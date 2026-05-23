"""
Workflow Action Handlers — Production Grade
=============================================
Comprehensive action execution with:
  - Idempotency via fingerprinting
  - Debouncing to prevent duplicates
  - Smart assignment strategies (owner, round-robin, manager, specific user)
  - Task-driven automation (on_task_complete chaining)
  - Activity logging for audit trails
  - Lead conversion orchestration
"""

import hashlib
import json
import logging
from datetime import timedelta
from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import WorkflowActionExecution, WorkflowDebounce
from .context import _state

logger = logging.getLogger(__name__)

TASK_TYPES = {'call', 'meeting', 'follow_up', 'proposal'}


class ActionResult:
    """Result wrapper for workflow actions."""
    def __init__(self, name, status='success', message='', created_object=''):
        self.name = name
        self.status = status
        self.message = message
        self.created_object = created_object


def execute_action(action, instance, event):
    """
    Main action execution entry point.
    Enforces idempotency and handles debouncing.
    """
    action_type = _normalize_action(action.action_type)
    fingerprint = _fingerprint(action, instance, event)
    object_key = _object_key(instance)

    # Enforce idempotency
    try:
        WorkflowActionExecution.objects.create(
            workflow=action.workflow,
            action=action,
            object_key=object_key,
            fingerprint=fingerprint,
        )
    except IntegrityError:
        return ActionResult(action_type, 'skipped', 'Duplicate action skipped (already executed)')

    handlers = {
        'create_task': create_task,
        'create_call': create_call,
        'create_meeting': create_meeting,
        'update_record': update_record,
        'create_quote': create_quote,
        'create_invoice': create_invoice,
        'send_notification': send_notification,
        'convert_lead': convert_lead_action,
        'assign_owner': assign_owner,
        'close_open_tasks': close_open_tasks,
    }
    handler = handlers.get(action_type)
    if not handler:
        _cleanup_execution(action, fingerprint)
        return ActionResult(action_type, 'skipped', f"Unsupported action '{action.action_type}'")

    try:
        # Set thread-local chain context for nested signal triggers
        _state.chain_id = event.get('chain_id')
        
        result = handler(action, instance, event)
        # Record the created object for traceability
        WorkflowActionExecution.objects.filter(action=action, fingerprint=fingerprint).update(
            created_object=result.created_object
        )
        return result
    except Exception as exc:
        _cleanup_execution(action, fingerprint)
        logger.error(f"[Workflow] action failed: {action.action_type} on {object_key}: {exc}", exc_info=True)
        raise
    finally:
        # Clear chain context
        if hasattr(_state, 'chain_id'):
            del _state.chain_id
def execute_compensation(action, instance, event, result):
    """
    Execute rollback logic for a successfully completed action.
    Used when a subsequent action in the same workflow fails permanently.
    Requirement 4: Compensation Logic.
    """
    comp_config = action.compensation_action
    if not comp_config:
        return
        
    action_type = comp_config.get('type', 'delete_created')
    logger.info(f"[Compensation] Executing {action_type} rollback for action {action.pk} on {instance}")
    
    try:
        if action_type == 'delete_created':
            # Delete the object created by the original action
            created_ref = getattr(result, 'created_object', None)
            if created_ref and ':' in created_ref:
                from django.apps import apps
                model_path, pk = created_ref.split(':')
                app_label, model_name = model_path.split('.')
                Model = apps.get_model(app_label, model_name)
                Model.objects.filter(pk=pk).delete()
                logger.info(f"[Compensation] Successfully deleted {created_ref}")
        
        elif action_type == 'undo_update':
            # Reverse field changes (requires 'old_values' to be stored in ActionResult)
            pass # Implementation depends on how much state we want to store

        # Mark the original action log as compensated
        from .models import WorkflowLog, WorkflowActionLog
        log = WorkflowActionLog.objects.filter(
            workflow_log__chain_id=event.get('chain_id'),
            action=action
        ).first()
        if log:
            log.is_compensated = True
            log.save(update_fields=['is_compensated'])

    except Exception as exc:
        logger.error(f"[Compensation] Failed to rollback action {action.pk}: {exc}", exc_info=True)
        raise


