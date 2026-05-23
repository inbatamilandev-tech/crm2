from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task
def send_welcome_email(contact_id):
    from contacts.models import Contact
    try:
        contact = Contact.objects.get(id=contact_id)
        # Placeholder for real email logic
        logger.info(f"Sending welcome email to converted contact: {contact.email} ({contact.first_name} {contact.last_name})")
        return True
    except Contact.DoesNotExist:
        logger.error(f"Contact {contact_id} not found for welcome email.")
        return False
