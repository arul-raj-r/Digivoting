from django.utils import timezone
from rest_framework import serializers
from elections.models import (
    Election,
    ElectionPhase,
    EligibleVoter,
    Candidate as ElectionCandidateModel,
    ElectionVerificationConfig,
    ElectionRules,
    ElectionAuditLog
)
from candidates.models import Candidate, ElectionCandidate, PoliticalParty

class ElectionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer dedicated to election creation (Module 8).
    Takes title, description, and election_type.
    Server strictly sets status='draft' and created_by=request.user.
    """
    title = serializers.CharField(max_length=255, required=True, allow_blank=False, trim_whitespace=True)
    description = serializers.CharField(max_length=2000, required=False, allow_blank=True, allow_null=True)
    organization = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    position_category = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    election_type = serializers.ChoiceField(choices=Election.ELECTION_TYPE_CHOICES, required=True)

    class Meta:
        model = Election
        fields = ('id', 'title', 'description', 'organization', 'position_category', 'election_type', 'status', 'is_locked', 'created_at', 'updated_at')
        read_only_fields = ('id', 'status', 'is_locked', 'created_at', 'updated_at')

    def validate_title(self, value):
        cleaned = value.strip() if value else ''
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty or whitespace only.")
        return cleaned

    def validate_description(self, value):
        if value and len(value) > 2000:
            raise serializers.ValidationError("Description cannot exceed 2000 characters.")
        return value

    def create(self, validated_data):
        # Force status='draft' and associate with the requesting user
        request = self.context.get('request')
        validated_data['status'] = 'draft'
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class ElectionUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for editing election details while in draft/configured/scheduled status.
    Supports:
    - Status transition from 'draft' -> 'configured'
    - Setting start_datetime and end_datetime with ordering validation
    - Status transition from 'configured' -> 'scheduled' with prerequisite gates and dual-point rules validation
    """
    title = serializers.CharField(max_length=255, required=False, allow_blank=False, trim_whitespace=True)
    description = serializers.CharField(max_length=2000, required=False, allow_blank=True, allow_null=True)
    organization = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    position_category = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    election_type = serializers.ChoiceField(choices=Election.ELECTION_TYPE_CHOICES, required=False)
    status = serializers.ChoiceField(choices=Election.STATUS_CHOICES, required=False)
    start_datetime = serializers.DateTimeField(required=False, allow_null=True)
    end_datetime = serializers.DateTimeField(required=False, allow_null=True)

    class Meta:
        model = Election
        fields = ('id', 'title', 'description', 'organization', 'position_category', 'election_type', 'status', 'is_locked', 'start_datetime', 'end_datetime', 'created_at', 'updated_at')
        read_only_fields = ('id', 'is_locked', 'created_at', 'updated_at')

    def validate_title(self, value):
        cleaned = value.strip() if value else ''
        if not cleaned:
            raise serializers.ValidationError("Title cannot be empty or whitespace only.")
        return cleaned

    def validate_description(self, value):
        if value and len(value) > 2000:
            raise serializers.ValidationError("Description cannot exceed 2000 characters.")
        return value

    def validate(self, attrs):
        new_status = attrs.get('status')
        start_datetime = attrs.get('start_datetime', getattr(self.instance, 'start_datetime', None))
        end_datetime = attrs.get('end_datetime', getattr(self.instance, 'end_datetime', None))

        # Validate date ordering if dates are being provided
        if 'start_datetime' in attrs or 'end_datetime' in attrs:
            if start_datetime and end_datetime:
                if start_datetime >= end_datetime:
                    raise serializers.ValidationError({
                        "end_datetime": "Election end datetime must be strictly after the start datetime."
                    })
            if 'start_datetime' in attrs and attrs['start_datetime']:
                if attrs['start_datetime'] <= timezone.now():
                    raise serializers.ValidationError({
                        "start_datetime": "Election start datetime must be scheduled in the future."
                    })

        if self.instance:
            current_status = self.instance.status

            # Gate 1: 'draft' -> 'configured'
            if new_status == 'configured' and current_status == 'draft':
                voters_count = self.instance.eligible_voters.count()
                candidates_count = self.instance.candidates.count()

                if voters_count == 0 and candidates_count == 0:
                    raise serializers.ValidationError({
                        "status": "Cannot mark election as configured. Please add at least one eligible voter and at least one candidate first."
                    })
                if voters_count == 0:
                    raise serializers.ValidationError({
                        "status": "Cannot mark election as configured. Please add at least one eligible voter first."
                    })
                if candidates_count == 0:
                    raise serializers.ValidationError({
                        "status": "Cannot mark election as configured. Please add at least one candidate first."
                    })

            # Gate 2: 'configured' -> 'scheduled'
            if new_status == 'scheduled':
                if current_status == 'draft':
                    raise serializers.ValidationError({
                        "status": "Cannot schedule election while in draft status. Configure eligible voters and candidates first."
                    })

                # Must have start and end datetimes
                if not start_datetime or not end_datetime:
                    raise serializers.ValidationError({
                        "status": "Set a valid start and end date in the future before scheduling this election."
                    })

                if start_datetime <= timezone.now():
                    raise serializers.ValidationError({
                        "start_datetime": "Cannot schedule election: start datetime must be in the future."
                    })

                if start_datetime >= end_datetime:
                    raise serializers.ValidationError({
                        "end_datetime": "Cannot schedule election: end datetime must be after start datetime."
                    })

                # Dual-point check: Re-validate ElectionRules results_visible_at if scheduled visibility is active
                if hasattr(self.instance, 'rules'):
                    rules = self.instance.rules
                    if rules.results_visibility == 'scheduled' and rules.results_visible_at:
                        if rules.results_visible_at <= end_datetime:
                            raise serializers.ValidationError({
                                "status": f"Scheduled results release time ({rules.results_visible_at.strftime('%Y-%m-%d %H:%M')}) must be strictly after the election end time ({end_datetime.strftime('%Y-%m-%d %H:%M')}). Please adjust Election Rules before scheduling."
                            })

        return attrs


