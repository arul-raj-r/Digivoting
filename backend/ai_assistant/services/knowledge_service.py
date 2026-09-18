import logging
from typing import Optional, Dict, Any, List
from django.utils import timezone
from ai_assistant.models import AIKnowledgeDocument
from ai_assistant.services.rag_service import RAGService, RAGError
from ai_assistant.services.pinecone_service import PineconeService

logger = logging.getLogger('ai_assistant')


def log_admin_action(event_type: str, user=None, metadata: Optional[Dict[str, Any]] = None, severity: str = "INFO"):
    """
    Helper to record administrative actions to DigiVote's existing audit.AuditLog.
    """
    try:
        from audit.models import AuditLog
        AuditLog.objects.create(
            user=user if user and getattr(user, 'is_authenticated', False) else None,
            event_type=event_type,
            severity=severity,
            result='SUCCESS',
            metadata=metadata or {}
        )
    except Exception as e:
        logger.warning("Failed to record audit log for %s: %s", event_type, str(e))


class KnowledgeManagementService:
    """
    Service for managing knowledge document lifecycle, versioning,
    and safe vector replacement in Pinecone without deleting namespaces.
    """

    def __init__(self, rag_service: Optional[RAGService] = None, pinecone_service: Optional[PineconeService] = None):
        self.rag_service = rag_service or RAGService()
        self.pinecone_service = pinecone_service or PineconeService()

    def get_active_documents(self) -> List[AIKnowledgeDocument]:
        """
        Return all currently active and approved knowledge documents.
        """
        return list(AIKnowledgeDocument.objects.filter(status='ACTIVE'))

    def activate_document(self, doc_id: str, user=None) -> AIKnowledgeDocument:
        """
        Mark a document as ACTIVE and audit log the change.
        """
        doc = AIKnowledgeDocument.objects.get(id=doc_id)
        doc.status = 'ACTIVE'
        doc.save()

        log_admin_action(
            event_type="KNOWLEDGE_DOC_ACTIVATED",
            user=user,
            metadata={"document_id": str(doc.id), "title": doc.title, "filename": doc.source_filename, "version": doc.version}
        )
        return doc

    def archive_document(self, doc_id: str, user=None) -> AIKnowledgeDocument:
        """
        Mark a document as ARCHIVED and audit log the change.
        """
        doc = AIKnowledgeDocument.objects.get(id=doc_id)
        doc.status = 'ARCHIVED'
        doc.save()

        log_admin_action(
            event_type="KNOWLEDGE_DOC_ARCHIVED",
            user=user,
            metadata={"document_id": str(doc.id), "title": doc.title, "filename": doc.source_filename, "version": doc.version}
        )
        return doc

    def safe_replace_document(
        self,
        new_pdf_path: str,
        title: str,
        source_filename: str,
        version: str,
        old_doc_id: Optional[str] = None,
        user=None,
        namespace: str = 'digivote-docs'
    ) -> Dict[str, Any]:
        """
        Executes safe replacement workflow:
        1. Ingests new document vectors into Pinecone with source metadata.
        2. Verifies ingestion generated and upserted vectors.
        3. Registers and marks new AIKnowledgeDocument as ACTIVE.
        4. If old document provided:
           - Marks old document as ARCHIVED.
           - Removes old vectors targeting ONLY the old document's source metadata filter.
           - NEVER deletes the whole namespace.
        5. Logs actions to AuditLog.
        """
        logger.info("Starting safe document replacement for: %s (v%s)", title, version)

        # Step 1: Ingest new document
        ingest_result = self.rag_service.ingest_pdf(
            pdf_path=new_pdf_path,
            namespace=namespace,
            chunk_size=600,
            overlap=60
        )

        vectors_count = ingest_result.get("vectors_upserted", 0)
        if vectors_count <= 0:
            raise RAGError(f"Safe replacement aborted: 0 vectors upserted for {source_filename}")

        log_admin_action(
            event_type="ADMIN_INGESTION_TRIGGERED",
            user=user,
            metadata={"source_filename": source_filename, "vectors_upserted": vectors_count, "namespace": namespace}
        )

        # Step 2: Create / activate new AIKnowledgeDocument
        new_doc, created = AIKnowledgeDocument.objects.update_or_create(
            source_filename=source_filename,
            defaults={
                "title": title,
                "version": version,
                "status": "ACTIVE",
                "namespace": namespace,
            }
        )

        log_admin_action(
            event_type="KNOWLEDGE_DOC_ACTIVATED",
            user=user,
            metadata={"document_id": str(new_doc.id), "title": new_doc.title, "version": version}
        )

        # Step 3: If old document exists, archive it and safely purge only its vectors
        purged_old_vectors = False
        if old_doc_id:
            try:
                old_doc = AIKnowledgeDocument.objects.get(id=old_doc_id)
                old_doc.status = 'ARCHIVED'
                old_doc.save()

                log_admin_action(
                    event_type="KNOWLEDGE_DOC_ARCHIVED",
                    user=user,
                    metadata={"document_id": str(old_doc.id), "title": old_doc.title, "version": old_doc.version}
                )

                # Delete old vectors targeting ONLY old_doc.source_filename
                if self.pinecone_service.is_configured():
                    index = self.pinecone_service.get_client()
                    index.delete(
                        filter={"source": {"$eq": old_doc.source_filename}},
                        namespace=namespace
                    )
                    purged_old_vectors = True
                    logger.info("Purged old vectors for source: %s in namespace %s", old_doc.source_filename, namespace)
            except Exception as e:
                logger.warning("Could not purge old vectors for %s: %s", old_doc_id, str(e))

        return {
            "success": True,
            "new_document_id": str(new_doc.id),
            "source_filename": source_filename,
            "version": version,
            "vectors_upserted": vectors_count,
            "purged_old_vectors": purged_old_vectors,
            "status": "ACTIVE"
        }
