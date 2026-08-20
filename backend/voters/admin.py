from django.contrib import admin
from .models import Constituency, Voter, VoterIDCard

@admin.register(Constituency)
class ConstituencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'created_at')
    search_fields = ('name',)

@admin.register(Voter)
class VoterAdmin(admin.ModelAdmin):
    list_display = ('user', 'voter_id_number', 'constituency', 'is_verified', 'verification_date')
    list_filter = ('is_verified', 'constituency')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'voter_id_number')

@admin.register(VoterIDCard)
class VoterIDCardAdmin(admin.ModelAdmin):
    list_display = ('card_number', 'voter', 'full_name', 'status', 'issued_date')
    list_filter = ('status', 'constituency')
    search_fields = ('card_number', 'full_name', 'voter__voter_id_number')
