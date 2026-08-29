from django.contrib import admin
from .models import Election, ElectionPhase

@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ('name', 'election_type', 'status', 'start_datetime', 'end_datetime', 'created_at')
    list_filter = ('status', 'election_type')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ElectionPhase)
class ElectionPhaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'election', 'status', 'start_datetime', 'end_datetime')
    list_filter = ('status', 'election')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
