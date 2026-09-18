import logging
from typing import List, Optional
from django.conf import settings
from .gemini_service import GeminiService, GeminiConfigurationError, GeminiAPIError

logger = logging.getLogger('ai_assistant')


class EmbeddingError(Exception):
    """Raised when embedding generation fails."""
    pass


class EmbeddingService:
    """
    Dedicated service for generating vector embeddings using Gemini embeddings.
    """

    def __init__(self, gemini_service: Optional[GeminiService] = None, model: Optional[str] = None):
        self.gemini_service = gemini_service or GeminiService()
        self.model = model or getattr(settings, 'GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')
        self.expected_dimension = getattr(settings, 'GEMINI_EMBEDDING_DIMENSION', 3072)

    def is_configured(self) -> bool:
        """Check if underlying Gemini service is configured."""
        return self.gemini_service.is_configured()

    def get_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for a single piece of text.

        :param text: Input text string.
        :return: List of floats representing the embedding vector.
        :raises ValueError: If input text is empty or blank.
        :raises EmbeddingError: If generation fails due to config or API error.
        """
        if not text or not text.strip():
            raise ValueError("Input text for embedding cannot be empty or whitespace.")

        cleaned_text = text.strip()

        try:
            vector = self.gemini_service.generate_embedding(cleaned_text, model=self.model)
            if not vector:
                raise EmbeddingError("Received empty vector from embedding provider.")
            return vector
        except (GeminiConfigurationError, GeminiAPIError, ValueError) as e:
            logger.error("Embedding generation failed: %s", str(e))
            raise EmbeddingError(f"Embedding error: {str(e)}") from e
        except Exception as e:
            logger.error("Unexpected error during embedding generation: %s", str(e))
            raise EmbeddingError(f"Unexpected embedding error: {str(e)}") from e

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embedding vectors for a list of text snippets.
        """
        if not texts:
            return []

        embeddings = []
        for idx, text in enumerate(texts):
            if not text or not text.strip():
                raise ValueError(f"Text item at index {idx} is empty or whitespace.")
            embeddings.append(self.get_embedding(text))

        return embeddings
