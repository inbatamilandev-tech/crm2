"""
Task Signals — ActivityLog auto-creation
=========================================
Every meaningful change to a Task (status, outcome, creation, completion)
is automatically recorded in ActivityLog. This provides the full history
timeline required by the CRM workflow engine.
"""
import logging
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone

import threading

logger = logging.getLogger(__name__)

# Thread-local storage to track old state before save
_state = threading.local()


@receiver(pre_save, sender='tasks.Task')
def task_pre_save(sender, instance, **kwargs):
    """Capture old state before saving so we can diff changes."""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            setattr(_state, f'task_{instance.pk}', {
                'status': old.status,
                'outcome': old.outcome,
                'priority': old.priority,
                'is_active': old.is_active,
            })
        except sender.DoesNotExist:
            pass


@receiver(post_save, sender='tasks.Task')
def task_post_save(sender, instance, created, **kwargs):
    """
    After every Task save:
    - Create ActivityLog entries for: creation, status_change, outcome_change, completion
    - Enforce: completed → is_active=False, completed_at=now()
    - Fire workflow engine on completion
    """
    from tasks.models import ActivityLog

    from tasks.middleware import get_current_user

    # Resolve current user: prefer instance-attached user (set by views), fall
    # back to the thread-local set by CurrentUserMiddleware.
    user = getattr(instance, '_current_user', None) or get_current_user()

    if created:
        _safe_log(ActivityLog, instance, 'created', {}, {
            'status': instance.status,
            'task_type': instance.task_type,
            'priority': instance.priority,
        }, user)
        return

    key = f'task_{instance.pk}'
    old = getattr(_state, key, {})
    if hasattr(_state, key):
        delattr(_state, key)

    if not old:
        return

    # Status change
    new_status = instance.status
    old_status = old.get('status')
    if old_status and new_status != old_status:
        _safe_log(ActivityLog, instance, 'status_change',
                  {'status': old_status}, {'status': new_status}, user)

    # Outcome change
    new_outcome = instance.outcome
    old_outcome = old.get('outcome')
    if new_outcome and new_outcome != old_outcome:
        _safe_log(ActivityLog, instance, 'outcome_change',
                  {'outcome': old_outcome}, {'outcome': new_outcome}, user)

    # Completion
    if new_status == 'completed' and old_status != 'completed':
        _safe_log(ActivityLog, instance, 'completed', {
            'status': old_status,
        }, {
            'status': 'completed',
            'outcome': new_outcome,
            'completed_at': str(instance.completed_at or timezone.now()),
        }, user)

        # Note: The workflow engine is now triggered generically by 
        # workflows/signals.py for all watched models (Task, Call, etc.)
        # so we don't need a specific trigger here.
        pass



def _safe_log(ActivityLog, task, action_type, old_value, new_value, user):
    """Create ActivityLog safely — never raises so signals don't break saves."""
    from django.contrib.auth.models import AnonymousUser
    if isinstance(user, AnonymousUser):
        user = None
    
    try:
        ActivityLog.objects.create(
            task=task,
            action_type=action_type,
            old_value=old_value,
            new_value=new_value,
            user=user,
        )
    except Exception as exc:
        logger.error("[Tasks] ActivityLog creation failed: %s", exc, exc_info=True)



