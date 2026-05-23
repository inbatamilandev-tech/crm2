from django.contrib import admin
from .models import Lead

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ('contact', 'status', 'assigned_to', 'score', 'created_at')
    list_filter = ('status',)
