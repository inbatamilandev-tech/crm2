from rest_framework import viewsets, status, response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Count, Avg
from .models import Call
from .serializers import CallSerializer

class CallViewSet(viewsets.ModelViewSet):
    queryset = Call.objects.all()
    serializer_class = CallSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def start_call(self, request):
        lead_id = request.data.get('lead_id')
        phone_number = request.data.get('phone_number')
        
        if not lead_id or not phone_number:
            return response.Response(
                {"error": "lead_id and phone_number are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        call = Call.objects.create(
            lead_id=lead_id,
            user=request.user,
            phone_number=phone_number,
            call_status='in_progress',
            start_time=timezone.now()
        )
        
        serializer = self.get_serializer(call)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def end_call(self, request, pk=None):
        call = self.get_object()
        if call.call_status != 'in_progress':
            return response.Response(
                {"error": "Call is not in progress"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        call.end_time = timezone.now()
        if call.start_time:
            diff = call.end_time - call.start_time
            call.duration = int(diff.total_seconds())
        
        call.save()
        serializer = self.get_serializer(call)
        return response.Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_outcome(self, request, pk=None):
        call = self.get_object()
        outcome = request.data.get('outcome')
        
        if outcome not in dict(Call.OUTCOME_CHOICES):
            return response.Response(
                {"error": "Invalid outcome"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        call.outcome = outcome
        call.call_status = 'completed'
        call.save()

        # Explicitly dispatch completion event
        from workflows.dispatcher import dispatch_event
        dispatch_event('call', 'on_task_complete', call)
        
        serializer = self.get_serializer(call)
        return response.Response(serializer.data)

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        queryset = self.get_queryset().filter(user=request.user)
        
        total_calls = queryset.count()
        connected_calls = queryset.filter(outcome='connected').count()
        no_response_calls = queryset.filter(outcome='no_response').count()
        avg_duration = queryset.filter(call_status='completed').aggregate(Avg('duration'))['duration__avg'] or 0
        
        return response.Response({
            "total_calls": total_calls,
            "connected_calls": connected_calls,
            "no_response_calls": no_response_calls,
            "avg_duration": round(avg_duration, 2)
        })
