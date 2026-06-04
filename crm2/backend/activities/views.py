import logging
import re
from django.db.models import Count, Sum, Q, F
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Activity, Meeting, Call, Comment, Mention
from .serializers import ActivitySerializer, MeetingSerializer, CallSerializer, CommentSerializer
from users.models import Notification
from users.permissions import HasModulePermission

User = get_user_model()
logger = logging.getLogger(__name__)

from realtime.bus import RealtimeEventBus, emit_notification

class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CommentSerializer

    def get_queryset(self):
        queryset = Comment.objects.all()
        content_type = self.request.query_params.get('content_type')
        object_id = self.request.query_params.get('object_id')
        if content_type and object_id:
            queryset = queryset.filter(content_type__model=content_type, object_id=object_id)
        return queryset

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        
        # Emit comment event to record channel
        RealtimeEventBus.broadcast(
            "comment.created", 
            CommentSerializer(comment).data,
            record_type=comment.content_type.model,
            record_id=comment.object_id
        )
        
        # Parse mentions: @username
        mentions = re.findall(r'@(\w+)', comment.text)
        for username in mentions:
            try:
                mentioned_user = User.objects.get(username=username)
                Mention.objects.create(comment=comment, user=mentioned_user)
                
                # Trigger Notification
                notif = Notification.objects.create(
                    user=mentioned_user,
                    title="New Mention",
                    message=f"{self.request.user.username} mentioned you in a comment.",
                    type='info',
                    link=f"/leads/{comment.object_id}" # Better link
                )
                
                # Emit notification event to personal channel
                emit_notification(mentioned_user.id, {
                    "id": notif.id,
                    "title": notif.title,
                    "message": notif.message,
                    "type": notif.type,
                    "created_at": notif.created_at.isoformat()
                })
            except User.DoesNotExist:
                pass

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type']
    search_fields = ['notes']
    ordering_fields = ['created_at']

class MeetingViewSet(viewsets.ModelViewSet):
    serializer_class = MeetingSerializer
    permission_classes = [HasModulePermission]
    rbac_module = 'meeting'
    search_fields = ['title', 'notes']
    ordering_fields = ['created_at', 'start_time']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Meeting.objects.none()
        if not user.role:
            return Meeting.objects.none()

        scope = user.role.data_scope
        base_qs = Meeting.objects.all().order_by('-created_at')

        if scope == 'global':
            return base_qs
        if scope == 'team':
            return base_qs.filter(owner__team=user.team) if user.team else Meeting.objects.none()
        # 'own' scope
        return base_qs.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class CallViewSet(viewsets.ModelViewSet):
    serializer_class = CallSerializer
    filterset_fields = ['direction', 'outcome']
    search_fields = ['phone_number', 'notes']
    ordering_fields = ['created_at', 'start_time']

    def get_queryset(self):
        return Call.objects.select_related('owner').all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class UnifiedActivityViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        # Fetch Activities
        activities = Activity.objects.all().order_by('-created_at')[:20]
        act_serializer = ActivitySerializer(activities, many=True)
        for d in act_serializer.data:
            d['feed_type'] = 'activity'
            d['timestamp'] = d['created_at']

        # Fetch Comments
        comments = Comment.objects.all().order_by('-created_at')[:20]
        com_serializer = CommentSerializer(comments, many=True)
        for d in com_serializer.data:
            d['feed_type'] = 'comment'
            d['timestamp'] = d['created_at']

        # Combine and sort
        combined = act_serializer.data + com_serializer.data
        combined.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response(combined[:30])

class SendEmailAPIView(APIView):
    """
    POST /api/emails/send/
    Sends a real email via Django's mail backend (SMTP or console),
    then logs it as an Activity record so it appears in the Emails page.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        to_email = request.data.get('to_email', '').strip()
        subject  = request.data.get('subject', '').strip()
        body     = request.data.get('body', '').strip()
        contact_id = request.data.get('contact_id')

        if not to_email:
            return Response({'detail': 'to_email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not subject:
            return Response({'detail': 'subject is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not body:
            return Response({'detail': 'body is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            logger.info("[SendEmail] Email sent to %s by user %s", to_email, request.user)
        except Exception as exc:
            logger.error("[SendEmail] Failed to send email to %s: %s", to_email, exc)
            return Response(
                {'detail': f'Email delivery failed: {str(exc)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        notes = f"TO: {to_email}\nSUBJECT: {subject}\n\n{body}"
        activity_kwargs = {
            'type': 'email',
            'notes': notes,
            'created_by': request.user,
        }

        if contact_id:
            try:
                from contacts.models import Contact
                from django.contrib.contenttypes.models import ContentType
                contact = Contact.objects.get(pk=contact_id)
                activity_kwargs['content_type'] = ContentType.objects.get_for_model(Contact)
                activity_kwargs['object_id'] = contact.pk
            except Exception:
                pass

        activity = Activity.objects.create(**activity_kwargs)
        serializer = ActivitySerializer(activity)

        return Response(
            {'detail': 'Email sent successfully.', 'activity': serializer.data},
            status=status.HTTP_201_CREATED,
        )
