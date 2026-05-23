"""
Workflow Signal Handlers — Production Grade
===========================================
Automatically triggers workflows on model save events:

  - on_create: When a new record is created
  - on_update: When a record is updated
  - stage_change: When status/stage field changes (deal, lead, quote, task)
  - on_task_complete: When a task, call, or meeting is marked complete

Usage:
  - Signals are automatically connected via apps.py
  - Tracks field changes to detect stage_change triggers
  - Uses thread-local storage to preserve old values across signal handlers
"""

import logging
from .context import _state

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .dispatcher import dispatch_event

logger = logging.getLogger(__name__)

# Models watched for workflow triggers
WATCHED_MODELS = {
    ('leads', 'lead'): 'lead',
    ('contacts', 'contact'): 'contact',
    ('contacts', 'account'): 'account',
    ('deals', 'deal'): 'deal',
    ('deals', 'product'): 'product',
    ('tasks', 'task'): 'task',
    ('calls', 'call'): 'call',
    ('activities', 'meeting'): 'meeting',
    ('quotes', 'quote'): 'quote',
    ('invoices', 'invoice'): 'invoice',
    ('projects', 'project'): 'project',
}

# Fields that trigger stage_change workflows
STAGE_FIELDS = {
    'deal': 'stage',
    'lead': 'status',
    'task': 'status',
    'quote': 'status',
    'project': 'status',
    'call': 'call_status',
    'meeting': 'status',
}

# Fields that trigger task completion workflows
COMPLETION_STATUSES = {'completed', 'done', 'finished', 'closed'}


@receiver(pre_save)
def capture_previous_values(sender, instance, **kwargs):
    """
    Capture previous field values before save.
    Used to detect stage/status changes and other field modifications.
    """
    app_label = sender._meta.app_label
    model_name = sender._meta.model_name
    module = _module_for(sender)
    
    if not module or not instance.pk:
        return

    tracked = {}
    fields_to_track = []
    
    # Add stage/status fields
    stage_field = STAGE_FIELDS.get(model_name)
    if stage_field:
        fields_to_track.append(stage_field)
    
    # Add other important fields for tracking
    if model_name == 'lead':
        fields_to_track.extend(['status', 'score', 'assigned_to_id'])
    if model_name == 'deal':
        fields_to_track.extend(['stage', 'value', 'owner_id'])
    if model_name == 'task':
        fields_to_track.extend(['status', 'priority', 'assigned_to_id', 'outcome', 'lead_id', 'task_type'])

    if model_name == 'quote':
        fields_to_track.extend(['status', 'amount', 'valid_until'])
    if model_name == 'contact':
        fields_to_track.extend(['status', 'owner_id'])
    if model_name == 'call':
        fields_to_track.extend(['call_status', 'outcome', 'duration', 'lead_id'])
    if model_name == 'meeting':
        fields_to_track.extend(['status', 'meeting_type', 'object_id'])
    
    if not fields_to_track:
        return

    try:
        old = sender.objects.only(*fields_to_track).get(pk=instance.pk)
        for field in fields_to_track:
            old_val = getattr(old, field, None)
            new_val = getattr(instance, field, None)
            tracked[f'old_{field}'] = old_val
            tracked[f'new_{field}'] = new_val
    except sender.DoesNotExist:
        return

    if tracked:
        logger.info(f"[WorkflowSignals] Captured values for {module}:{instance.pk}: {tracked}")
        setattr(_state, _state_key(sender, instance.pk), tracked)


