from rest_framework import serializers
from elections.models import Election, ElectionPhase
from candidates.models import Candidate, ElectionCandidate, PoliticalParty

class ElectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = ('id', 'name', 'description', 'election_type', 'start_datetime', 'end_datetime', 'status', 'created_at', 'updated_at')


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
