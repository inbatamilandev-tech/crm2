from rest_framework import serializers
from .models import (
    Workflow, WorkflowCondition, WorkflowAction, WorkflowLog, 
    RoundRobinState, WorkflowActionLog, WorkflowEvent, WorkflowChain
)


class WorkflowConditionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WorkflowCondition
        fields = ['id', 'field_name', 'operator', 'value', 'order']


class WorkflowActionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WorkflowAction
        fields = [
            'id', 'action_type', 'order',
            'assignment_type', 'specific_user', 'delay_days', 'priority',
            'action_data', 'parent_action', 'branch_label', 'position_x', 'position_y'
        ]


class WorkflowActionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowActionLog
        fields = [
            'id', 'status', 'message', 'error_details', 
            'retry_count', 'executed_at', 'idempotency_key', 'is_compensated'
        ]


class WorkflowLogSerializer(serializers.ModelSerializer):
    action_logs = WorkflowActionLogSerializer(many=True, read_only=True)
    
    class Meta:
        model       = WorkflowLog
        fields      = [
            'id', 'status', 'trigger_event', 'object_id', 
            'executed_at', 'message', 'execution_key', 'chain_id',
            'action_logs'
        ]
        read_only_fields = fields


class WorkflowEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowEvent
        fields = '__all__'


class WorkflowTraceSerializer(serializers.ModelSerializer):
    executions = serializers.SerializerMethodField()
    events = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowChain
        fields = ['chain_id', 'depth', 'created_at', 'is_active', 'executions', 'events']

    def get_executions(self, obj):
        # Find all logs that belong to this chain (exact match or parent match)
        # Chain IDs are dot-separated like 'root.child.grandchild'
        logs = WorkflowLog.objects.filter(
            chain_id__startswith=obj.chain_id
        ).select_related('workflow').prefetch_related('action_logs__action').order_by('executed_at')
        
        return [{
            'workflow_name': log.workflow.name,
            'status': log.status,
            'trigger': log.trigger_event,
            'object_id': log.object_id,
            'executed_at': log.executed_at,
            'actions': WorkflowActionLogSerializer(log.action_logs.all(), many=True).data
        } for log in logs]

    def get_events(self, obj):
        # Return the root event and any related events if needed
        # For now, just the root event
        events = WorkflowEvent.objects.filter(event_key=obj.root_event_key)
        return WorkflowEventSerializer(events, many=True).data


class WorkflowSerializer(serializers.ModelSerializer):
    conditions = WorkflowConditionSerializer(many=True, required=False)
    actions    = WorkflowActionSerializer(many=True, required=False)
    log_count  = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Workflow
        fields = [
            'id', 'name', 'description', 'module', 'trigger_event',
            'condition_logic', 'is_active', 'status', 'version',
            'is_active_version', 'published_at', 'parent_workflow',
            'created_at', 'updated_at',
            'conditions', 'actions', 'log_count',
        ]

    def get_log_count(self, obj):
        return obj.logs.count()

    # ── Create ──────────────────────────────────────────────────────────────
    def create(self, validated_data):
        conditions_data = validated_data.pop('conditions', [])
        actions_data    = validated_data.pop('actions', [])

        workflow = Workflow.objects.create(**validated_data)

        for cond in conditions_data:
            WorkflowCondition.objects.create(workflow=workflow, **cond)

        for act in actions_data:
            WorkflowAction.objects.create(workflow=workflow, **act)

        return workflow

    # ── Update (full replace of nested objects) ──────────────────────────
    def update(self, instance, validated_data):
        conditions_data = validated_data.pop('conditions', None)
        actions_data    = validated_data.pop('actions', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if conditions_data is not None:
            instance.conditions.all().delete()
            for cond in conditions_data:
                WorkflowCondition.objects.create(workflow=instance, **cond)

        if actions_data is not None:
            instance.actions.all().delete()
            for act in actions_data:
                WorkflowAction.objects.create(workflow=instance, **act)

        return instance