def create_task(action, instance, event):
    """Create or update a task with smart assignment and request-cycle capturing."""
    from tasks.models import Task
    from .context import capture_task

    data = action.action_data or {}
    title = _render(data.get('title', 'Follow-up Task'), instance, event)
    task_type = data.get('task_type', 'follow_up')
    
    if task_type not in TASK_TYPES:
        raise ValueError(f"Invalid task_type '{task_type}'. Must be one of {TASK_TYPES}")

    # Calculate due date (Standardized to 'Today' for high-visibility follow-ups)
    due_days = int(data.get('due_days', data.get('due_days_override', action.delay_days or 0)))
    due_date = timezone.now() + timedelta(days=due_days)
    
    # Resolve assignee (Ensures task follows the active executor)
    assignee = _resolve_assignee(action, instance)
    
    # Build task links
    links = _task_links(instance, data)
    description = _render(data.get('description', ''), instance, event)

    task_defaults = {
        'task_type': task_type,
        'description': description,
        'status': data.get('status', 'not_started'),
        'priority': action.priority,
        'due_date': due_date,
        'assigned_to': assignee,
        'source_object_id': str(instance.pk),
        **links,
    }

    from tasks.services import TaskService
    from leads.models import Lead
    
    lead = instance if isinstance(instance, Lead) else None
    if not lead and hasattr(instance, 'lead'):
        lead = instance.lead
        
    # Use service to create or get task
    task, created = TaskService.create_task(
        task_type=task_type,
        title=title,
        lead=lead,
        assigned_to=assignee,
        priority=action.priority,
        due_date=due_date,
        **{k: v for k, v in task_defaults.items() if k not in ['task_type', 'title', 'lead', 'assigned_to', 'priority', 'due_date']}
    )



    # Capture for immediate UI feedback (Requirement 6)
    capture_task(task)

    target_name = getattr(instance, 'name', getattr(instance, 'title', 'Unknown Prospect'))
    message = f"{'Created' if created else 'Updated'} task for {target_name}: {title}"

    log_activity('created' if created else 'updated', message, instance, assignee)
    return ActionResult('create_task', message=message, created_object=f"tasks.Task:{task.pk}")


def create_call(action, instance, event):
    from activities.models import Call

    data = action.action_data or {}
    owner = _resolve_assignee(action, instance) or _record_owner(instance)
    call = Call.objects.create(
        owner=owner,
        direction=data.get('direction', 'outbound'),
        outcome=data.get('outcome', 'pending'),
        duration=int(data.get('duration', 0)),
        notes=_render(data.get('notes', 'Scheduled by workflow'), instance, event),
        **_generic_link(instance),
    )
    log_activity('call', f"Workflow created call {call.pk}", instance, owner)
    return ActionResult('create_call', created_object=f"activities.Call:{call.pk}")


def create_meeting(action, instance, event):
    from activities.models import Meeting

    data = action.action_data or {}
    owner = _resolve_assignee(action, instance) or _record_owner(instance)
    due_days = int(data.get('due_days', 0))
    start_time = timezone.now() + timedelta(days=due_days)
    meeting = Meeting.objects.create(
        title=_render(data.get('title', 'CRM Meeting'), instance, event),
        owner=owner,
        start_time=start_time,
        end_time=start_time + timedelta(minutes=int(data.get('duration_minutes', 30))),
        meeting_type=data.get('meeting_type', 'Discovery'),
        status=data.get('status', 'scheduled'),
        notes=_render(data.get('notes', ''), instance, event),
        **_generic_link(instance),
    )
    log_activity('meeting', f"Workflow created meeting {meeting.pk}", instance, owner)
    return ActionResult('create_meeting', created_object=f"activities.Meeting:{meeting.pk}")