@receiver(post_save)
def emit_workflow_events(sender, instance, created, **kwargs):
    """
    Emit workflow trigger events after save.
    Handles on_create, on_update, stage_change, and on_task_complete triggers.
    """
    from django.db import transaction
    
    module = _module_for(sender)
    if not module:
        return

    key = _state_key(sender, instance.pk)
    previous = getattr(_state, key, {})
    if hasattr(_state, key):
        delattr(_state, key)

    def do_dispatch():
        try:
            # Get chain_id from thread-local if this save was triggered by another workflow
            parent_chain_id = getattr(_state, 'chain_id', None)

            # Trigger on_create event
            if created:
                logger.info(f"[WorkflowSignals] Detected create for {module}:{instance.pk}")
                
                if module == 'meeting':
                    from django.contrib.contenttypes.models import ContentType
                    from leads.models import Lead
                    from tasks.models import Task
                    
                    lead_ct = ContentType.objects.get_for_model(Lead)
                    if hasattr(instance, 'content_type') and instance.content_type == lead_ct:
                        lead_id = instance.object_id
                        meeting_types = ['meeting', 'discovery_meeting', 'demo_meeting', 'proposal_meeting']
                        updated_count = Task.objects.filter(
                            lead_id=lead_id,
                            task_type__in=meeting_types,
                            is_active=True
                        ).update(status='completed', outcome='success', is_active=False)
                        logger.info(f"[WorkflowSignals] Auto-completed {updated_count} previous meeting tasks for lead {lead_id}")
                        
                dispatch_event(module, 'on_create', instance, parent_chain_id=parent_chain_id)
                return

            # Trigger on_update event
            dispatch_event(module, 'on_update', instance, previous, parent_chain_id=parent_chain_id)

            # Trigger stage_change when relevant field changes
            stage_field = STAGE_FIELDS.get(module)
            if stage_field:
                old_val = previous.get(f'old_{stage_field}')
                new_val = previous.get(f'new_{stage_field}')
                if old_val != new_val:
                    logger.info(f"[WorkflowSignals] Detected stage change for {module}:{instance.pk} from {old_val} to {new_val}")
                    dispatch_event(
                        module,
                        'stage_change',
                        instance,
                        {
                            'field': stage_field,
                            'old_value': old_val,
                            'new_value': new_val,
                        },
                        parent_chain_id=parent_chain_id
                    )

            # Trigger on_task_complete when task/call/meeting is completed
            if module in {'task', 'call', 'meeting'}:
                status_field = STAGE_FIELDS.get(module, 'status')
                old_status = previous.get(f'old_{status_field}', '')
                new_status = previous.get(f'new_{status_field}', '')
                
                if old_status not in COMPLETION_STATUSES and new_status in COMPLETION_STATUSES:
                    logger.info(f"[WorkflowSignals] Detected task completion for {module}:{instance.pk}")
                    dispatch_event(module, 'on_task_complete', instance, previous, parent_chain_id=parent_chain_id)
                    
                    # Update Contact status if meeting is successful/interested
                    if module == 'task' and instance.task_type == 'meeting' and instance.outcome == 'success' and instance.contact:
                        instance.contact.status = 'qualified'
                        instance.contact.save(update_fields=['status'])
                        logger.info(f"[WorkflowSignals] Updated Contact {instance.contact.id} status to qualified")
                    
                    # Automatically convert Lead on meeting success
                    if module == 'task' and instance.task_type == 'meeting' and instance.outcome == 'success' and instance.lead:
                        from workflows.services import convert_lead
                        convert_lead(instance.lead, create_deal=False)
                        logger.info(f"[WorkflowSignals] Automatically converted Lead {instance.lead.id} on meeting success")
                    
                    # NEW: Run config-driven workflow rules
                    if module == 'task':
                        from workflows.engine import execute_workflow_rules
                        actions = execute_workflow_rules(instance, chain_id=parent_chain_id)
                        logger.info(f"[WorkflowSignals] Executed workflow rules for task {instance.pk}: {actions}")
                    
                    # Chain to next workflow (task-driven automation)
                    _trigger_dependent_workflows(instance, previous, parent_chain_id=parent_chain_id)
        except Exception as exc:
            logger.error(
                "[WorkflowSignals] failed for module=%s instance_id=%s: %s",
                module,
                instance.pk,
                exc,
                exc_info=True
            )

    transaction.on_commit(do_dispatch)



def _trigger_dependent_workflows(instance, previous, parent_chain_id=None):
    """
    Trigger dependent workflows based on task completion.
    For example: When "Initial Call" task completes → create "Follow-up Call" task.
    """
    from tasks.models import Task
    
    if not isinstance(instance, Task):
        return
    
    # Get the linked record (lead, contact, deal, etc.)
    linked_record = None
    linked_module = None

    if hasattr(instance, 'lead') and instance.lead:
        linked_record = instance.lead
        linked_module = 'lead'
    elif hasattr(instance, 'deal') and instance.deal:
        linked_record = instance.deal
        linked_module = 'deal'
    elif hasattr(instance, 'contact') and instance.contact:
        linked_record = instance.contact
        linked_module = 'contact'
    elif hasattr(instance, 'related_to') and instance.related_to:
        linked_record = instance.related_to
        linked_module = getattr(linked_record._meta, 'model_name', None)
    elif hasattr(instance, 'content_type') and instance.object_id:
        # Fallback for GFK if related_to is not yet cached/loaded
        try:
            linked_record = instance.related_to
            linked_module = getattr(linked_record._meta, 'model_name', None)
        except Exception:
            return
    else:
        return
    
    if linked_record:
        # Trigger workflows on the linked record with on_task_complete trigger
        logger.info(f"[WorkflowSignals] Chaining task completion to linked {linked_module}:{linked_record.pk}")
        dispatch_event(
            linked_module,
            'on_task_complete',
            linked_record,
            {
                'source_id': instance.pk,
                'source_type': instance.__class__.__name__.lower(),
                'status': getattr(instance, 'status', getattr(instance, 'call_status', 'completed')),
                'outcome': getattr(instance, 'outcome', None),
            },
            parent_chain_id=parent_chain_id
        )


def _module_for(sender):
    """Map model to module name for workflow triggers."""
    return WATCHED_MODELS.get((sender._meta.app_label, sender._meta.model_name))


def _state_key(sender, pk):
    """Generate a unique key for thread-local storage."""
    return f"{sender._meta.label_lower}:{pk}"
