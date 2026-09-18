import re
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class TextChunk:
    text: str
    page: int
    source: str
    chunk_index: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "page": self.page,
            "source": self.source,
            "chunk_index": self.chunk_index
        }


class TextChunker:
    """
    Deterministic page-aware text chunker with configurable size and overlap.
    """

    def __init__(self, chunk_size: int = 1200, overlap: int = 200):
        if chunk_size <= 0:
            raise ValueError("chunk_size must be greater than 0.")
        if overlap < 0:
            raise ValueError("overlap must be non-negative.")
        if overlap >= chunk_size:
            raise ValueError("overlap must be strictly less than chunk_size.")

        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_pages(self, pages: List[Dict[str, Any]], source_name: str = "document.pdf") -> List[Dict[str, Any]]:
        """
        Split a list of page dicts [{"page": int, "text": str}] into deterministic, page-aware chunks.

        :param pages: List of page dictionaries with 'page' and 'text'.
        :param source_name: Name of the originating document.
        :return: List of chunk dictionaries containing text, page, source, and chunk_index.
        """
        chunks: List[Dict[str, Any]] = []
        global_chunk_idx = 0

        for page in pages:
            raw_text = page.get("text", "")
            page_number = page.get("page", 1)

            # Normalize whitespace while retaining readability
            normalized_text = re.sub(r'[ \t]+', ' ', raw_text).strip()
            if not normalized_text:
                continue

            # If text fits within a single chunk
            if len(normalized_text) <= self.chunk_size:
                chunks.append({
                    "text": normalized_text,
                    "page": page_number,
                    "source": source_name,
                    "chunk_index": global_chunk_idx
                })
                global_chunk_idx += 1
                continue

            # Sliding window with overlap
            start = 0
            step = self.chunk_size - self.overlap

            while start < len(normalized_text):
                end = min(start + self.chunk_size, len(normalized_text))
                chunk_slice = normalized_text[start:end].strip()

                if chunk_slice:
                    chunks.append({
                        "text": chunk_slice,
                        "page": page_number,
                        "source": source_name,
                        "chunk_index": global_chunk_idx
                    })
                    global_chunk_idx += 1

                if end >= len(normalized_text):
                    break

                start += step

        return chunks
