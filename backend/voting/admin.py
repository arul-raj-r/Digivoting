from django.contrib import admin
from .models import VoteTransaction, Vote, VoteReceipt

@admin.register(VoteTransaction)
class VoteTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_hash', 'election', 'created_at')
    list_filter = ('election',)
    search_fields = ('transaction_hash',)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ('election', 'constituency', 'candidate', 'created_at')
    list_filter = ('election', 'constituency', 'candidate')
    search_fields = ('constituency__name', 'candidate__name')


@admin.register(VoteReceipt)
class VoteReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'election', 'voter', 'timestamp')
    list_filter = ('election',)
    search_fields = ('receipt_number', 'voter__user__email', 'voter__user__username')
