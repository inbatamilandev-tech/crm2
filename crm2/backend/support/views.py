from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, F, Count
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from .models import Case, Solution, Service, Feedback, CaseAttachment
from .serializers import CaseSerializer, SolutionSerializer, ServiceSerializer, FeedbackSerializer, CaseAttachmentSerializer
from .utils import find_duplicate_case
from activities.models import Activity

class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.all().order_by('-created_at')
    serializer_class = CaseSerializer

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        
        logger.debug(f"Case creation request data: {request.data}")
        
        contact_id = request.data.get('contact')
        subject = request.data.get('subject')
        
        if contact_id and subject:
            from contacts.models import Contact
            try:
                contact = Contact.objects.get(pk=contact_id)
                duplicate = find_duplicate_case(contact, subject)
                if duplicate:
                    return Response({
                        'success': False,
                        'duplicate': True,
                        'message': 'Existing active case found',
                        'existing_case_id': duplicate.id
                    }, status=status.HTTP_409_CONFLICT)
            except Contact.DoesNotExist:
                pass
                
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            logger.debug(f"Validation errors: {serializer.errors}")
            return Response({
                'success': False,
                'message': 'Validation failed',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response({
                'success': True,
                'message': 'Case created successfully',
                'data': {
                    'id': serializer.instance.id,
                    'case_id': serializer.instance.case_id
                }
            }, status=status.HTTP_201_CREATED, headers=headers)
        except Exception as e:
            logger.exception("Exception during case creation")
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        case = self.get_object()
        duplicate_id = request.data.get('duplicate_id')
        if not duplicate_id:
            return Response({'detail': 'duplicate_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            duplicate = Case.objects.get(pk=duplicate_id)
        except Case.DoesNotExist:
            return Response({'detail': 'Duplicate case not found'}, status=status.HTTP_404_NOT_FOUND)
            
        # Merge logic
        case.description += f"\n\n--- Merged from {duplicate.case_id} ---\n{duplicate.description}"
        if duplicate.internal_notes:
            case.internal_notes = (case.internal_notes or '') + f"\n\n--- Merged Notes ---\n{duplicate.internal_notes}"
            
        # Mark duplicate as merged
        duplicate.status = 'Closed'
        duplicate.merged_into = case
        duplicate.save()
        
        # Create activity log
        Activity.objects.create(
            type='note',
            notes=f"Case merged from duplicate submission {duplicate.case_id}.",
            related_to=case,
            created_by=request.user
        )
        
        case.save()
        
        return Response({'detail': f'Case {duplicate.case_id} merged into {case.case_id}'})

    @action(detail=True, methods=['post'])
    def append(self, request, pk=None):
        case = self.get_object()
        message = request.data.get('message')
        if not message:
            return Response({'detail': 'message is required'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Append logic
        case.description += f"\n\n--- Appended Message ---\n{message}"
        case.last_customer_reply_at = timezone.now()
        case.save()
        
        # Create activity log
        Activity.objects.create(
            type='note',
            notes=f"Appended message: {message}",
            related_to=case,
            created_by=request.user
        )
        
        # Notify assigned agent (simulate or use signals)
        # For now we rely on activity log and websocket if triggered by signal
        
        return Response({'detail': 'Message appended to case'})

class SolutionViewSet(viewsets.ModelViewSet):
    queryset = Solution.objects.all().order_by('-created_at')
    serializer_class = SolutionSerializer

class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all().order_by('-created_at')
    serializer_class = ServiceSerializer

class FeedbackViewSet(viewsets.ModelViewSet):
    queryset = Feedback.objects.all().order_by('-created_at')
    serializer_class = FeedbackSerializer

class CaseAttachmentViewSet(viewsets.ModelViewSet):
    queryset = CaseAttachment.objects.all()
    serializer_class = CaseAttachmentSerializer

class SupportStatsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        today = now.date()
        
        total_cases = Case.objects.count()
        open_cases = Case.objects.filter(status__in=['New', 'Open', 'In Progress']).count()
        resolved_today = Case.objects.filter(status='Resolved', resolved_at__date=today).count()
        
        sla_breaches = Case.objects.filter(
            sla_deadline__lt=now
        ).exclude(status__in=['Resolved', 'Closed']).count()
        
        # Avg resolution time in hours
        resolved_cases = Case.objects.filter(status='Resolved', resolved_at__isnull=False, created_at__isnull=False)
        if resolved_cases.exists():
            avg_res_time = resolved_cases.annotate(
                duration=F('resolved_at') - F('created_at')
            ).aggregate(avg=Avg('duration'))['avg']
            
            if avg_res_time:
                avg_res_hours = avg_res_time.total_seconds() / 3600
            else:
                avg_res_hours = 0
        else:
            avg_res_hours = 0
            
        # CSAT
        avg_rating = Feedback.objects.aggregate(avg=Avg('rating'))['avg'] or 0
        
        return Response({
            'total_cases': total_cases,
            'open_cases': open_cases,
            'resolved_today': resolved_today,
            'sla_breaches': sla_breaches,
            'avg_resolution_time_hours': round(avg_res_hours, 1),
            'customer_satisfaction': round(avg_rating, 1)
        })
