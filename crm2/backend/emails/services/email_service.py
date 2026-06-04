import os
import logging
import resend
import bleach
from django.utils import timezone
from django.conf import settings
from emails.models import Email

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def initialize():
        """Initialize Resend API with key from environment."""
        api_key = os.getenv("RESEND_API_KEY")
        if not api_key:
            logger.warning("RESEND_API_KEY is not set in environment variables.")
        resend.api_key = api_key

    @staticmethod
    def send_email(email_instance):
        """
        Send an email using Resend API.
        Updates the email instance status based on result.
        """
        EmailService.initialize()
        
        if not resend.api_key:
            email_instance.status = 'failed'
            email_instance.failed_reason = "RESEND_API_KEY is not set."
            email_instance.save()
            return email_instance

        params = {
            "from": email_instance.from_email,
            "to": [email_instance.to_email],
            "subject": email_instance.subject,
            "text": email_instance.body,
        }
        
        if email_instance.html_body:
            # Sanitize HTML to prevent XSS
            allowed_tags = ['p', 'b', 'i', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'br', 'span', 'strong', 'em', 'img']
            allowed_attrs = {'a': ['href', 'title', 'target'], '*': ['style'], 'img': ['src', 'alt', 'width', 'height']}
            clean_html = bleach.clean(email_instance.html_body, tags=allowed_tags, attributes=allowed_attrs)
            
            # Wrap in proper HTML structure
            params["html"] = f"<!DOCTYPE html><html><body>{clean_html}</body></html>"

        try:
            logger.info(f"[EmailService] Sending email to {email_instance.to_email}")
            
            # Check if API key is a placeholder/dummy value
            is_dummy_key = not resend.api_key or resend.api_key == "re_6vRwMh6H_CGuFjbNyvtajHXyjceDomK5y" or resend.api_key.startswith("your-") or "dummy" in resend.api_key.lower()
            if is_dummy_key:
                raise Exception("API key is invalid (dummy key detected)")

            r = resend.Emails.send(params)
            
            # Support both dict and object return types (resend sdk version dependency)
            msg_id = getattr(r, 'id', None) or (r.get('id') if isinstance(r, dict) else None) or str(r)
            email_instance.provider_message_id = msg_id
            email_instance.status = 'sent'
            email_instance.sent_at = timezone.now()
            email_instance.save()
            
            logger.info(f"[EmailService] Email sent successfully, ID: {msg_id}")
            return email_instance
            
        except Exception as e:
            err_msg = str(e)
            logger.error(f"[EmailService] Failed to send email via Resend: {err_msg}")
            
            # Fallback to Django send_mail if settings.DEBUG is True or API key is dummy/invalid
            from django.conf import settings
            if settings.DEBUG or "invalid" in err_msg.lower() or "dummy" in err_msg.lower() or "unauthorized" in err_msg.lower() or "api key" in err_msg.lower():
                logger.info("[EmailService] Falling back to Django send_mail...")
                try:
                    from django.core.mail import send_mail
                    send_mail(
                        subject=email_instance.subject,
                        message=email_instance.body,
                        from_email=email_instance.from_email or settings.DEFAULT_FROM_EMAIL or "noreply@crm.example.com",
                        recipient_list=[email_instance.to_email],
                        html_message=params.get("html"),
                        fail_silently=False,
                    )
                    email_instance.provider_message_id = f"django-fallback-{email_instance.id}"
                    email_instance.status = 'sent'
                    email_instance.sent_at = timezone.now()
                    email_instance.save()
                    logger.info("[EmailService] Email sent successfully via Django send_mail fallback")
                    return email_instance
                except Exception as django_err:
                    logger.error(f"[EmailService] Django send_mail fallback also failed: {django_err}")
                    email_instance.status = 'failed'
                    email_instance.failed_reason = f"Resend failed ({err_msg}) and Fallback failed ({django_err})"
                    email_instance.save()
                    return email_instance
            else:
                email_instance.status = 'failed'
                email_instance.failed_reason = err_msg
                email_instance.save()
                return email_instance

    @staticmethod
    def handle_webhook_event(payload):
        """
        Handle webhook events from Resend.
        Payload structure typically contains event type and data.
        """
        event_type = payload.get('type')
        data = payload.get('data') or {}
        email_id = data.get('email_id') or payload.get('id') # Resend might send it differently
        
        if not email_id:
            logger.warning("[EmailService] Webhook received without email_id.")
            return False

        try:
            email = Email.objects.get(provider_message_id=email_id)
        except Email.DoesNotExist:
            logger.warning(f"[EmailService] Webhook received for unknown email ID: {email_id}")
            return False

        logger.info(f"[EmailService] Handling webhook {event_type} for email {email.id}")

        if event_type == 'email.delivered':
            email.status = 'delivered'
            email.delivered_at = timezone.now()
            
            try:
                from users.models import Notification
                from users.serializers import NotificationSerializer
                from realtime.bus import emit_notification
                
                if email.created_by:
                    notification = Notification.objects.create(
                        user=email.created_by,
                        title="Email Delivered",
                        message=f"Your email to {email.to_email} was successfully delivered.",
                        type="success",
                        link="/emails"
                    )
                    notif_data = NotificationSerializer(notification).data
                    emit_notification(email.created_by.id, notif_data)
            except Exception as e:
                logger.error(f"Failed to emit notification for email delivered: {e}")
        elif event_type == 'email.opened':
            email.status = 'opened'
            email.opened_at = timezone.now()
            # Automation: Increase lead score if lead exists
            if email.lead:
                email.lead.score += 5
                email.lead.save(update_fields=['score'])
                logger.info(f"[EmailService] Increased score for lead {email.lead.id}")
        elif event_type == 'email.clicked':
            email.status = 'clicked'
            email.clicked_at = timezone.now()
            # Automation: Create follow-up task
            if email.lead:
                from tasks.services import TaskService
                TaskService.create_task(
                    task_type='call',
                    title=f"Follow-up: Email clicked by {email.lead.name or email.to_email}",
                    lead=email.lead,
                    assigned_to=email.created_by,
                    priority='high',
                )  # returns (task, created) tuple — no assignment needed here
                logger.info(f"[EmailService] Created follow-up task for lead {email.lead.id}")
        elif event_type == 'email.bounced':
            email.status = 'bounced'
        elif event_type == 'email.failed':
            email.status = 'failed'
            email.failed_reason = data.get('reason') or "Failed via provider"

        email.save()
        return True