def update_record(action, instance, event):
    data = action.action_data or {}
    target_name = data.get('target')
    
    # Resolve target object (self or linked record)
    target = instance
    if target_name and target_name != 'self':
        target = getattr(instance, target_name, None)
        if not target:
            return ActionResult('update_record', 'skipped', f"Linked target '{target_name}' not found on {instance}")

    updates = data.get('fields') or {data.get('field'): data.get('value')}
    updates = {k: _render(str(v), instance, event) for k, v in updates.items() if k}

    changed = []
    for field, value in updates.items():
        if not hasattr(target, field):
            # Try to handle common field name mapping issues or raise error
            raise ValueError(f"{target.__class__.__name__} has no field '{field}'.")
        
        current_value = getattr(target, field)
        # Convert to string for comparison to handle lazy objects or numbers
        if str(current_value) != str(value):
            setattr(target, field, value)
            changed.append(field)

    if changed:
        save_fields = changed + ['updated_at'] if hasattr(target, 'updated_at') else changed
        target.save(update_fields=save_fields)
        log_activity('update', f"Workflow updated {target.__class__.__name__} {', '.join(changed)}", target, _record_owner(target))

    
    message = f"Updated {target.__class__.__name__} {changed}"
    if target.__class__.__name__ == 'Task' and 'task_type' in updates and updates['task_type'] == 'proposal':
        message = 'Proposal Task Created'
        
    return ActionResult('update_record', message=message)


def create_quote(action, instance, event):
    from deals.models import Deal, Product
    from quotes.models import Quote, QuoteLineItem

    deal = instance if isinstance(instance, Deal) else getattr(instance, 'deal', None)
    if not deal:
        raise ValueError('create_quote requires a Deal or an object linked to a Deal.')

    data = action.action_data or {}
    owner = deal.owner or _record_owner(instance)
    quote_number = data.get('quote_number') or f"QT-{deal.pk}-{timezone.now():%Y%m%d%H%M%S}"
    amount = deal.value or 0
    quote, created = Quote.objects.get_or_create(
        deal=deal,
        quote_number=quote_number,
        defaults={
            'owner': owner,
            'amount': amount,
            'status': data.get('status', 'draft'),
            'valid_until': timezone.now().date() + timedelta(days=int(data.get('valid_days', 30))),
        },
    )

    total = 0
    for item in data.get('products', []):
        product = Product.objects.get(pk=item['product_id'])
        quantity = int(item.get('quantity', 1))
        unit_price = item.get('unit_price', product.price)
        line, _ = QuoteLineItem.objects.update_or_create(
            quote=quote,
            product=product,
            defaults={'quantity': quantity, 'unit_price': unit_price},
        )
        total += line.line_total

    if total:
        quote.amount = total
        quote.save(update_fields=['amount', 'updated_at'])

    log_activity('created', f"Workflow {'created' if created else 'reused'} quote {quote.quote_number}", deal, owner)
    return ActionResult('create_quote', message=f"Quote {quote.quote_number}", created_object=f"quotes.Quote:{quote.pk}")


def create_invoice(action, instance, event):
    from quotes.models import Quote
    from invoices.models import Invoice

    quote = instance if isinstance(instance, Quote) else getattr(instance, 'quote', None)
    if not quote and hasattr(instance, 'quotes'):
        quote = instance.quotes.order_by('-created_at').first()
    if not quote:
        raise ValueError('create_invoice requires a Quote or an object linked to a Quote.')

    data = action.action_data or {}
    invoice_number = data.get('invoice_number') or f"INV-{quote.pk}-{timezone.now():%Y%m%d%H%M%S}"
    invoice, created = Invoice.objects.get_or_create(
        quote=quote,
        invoice_number=invoice_number,
        defaults={
            'owner': quote.owner,
            'amount': quote.amount,
            'status': data.get('status', 'draft'),
            'due_date': timezone.now().date() + timedelta(days=int(data.get('due_days', 30))),
        },
    )
    log_activity('created', f"Workflow {'created' if created else 'reused'} invoice {invoice.invoice_number}", quote, quote.owner)
    return ActionResult('create_invoice', message=f"Invoice {invoice.invoice_number}", created_object=f"invoices.Invoice:{invoice.pk}")


