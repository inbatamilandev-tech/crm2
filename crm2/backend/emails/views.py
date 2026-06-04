from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from emails.models import Email, EmailTemplate
from emails.serializers import EmailSerializer, EmailTemplateSerializer
from emails.services.email_service import EmailService
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
import logging

logger = logging.getLogger(__name__)

class EmailViewSet(viewsets.ModelViewSet):
    queryset = Email.objects.all().order_by('-created_at')
    serializer_class = EmailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Filter by user if needed, or return all for admins
        return super().get_queryset()

    def perform_create(self, serializer):
        email = serializer.save(created_by=self.request.user)
        try:
            from users.models import Notification
            from users.serializers import NotificationSerializer
            from realtime.bus import emit_notification
            
            notification = Notification.objects.create(
                user=self.request.user,
                title="Email Draft Created",
                message=f"Email draft to {email.to_email} was created.",
                type="info",
                link="/emails"
            )
            notif_data = NotificationSerializer(notification).data
            emit_notification(self.request.user.id, notif_data)
        except Exception as e:
            logger.error(f"Failed to emit notification for email created: {e}")

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send a draft email or a new email."""
        email = self.get_object()
        if email.status not in ['draft', 'failed']:
            return Response({"error": "Only drafts or failed emails can be sent."}, status=status.HTTP_400_BAD_REQUEST)
        
        email = EmailService.send_email(email)
        
        if email.status == 'sent':
            try:
                from users.models import Notification
                from users.serializers import NotificationSerializer
                from realtime.bus import emit_notification
                
                notification = Notification.objects.create(
                    user=request.user,
                    title="Email Sent",
                    message=f"Email to {email.to_email} has been sent.",
                    type="success",
                    link="/emails"
                )
                notif_data = NotificationSerializer(notification).data
                emit_notification(request.user.id, notif_data)
            except Exception as e:
                logger.error(f"Failed to emit notification for email sent: {e}")
                
            return Response(EmailSerializer(email).data)
        else:
            return Response({"error": email.failed_reason}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def send(self, request):
        """Create and immediately send a new email (used by Quotes API)."""
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            email = serializer.save(created_by=request.user, status='queued')
            email = EmailService.send_email(email)
            if email.status == 'sent':
                return Response(EmailSerializer(email).data, status=status.HTTP_201_CREATED)
            else:
                return Response({"error": email.failed_reason}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        """Retry a failed email."""
        email = self.get_object()
        if email.status != 'failed':
            return Response({"error": "Only failed emails can be retried."}, status=status.HTTP_400_BAD_REQUEST)
        
        email.status = 'queued'
        email.save()
        
        email = EmailService.send_email(email)
        
        if email.status == 'sent':
            return Response(EmailSerializer(email).data)
        else:
            return Response({"error": email.failed_reason}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def receive_email(self, request):
        """
        Simulate or record an incoming (received) email into the Inbox.
        Expected payload: { from_email, to_email, subject, body, html_body (optional) }
        """
        from_email = request.data.get('from_email', '')
        to_email = request.data.get('to_email', '')
        subject = request.data.get('subject', '(No Subject)')
        body = request.data.get('body', '')
        html_body = request.data.get('html_body', '')

        if not from_email or not to_email:
            return Response(
                {"error": "from_email and to_email are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        email = Email.objects.create(
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            body=body,
            html_body=html_body,
            status='inbox',
            created_by=request.user,
        )

        try:
            from users.models import Notification
            from users.serializers import NotificationSerializer
            from realtime.bus import emit_notification

            notification = Notification.objects.create(
                user=request.user,
                title="New Email Received",
                message=f"You have a new email from {from_email}: {subject}",
                type="info",
                link="/emails"
            )
            notif_data = NotificationSerializer(notification).data
            emit_notification(request.user.id, notif_data)
        except Exception as e:
            logger.error(f"Failed to emit notification for received email: {e}")

        return Response(EmailSerializer(email).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def fetch_inbox(self, request):
        """
        Manually trigger an IMAP fetch from Gmail to pull new incoming emails.
        POST /api/emails/fetch_inbox/
        """
        from emails.services.imap_service import IMAPService

        mark_as_read = request.data.get('mark_as_read', False)
        limit = int(request.data.get('limit', 50))

        logger.info(f"[EmailViewSet] Manual IMAP fetch triggered by user {request.user}")
        fetched, error = IMAPService.fetch_inbox(
            mark_as_read=mark_as_read,
            user=request.user,
            limit=limit
        )

        if error:
            return Response(
                {"error": error, "fetched": 0},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response({"fetched": fetched, "message": f"{fetched} new email(s) pulled from inbox."})

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """Get email analytics."""
        total = Email.objects.count()
        sent = Email.objects.filter(status='sent').count()
        delivered = Email.objects.filter(status='delivered').count()
        opened = Email.objects.filter(status='opened').count()
        clicked = Email.objects.filter(status='clicked').count()
        failed = Email.objects.filter(status='failed').count()
        bounced = Email.objects.filter(status='bounced').count()
        received = Email.objects.filter(status__in=['inbox', 'received']).count()
        
        data = {
            "total": total,
            "sent": sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "failed": failed,
            "bounced": bounced,
            "received": received,
            "open_rate": (opened / delivered * 100) if delivered > 0 else 0,
            "click_rate": (clicked / delivered * 100) if delivered > 0 else 0,
        }
        return Response(data)

class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all().order_by('-created_at')
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def email_webhook(request):
    """
    Public endpoint for Resend webhooks.
    """
    logger.info(f"[Webhook] Received webhook from Resend")
    payload = request.data
    
    # In production, verify signature here!
    
    success = EmailService.handle_webhook_event(payload)
    
    if success:
        return Response({"status": "processed"}, status=status.HTTP_200_OK)
    else:
        return Response({"status": "ignored or failed"}, status=status.HTTP_400_BAD_REQUEST)
