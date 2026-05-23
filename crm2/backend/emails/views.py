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
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send a draft email or a new email."""
        email = self.get_object()
        if email.status not in ['draft', 'failed']:
            return Response({"error": "Only drafts or failed emails can be sent."}, status=status.HTTP_400_BAD_REQUEST)
        
        email = EmailService.send_email(email)
        
        if email.status == 'sent':
            return Response(EmailSerializer(email).data)
        else:
            return Response({"error": email.failed_reason}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        
        data = {
            "total": total,
            "sent": sent,
            "delivered": delivered,
            "opened": opened,
            "clicked": clicked,
            "failed": failed,
            "bounced": bounced,
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
