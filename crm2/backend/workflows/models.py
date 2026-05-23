"""
Workflow Models — Production Grade
====================================
Supports:
  - Multiple trigger events (create / update / delete / stage_changed)
  - AND / OR condition logic
  - Multiple action types with smart assignment strategies
  - Delayed (async) task creation via Celery
  - Task-driven automation (on_task_complete)
  - Debouncing & idempotency
  - Activity logging for audit trails
"""

from django.db import models
from django.conf import settings


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------
class Workflow(models.Model):
    MODULE_CHOICES = [
        ('lead', 'Lead'),
        ('deal', 'Deal'),
        ('account', 'Account'),
        ('task', 'Task'),
        ('call', 'Call'),
        ('meeting', 'Meeting'),
        ('contact', 'Contact'),
        ('product', 'Product'),
        ('quote', 'Quote'),
        ('invoice', 'Invoice'),
        ('project', 'Project'),
        ('case', 'Support Case'),
    ]

    TRIGGER_CHOICES = [
        ('on_create', 'On Create'),
        ('on_update', 'On Update'),
        ('stage_change', 'Stage Change'),
        ('on_task_complete', 'On Task Complete'),
        # Backward-compatible aliases for older saved workflows.
        ('create', 'On Create (legacy)'),
        ('update', 'On Update (legacy)'),
        ('delete', 'On Delete (legacy)'),
        ('stage_changed', 'Stage Changed (legacy)'),
        ('status_changed', 'Status Changed (legacy)'),
    ]

    CONDITION_LOGIC_CHOICES = [
        ('AND', 'All conditions must match (AND)'),
        ('OR',  'Any condition must match (OR)'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
    ]

    name             = models.CharField(max_length=255)
    description      = models.TextField(blank=True, default='')
    module           = models.CharField(max_length=50, choices=MODULE_CHOICES)
    trigger_event    = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    condition_logic  = models.CharField(
        max_length=3,
        choices=CONDITION_LOGIC_CHOICES,
        default='AND',
        help_text="How multiple conditions are combined."
    )
    is_active        = models.BooleanField(default=True)
    
    # Versioning & Audit
    status             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    parent_workflow    = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')
    version            = models.PositiveIntegerField(default=1)
    is_active_version  = models.BooleanField(default=True)
    published_at       = models.DateTimeField(null=True, blank=True)
    created_by         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_workflows')

    debounce_minutes = models.PositiveIntegerField(
        default=5,
        help_text="Prevent duplicate executions within N minutes for same object."
    )
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['module', 'trigger_event', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} [{self.module}:{self.trigger_event}]"


# ---------------------------------------------------------------------------
# WorkflowCondition
# ---------------------------------------------------------------------------
class WorkflowCondition(models.Model):
    OPERATOR_CHOICES = [
        ('equals',      'Equals (=)'),
        ('not_equals',  'Not Equals (!=)'),
        ('contains',    'Contains'),
        ('not_contains','Does Not Contain'),
        ('gt',          'Greater Than (>)'),
        ('gte',         'Greater Than or Equal (>=)'),
        ('lt',          'Less Than (<)'),
        ('lte',         'Less Than or Equal (<=)'),
        ('starts_with', 'Starts With'),
        ('ends_with',   'Ends With'),
        ('is_empty',    'Is Empty'),
        ('is_not_empty','Is Not Empty'),
    ]

    workflow   = models.ForeignKey(Workflow, related_name='conditions', on_delete=models.CASCADE)
    field_name = models.CharField(
        max_length=255,
        help_text="Dot-notation field path, e.g. 'status', 'value', 'contact.company'"
    )
    operator   = models.CharField(max_length=50, choices=OPERATOR_CHOICES, default='equals')
    value      = models.CharField(max_length=512, blank=True, default='')
    order      = models.PositiveIntegerField(default=0, help_text="Evaluation order (lower = first)")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.field_name} {self.operator} '{self.value}'"


