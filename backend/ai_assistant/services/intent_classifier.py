import re
from typing import Optional


class IntentType:
    WEBSITE_HELP = "WEBSITE_HELP"
    ELECTION_CONTEXT = "ELECTION_CONTEXT"
    SOURCE_REQUEST = "SOURCE_REQUEST"
    SECURITY = "SECURITY"
    TECHNICAL_AI = "TECHNICAL_AI"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"


class IntentClassifier:
    """
    Lightweight, deterministic rule-based intent classification service for DigiVote AI.
    Executes fast heuristic and regex pattern matching without extra LLM overhead or latency.
    """

    # 1. Security / Malicious / Bypass / Extraction patterns
    SECURITY_PATTERNS = [
        r'\bbypass\b',
        r'\bhack\b',
        r'\bcrack\b',
        r'\bexploit\b',
        r'\boverride\b',
        r'\bignore\s+(all\s+)?(previous|prior|system)\s+(instructions|rules)\b',
        r'\bdisregard\s+(all\s+)?(previous|prior|system)\b',
        r'\b(steal|leak|dump|expose|show|list|give|provide|get|send)\s+(me\s+)?(all\s+)?(voters?|passwords?|hashes?|tokens?|keys?|emails?|credentials?|private\s+data)\b',
        r'\b(voter\s+list|private\s+voter|private\s+data|biometric\s+data|face\s+embeddings?)\b',
        r'\b(ballot\s+box\s+contents?|who\s+voted\s+for\s+whom|secret\s+key|jwt_secret)\b',
        r'\b(cast|submit|change|alter|delete)\s+(my\s+)?vote\b.*?\b(for\s+me|automatically|for\s+candidate)\b',
        r'\b(cast|submit|change|alter|delete)\s+(my\s+)?vote\s+(for\s+me|automatically)\b',
        r'\bvote\s+for\s+me\b',
    ]

    # 2. Technical AI / Architecture patterns
    TECHNICAL_AI_PATTERNS = [
        r'\bhow\s+does\s+(the\s+|your\s+)?(digivote\s+)?(ai\s+assistant|rag|assistant|chatbot|ai)\s+work\b',
        r'\bhow\s+does\s+rag\s+work\b',
        r'\b(rag|retrieval\s+augmented\s+generation)\s+(architecture|pipeline|flow|process)\b',
        r'\b(pinecone|embedding|vector\s+database|gemini|generative\s+ai)\s+(work|architecture|pipeline)\b',
        r'\bexplain\s+(the\s+|your\s+|this\s+)?(ai|rag|assistant)\s+(system\s+)?(architecture|workflow|pipeline|system)\b',
        r'\bwhat\s+tech(nology)?\s+stack\s+(powers|runs)\s+(the\s+|your\s+)?(ai|assistant)\b',
    ]

    # 3. Source / Citation request patterns
    SOURCE_REQUEST_PATTERNS = [
        r'\bwhat\s+(sources?|references?|docs?|documents?)\s+did\s+you\s+use\b',
        r'\bwhere\s+did\s+(this|that|your)\s+(answer|information|data)\s+come\s+from\b',
        r'\bcite\s+(your\s+)?sources?\b',
        r'\bwhat\s+is\s+the\s+source\b',
        r'\bwhich\s+(page|document|manual|guide|pdf)\s+(is\s+that|did\s+that\s+come\s+from)\b',
        r'\bshow\s+(me\s+)?(the\s+)?sources?\b',
    ]

    # 4. Election-specific context patterns (eligibility, status, voting now, election questions)
    ELECTION_CONTEXT_PATTERNS = [
        r'\bam\s+i\s+eligible\b',
        r'\bcan\s+i\s+vote\s+(now|today|already)?\b',
        r'\bhave\s+i\s+(already\s+)?voted\b',
        r'\bis\s+(the\s+)?election\s+(open|active|closed|running|live)\b',
        r'\bwhen\s+does\s+(the\s+)?election\s+(start|end|close|open)\b',
        r'\bwho\s+are\s+the\s+candidates\b',
        r'\bwhat\s+candidates\s+are\s+running\b',
        r'\bmy\s+eligibility\b',
        r'\bmy\s+voting\s+status\b',
        r'\bmy\s+verification\s+status\b',
        r'\bhow\s+many\s+voters\s+(are\s+registered|in\s+this\s+election)\b',
        r'\bwho\s+should\s+i\s+vote\s+for\b',
        r'\bwhich\s+candidate\s+(is\s+best|should\s+i\s+pick|to\s+choose)\b',
    ]

    # 5. Out of scope patterns (general knowledge, irrelevant queries)
    OUT_OF_SCOPE_PATTERNS = [
        r'\b(weather|temperature|forecast|rain|cloudy|sunny)\b',
        r'\b(tell\s+me\s+a\s+joke|make\s+me\s+laugh|funny\s+story)\b',
        r'\b(recipe|cook|baking|dinner|cake|pizza)\b',
        r'\b(movie|cinema|actor|hollywood|song|lyrics|singer|album)\b',
        r'\b(football|basketball|soccer|cricket|tennis|world\s+cup|nba|premier\s+league)\b',
        r'\b(crypto|bitcoin|ethereum|stock\s+market|forex)\b',
        r'\b(capital\s+of|highest\s+mountain|distance\s+to\s+mars)\b',
        r'\bwrite\s+a\s+poem\b',
        r'\bwho\s+is\s+president\s+of\s+(the\s+united\s+states|france|germany|india|china)\b',
    ]

    # 6. Website Help patterns (how-to guides, platform navigation, features)
    WEBSITE_HELP_PATTERNS = [
        r'\bhow\s+do\s+i\s+(vote|login|log\s+in|sign\s+in|register|verify|cast)\b',
        r'\bhow\s+do\s+i\s+(create|setup|schedule)\s+an?\s+election\b',
        r'\bhow\s+do\s+i\s+(upload|import|add)\s+voters\b',
        r'\bhow\s+do\s+i\s+(see|view|check)\s+results\b',
        r'\bhow\s+to\b',
        r'\bwhat\s+is\s+digivote\b',
        r'\bhow\s+does\s+face\s+verification\s+work\b',
        r'\bhow\s+does\s+otp\s+work\b',
        r'\bwhat\s+are\s+the\s+steps\s+to\b',
        r'\bwhere\s+is\s+the\s+dashboard\b',
        r'\bguide\b',
        r'\bhelp\b',
        r'\btutorial\b',
        r'\binstructions?\b',
    ]

    @classmethod
    def classify(cls, query: str, election_id: Optional[str] = None) -> str:
        """
        Classify the query deterministically into one of the 6 standard intent types.

        :param query: The user query string.
        :param election_id: Optional election UUID string if currently scoped.
        :return: One of IntentType string constants.
        """
        cleaned = query.strip().lower()
        if not cleaned:
            return IntentType.WEBSITE_HELP

        # Check 1: Security violations or prompt injections
        for pattern in cls.SECURITY_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return IntentType.SECURITY

        # Check 2: Technical AI architecture questions
        for pattern in cls.TECHNICAL_AI_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return IntentType.TECHNICAL_AI

        # Check 3: Source / citation questions
        for pattern in cls.SOURCE_REQUEST_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return IntentType.SOURCE_REQUEST

        # Check 4: Out-of-scope queries (weather, jokes, unrelated trivia)
        # Note: only classify as OUT_OF_SCOPE if it doesn't mention DigiVote, voting, election, ballot, etc.
        has_voting_keywords = bool(re.search(
            r'\b(digivote|vote|voting|ballot|election|candidate|voter|otp|verification)\b',
            cleaned,
            re.IGNORECASE
        ))

        for pattern in cls.OUT_OF_SCOPE_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE) and not has_voting_keywords:
                return IntentType.OUT_OF_SCOPE

        # Check 5: Election-specific context (or if election_id is provided and query relates to live status)
        for pattern in cls.ELECTION_CONTEXT_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return IntentType.ELECTION_CONTEXT

        if election_id:
            # If scoped to an election and query asks specific election-state queries
            if re.search(r'\b(status|eligible|candidate|open|close|start|end|cast|voted)\b', cleaned, re.IGNORECASE):
                return IntentType.ELECTION_CONTEXT

        # Check 6: Website Help & operational queries
        for pattern in cls.WEBSITE_HELP_PATTERNS:
            if re.search(pattern, cleaned, re.IGNORECASE):
                return IntentType.WEBSITE_HELP

        # Fallback: if scoped to an election, default to ELECTION_CONTEXT, else WEBSITE_HELP
        if election_id:
            return IntentType.ELECTION_CONTEXT

        return IntentType.WEBSITE_HELP
