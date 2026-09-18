from rest_framework import serializers

MAX_CONVERSATION_HISTORY = 6


class ChatMessageContextSerializer(serializers.Serializer):
    """
    Validates an individual recent conversation turn (untrusted history).
    """
    role = serializers.ChoiceField(
        choices=['user', 'assistant'],
        required=True,
        error_messages={
            'invalid_choice': "Message role must be either 'user' or 'assistant'."
        }
    )
    content = serializers.CharField(
        required=True,
        max_length=2000,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            'required': 'Conversation message content is required.',
            'blank': 'Conversation message content cannot be blank.',
            'max_length': 'Conversation message cannot exceed 2000 characters.'
        }
    )

    def validate_content(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Conversation message content cannot be blank.")
        return cleaned


class AIChatRequestSerializer(serializers.Serializer):
    """
    Serializer for validating AI chat queries and optional conversation context.
    """
    message = serializers.CharField(
        required=True,
        max_length=2000,
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            'required': 'Message field is required.',
            'blank': 'Message cannot be empty or whitespace.',
            'max_length': 'Message cannot exceed 2000 characters.'
        }
    )
    election_id = serializers.UUIDField(
        required=False,
        default=None,
        allow_null=True,
        error_messages={
            'invalid': 'Must be a valid UUID for election_id.'
        }
    )
    conversation = serializers.ListSerializer(
        child=ChatMessageContextSerializer(),
        required=False,
        default=list,
        error_messages={
            'not_a_list': 'Conversation must be a list of message objects.'
        }
    )

    def validate_message(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Message cannot be empty or whitespace.")
        return cleaned

    def validate_conversation(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Conversation must be a list of messages.")
        # Restrict conversation history to safe limit of most recent turns
        if len(value) > MAX_CONVERSATION_HISTORY:
            return value[-MAX_CONVERSATION_HISTORY:]
        return value


class AIChatSourceSerializer(serializers.Serializer):
    """
    Represents a citation source from the RAG knowledge base.
    """
    source = serializers.CharField()
    page = serializers.IntegerField(default=1)


class AIChatResponseSerializer(serializers.Serializer):
    """
    Standard response format for the AI chat endpoint.
    """
    success = serializers.BooleanField(default=True)
    request_id = serializers.UUIDField(required=False)
    answer = serializers.CharField()
    sources = AIChatSourceSerializer(many=True, default=list)
    context_used = serializers.DictField(default=dict)


class AIAssistantFeedbackSerializer(serializers.Serializer):
    """
    Validates user feedback on an AI Assistant response.
    """
    message_id = serializers.UUIDField(
        required=True,
        error_messages={
            'required': 'message_id is required.',
            'invalid': 'message_id must be a valid UUID.'
        }
    )
    rating = serializers.ChoiceField(
        choices=['helpful', 'not_helpful'],
        required=True,
        error_messages={
            'required': 'rating is required.',
            'invalid_choice': "rating must be either 'helpful' or 'not_helpful'."
        }
    )