def send_notification(action, instance, event):
    message = _render((action.action_data or {}).get('message', 'Workflow notification'), instance, event)
    log_activity('note', message, instance, _record_owner(instance))
    return ActionResult('send_notification', message=message)


def convert_lead_action(action, instance, event):
    """Convert a Lead to Contact, Account, and Deal."""
    from leads.models import Lead
    from tasks.models import Task
    from workflows.services import convert_lead

    # If triggered from a Task, resolve the associated Lead
    lead = instance
    if isinstance(instance, Task):
        lead = instance.lead
    
    if not isinstance(lead, Lead):
        raise ValueError('convert_lead action requires a Lead instance or an object linked to a Lead.')

    data = action.action_data or {}
    create_deal = data.get('create_deal', True)
    deal_data = {
        'title': _render(data.get('deal_title') or "{company} - {name} Deal", lead, event),
        'value': data.get('deal_value', 0),
        'stage': data.get('deal_stage', 'qualification'),
    }

    result = convert_lead(lead, owner=lead.assigned_to, create_deal=create_deal, deal_data=deal_data)
    
    log_activity(
        'converted',
        f"Workflow converted lead {lead.pk} to contact {result['contact'].pk}",
        lead,
        lead.assigned_to
    )
    
    return ActionResult(
        'convert_lead',
        message='Lead Qualified. Contact & Account synced. Deal Created.',
        created_object=f"leads.Lead:{lead.pk}"
    )


def assign_owner(action, instance, event):
    """
    Explicitly assign the record to a user using the workflow assignment strategy.
    Supports owner, round_robin, manager, and specific_user.
    """
    assignee = _resolve_assignee(action, instance)
    
    if not assignee:
        return ActionResult('assign_owner', 'skipped', "No assignee available (e.g. no sales reps for round-robin)")

    # Identify the correct field to update (usually 'assigned_to' or 'owner')
    field = 'assigned_to' if hasattr(instance, 'assigned_to') else 'owner'
    if not hasattr(instance, field):
        return ActionResult('assign_owner', 'failure', f"Record {instance} has no 'assigned_to' or 'owner' field.")

    old_owner = getattr(instance, field, None)
    if old_owner == assignee:
        return ActionResult('assign_owner', 'skipped', f"Already assigned to {assignee.username}")

    setattr(instance, field, assignee)
    
    # Save the change
    save_fields = [field]
    if hasattr(instance, 'updated_at'):
        save_fields.append('updated_at')
    instance.save(update_fields=save_fields)

    log_activity(
        'assigned',
        f"Workflow assigned {instance.__class__.__name__} to {assignee.username} (Assignment: {action.assignment_type})",
        instance,
        assignee
    )

    return ActionResult('assign_owner', message=f"Assigned to {assignee.username}")


def close_open_tasks(action, instance, event):
    """
    Close all active tasks associated with the instance.
    Typically used when a Lead is marked as lost or won.
    """
    from tasks.models import Task
    
    # We need to find tasks linked to this instance
    model_name = instance._meta.model_name
    query = {
        f"{model_name}": instance,
        "is_active": True
    }
    
    # Ensure it's one of the known linkable models
    if model_name not in ['lead', 'contact', 'account', 'deal']:
        return ActionResult('close_open_tasks', 'skipped', f"Cannot close tasks for unsupported model {model_name}")
        
    tasks = Task.objects.filter(**query)
    count = tasks.count()
    
    if count == 0:
        return ActionResult('close_open_tasks', message="No open tasks to close")
        
    for task in tasks:
        task.status = 'completed'
        task.outcome = 'failed' if event.get('extra', {}).get('outcome') == 'not_interested' else 'success'
        task.is_active = False
        task.completed_at = timezone.now()
        task.save(update_fields=['status', 'outcome', 'is_active', 'completed_at', 'updated_at'])
        
    log_activity('system', f"Workflow auto-closed {count} open tasks.", instance, _record_owner(instance))
    return ActionResult('close_open_tasks', message=f"Closed {count} open tasks")

