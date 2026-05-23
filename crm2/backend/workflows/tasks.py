import logging
from datetime import timedelta

from celery import shared_task
from django.core.mail import send_mail
from django.db import close_old_connections
from django.utils import timezone

logger = logging.getLogger(__name__)


def _create_task_in_db(
    workflow_id, workflow_action_id, title, description, priority,
    delay_days, assignment_type, specific_user_id, source_object_id,
    owner_user_id, team_name
):
    """
    Legacy Celery-compatible task creator.
    The new engine uses workflows.actions directly, but this keeps old queued
    jobs working without deprecated Task fields.
    """
    from django.contrib.auth import get_user_model
    from tasks.models import Task

    close_old_connections()
    User = get_user_model()
    assignee = User.objects.filter(pk=owner_user_id).first() if owner_user_id else None
    due_date = timezone.now() + timedelta(days=max(int(delay_days), 1))

    task = Task.objects.filter(source_object_id=str(source_object_id), is_active=True).first()
    if not task:
        task = Task(title=title, source_object_id=str(source_object_id))

    task.task_type = 'follow_up'
    task.description = description
    task.status = 'not_started'
    task.priority = priority
    task.due_date = due_date
    task.assigned_to = assignee
    task.save()

    return {'task_id': task.pk, 'assigned_to': getattr(assignee, 'username', None)}


@shared_task(bind=True, name='workflows.execute_create_task')
def execute_create_task(self, **kwargs):
    return _create_task_in_db(**kwargs)


@shared_task(bind=True, name='workflows.execute_delayed_task')
def execute_delayed_task(self, **kwargs):
    return _create_task_in_db(**kwargs)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name='workflows.send_workflow_email')
def send_workflow_email(self, to_email, subject, body):
    send_mail(subject=subject, message=body, from_email=None, recipient_list=[to_email], fail_silently=False)
    return {'sent': True, 'to': to_email}


# ---------------------------------------------------------------------------
# Async workflow trigger — fire engine off the HTTP request thread
# ---------------------------------------------------------------------------
@shared_task(bind=True, max_retries=3, default_retry_delay=30, name='workflows.trigger_workflow_async')
def trigger_workflow_async(self, module_name, trigger_event, object_app_label, object_model, object_pk, extra_context=None):
    """
    Fire trigger_workflows() asynchronously via Celery.

    Usage:
        from workflows.tasks import trigger_workflow_async
        trigger_workflow_async.delay('lead', 'on_create', 'leads', 'lead', instance.pk)
    """
    try:
        from django.apps import apps
        from workflows.engine import trigger_workflows

        close_old_connections()
        Model = apps.get_model(app_label=object_app_label, model_name=object_model)
        instance = Model.objects.get(pk=object_pk)
        trigger_workflows(module_name, trigger_event, instance, extra_context or {})
        logger.info(
            "[WorkflowTask] Triggered %s:%s for %s:%s",
            module_name, trigger_event, object_model, object_pk
        )
    except Exception as exc:
        logger.error("[WorkflowTask] Failed: %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=30)


# ---------------------------------------------------------------------------
# Periodic cleanup — keep WorkflowLog table lean (run daily)
# ---------------------------------------------------------------------------
@shared_task(name='workflows.cleanup_workflow_logs')
def cleanup_workflow_logs(days=90):
    """
    Delete workflow logs older than N days.
    Schedule this in CELERY_BEAT_SCHEDULE for daily cleanup.
    """
    from workflows.services import cleanup_old_logs
    result = cleanup_old_logs(days=days)
    logger.info("[WorkflowTask] Cleaned up %d logs older than %d days", result['deleted_logs'], days)
    return result

