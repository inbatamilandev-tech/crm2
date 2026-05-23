"""
Tasks Celery Jobs
==================
- reconcile_lead_tasks: sync Lead status ↔ Task steps
- escalate_overdue_tasks: SLA enforcement — escalate overdue tasks
"""
import logging
from django.db import models
from django.utils import timezone
from celery import shared_task
from leads.models import Lead
from tasks.models import Task, ActivityLog

logger = logging.getLogger(__name__)

try:
    from leads.constants import STATUS_TO_STEP
except ImportError:
    STATUS_TO_STEP = {}


@shared_task
def reconcile_lead_tasks():
    """Runs every 5 minutes to ensure Lead status and Task steps are in sync."""
    # Use prefetch_related to avoid N+1 queries when checking for active tasks
    leads = Lead.objects.exclude(status__in=['won', 'lost']).prefetch_related(
        models.Prefetch('tasks', queryset=Task.objects.filter(is_active=True), to_attr='active_tasks')
    )

    for lead in leads:
        expected_step = STATUS_TO_STEP.get(lead.status)
        task = lead.active_tasks[0] if lead.active_tasks else None

        if not task:
            logger.warning(f"[Recovery] Recreating missing task for Lead:{lead.id}")
            Task.objects.create(
                lead=lead,
                task_type='follow_up',
                title="Master Task: Recovery",
                current_step=expected_step,
                status='in_progress',
            )
        elif expected_step and task.current_step != expected_step:
            logger.warning(
                f"[Recovery] Fixing mismatch for Lead:{lead.id}. "
                f"{task.current_step} → {expected_step}"
            )
            task.current_step = expected_step
            task.save(update_fields=['current_step'])


@shared_task
def escalate_overdue_tasks():
    """
    SLA Enforcement — runs periodically (e.g., every 30 min).

    For every overdue task:
    1. Escalate priority (low→medium, medium→high)
    2. Create ActivityLog entry
    3. (Optional) Send notification — placeholder for email/WS
    """
    now = timezone.now()

    overdue_tasks = Task.objects.filter(
        due_date__lt=now,
        status__in=['not_started', 'pending', 'in_progress'],
        is_active=True,
    ).select_related('assigned_to', 'lead')

    escalated = 0
    priority_ladder = {'low': 'medium', 'medium': 'high', 'high': 'high'}

    for task in overdue_tasks:
        new_priority = priority_ladder.get(task.priority, task.priority)
        changed = new_priority != task.priority

        if changed:
            old_priority = task.priority
            task.priority = new_priority
            task.save(update_fields=['priority', 'updated_at'])
            escalated += 1

            try:
                ActivityLog.objects.create(
                    task=task,
                    action_type='updated',
                    old_value={'priority': old_priority, 'reason': 'overdue_escalation'},
                    new_value={'priority': new_priority, 'overdue': True},
                    user=None,
                )
            except Exception as exc:
                logger.error("[SLA] ActivityLog failed for task %s: %s", task.pk, exc)

            # Placeholder: send WebSocket notification
            _notify_overdue(task)

    logger.info("[SLA] Escalated %d overdue tasks.", escalated)
    return escalated


def _notify_overdue(task):
    """Send a broadcast notification for overdue task escalation."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'global_notifications',
                {
                    'type': 'send_notification',
                    'message': {
                        'action': 'overdue_escalated',
                        'task_id': task.pk,
                        'title': task.title,
                        'new_priority': task.priority,
                        'assigned_to': task.assigned_to.username if task.assigned_to else None,
                    }
                }
            )
    except Exception:
        pass  # WebSocket broadcast is best-effort


@shared_task
def escalate_missing_deals():
    """
    SLA Enforcement for Deal Creation — runs periodically.
    If deal_required=True for > 48 hours, create a high-priority task.
    """
    from datetime import timedelta
    now = timezone.now()
    cutoff = now - timedelta(hours=48)
    
    stale_leads = Lead.objects.filter(
        deal_required=True,
        deal_required_at__lt=cutoff
    ).select_related('assigned_to')
    
    escalated_count = 0
    for lead in stale_leads:
        # 1. Idempotency check: don't create multiple escalation tasks
        task_title = f"🚨 URGENT: Missing Deal for {lead.name or lead.id}"
        existing = Task.objects.filter(lead=lead, title=task_title, is_active=True).exists()
        
        if not existing:
            new_task = Task.objects.create(
                lead=lead,
                task_type='proposal',
                title=task_title,
                priority='high',
                due_date=now + timedelta(hours=4),
                assigned_to=lead.assigned_to,
                status='not_started'
            )
            escalated_count += 1
            
            # 2. Log Activity
            try:
                ActivityLog.objects.create(
                    task=new_task,
                    action_type='created',
                    new_value={'reason': 'deal_creation_sla_breach'},
                    user=None
                )
            except Exception as exc:
                logger.error("[SLA] ActivityLog failed for lead %s escalation: %s", lead.pk, exc)
            
            # 3. Notify
            _notify_escalation(new_task)

    logger.info("[SLA] Escalated %d leads with missing deals.", escalated_count)
    return escalated_count


def _notify_escalation(task):
    """Send a broadcast notification for deal creation escalation."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'global_notifications',
                {
                    'type': 'send_notification',
                    'message': {
                        'action': 'deal_sla_escalated',
                        'lead_id': task.lead.id if task.lead else None,
                        'task_id': task.pk,
                        'message': f"Deal creation SLA breached for {task.lead.name if task.lead else task.pk}",
                    }
                }
            )
    except Exception:
        pass