class ElectionVerificationConfigSerializer(serializers.ModelSerializer):
    """
    Module 10: Serializer for election-specific verification requirements.
    """
    class Meta:
        model = ElectionVerificationConfig
        fields = ('id', 'election', 'require_email_otp', 'require_webcam_verification', 'require_biometric_verification', 'created_at', 'updated_at')
        read_only_fields = ('id', 'election', 'created_at', 'updated_at')


class ElectionRulesSerializer(serializers.ModelSerializer):
    """
    Module 10: Serializer for election rules and result publication schedule.
    Enforces scheduled results release after election end time.
    """
    class Meta:
        model = ElectionRules
        fields = ('id', 'election', 'results_visibility', 'results_visible_at', 'allow_vote_change', 'created_at', 'updated_at')
        read_only_fields = ('id', 'election', 'created_at', 'updated_at')

    def validate(self, attrs):
        visibility = attrs.get('results_visibility', getattr(self.instance, 'results_visibility', 'manual'))
        results_visible_at = attrs.get('results_visible_at', getattr(self.instance, 'results_visible_at', None))
        election = self.instance.election if self.instance else self.context.get('election')

        if visibility == 'scheduled':
            if not results_visible_at:
                raise serializers.ValidationError({
                    "results_visible_at": "A specific date and time is required when results visibility is set to 'scheduled'."
                })
            
            # If election end_datetime is already known, enforce results_visible_at > end_datetime
            if election and election.end_datetime:
                if results_visible_at <= election.end_datetime:
                    raise serializers.ValidationError({
                        "results_visible_at": "Scheduled results release time must be strictly after the election end time."
                    })
        elif visibility in ['immediate', 'manual']:
            # Clear results_visible_at if not scheduled
            attrs['results_visible_at'] = None

        return attrs



class EligibleVoterSerializer(serializers.ModelSerializer):
    """
    Serializer for Eligible Voter records in an election roll (Module 9).
    """
    user_full_name = serializers.CharField(source='user.full_name', read_only=True)
    is_registered_user = serializers.SerializerMethodField()

    class Meta:
        model = EligibleVoter
        fields = (
            'id', 'election', 'email', 'name', 'student_id', 'mobile_number',
            'user', 'user_full_name', 'is_registered_user',
            'has_voted', 'verification_status', 'verified_at', 'voted_at', 'added_at'
        )
        read_only_fields = ('id', 'election', 'user', 'has_voted', 'verification_status', 'verified_at', 'voted_at', 'added_at')

    def get_is_registered_user(self, obj):
        return bool(obj.user_id)


class EligibleVoterCreateSerializer(serializers.Serializer):
    """
    Serializer for adding a single voter by email, with optional name, student_id, mobile_number.
    """
    email = serializers.EmailField(max_length=255, required=True)
    name = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    student_id = serializers.CharField(max_length=100, required=False, allow_blank=True, allow_null=True)
    mobile_number = serializers.CharField(max_length=30, required=False, allow_blank=True, allow_null=True)

    def validate_email(self, value):
        cleaned = value.strip().lower()
        election = self.context.get('election')
        if election and election.eligible_voters.filter(email=cleaned).exists():
            raise serializers.ValidationError("This email is already registered as an eligible voter for this election.")
        return cleaned

    def validate_student_id(self, value):
        if not value:
            return value
        cleaned = value.strip()
        election = self.context.get('election')
        if election and election.eligible_voters.filter(student_id__iexact=cleaned).exists():
            raise serializers.ValidationError("This Student ID is already registered for this election.")
        return cleaned