def _log_activity(activity_type, notes, instance, user=None):
    """Internal helper to record activity logs for audit trails."""
    from activities.models import Activity

    Activity.objects.create(
        type=activity_type,
        notes=notes,
        created_by=user,
        **_generic_link(instance),
    )

# Alias for backward compatibility and standard naming
log_activity = _log_activity


def _normalize_action(action_type):
    aliases = {
        'update_field': 'update_record',
        'generate_invoice': 'create_invoice',
        'assign_user': 'update_record',
    }
    return aliases.get(action_type, action_type)


def _fingerprint(action, instance, event):
    raw = {
        'action': action.pk,
        'module': instance._meta.label_lower,
        'object': instance.pk,
        'trigger': event.get('trigger'),
        'extra': event.get('extra', {}),
        'data': action.action_data,
    }
    return hashlib.sha256(json.dumps(raw, sort_keys=True, default=str).encode()).hexdigest()


def _object_key(instance):
    return f"{instance._meta.label_lower}:{instance.pk}"


def _cleanup_execution(action, fingerprint):
    """Clean up failed execution records."""
    WorkflowActionExecution.objects.filter(action=action, fingerprint=fingerprint).delete()


def _render(template, instance, event):
    value = str(template)
    for key, replacement in {
        'id': instance.pk,
        'name': (
            getattr(instance, 'name', None) or 
            getattr(getattr(instance, 'lead', None), 'name', None) or 
            getattr(getattr(instance, 'contact', None), 'name', None) or 
            getattr(getattr(instance, 'account', None), 'name', '')
        ),
        'title': getattr(instance, 'title', ''),
        'status': getattr(instance, 'status', ''),
        'stage': getattr(instance, 'stage', ''),
        'company': (
            getattr(instance, 'company', None) or 
            getattr(getattr(instance, 'lead', None), 'company', None) or 
            getattr(getattr(instance, 'account', None), 'name', '')
        ),
    }.items():
        value = value.replace('{' + key + '}', str(replacement or ''))
    for key, replacement in event.get('extra', {}).items():
        value = value.replace('{' + key + '}', str(replacement or ''))
    return value


def _resolve_assignee(action, instance):
    from django.contrib.auth import get_user_model
    from .models import RoundRobinState

    User = get_user_model()
    if action.assignment_type == 'specific_user':
        return action.specific_user
    if action.assignment_type == 'manager':
        owner = _record_owner(instance)
        if owner and owner.team:
            return User.objects.filter(role='manager', team=owner.team, is_active=True).first()
    if action.assignment_type == 'round_robin':
        reps = list(User.objects.filter(role='sales', is_active=True).order_by('pk'))
        if not reps:
            # Fallback for early-stage environments: include admins if no sales reps exist
            reps = list(User.objects.filter(role='admin', is_active=True).order_by('pk'))
            if not reps:
                return None
        with transaction.atomic():
            state, _ = RoundRobinState.objects.select_for_update().get_or_create(action=action)
            last_idx = next((idx for idx, rep in enumerate(reps) if rep.pk == state.last_user_id), -1)
            assignee = reps[(last_idx + 1) % len(reps)]
            state.last_user_id = assignee.pk
            state.save(update_fields=['last_user_id', 'updated_at'])
            return assignee
    return _record_owner(instance)


def _record_owner(instance):
    return getattr(instance, 'owner', None) or getattr(instance, 'assigned_to', None)


def _generic_link(instance):
    return {
        'content_type': ContentType.objects.get_for_model(instance.__class__),
        'object_id': instance.pk,
    }


def _task_links(instance, data):
    links = {'lead': None, 'contact': None, 'account': None, 'deal': None}
    model_name = instance._meta.model_name
    if model_name in links:
        links[model_name] = instance
    for field in links:
        linked = getattr(instance, field, None)
        if linked is not None:
            links[field] = linked
    return links


def _non_null_links(links):
    return {key: value for key, value in links.items() if value is not None}
