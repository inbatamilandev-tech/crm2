from django.contrib import admin
from .models import Activity

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('type', 'related_to', 'created_by', 'created_at')
    list_filter = ('type',)
    search_fields = ('notes',)
