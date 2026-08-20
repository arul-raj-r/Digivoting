from django.contrib import admin
from .models import Election, Candidate, VoteReceipt, Vote

@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'start_date', 'end_date', 'created_at')
    list_filter = ('status',)
    search_fields = ('title',)

@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ('name', 'party_name', 'election', 'constituency', 'is_approved')
    list_filter = ('is_approved', 'election', 'constituency')
    search_fields = ('name', 'party_name')

@admin.register(VoteReceipt)
class VoteReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'election', 'voter', 'timestamp')
    search_fields = ('receipt_number', 'voter__user__username')

@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('election', 'constituency', 'candidate', 'created_at')
    list_filter = ('election', 'constituency', 'candidate')
