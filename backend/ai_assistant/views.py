import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.conf import settings

from .services.rag_service import RAGService
from .services.chat_service import ChatService
from .serializers import AIChatRequestSerializer, AIAssistantFeedbackSerializer
from .models import AIAssistantFeedback

logger = logging.getLogger('ai_assistant')


class AIHealthCheckView(APIView):
    """
    Health check endpoint for the DigiVote AI Assistant / RAG foundation.
    Validates environment and service configuration without exposing sensitive API credentials.
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            rag_service = RAGService()
            config_status = rag_service.is_configured()

            gemini_ready = config_status.get("gemini_configured", False)
            pinecone_ready = config_status.get("pinecone_configured", False)

            all_configured = gemini_ready and pinecone_ready

            payload = {
                "status": "ok" if all_configured else "not_configured",
                "gemini_configured": gemini_ready,
                "pinecone_configured": pinecone_ready,
            }

            if all_configured:
                # Include non-sensitive metadata for verification
                payload["embedding_model"] = getattr(settings, 'GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001')
                payload["chat_model"] = getattr(settings, 'GEMINI_CHAT_MODEL', 'gemini-2.5-flash')
                payload["pinecone_index"] = getattr(settings, 'PINECONE_INDEX_NAME', '')
                payload["pinecone_namespace"] = getattr(settings, 'PINECONE_NAMESPACE', 'digivote-docs')

            return Response(payload, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Error during AI health check evaluation: %s", str(e))
            return Response(
                {
                    "status": "error",
                    "gemini_configured": False,
                    "pinecone_configured": False,
                    "message": "Failed to evaluate AI health configuration."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIChatView(APIView):
    """
    Stage 2 & Stage 4 AI Chat endpoint for authenticated DigiVote users.
    Combines Pinecone RAG knowledge with authorized PostgreSQL election context
    and multi-turn conversation memory.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AIChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        message = serializer.validated_data['message']
        election_id = serializer.validated_data.get('election_id')
        conversation = serializer.validated_data.get('conversation', [])

        try:
            chat_service = ChatService()
            result = chat_service.process_chat(
                user=request.user,
                message=message,
                election_id=str(election_id) if election_id else None,
                conversation=conversation
            )
            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error("Unexpected error in AIChatView: %s", str(e))
            return Response(
                {
                    "success": False,
                    "detail": "An internal error occurred while generating the assistant response."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AIFeedbackView(APIView):
    """
    Stage 5 User Feedback endpoint.
    Accepts feedback ('helpful' or 'not_helpful') on assistant responses using backend request_id.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AIAssistantFeedbackSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        message_id = serializer.validated_data['message_id']
        rating = serializer.validated_data['rating']

        try:
            feedback, created = AIAssistantFeedback.objects.update_or_create(
                user=request.user,
                request_id=message_id,
                defaults={
                    'rating': rating,
                }
            )

            logger.info("Feedback recorded for request %s: %s by user %s", message_id, rating, request.user.id)
            return Response(
                {
                    "success": True,
                    "message": "Feedback submitted successfully.",
                    "created": created
                },
                status=status.HTTP_200_OK
            )

        except Exception as e:
            logger.error("Error saving AI feedback: %s", str(e))
            return Response(
                {
                    "success": False,
                    "detail": "Unable to save feedback at this time."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

