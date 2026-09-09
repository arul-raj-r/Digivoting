from rest_framework import serializers
from elections.models import Election, Candidate, EligibleVoter
from voting.models import Ballot, ElectionResult, CandidateResult, BallotConfirmationToken


class BallotCandidateSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Candidate
        fields = ('id', 'full_name', 'party_or_affiliation', 'bio', 'photo_url', 'display_order')

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class BallotViewSerializer(serializers.Serializer):
    election = serializers.SerializerMethodField()
    candidates = serializers.SerializerMethodField()
    voter = serializers.SerializerMethodField()

    def get_election(self, obj):
        election = obj['election']
        return {
            'id': str(election.id),
            'title': election.title,
            'description': election.description,
            'election_type': election.election_type,
            'status': election.status,
            'start_datetime': election.start_datetime,
            'end_datetime': election.end_datetime,
        }

    def get_candidates(self, obj):
        candidates = obj['candidates']
        request = self.context.get('request')
        return BallotCandidateSerializer(candidates, many=True, context={'request': request}).data

    def get_voter(self, obj):
        voter = obj['voter']
        return {
            'id': str(voter.id),
            'email': voter.email,
            'has_voted': voter.has_voted,
        }


class BallotConfirmRequestSerializer(serializers.Serializer):
    candidate_id = serializers.UUIDField(required=True)


class BallotSubmitRequestSerializer(serializers.Serializer):
    candidate_id = serializers.UUIDField(required=True)
    confirmation_token = serializers.CharField(required=False, allow_blank=True, max_length=255)
    authorization_token = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        token = attrs.get('authorization_token') or attrs.get('confirmation_token')
        if not token:
            raise serializers.ValidationError({"token": "Either authorization_token or confirmation_token is required."})
        attrs['confirmation_token'] = token
        return attrs


class CandidateResultSerializer(serializers.ModelSerializer):
    candidate_id = serializers.UUIDField(source='candidate.id')
    full_name = serializers.CharField(source='candidate.full_name')
    party_or_affiliation = serializers.CharField(source='candidate.party_or_affiliation')
    photo_url = serializers.SerializerMethodField()
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = CandidateResult
        fields = ('candidate_id', 'full_name', 'party_or_affiliation', 'photo_url', 'vote_count', 'percentage')

    def get_photo_url(self, obj):
        if obj.candidate.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.candidate.photo.url)
            return obj.candidate.photo.url
        return None

    def get_percentage(self, obj):
        total = obj.election_result.total_ballots_cast
        if total and total > 0:
            return round((obj.vote_count / total) * 100, 2)
        return 0.0


class ElectionResultSerializer(serializers.ModelSerializer):
    results = serializers.SerializerMethodField()
    turnout = serializers.SerializerMethodField()
    winner = serializers.SerializerMethodField()
    tie = serializers.SerializerMethodField()
    tied_candidates = serializers.SerializerMethodField()
    small_electorate_disclaimer = serializers.SerializerMethodField()
    preview = serializers.BooleanField(default=False)

    class Meta:
        model = ElectionResult
        fields = (
            'id', 'election_id', 'computed_at', 'total_ballots_cast',
            'integrity_verified', 'is_published', 'published_at',
            'results', 'turnout', 'winner', 'tie', 'tied_candidates',
            'small_electorate_disclaimer', 'preview'
        )

    def get_results(self, obj):
        request = self.context.get('request')
        candidate_results = obj.candidate_results.all().order_by('-vote_count', 'candidate__display_order')
        return CandidateResultSerializer(candidate_results, many=True, context={'request': request}).data

    def get_turnout(self, obj):
        total_eligible = obj.election.eligible_voters.count()
        total_voted = obj.total_ballots_cast
        pct = round((total_voted / total_eligible * 100), 2) if total_eligible > 0 else 0.0
        return {
            'total_eligible_voters': total_eligible,
            'total_ballots_cast': total_voted,
            'turnout_percentage': pct
        }

    def _get_top_results(self, obj):
        if not hasattr(self, '_top_results_cache'):
            results = list(obj.candidate_results.all().order_by('-vote_count'))
            self._top_results_cache = results
        return self._top_results_cache

    def get_tie(self, obj):
        top_results = self._get_top_results(obj)
        if len(top_results) > 1 and obj.total_ballots_cast > 0:
            return top_results[0].vote_count == top_results[1].vote_count
        return False

    def get_tied_candidates(self, obj):
        top_results = self._get_top_results(obj)
        if len(top_results) > 1 and obj.total_ballots_cast > 0 and top_results[0].vote_count == top_results[1].vote_count:
            top_count = top_results[0].vote_count
            request = self.context.get('request')
            tied = [r for r in top_results if r.vote_count == top_count]
            return CandidateResultSerializer(tied, many=True, context={'request': request}).data
        return []

    def get_winner(self, obj):
        if self.get_tie(obj) or obj.total_ballots_cast == 0:
            return None
        top_results = self._get_top_results(obj)
        if top_results:
            request = self.context.get('request')
            return CandidateResultSerializer(top_results[0], context={'request': request}).data
        return None

    def get_small_electorate_disclaimer(self, obj):
        return obj.total_ballots_cast < 10
