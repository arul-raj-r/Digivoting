import sys
from pathlib import Path
from django.core.management.base import BaseCommand, CommandError
from ai_assistant.services.rag_service import RAGService, RAGError


class Command(BaseCommand):
    help = "Ingest a PDF knowledge document into the Pinecone vector database for RAG retrieval."

    def add_arguments(self, parser):
        parser.add_argument(
            'pdf_path',
            type=str,
            help="Path to the PDF document to ingest (e.g. docs/digivote_guide.pdf)."
        )
        parser.add_argument(
            '--namespace',
            type=str,
            default=None,
            help="Pinecone namespace to store the document vectors in (defaults to PINECONE_NAMESPACE setting)."
        )
        parser.add_argument(
            '--chunk-size',
            type=int,
            default=1200,
            help="Maximum character length of each chunk (default: 1200)."
        )
        parser.add_argument(
            '--overlap',
            type=int,
            default=200,
            help="Character overlap between consecutive chunks (default: 200)."
        )

    def handle(self, *args, **options):
        pdf_path = options['pdf_path']
        namespace = options.get('namespace')
        chunk_size = options.get('chunk_size', 1200)
        overlap = options.get('overlap', 200)

        path_obj = Path(pdf_path)
        if not path_obj.exists():
            raise CommandError(f"Target PDF file does not exist: {pdf_path}")

        self.stdout.write(self.style.NOTICE("=================================================="))
        self.stdout.write(self.style.NOTICE("         DIGIVOTE RAG KNOWLEDGE INGESTION         "))
        self.stdout.write(self.style.NOTICE("=================================================="))
        self.stdout.write(f"Target Document : {path_obj.name}")
        self.stdout.write(f"File Path       : {path_obj.resolve()}")
        self.stdout.write(f"Chunk Size      : {chunk_size}")
        self.stdout.write(f"Chunk Overlap   : {overlap}")

        rag_service = RAGService()
        config_status = rag_service.is_configured()

        if not config_status["gemini_configured"]:
            raise CommandError("Gemini API key is missing. Set GEMINI_API_KEY in your environment.")
        if not config_status["pinecone_configured"]:
            raise CommandError("Pinecone configuration is incomplete. Set PINECONE_API_KEY and PINECONE_INDEX_NAME.")

        def progress_tracker(step: str, current: int, total: int):
            if step == "pages_extracted":
                self.stdout.write(self.style.SUCCESS(f"[1/4] Extracted {current} page(s) with text."))
            elif step == "chunks_created":
                self.stdout.write(self.style.SUCCESS(f"[2/4] Generated {current} text chunk(s)."))
            elif step == "embedding_progress":
                self.stdout.write(f"  -> Generated embeddings for {current}/{total} chunks...")

        try:
            self.stdout.write("Processing document pipeline...")
            result = rag_service.ingest_pdf(
                pdf_path=str(path_obj),
                namespace=namespace,
                chunk_size=chunk_size,
                overlap=overlap,
                progress_callback=progress_tracker
            )

            self.stdout.write(self.style.SUCCESS("[3/4] Embeddings generated."))
            self.stdout.write(self.style.SUCCESS(f"[4/4] Upserted {result['vectors_upserted']} vector(s) to Pinecone."))
            self.stdout.write(self.style.NOTICE("--------------------------------------------------"))
            self.stdout.write(f"Namespace Used  : {result['namespace']}")
            self.stdout.write(f"Pages Extracted : {result['pages_extracted']}")
            self.stdout.write(f"Chunks Created  : {result['chunks_generated']}")
            self.stdout.write(f"Vectors Uploaded: {result['vectors_upserted']}")
            self.stdout.write(self.style.SUCCESS("Status          : Ingestion Complete!"))
            self.stdout.write(self.style.NOTICE("=================================================="))

        except RAGError as re:
            raise CommandError(f"RAG ingestion failed: {str(re)}")
        except Exception as e:
            raise CommandError(f"Unexpected error during ingestion: {str(e)}")
