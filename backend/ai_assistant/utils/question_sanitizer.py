import re


def sanitize_question(text: str) -> str:
    """
    Redacts sensitive user data (passwords, OTP codes, JWT tokens, API keys)
    before questions are stored in unanswered question tracking.

    :param text: Raw user query string.
    :return: Sanitized string with sensitive patterns masked.
    """
    if not text or not isinstance(text, str):
        return ""

    sanitized = text

    # 1. Redact JWT tokens (header.payload.signature)
    sanitized = re.sub(
        r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*',
        '[REDACTED_JWT]',
        sanitized
    )

    # 2. Redact Bearer / API tokens / Passwords (ignore already redacted tags)
    sanitized = re.sub(
        r'(?i)\b(bearer|token|api[_-]?key|secret|password|pwd)\s*(?:is|:|=)?\s*[\'"]?(?!\[REDACTED)([^\s,;]+)',
        r'\1: [REDACTED_SECRET]',
        sanitized
    )

    # 3. Redact explicit OTP codes (e.g. "otp is 123456" or standalone 6 digits in OTP context)
    sanitized = re.sub(
        r'(?i)\b(otp|code|pin|verification\s+code)\s*(?:is|:|=)?\s*(\d{4,8})\b',
        r'\1: [REDACTED_OTP]',
        sanitized
    )

    # 4. Redact standalone 6-digit numbers often representing OTPs
    sanitized = re.sub(
        r'\b\d{6}\b',
        '[REDACTED_CODE]',
        sanitized
    )

    return sanitized.strip()


def normalize_question(text: str) -> str:
    """
    Produces a canonical normalized form of a user question for aggregation and analytics.
    Deterministic text normalization without external LLM calls.

    :param text: Input question string.
    :return: Canonical normalized string.
    """
    if not text or not isinstance(text, str):
        return ""

    # 1. Lowercase
    cleaned = text.strip().lower()

    # 2. Strip punctuation
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)

    # 3. Standardize common intent prefixes
    cleaned = re.sub(r'\b(how\s+can\s+i|how\s+do\s+i|how\s+should\s+i|how\s+to)\b', 'how to', cleaned)
    cleaned = re.sub(r'\b(can\s+i|am\s+i\s+able\s+to|is\s+it\s+possible\s+to)\b', 'can i', cleaned)
    cleaned = re.sub(r'\b(put\s+my\s+vote|give\s+my\s+vote|submit\s+my\s+vote|cast\s+my\s+vote|cast\s+my\s+ballot|cast\s+a\s+vote)\b', 'cast vote', cleaned)
    cleaned = re.sub(r'\b(see\s+results|check\s+results|view\s+the\s+results)\b', 'view results', cleaned)

    # 4. Collapse whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    return cleaned
