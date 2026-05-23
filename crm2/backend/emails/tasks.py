from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from emails.models import Email
import logging

logger = logging.getLogger(__name__)

@shared_task(name="emails.tasks.check_unopened_emails")
def check_unopened_emails():
    """
    Check for emails that were delivered but not opened after 3 days.
    Create a reminder follow-up task for them.
    """
    cutoff_time = timezone.now() - timedelta(days=3)
    
    # Find emails delivered before cutoff that are not opened
    emails = Email.objects.filter(
        status='delivered',
        delivered_at__lte=cutoff_time,
        opened_at__isnull=True
    )
    
    logger.info(f"[EmailTasks] Found {emails.count()} unopened emails older than 3 days.")
    
    for email in emails:
        if email.lead:
            # Check if we already created a reminder task to avoid duplicates
            from tasks.models import Task
            existing_task = Task.objects.filter(
                lead=email.lead,
                title__icontains=f"Reminder: Email not opened",
                status='not_started'
            ).exists()
            
            if not existing_task:
                from tasks.services import TaskService
                _, created = TaskService.create_task(
                    task_type='call',
                    title=f"Reminder: Email not opened by {email.lead.name or email.to_email}",
                    lead=email.lead,
                    assigned_to=email.created_by,
                    priority='medium',
                )
                if created:
                    logger.info(f"[EmailTasks] Created reminder task for lead {email.lead.id}")
                else:
                    logger.info(f"[EmailTasks] Existing active task reused for lead {email.lead.id}")
                
                # Update status to avoid checking it again (or use a flag)
                # Let's just log it and assume the title check prevents duplicates.
                
    return f"Processed {emails.count()} emails."
