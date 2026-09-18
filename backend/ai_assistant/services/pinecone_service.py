import logging
from typing import List, Dict, Any, Optional
from django.conf import settings

logger = logging.getLogger('ai_assistant')


class PineconeConfigurationError(Exception):
    """Raised when Pinecone credentials or index configuration is missing."""
    pass


class PineconeAPIError(Exception):
    """Raised when Pinecone operations fail."""
    pass


class PineconeService:
    """
    Reusable Pinecone client and vector index management service.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        index_name: Optional[str] = None,
        default_namespace: Optional[str] = None
    ):
        self.api_key = api_key if api_key is not None else getattr(settings, 'PINECONE_API_KEY', '')
        self.index_name = index_name if index_name is not None else getattr(settings, 'PINECONE_INDEX_NAME', '')
        self.default_namespace = default_namespace if default_namespace is not None else getattr(settings, 'PINECONE_NAMESPACE', 'digivote-docs')
        self._client = None
        self._index = None

    def is_configured(self) -> bool:
        """Check if Pinecone API key and index name are configured."""
        return bool(
            self.api_key and str(self.api_key).strip() and
            self.index_name and str(self.index_name).strip()
        )

    def get_client(self):
        """
        Get or initialize the Pinecone client.
        """
        if not (self.api_key and str(self.api_key).strip()):
            raise PineconeConfigurationError(
                "Pinecone API key is not configured. Please set PINECONE_API_KEY in your environment."
            )

        if self._client is None:
            try:
                from pinecone import Pinecone
                self._client = Pinecone(api_key=self.api_key.strip())
            except ImportError as e:
                logger.error("pinecone SDK is not installed.")
                raise PineconeConfigurationError("pinecone library is not installed.") from e
            except Exception as e:
                logger.error("Failed to initialize Pinecone client: %s", str(e))
                raise PineconeConfigurationError(f"Failed to initialize Pinecone client: {str(e)}") from e

        return self._client

    def get_index(self):
        """
        Get or connect to the configured Pinecone index.
        """
        if not (self.index_name and str(self.index_name).strip()):
            raise PineconeConfigurationError(
                "Pinecone index name is not configured. Please set PINECONE_INDEX_NAME in your environment."
            )

        if self._index is None:
            client = self.get_client()
            try:
                self._index = client.Index(self.index_name.strip())
            except Exception as e:
                logger.error("Failed to connect to Pinecone index '%s': %s", self.index_name, str(e))
                raise PineconeAPIError(f"Failed to connect to Pinecone index: {str(e)}") from e

        return self._index

    def upsert_vectors(
        self,
        vectors: List[Dict[str, Any]],
        namespace: Optional[str] = None,
        batch_size: int = 100
    ) -> int:
        """
        Upsert vector records into the configured Pinecone index.

        :param vectors: List of dicts, each with 'id', 'values', and optional 'metadata'.
        :param namespace: Optional Pinecone namespace. Defaults to self.default_namespace.
        :param batch_size: Number of vectors per upsert request.
        :return: Count of vectors upserted.
        """
        if not vectors:
            return 0

        target_namespace = namespace if namespace is not None else self.default_namespace
        index = self.get_index()

        total_upserted = 0
        try:
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                if target_namespace:
                    index.upsert(vectors=batch, namespace=target_namespace)
                else:
                    index.upsert(vectors=batch)
                total_upserted += len(batch)

            logger.info("Successfully upserted %d vectors to namespace '%s'", total_upserted, target_namespace)
            return total_upserted
        except PineconeConfigurationError:
            raise
        except Exception as e:
            logger.error("Pinecone vector upsert failed: %s", str(e))
            raise PineconeAPIError(f"Pinecone vector upsert failed: {str(e)}") from e

    def query_vectors(
        self,
        vector: List[float],
        top_k: int = 5,
        namespace: Optional[str] = None,
        filter_criteria: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True
    ) -> List[Any]:
        """
        Query Pinecone index for nearest vectors.

        :param vector: Query embedding vector.
        :param top_k: Maximum number of top matches to return.
        :param namespace: Optional Pinecone namespace. Defaults to self.default_namespace.
        :param filter_criteria: Optional metadata filter dict.
        :param include_metadata: Whether to return vector metadata.
        :return: List of match objects.
        """
        if not vector:
            raise ValueError("Query vector cannot be empty.")

        target_namespace = namespace if namespace is not None else self.default_namespace
        index = self.get_index()

        try:
            query_kwargs: Dict[str, Any] = {
                'vector': vector,
                'top_k': top_k,
                'include_metadata': include_metadata,
            }
            if target_namespace:
                query_kwargs['namespace'] = target_namespace
            if filter_criteria:
                query_kwargs['filter'] = filter_criteria

            results = index.query(**query_kwargs)

            # Results typically have a 'matches' attribute
            if hasattr(results, 'matches'):
                return results.matches
            elif isinstance(results, dict) and 'matches' in results:
                return results['matches']
            return []
        except PineconeConfigurationError:
            raise
        except Exception as e:
            logger.error("Pinecone query failed: %s", str(e))
            raise PineconeAPIError(f"Pinecone query failed: {str(e)}") from e

    def delete_vectors(
        self,
        ids: Optional[List[str]] = None,
        filter_criteria: Optional[Dict[str, Any]] = None,
        namespace: Optional[str] = None,
        delete_all: bool = False
    ) -> None:
        """
        Delete vectors from the Pinecone index by IDs or metadata filter.

        :param ids: Optional list of vector IDs to delete.
        :param filter_criteria: Optional metadata filter dict (e.g. {"source": "filename.pdf"}).
        :param namespace: Optional Pinecone namespace. Defaults to self.default_namespace.
        :param delete_all: Whether to delete all vectors in the namespace (defaults to False).
        """
        target_namespace = namespace if namespace is not None else self.default_namespace
        index = self.get_index()

        try:
            delete_kwargs: Dict[str, Any] = {}
            if target_namespace:
                delete_kwargs['namespace'] = target_namespace
            if ids is not None:
                delete_kwargs['ids'] = ids
            if filter_criteria is not None:
                delete_kwargs['filter'] = filter_criteria
            if delete_all:
                delete_kwargs['delete_all'] = True

            index.delete(**delete_kwargs)
            logger.info("Successfully requested vector deletion from namespace '%s' with filter: %s", target_namespace, filter_criteria)
        except PineconeConfigurationError:
            raise
        except Exception as e:
            logger.error("Pinecone vector deletion failed: %s", str(e))
            raise PineconeAPIError(f"Pinecone vector deletion failed: {str(e)}") from e

