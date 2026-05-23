from django.db import models
from django.conf import settings
from leads.models import Lead

class Task(models.Model):
    """
    SINGLE MASTER TASK: Replaces separate Call and Meeting tables.
    """
    TYPE_CHOICES = (
        ('call', 'Call 📞'),
        ('meeting', 'Meeting 🧑💼'),
        ('discovery_meeting', 'Discovery Meeting'),
        ('demo_meeting', 'Demo Meeting'),
        ('proposal_meeting', 'Proposal Meeting'),
        ('follow_up', 'Follow-Up'),
        ('proposal', 'Proposal'),
        ('todo', 'To-Do'),
        ('email', 'Email'),
    )


    STATUS_CHOICES = (
        ('pending', 'Pending'),          # backend-generated initial state
        ('not_started', 'Not Started'),   # frontend default
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )

    OUTCOME_CHOICES = (
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('no_response', 'No Response'),
        ('interested', 'Interested'),
        ('not_interested', 'Not Interested'),
        ('follow_up', 'Follow-up Required'),
        ('connected', 'Connected'),
        ('sent', 'Proposal Sent'),
        ('negotiating', 'Customer Negotiating'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('revision', 'Need Revision'),
        ('Proposal/Price Quote', 'Proposal/Price Quote'),
        ('Negotiation/Review', 'Negotiation/Review'),
        ('Closed Won', 'Closed Won'),
        ('Closed Lost', 'Closed Lost'),
        ('Closed Lost to Competition', 'Closed Lost to Competition'),
        ('Qualification', 'Qualification'),
        ('Needs Analysis', 'Needs Analysis'),
        ('Value Proposition', 'Value Proposition'),
        ('Identify Decision Makers', 'Identify Decision Makers'),
    )

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="tasks", null=True, blank=True)
    contact = models.ForeignKey('contacts.Contact', on_delete=models.CASCADE, related_name="tasks", null=True, blank=True)
    account = models.ForeignKey('contacts.Account', on_delete=models.CASCADE, related_name="tasks", null=True, blank=True)
    deal = models.ForeignKey('deals.Deal', on_delete=models.CASCADE, related_name="tasks", null=True, blank=True)
    campaign = models.ForeignKey('marketing.Campaign', on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    milestone = models.ForeignKey('projects.Milestone', on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    
    task_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='todo')
    title = models.CharField(max_length=255)
    current_step = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='not_started')
    is_active = models.BooleanField(default=True)
    
    # Polymorphic fields for Call/Meeting data
    call_duration = models.IntegerField(null=True, blank=True, help_text="Duration in seconds (if Call)")
    call_outcome = models.CharField(max_length=50, null=True, blank=True)
    meeting_start = models.DateTimeField(null=True, blank=True)
    meeting_end = models.DateTimeField(null=True, blank=True)
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    outcome = models.CharField(max_length=50, choices=OUTCOME_CHOICES, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True, null=True)

    # Legacy fields to prevent complete breakage
    description = models.TextField(blank=True, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    due_date = models.DateTimeField(null=True, blank=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    active_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="active_tasks")
    source_object_id = models.CharField(max_length=100, blank=True, null=True)
    next_action = models.CharField(max_length=255, blank=True, null=True)
    steps = models.JSONField(default=dict, blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["lead", "task_type"],
                condition=models.Q(is_active=True),
                name="unique_active_task_per_stage_per_lead"
            )
        ]

    def save(self, *args, **kwargs):
        # Enforce: lead is mandatory for all meeting-related tasks
        meeting_types = ['meeting', 'discovery_meeting', 'demo_meeting', 'proposal_meeting']
        if self.task_type in meeting_types and not self.lead:
            from django.core.exceptions import ValidationError
            raise ValidationError("A lead is mandatory for all meeting-related tasks.")

        # 1. Enforce: status = completed → is_active = False, completed_at = now()

        if self.status == 'completed':
            self.is_active = False
            if not self.completed_at:
                from django.utils import timezone
                self.completed_at = timezone.now()
            
            # 2. Outcome Handling (MANDATORY)
            if not self.outcome:
                # In a real enterprise app, we might raise a ValidationError here.
                # For now, we'll default to 'no_response' if it's a call, or 'success' if meeting
                if self.task_type == 'call':
                    self.outcome = 'no_response'
                else:
                    self.outcome = 'success'
        else:
            self.is_active = True
            # If status was changed back from completed, clear completed_at
            # (Note: signals will handle the logging of this change)
            if self.status != 'completed' and self.completed_at:
                self.completed_at = None

        # 3. Handle update_fields: ensure is_active and completed_at are persisted
        if 'update_fields' in kwargs and kwargs['update_fields'] is not None:
            update_fields = set(kwargs['update_fields'])
            update_fields.add('is_active')
            update_fields.add('completed_at')
            kwargs['update_fields'] = list(update_fields)

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class ActivityLog(models.Model):
    ACTION_CHOICES = (
        ('status_change', 'Status Change'),
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('completed', 'Completed'),
        ('outcome_change', 'Outcome Change'),
    )
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="activity_logs")
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    old_value = models.JSONField(default=dict, blank=True, null=True)
    new_value = models.JSONField(default=dict, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.action_type} for Task {self.task.id}"
