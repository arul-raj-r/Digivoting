import logging
import uuid
from typing import Optional, Dict, Any, List

from .gemini_service import GeminiService, GeminiConfigurationError, GeminiAPIError
from .rag_service import RAGService, RAGError
from .context_service import DatabaseContextService
from .context_builder import ContextBuilder
from .intent_classifier import IntentClassifier, IntentType

logger = logging.getLogger('ai_assistant')


class ChatService:
    """
    Central orchestration service for DigiVote AI Chatbot (Stage 4).
    Combines RAG retrieval from Pinecone, authorized context from DigiVote PostgreSQL,
    untrusted recent conversation context, deterministic intent classification,
    and Gemini response generation with strict security and candidate neutrality guardrails.
    """

    def __init__(
        self,
        gemini_service: Optional[GeminiService] = None,
        rag_service: Optional[RAGService] = None,
        context_service: Optional[DatabaseContextService] = None,
        intent_classifier: Optional[IntentClassifier] = None
    ):
        self.gemini_service = gemini_service or GeminiService()
        self.rag_service = rag_service or RAGService(gemini_service=self.gemini_service)
        self.context_service = context_service or DatabaseContextService()
        self.intent_classifier = intent_classifier or IntentClassifier()

    def process_chat(
        self,
        user,
        message: str,
        election_id: Optional[str] = None,
        conversation: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process an incoming chat query with optional election and conversation context.

        :param user: The authenticated Django User object.
        :param message: The user query string (pre-validated).
        :param election_id: Optional UUID string of a target election.
        :param conversation: Optional list of recent conversation turns [{"role": "...", "content": "..."}].
        :return: Standardized dictionary containing answer, sources, and context_used.
        """
        logger.info(
            "AI chat request received for user: %s (election_id: %s, history_len: %d)",
            getattr(user, 'id', 'anonymous'),
            election_id,
            len(conversation) if conversation else 0
        )

        # Generate safe unique request identifier for feedback tracking
        request_id = str(uuid.uuid4())

        user_context = self.context_service.get_user_context(user)
        db_context: Optional[Dict[str, Any]] = None
        context_flags = {
            "rag": False,
            "election": False,
            "eligibility": False,
            "ownership": False,
            "conversation": bool(conversation and len(conversation) > 0)
        }

        # 1. Deterministic Intent Classification
        intent = self.intent_classifier.classify(message, election_id=election_id)
        logger.debug("Classified query intent: %s", intent)

        # 2. Fast Path: OUT_OF_SCOPE
        # Do not unnecessarily query Pinecone or run LLM for general knowledge/jokes/weather
        if intent == IntentType.OUT_OF_SCOPE:
            return {
                "success": True,
                "request_id": request_id,
                "answer": (
                    "I am DigiVote Assistant, dedicated to assisting with the DigiVote digital voting "
                    "platform, election procedures, and voter guidance. I cannot assist with unrelated topics."
                ),
                "sources": [],
                "context_used": context_flags
            }

        # 3. Validate election authorization if election_id provided
        if election_id:
            is_authorized, election, role = self.context_service.validate_election_access(user, str(election_id))

            if role == "not_found":
                return {
                    "success": False,
                    "request_id": request_id,
                    "answer": "The requested election could not be found in DigiVote.",
                    "sources": [],
                    "context_used": context_flags
                }

            if not is_authorized:
                return {
                    "success": True,
                    "request_id": request_id,
                    "answer": (
                        "You are not registered as an eligible voter or administrator for this election, "
                        "so I cannot provide election-specific details."
                    ),
                    "sources": [],
                    "context_used": context_flags
                }

            # Gather authorized election context (Priority 2 - Authoritative Live Facts)
            db_context = self.context_service.get_election_context(user, election, role)
            context_flags["election"] = True
            if role == "voter":
                context_flags["eligibility"] = True
            elif role == "owner":
                context_flags["ownership"] = True

        # 4. Retrieve RAG knowledge base chunks (Priority 3 - Official Documentation)
        rag_matches: List[Dict[str, Any]] = []
        try:
            # Skip RAG query for pure technical AI explanation if question asks how AI works generally
            # but allow RAG for general website help and election context
            rag_matches = self.rag_service.retrieve_context(message, top_k=5)
            if rag_matches:
                context_flags["rag"] = True
        except (RAGError, Exception) as re:
            logger.warning("RAG retrieval omitted or failed: %s", str(re))

        # Format deduplicated citations with human-readable document titles
        sources: List[Dict[str, Any]] = []
        seen_citations = set()
        for m in rag_matches:
            raw_source = m.get("source") or "DigiVote Comprehensive Website User Guide"
            # Normalize display source name (remove internal path if any)
            source_file = raw_source.split("/")[-1].split("\\")[-1]
            page_num = m.get("page", 1)
            citation_key = (source_file, page_num)
            if source_file and citation_key not in seen_citations:
                seen_citations.add(citation_key)
                sources.append({
                    "source": source_file,
                    "page": page_num
                })

        # 5. Assemble prompt via ContextBuilder (5-Level Context Priority)
        system_instruction, user_prompt = ContextBuilder.build_prompt(
            question=message,
            rag_matches=rag_matches,
            db_context=db_context,
            user_context=user_context,
            conversation_history=conversation,
            intent=intent
        )

        # 6. Generate answer via Gemini
        try:
            answer = self.gemini_service.generate_text(
                prompt=user_prompt,
                system_instruction=system_instruction
            )
        except GeminiConfigurationError as ce:
            logger.error("Gemini configuration error: %s", str(ce))
            self._record_unanswered_question(user, message, intent, reason="AI_ERROR")
            return {
                "success": False,
                "request_id": request_id,
                "answer": "The AI assistant generative service is currently not configured. Please contact your DigiVote administrator.",
                "sources": [],
                "context_used": context_flags
            }
        except GeminiAPIError as ae:
            logger.error("Gemini API generation failure: %s", str(ae))
            self._record_unanswered_question(user, message, intent, reason="AI_ERROR")
            return {
                "success": False,
                "request_id": request_id,
                "answer": "I'm sorry, but I'm currently unable to generate a response. Please try again in a few moments.",
                "sources": [],
                "context_used": context_flags
            }
        except Exception as e:
            logger.error("Unexpected error during AI answer generation: %s", str(e))
            self._record_unanswered_question(user, message, intent, reason="AI_ERROR")
            return {
                "success": False,
                "request_id": request_id,
                "answer": "An unexpected error occurred while processing your request. Please try again later.",
                "sources": [],
                "context_used": context_flags
            }

        # 7. Check and record low-confidence or unanswered questions
        clean_answer = answer.strip()
        self._check_and_record_unanswered(user, message, intent, rag_matches, clean_answer)

        return {
            "success": True,
            "request_id": request_id,
            "answer": clean_answer,
            "sources": sources,
            "context_used": context_flags
        }

    def _check_and_record_unanswered(
        self,
        user,
        message: str,
        intent: str,
        rag_matches: List[Dict[str, Any]],
        answer: str
    ):
        """
        Record question if official DigiVote knowledge was insufficient,
        excluding greetings, out-of-scope queries, and security refusals.
        """
        import re
        # Exclude out-of-scope and security
        if intent in (IntentType.OUT_OF_SCOPE, IntentType.SECURITY):
            return

        # Exclude casual short greetings
        if re.match(r'^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b', message.strip().lower()):
            return

        is_unanswered = False
        reason = "NO_RAG_CONTEXT"

        if not rag_matches and intent in (IntentType.WEBSITE_HELP, IntentType.ELECTION_CONTEXT):
            is_unanswered = True
            reason = "NO_RAG_CONTEXT"
        elif any(phrase in answer.lower() for phrase in [
            "not enough information",
            "insufficient information",
            "couldn't find enough",
            "could not find enough",
            "don't have enough information",
            "cannot provide election-specific details"
        ]):
            is_unanswered = True
            reason = "LOW_RELEVANCE"

        if is_unanswered:
            self._record_unanswered_question(user, message, intent, reason=reason)

    def _record_unanswered_question(self, user, message: str, intent: str, reason: str = "NO_RAG_CONTEXT"):
        """
        Sanitize and persist an unanswered question for admin review.
        """
        try:
            from ai_assistant.models import AIUnansweredQuestion
            from ai_assistant.utils.question_sanitizer import sanitize_question, normalize_question

            clean_q = sanitize_question(message)
            norm_q = normalize_question(message)

            AIUnansweredQuestion.objects.create(
                user=user if getattr(user, 'is_authenticated', False) else None,
                question=clean_q,
                normalized_question=norm_q,
                reason=reason,
                intent=intent,
                status='NEW'
            )
        except Exception as e:
            logger.warning("Could not persist unanswered question: %s", str(e))


