import re
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from django.conf import settings

from .gemini_service import GeminiService
from .embedding_service import EmbeddingService, EmbeddingError
from .pinecone_service import PineconeService, PineconeConfigurationError, PineconeAPIError
from ..utils.pdf_loader import PDFLoader, PDFLoaderError
from ..utils.text_chunker import TextChunker

logger = logging.getLogger('ai_assistant')


class RAGError(Exception):
    """Raised when RAG ingestion or retrieval fails."""
    pass


class RAGService:
    """
    Core RAG coordinator handling document ingestion and vector retrieval.
    """

    def __init__(
        self,
        gemini_service: Optional[GeminiService] = None,
        embedding_service: Optional[EmbeddingService] = None,
        pinecone_service: Optional[PineconeService] = None,
        default_namespace: Optional[str] = None
    ):
        self.gemini_service = gemini_service or GeminiService()
        self.embedding_service = embedding_service or EmbeddingService(gemini_service=self.gemini_service)
        self.pinecone_service = pinecone_service or PineconeService()
        self.default_namespace = default_namespace or getattr(settings, 'PINECONE_NAMESPACE', 'digivote-docs')

    def is_configured(self) -> Dict[str, bool]:
        """
        Check if both Gemini and Pinecone are configured.
        """
        return {
            "gemini_configured": self.gemini_service.is_configured(),
            "pinecone_configured": self.pinecone_service.is_configured()
        }

    # =========================================================================
    # INGESTION PIPELINE
    # =========================================================================

    @staticmethod
    def _sanitize_prefix(name: str) -> str:
        """Sanitize filename into a clean vector ID prefix."""
        clean = re.sub(r'[^a-zA-Z0-9_-]', '_', name)
        return clean.strip('_').lower()[:32]

    def ingest_pdf(
        self,
        pdf_path: str,
        namespace: Optional[str] = None,
        chunk_size: int = 1200,
        overlap: int = 200,
        progress_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        Full RAG ingestion pipeline:
        PDF -> Page Extraction -> Chunking -> Embeddings -> Pinecone Upsert.

        :param pdf_path: Path to the target PDF file.
        :param namespace: Optional Pinecone namespace (defaults to configured namespace).
        :param chunk_size: Size of chunk in characters.
        :param overlap: Overlap in characters.
        :param progress_callback: Optional callable(step_name, current, total).
        :return: Summary dictionary with ingestion stats.
        """
        target_namespace = namespace if namespace is not None else self.default_namespace
        pdf_file = Path(pdf_path)
        source_name = pdf_file.name

        logger.info("Starting ingestion for PDF: %s into namespace '%s'", source_name, target_namespace)

        # 1. Extract pages
        try:
            pages = PDFLoader.extract_pages(str(pdf_file))
        except PDFLoaderError as pe:
            logger.error("PDF extraction failed for %s: %s", source_name, str(pe))
            raise RAGError(f"PDF extraction failed: {str(pe)}") from pe

        if progress_callback:
            progress_callback("pages_extracted", len(pages), len(pages))

        # 2. Chunk pages
        chunker = TextChunker(chunk_size=chunk_size, overlap=overlap)
        chunks = chunker.chunk_pages(pages, source_name=source_name)

        if not chunks:
            raise RAGError(f"No usable text chunks generated from PDF: {source_name}")

        if progress_callback:
            progress_callback("chunks_created", len(chunks), len(chunks))

        # 3. Generate embeddings and construct vector records
        prefix = self._sanitize_prefix(source_name)
        doc_hash = hashlib.md5(source_name.encode('utf-8')).hexdigest()[:8]
        vectors: List[Dict[str, Any]] = []

        total_chunks = len(chunks)
        for idx, chunk in enumerate(chunks):
            chunk_text = chunk["text"]
            try:
                embedding = self.embedding_service.get_embedding(chunk_text)
            except EmbeddingError as ee:
                logger.error("Failed generating embedding for chunk %d of %s: %s", idx, source_name, str(ee))
                raise RAGError(f"Embedding generation failed for chunk {idx}: {str(ee)}") from ee

            vector_id = f"{prefix}-{doc_hash}-{chunk['page']}-{idx}"

            vectors.append({
                "id": vector_id,
                "values": embedding,
                "metadata": {
                    "source": chunk["source"],
                    "page": chunk["page"],
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk_text
                }
            })

            if progress_callback and ((idx + 1) % 5 == 0 or (idx + 1) == total_chunks):
                progress_callback("embedding_progress", idx + 1, total_chunks)

        # 4. Upsert into Pinecone
        try:
            upserted_count = self.pinecone_service.upsert_vectors(vectors, namespace=target_namespace)
        except (PineconeConfigurationError, PineconeAPIError) as pe:
            logger.error("Vector upsert failed for %s: %s", source_name, str(pe))
            raise RAGError(f"Vector upsert failed: {str(pe)}") from pe

        summary = {
            "source": source_name,
            "namespace": target_namespace,
            "pages_extracted": len(pages),
            "chunks_generated": len(chunks),
            "vectors_upserted": upserted_count,
            "status": "success"
        }
        logger.info("Ingestion complete for %s: %s", source_name, summary)
        return summary

    # =========================================================================
    # RETRIEVAL PIPELINE
    # =========================================================================

    def retrieve_context(
        self,
        question: str,
        top_k: int = 5,
        namespace: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        RAG retrieval service:
        Question -> Embedding -> Pinecone Similarity Search -> Structured Chunks.

        :param question: User question string.
        :param top_k: Number of top results to retrieve.
        :param namespace: Optional Pinecone namespace.
        :return: List of structured match dicts:
                 [{"source": str, "page": int, "chunk_index": int, "score": float, "text": str}]
        """
        if not question or not question.strip():
            raise ValueError("Question cannot be empty or whitespace.")

        cleaned_question = question.strip()
        target_namespace = namespace if namespace is not None else self.default_namespace

        # 1. Generate query embedding
        try:
            query_vector = self.embedding_service.get_embedding(cleaned_question)
        except EmbeddingError as ee:
            logger.error("Failed to generate embedding for query: %s", str(ee))
            raise RAGError(f"Query embedding generation failed: {str(ee)}") from ee

        # 2. Query Pinecone
        try:
            matches = self.pinecone_service.query_vectors(
                vector=query_vector,
                top_k=top_k,
                namespace=target_namespace,
                include_metadata=True
            )
        except (PineconeConfigurationError, PineconeAPIError) as pe:
            logger.error("Pinecone query failed: %s", str(pe))
            raise RAGError(f"Vector search failed: {str(pe)}") from pe

        # 3. Format structured results
        structured_results: List[Dict[str, Any]] = []
        for match in matches:
            if hasattr(match, 'metadata') and match.metadata:
                meta = match.metadata
                score = getattr(match, 'score', 0.0)
            elif isinstance(match, dict):
                meta = match.get('metadata', {})
                score = match.get('score', 0.0)
            else:
                continue

            structured_results.append({
                "source": meta.get("source", "unknown"),
                "page": meta.get("page", 0),
                "chunk_index": meta.get("chunk_index", 0),
                "score": score,
                "text": meta.get("text", "")
            })

        return structured_results

    def format_context(self, matches: List[Dict[str, Any]]) -> str:
        """
        Format retrieved matches into a coherent context string for future LLM generation.
        """
        if not matches:
            return ""

        context_parts = []
        for match in matches:
            source = match.get("source", "document")
            page = match.get("page", "?")
            text = match.get("text", "").strip()
            context_parts.append(f"[Source: {source} | Page: {page}]\n{text}")

        return "\n\n".join(context_parts)