class CandidateModelSerializer(serializers.ModelSerializer):
    """
    Serializer for candidate roster in an election (Module 9).
    Includes validation for photo upload type and size (max 5MB).
    """
    photo_url = serializers.SerializerMethodField()
    manifesto = serializers.CharField(source='bio', required=False, allow_blank=True)

    class Meta:
        model = ElectionCandidateModel
        fields = ('id', 'election', 'full_name', 'party_or_affiliation', 'bio', 'manifesto', 'photo', 'photo_url', 'display_order', 'is_active', 'added_at')
        read_only_fields = ('id', 'election', 'added_at')

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def validate_full_name(self, value):
        cleaned = value.strip() if value else ''
        if not cleaned:
            raise serializers.ValidationError("Candidate full name is required.")
        return cleaned

    def validate_bio(self, value):
        if value and len(value) > 1000:
            raise serializers.ValidationError("Candidate biography cannot exceed 1000 characters.")
        return value

    def validate_photo(self, value):
        if value:
            # Validate file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError("Candidate photo exceeds the 5MB maximum size limit.")
            # Validate format
            content_type = getattr(value, 'content_type', '')
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if content_type and content_type.lower() not in allowed_types:
                raise serializers.ValidationError("Candidate photo must be a JPG or PNG image.")
        return value


class CandidateReorderSerializer(serializers.Serializer):
    """
    Serializer for atomic candidate reordering endpoint.
    """
    candidate_ids = serializers.ListField(
        child=serializers.UUIDField(),
        allow_empty=False,
        required=True
    )



class ElectionSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    stopped_by_email = serializers.EmailField(source='stopped_by.email', read_only=True)
    name = serializers.CharField(source='title', read_only=True)

    class Meta:
        model = Election
        fields = (
            'id',
            'title',
            'name',
            'description',
            'organization',
            'position_category',
            'election_type',
            'status',
            'is_locked',
            'created_by',
            'created_by_email',
            'start_datetime',
            'end_datetime',
            'actual_start_at',
            'stopped_at',
            'stop_reason',
            'stopped_by',
            'stopped_by_email',
            'created_at',
            'updated_at'
        )
        read_only_fields = (
            'id', 'status', 'is_locked', 'created_by', 'actual_start_at',
            'stopped_at', 'stop_reason', 'stopped_by', 'created_at', 'updated_at'
        )


class ElectionStartSerializer(serializers.Serializer):
    """
    Module 11: Serializer for manual start control.
    Accepts optional force boolean for early start confirmation.
    """
    force = serializers.BooleanField(required=False, default=False)


class ElectionStopSerializer(serializers.Serializer):
    """
    Module 11: Serializer for emergency stop control.
    Requires reason with minimum length 20 characters.
    """
    reason = serializers.CharField(required=True, min_length=20, trim_whitespace=True)

    def validate_reason(self, value):
        cleaned = value.strip()
        if len(cleaned) < 20:
            raise serializers.ValidationError("Stop reason must be at least 20 characters long.")
        return cleaned


class ElectionAuditLogSerializer(serializers.ModelSerializer):
    """
    Module 11: Serializer for ElectionAuditLog entries.
    """
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = ElectionAuditLog
        fields = ('id', 'election', 'actor', 'actor_email', 'action', 'details', 'ip_address', 'created_at')
        read_only_fields = fields

    def get_actor_email(self, obj):
        return obj.actor.email if obj.actor else "System"


class ElectionMonitoringSerializer(serializers.Serializer):
    """
    Module 11: Serializer for Election Monitoring and Turnout.
    Read-only participation metrics strictly detached from ballot tallies or candidate counts.
    """
    election_id = serializers.UUIDField()
    title = serializers.CharField()
    current_status = serializers.CharField()
    is_locked = serializers.BooleanField()
    start_datetime = serializers.DateTimeField(allow_null=True)
    end_datetime = serializers.DateTimeField(allow_null=True)
    actual_start_at = serializers.DateTimeField(allow_null=True)
    total_eligible_voters = serializers.IntegerField()
    voters_participated = serializers.IntegerField()
    participation_rate = serializers.FloatField()
    time_remaining_seconds = serializers.IntegerField(allow_null=True)


class PoliticalPartySerializer(serializers.ModelSerializer):
    class Meta:
        model = PoliticalParty
        fields = ('id', 'name', 'symbol_tag', 'symbol_url')


class CandidateSerializer(serializers.ModelSerializer):
    party = PoliticalPartySerializer(read_only=True)

    class Meta:
        model = Candidate
        fields = ('id', 'name', 'party', 'bio', 'photo_url', 'created_at', 'updated_at')


class ElectionCandidateSerializer(serializers.ModelSerializer):
    candidate = CandidateSerializer(read_only=True)
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    election_name = serializers.CharField(source='election.name', read_only=True)

    class Meta:
        model = ElectionCandidate
        fields = ('id', 'election', 'election_name', 'candidate', 'constituency', 'constituency_name', 'is_approved')
