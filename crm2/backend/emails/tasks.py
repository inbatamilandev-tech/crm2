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

    return f"Processed {emails.count()} emails."


@shared_task(name="emails.tasks.fetch_inbox_emails")
def fetch_inbox_emails():
    """
    Periodically fetches new (UNSEEN) emails from Gmail via IMAP
    and stores them in the CRM inbox.
    Runs every 5 minutes via Celery Beat.
    """
    from emails.services.imap_service import IMAPService

    logger.info("[EmailTasks] Starting scheduled IMAP inbox fetch...")
    fetched, error = IMAPService.fetch_inbox(mark_as_read=False, user=None, limit=50)

    if error:
        logger.error(f"[EmailTasks] IMAP fetch failed: {error}")
        return f"IMAP fetch failed: {error}"

    logger.info(f"[EmailTasks] IMAP fetch complete. {fetched} new email(s) saved.")
    return f"Fetched {fetched} new email(s) from inbox."
