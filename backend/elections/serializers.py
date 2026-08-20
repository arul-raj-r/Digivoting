from rest_framework import serializers
from elections.models import Election, Candidate, VoteReceipt, Vote

class ElectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Election
        fields = ('id', 'title', 'description', 'start_date', 'end_date', 'status', 'created_at', 'updated_at')

class CandidateSerializer(serializers.ModelSerializer):
    constituency_name = serializers.CharField(source='constituency.name', read_only=True)
    election_title = serializers.CharField(source='election.title', read_only=True)

    class Meta:
        model = Candidate
        fields = ('id', 'election', 'election_title', 'constituency', 'constituency_name', 'name', 'party_name', 'party_logo_url', 'photo_url', 'bio', 'is_approved', 'created_at', 'updated_at')

class CandidateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ('election', 'constituency', 'name', 'party_name', 'party_logo_url', 'photo_url', 'bio')