# ---------------------------------------------------------------------------
# WorkflowAction
# ---------------------------------------------------------------------------
class WorkflowAction(models.Model):
    ACTION_TYPE_CHOICES = [
        ('create_task',        'Create Task'),
        ('create_call',        'Create Call'),
        ('create_meeting',     'Create Meeting'),
        ('update_record',      'Update Record'),
        ('create_quote',       'Create Quote'),
        ('create_invoice',     'Create Invoice'),
        ('send_notification',  'Send Notification'),
        ('assign_owner',       'Assign Owner'),
        ('close_open_tasks',   'Close Open Tasks'),
        # Backward-compatible aliases for older saved workflows.
        ('assign_user',        'Assign User (legacy)'),
        ('send_email',         'Send Email (legacy)'),
        ('update_field',       'Update Field (legacy)'),
        ('create_project',     'Create Project (legacy)'),
        ('generate_invoice',   'Generate Invoice (legacy)'),
    ]

    ASSIGNMENT_TYPE_CHOICES = [
        ('owner',        'Record Owner / Assigned To'),
        ('round_robin',  'Round Robin (distribute equally)'),
        ('manager',      'Team Manager'),
        ('specific_user','Specific User'),
    ]

    PRIORITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('urgent',   'Urgent'),
    ]

    workflow        = models.ForeignKey(Workflow, related_name='actions', on_delete=models.CASCADE)
    action_type     = models.CharField(max_length=50, choices=ACTION_TYPE_CHOICES)
    
    # DAG / Tree Architecture
    parent_action   = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='child_actions')
    branch_label    = models.CharField(max_length=255, blank=True, default='')
    position_x      = models.FloatField(default=0.0)
    position_y      = models.FloatField(default=0.0)
    order           = models.PositiveIntegerField(default=0, help_text="Execution order (lower = first)")

    # ── Task creation fields ───────────────────────────────────────────────
    assignment_type = models.CharField(
        max_length=30,
        choices=ASSIGNMENT_TYPE_CHOICES,
        default='owner',
        help_text="How to assign the created task."
    )
    specific_user   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='workflow_actions',
        help_text="Used when assignment_type='specific_user'."
    )
    delay_days      = models.PositiveIntegerField(
        default=0,
        help_text="0 = immediate. N > 0 = schedule via Celery after N days."
    )
    priority        = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
    )

    # ── Generic action data (used for send_email, update_field, etc.) ─────
    action_data     = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "For create_task: {title, description, due_days_override}. "
            "For send_email: {to_field, subject, body}. "
            "For update_field: {field, value}."
        )
    )

    # ── Compensation / Rollback logic ──────────────────────────────────────
    compensation_action = models.JSONField(
        default=dict, 
        blank=True, 
        help_text="JSON config for rollback if subsequent actions in chain fail."
    )

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"[{self.workflow.name}] {self.action_type} ({self.assignment_type})"


# ---------------------------------------------------------------------------
# WorkflowLog — one row per workflow execution
# ---------------------------------------------------------------------------
class WorkflowLog(models.Model):
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('partial', 'Partial (some actions failed)'),
        ('failure', 'Failure'),
        ('skipped', 'Skipped (conditions not met)'),
    ]

    workflow      = models.ForeignKey(Workflow, related_name='logs', on_delete=models.CASCADE)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES)
    executed_at   = models.DateTimeField(auto_now_add=True)
    trigger_event = models.CharField(max_length=50, blank=True, default='')
    object_id     = models.CharField(max_length=50, blank=True, default='')
    message       = models.TextField(blank=True, default='')
    execution_key = models.CharField(max_length=255, blank=True, default='', db_index=True)
    chain_id      = models.CharField(max_length=100, blank=True, default='', db_index=True)

    class Meta:
        ordering = ['-executed_at']

    def __str__(self):
        return f"{self.workflow.name} — {self.status} @ {self.executed_at:%Y-%m-%d %H:%M}"


class WorkflowActionExecution(models.Model):
    """
    Idempotency ledger for workflow side effects.
    Prevents duplicate actions from being executed.
    """
    action = models.ForeignKey(WorkflowAction, related_name='executions', on_delete=models.CASCADE)
    workflow = models.ForeignKey(Workflow, related_name='action_executions', on_delete=models.CASCADE)
    object_key = models.CharField(max_length=255, db_index=True)
    fingerprint = models.CharField(max_length=255, db_index=True)
    created_object = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('action', 'fingerprint')]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workflow', 'action', 'created_at']),
        ]

    def __str__(self):
        return f"{self.workflow_id}:{self.action_id}:{self.fingerprint}"


