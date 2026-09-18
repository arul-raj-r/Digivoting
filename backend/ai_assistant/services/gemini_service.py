import logging
from typing import Optional, List
from django.conf import settings

logger = logging.getLogger('ai_assistant')


class GeminiConfigurationError(Exception):
    """Raised when Gemini is not properly configured."""
    pass


class GeminiAPIError(Exception):
    """Raised when Gemini API request fails."""
    pass


class GeminiService:
    """
    Centralized service for Google Gemini API interactions.
    Handles client initialization, text generation, and embedding generation.
    """

    def __init__(self, api_key: Optional[str] = None, chat_model: Optional[str] = None, embedding_model: Optional[str] = None):
        self.api_key = api_key if api_key is not None else getattr(settings, 'GEMINI_API_KEY', '')
        self.chat_model = chat_model if chat_model is not None else getattr(settings, 'GEMINI_CHAT_MODEL', 'gemini-2.5-flash')
        self.embedding_model = embedding_model if embedding_model is not None else getattr(settings, 'GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')
        self.embedding_dimension = getattr(settings, 'GEMINI_EMBEDDING_DIMENSION', None)
        self._client = None

    def is_configured(self) -> bool:
        """Check if required Gemini API credentials are present."""
        return bool(self.api_key and str(self.api_key).strip())

    def get_client(self):
        """
        Get or initialize the Gemini client using the Google GenAI SDK.
        """
        if not self.is_configured():
            raise GeminiConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in your environment."
            )

        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key.strip())
            except ImportError as e:
                logger.error("google-genai SDK is not installed.")
                raise GeminiConfigurationError("google-genai library is not installed.") from e
            except Exception as e:
                logger.error("Failed to initialize Gemini client: %s", str(e))
                raise GeminiConfigurationError(f"Failed to initialize Gemini client: {str(e)}") from e

        return self._client

    def generate_text(self, prompt: str, model: Optional[str] = None, system_instruction: Optional[str] = None) -> str:
        """
        Generate text content from Gemini.
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty.")

        target_model = model or self.chat_model
        client = self.get_client()

        try:
            kwargs = {
                'model': target_model,
                'contents': prompt
            }
            if system_instruction and str(system_instruction).strip():
                try:
                    from google.genai import types
                    kwargs['config'] = types.GenerateContentConfig(system_instruction=str(system_instruction).strip())
                except Exception:
                    kwargs['config'] = {'system_instruction': str(system_instruction).strip()}

            response = client.models.generate_content(**kwargs)
            if not response or not hasattr(response, 'text') or response.text is None:
                raise GeminiAPIError("Empty response received from Gemini model.")
            return response.text
        except GeminiConfigurationError:
            raise
        except Exception as e:
            logger.error("Gemini text generation failed for model '%s': %s", target_model, str(e))
            raise GeminiAPIError(f"Gemini text generation failed: {str(e)}") from e

    def generate_embedding(self, text: str, model: Optional[str] = None) -> List[float]:
        """
        Generate vector embedding for a given text snippet.
        """
        if not text or not text.strip():
            raise ValueError("Input text for embedding cannot be empty.")

        target_model = model or self.embedding_model
        client = self.get_client()

        try:
            kwargs = {
                'model': target_model,
                'contents': text
            }
            if self.embedding_dimension:
                kwargs['config'] = {'output_dimensionality': int(self.embedding_dimension)}
            response = client.models.embed_content(**kwargs)
            if not response or not hasattr(response, 'embeddings') or not response.embeddings:
                raise GeminiAPIError("No embeddings returned from Gemini API.")
            return list(response.embeddings[0].values)
        except GeminiConfigurationError:
            raise
        except Exception as e:
            logger.error("Gemini embedding generation failed for model '%s': %s", target_model, str(e))
            raise GeminiAPIError(f"Gemini embedding generation failed: {str(e)}") from e
