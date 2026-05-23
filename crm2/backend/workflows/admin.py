from django.contrib import admin

from .models import (
    RoundRobinState,
    Workflow,
    WorkflowAction,
    WorkflowActionExecution,
    WorkflowCondition,
    WorkflowLog,
)


class WorkflowConditionInline(admin.TabularInline):
    model = WorkflowCondition
    extra = 0


class WorkflowActionInline(admin.TabularInline):
    model = WorkflowAction
    extra = 0


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ('name', 'module', 'trigger_event', 'is_active', 'updated_at')
    list_filter = ('module', 'trigger_event', 'is_active')
    search_fields = ('name', 'description')
    inlines = [WorkflowConditionInline, WorkflowActionInline]


@admin.register(WorkflowLog)
class WorkflowLogAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'status', 'trigger_event', 'object_id', 'executed_at')
    list_filter = ('status', 'trigger_event')
    search_fields = ('message', 'object_id', 'execution_key')


admin.site.register(WorkflowActionExecution)
admin.site.register(RoundRobinState)
