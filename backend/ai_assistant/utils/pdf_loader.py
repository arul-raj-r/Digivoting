import os
import logging
from typing import List, Dict, Any
from pathlib import Path

logger = logging.getLogger('ai_assistant')


class PDFLoaderError(Exception):
    """Raised when PDF loading or extraction encounters a failure."""
    pass


class PDFLoader:
    """
    Utility for loading PDF documents and extracting text page-by-page using pypdf.
    """

    @staticmethod
    def extract_pages(pdf_path: str) -> List[Dict[str, Any]]:
        """
        Extract readable text from a PDF file page by page.

        :param pdf_path: Path to the target PDF file on disk.
        :return: List of dictionaries with structure:
                 [{"page": 1, "text": "..."}, ...]
        :raises PDFLoaderError: If file is missing, empty, corrupt, or has no extractable text.
        """
        if not pdf_path or not str(pdf_path).strip():
            raise PDFLoaderError("PDF path cannot be empty.")

        path = Path(pdf_path)
        if not path.exists():
            raise PDFLoaderError(f"PDF file not found at: {pdf_path}")

        if not path.is_file():
            raise PDFLoaderError(f"Path is not a regular file: {pdf_path}")

        if path.stat().st_size == 0:
            raise PDFLoaderError(f"PDF file is completely empty (0 bytes): {pdf_path}")

        try:
            from pypdf import PdfReader
            from pypdf.errors import PyPdfError
        except ImportError as e:
            logger.error("pypdf is not installed.")
            raise PDFLoaderError("pypdf package is not installed.") from e

        try:
            reader = PdfReader(str(path))
            if len(reader.pages) == 0:
                raise PDFLoaderError(f"PDF contains no pages: {pdf_path}")

            pages: List[Dict[str, Any]] = []

            for page_idx, page in enumerate(reader.pages):
                page_num = page_idx + 1
                try:
                    text = page.extract_text() or ""
                    clean_text = text.strip()
                    if clean_text:
                        pages.append({
                            "page": page_num,
                            "text": clean_text
                        })
                    else:
                        logger.debug("Page %d in %s has no extractable text.", page_num, path.name)
                except Exception as page_err:
                    logger.warning("Failed to extract text from page %d of %s: %s", page_num, path.name, str(page_err))

            if not pages:
                raise PDFLoaderError(f"No extractable text found in PDF: {pdf_path}")

            logger.info("Successfully extracted %d pages with text from %s", len(pages), path.name)
            return pages

        except PDFLoaderError:
            raise
        except PyPdfError as pe:
            logger.error("PyPdf error while reading %s: %s", pdf_path, str(pe))
            raise PDFLoaderError(f"Invalid or corrupted PDF file: {str(pe)}") from pe
        except Exception as e:
            logger.error("Unexpected error reading PDF %s: %s", pdf_path, str(e))
            raise PDFLoaderError(f"Failed to read PDF file: {str(e)}") from e
