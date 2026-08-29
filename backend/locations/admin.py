from django.contrib import admin
from .models import State, District, Constituency, PollingStation

@admin.register(State)
class StateAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')
    search_fields = ('name',)


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ('name', 'state', 'created_at')
    list_filter = ('state',)
    search_fields = ('name',)


@admin.register(Constituency)
class ConstituencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'district', 'created_at')
    list_filter = ('district__state', 'district')
    search_fields = ('name',)


@admin.register(PollingStation)
class PollingStationAdmin(admin.ModelAdmin):
    list_display = ('name', 'constituency', 'created_at')
    list_filter = ('constituency__district__state', 'constituency')
    search_fields = ('name', 'address')
