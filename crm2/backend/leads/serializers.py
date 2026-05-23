from rest_framework import serializers
from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    # Human-readable assignment info for display (never writable)
    assigned_to_username = serializers.CharField(
        source='assigned_to.username', read_only=True, allow_null=True
    )
    assigned_to_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = '__all__'
        read_only_fields = ['assigned_to', 'created_at', 'updated_at', 'is_deleted', 'deleted_at']

    def get_assigned_to_full_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None