class WorkflowDebounce(models.Model):
    """
    Debounce ledger to prevent duplicate workflow execution.
    Tracks the last execution of a workflow for a specific object.
    """
    workflow = models.ForeignKey(Workflow, related_name='debounce_records', on_delete=models.CASCADE)
    object_key = models.CharField(max_length=255, db_index=True)  # "module:object_id"
    execution_key = models.CharField(max_length=255, db_index=True)
    last_executed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('workflow', 'object_key')]
        ordering = ['-last_executed_at']

    def __str__(self):
        return f"{self.workflow.name} @ {self.object_key}"


# ---------------------------------------------------------------------------
# RoundRobinState — tracks the round-robin pointer per workflow action
# ---------------------------------------------------------------------------
class RoundRobinState(models.Model):
    """
    Persists which sales rep should receive the NEXT round-robin task.
    One row per workflow action with assignment_type='round_robin'.
    """
    action       = models.OneToOneField(
        WorkflowAction,
        on_delete=models.CASCADE,
        related_name='round_robin_state'
    )
    last_user_id = models.IntegerField(
        null=True, blank=True,
        help_text="PK of the last user who was assigned a task via round-robin."
    )
    updated_at   = models.DateTimeField(auto_now=True)

# ---------------------------------------------------------------------------
# WorkflowRule — Dynamic Task Outcome Rules (JSON-driven)
# ---------------------------------------------------------------------------
class WorkflowRule(models.Model):
    """
    Simplified, config-driven rules for Task outcomes.
    Acts as the single source of truth for post-task automation.
    """
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    # Trigger conditions
    trigger_task_type = models.CharField(max_length=50, help_text="e.g. 'call', 'meeting'")
    trigger_outcome = models.CharField(max_length=50, help_text="e.g. 'interested', 'no_response'")

    # Dynamic actions
    actions = models.JSONField(
        default=list,
        help_text="List of actions: [{'type': 'update_lead', 'status': 'qualified'}, ...]"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.trigger_task_type}:{self.trigger_outcome})"


class WorkflowExecutionLog(models.Model):
    """
    Production-grade failure handling: logs every execution of a WorkflowRule.
    """
    task = models.ForeignKey('tasks.Task', on_delete=models.CASCADE, related_name='execution_logs')
    rule = models.ForeignKey(WorkflowRule, on_delete=models.SET_NULL, null=True, related_name='execution_logs')
    status = models.CharField(max_length=20, choices=[('success', 'Success'), ('failed', 'Failed')])
    error_message = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log for Task {self.task_id} - {self.status}"


# ---------------------------------------------------------------------------
# Advanced Automation Tracking (Refactoring V2)
# ---------------------------------------------------------------------------

class WorkflowEvent(models.Model):
    """
    Deduplication ledger for triggered events.
    Ensures a specific business event (e.g., lead created with key X)
    is only processed once by the workflow engine.
    """
    event_key = models.CharField(max_length=255, unique=True, db_index=True)
    module = models.CharField(max_length=50)
    trigger = models.CharField(max_length=50)
    object_id = models.CharField(max_length=50)
    
    # Ordering Control (Requirement 1)
    version = models.PositiveIntegerField(default=1, help_text="Object version at time of event")
    source_timestamp = models.DateTimeField(null=True, blank=True, help_text="Original event timestamp")
    
    processed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_key} (v{self.version})"


class WorkflowChain(models.Model):
    """
    Tracks execution chains to prevent infinite loops.
    A chain starts with an initial event and grows as actions trigger new workflows.
    """
    chain_id = models.CharField(max_length=100, unique=True, db_index=True)
    root_event_key = models.CharField(max_length=255)
    parent_chain_id = models.CharField(max_length=100, blank=True, null=True)
    depth = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Chain {self.chain_id} (Depth: {self.depth})"


class WorkflowActionLog(models.Model):
    """
    Granular logging for each action in a workflow execution.
    Supports tracking partial failures and providing audit trails for retries.
    """
    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failure', 'Failure'),
        ('retrying', 'Retrying'),
        ('skipped', 'Skipped'),
    ]
    workflow_log  = models.ForeignKey(WorkflowLog, related_name='action_logs', on_delete=models.CASCADE)
    action        = models.ForeignKey(WorkflowAction, on_delete=models.CASCADE)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES)
    message       = models.TextField(blank=True, default='')
    error_details = models.TextField(blank=True, default='')
    retry_count   = models.PositiveIntegerField(default=0)
    
    # Idempotency & Compensation (Requirement 2 & 4)
    idempotency_key = models.CharField(max_length=255, blank=True, default='', db_index=True)
    is_compensated  = models.BooleanField(default=False)
    
    executed_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['executed_at']
