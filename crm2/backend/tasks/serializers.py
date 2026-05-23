from rest_framework import serializers
from django.utils import timezone
from .models import Task, ActivityLog


class TaskSerializer(serializers.ModelSerializer):
    lead_name = serializers.CharField(source='lead.name', read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)
    deal_name = serializers.CharField(source='deal.title', read_only=True)
    stage = serializers.CharField(source='lead.status', read_only=True)
    owner = serializers.SerializerMethodField(read_only=True)
    is_overdue = serializers.SerializerMethodField(read_only=True)
    related_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'task_type', 'description', 'status', 'priority',
            'due_date', 'assigned_to', 'owner', 'lead', 'contact', 'account', 'deal',
            'lead_name', 'contact_name', 'account_name', 'deal_name',
            'related_name', 'stage', 'current_step', 'steps', 'next_action',
            'source_object_id', 'is_active', 'created_at', 'updated_at',
            'call_duration', 'call_outcome', 'meeting_start', 'meeting_end', 'notes',
            # New workflow fields
            'outcome', 'completed_at', 'metadata', 'is_overdue',
        ]
        read_only_fields = ['source_object_id', 'created_at', 'updated_at', 'completed_at']

    def get_related_name(self, obj):
        if obj.lead: return obj.lead.name
        if obj.contact: return obj.contact.name
        if obj.deal: return obj.deal.title
        if obj.account: return obj.account.name
        return None

    def get_owner(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None

    def get_is_overdue(self, obj):
        if obj.due_date and obj.status != 'completed':
            return timezone.now() > obj.due_date
        return False

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Normalise legacy 'pending' to 'not_started' for frontend
        if ret.get('status') == 'pending':
            ret['status'] = 'not_started'
        return ret

    def validate_status(self, value):
        valid = [s[0] for s in Task.STATUS_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Allowed: {', '.join(valid)}"
            )
        return value

    def validate_task_type(self, value):
        valid = [t[0] for t in Task.TYPE_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid task_type '{value}'. Allowed: {', '.join(valid)}"
            )
        return value

    def validate_outcome(self, value):
        if value is None:
            return value
        valid = [o[0] for o in Task.OUTCOME_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(
                f"Invalid outcome '{value}'. Allowed: {', '.join(valid)}"
            )
        return value

    def validate(self, data):
        # Outcome is optional even when completing a task, as the model's 
        # save() method provides a default if none is provided.
        # This allows simple status updates from Kanban/Table.
        return data


class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id', 'task', 'task_title', 'action_type', 'old_value',
            'new_value', 'timestamp', 'user', 'user_name',
        ]
        read_only_fields = ['timestamp']

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'System'
