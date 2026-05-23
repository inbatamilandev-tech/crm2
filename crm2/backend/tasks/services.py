from django.utils import timezone
from tasks.models import Task
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

class TaskService:
    @staticmethod
    def create_task(task_type, title, lead=None, assigned_to=None, priority='medium', due_date=None, **extra_fields):
        """
        Centralized service to create tasks with deduplication and validation.
        """
        # 1. Validation for meeting tasks
        meeting_types = ['meeting', 'discovery_meeting', 'demo_meeting', 'proposal_meeting', 'schedule_meeting']
        if task_type in meeting_types and not lead:
            raise ValidationError("A lead is mandatory for all meeting-related tasks.")
            
        # 2. Deduplication & Transition check
        if lead:
            from django.db.models import Q
            
            if task_type in meeting_types:
                existing_task = Task.objects.filter(
                    lead=lead,
                    task_type__in=meeting_types,
                    is_active=True
                ).first()
                
                if existing_task:
                    logger.info(f"[TaskService] Transitioning existing task {existing_task.id} from {existing_task.task_type} ('{existing_task.title}') to {task_type} ('{title}')")
                    existing_task.task_type = task_type
                    existing_task.title = title
                    if due_date:
                        existing_task.due_date = due_date
                    existing_task.save()
                    return existing_task, False
            else:
                existing_task = Task.objects.filter(
                    lead=lead,
                    task_type=task_type,
                    is_active=True
                ).first()
                
                if existing_task:
                    logger.info(f"[TaskService] Found existing active task {existing_task.id} for lead {lead.id} of type {task_type}. Returning existing.")
                    return existing_task, False
                
        # 3. Create new task
        if not due_date:
            from datetime import timedelta
            due_date = timezone.now() + timedelta(days=1)
            
        task = Task.objects.create(
            task_type=task_type,
            title=title,
            lead=lead,
            assigned_to=assigned_to,
            priority=priority,
            due_date=due_date,
            **extra_fields
        )
        logger.info(f"[TaskService] Created new task {task.id} for lead {lead.id if lead else 'None'}")
        return task, True
