import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from contacts.serializers import ContactSerializer
from deals.serializers import DealSerializer
from users.permissions import RoleBasedAccessPermission
from workflows.services import convert_lead

from .models import Lead
from .serializers import LeadSerializer

logger = logging.getLogger(__name__)


class LeadViewSet(viewsets.ModelViewSet):
    serializer_class = LeadSerializer
    permission_classes = [RoleBasedAccessPermission]
    pagination_class = None
    filterset_fields = ['status']
    search_fields = ['name', 'email', 'company']
    ordering_fields = ['created_at', 'updated_at']

    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        name = request.data.get('name')
        company = request.data.get('company')
        phone = request.data.get('phone')
        
        existing_lead = None
        
        # 1. Check by Email
        if email:
            existing_lead = Lead.objects.filter(email=email, is_deleted=False).first()
        
        # 2. Check by Phone (via linked Contact)
        if not existing_lead and phone:
            from contacts.models import Contact
            contact = Contact.objects.filter(phone=phone).first()
            if contact:
                existing_lead = Lead.objects.filter(contact=contact, is_deleted=False).first()
                
        # 3. Check by Company + Name
        if not existing_lead and company and name:
            existing_lead = Lead.objects.filter(company=company, name=name, is_deleted=False).first()
            
        if existing_lead:
            # Update existing lead instead of creating duplicate
            serializer = self.get_serializer(existing_lead, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
            
        return super().create(request, *args, **kwargs)


    def get_queryset(self):

        user = self.request.user
        if not user.is_authenticated:
            return Lead.objects.none()

        base_qs = Lead.objects.select_related('assigned_to', 'contact', 'contact__account')
        if user.role == 'admin':
            return base_qs.all()
        if user.role == 'manager':
            return base_qs.filter(assigned_to__team=user.team) if user.team else base_qs.none()
        if user.role == 'sales':
            return base_qs.filter(assigned_to=user)
        return base_qs.none()

    def perform_create(self, serializer):
        serializer.save(assigned_to=self.request.user)

    def perform_destroy(self, instance):
        instance.soft_delete()

    @action(detail=False, methods=['get'], url_path='conversion-rate')
    def conversion_rate(self, request):
        qs = self.get_queryset()
        total = qs.count()
        qualified = qs.filter(status='qualified').count()
        rate = round(qualified / total * 100, 1) if total else 0.0
        return Response({'total': total, 'qualified': qualified, 'conversion_rate': rate})

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        lead = self.get_object()
        if lead.status == 'qualified' and hasattr(lead, 'deal'):
            return Response({'detail': 'This lead has already been converted.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = convert_lead(
                lead,
                owner=lead.assigned_to or request.user,
                create_deal=request.data.get('createDeal', True),
                deal_data={
                    'title': request.data.get('dealName') or f"{lead.company or lead.name} Deal",
                    'value': request.data.get('amount') or 0,
                    'stage': request.data.get('stage') or 'proposal',
                    'expected_close_date': request.data.get('closingDate'),
                },
            )
            logger.info("Lead %s converted to contact=%s deal=%s", lead.pk, result['contact'].pk, getattr(result['deal'], 'pk', None))
            return Response(
                {
                    'lead': LeadSerializer(result['lead']).data,
                    'contact': ContactSerializer(result['contact']).data,
                    'deal': DealSerializer(result['deal']).data if result['deal'] else None,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as exc:
            logger.error("Error converting lead %s: %s", lead.pk, exc, exc_info=True)
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
