import logging
from rest_framework import viewsets

from users.permissions import RoleBasedAccessPermission

from .models import Deal, Product
from .serializers import DealSerializer, ProductSerializer


logger = logging.getLogger(__name__)


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['stage']
    search_fields = ['title']
    ordering_fields = ['created_at', 'value']

    def create(self, request, *args, **kwargs):
        from rest_framework.response import Response
        lead_id = request.data.get('lead')
        if lead_id:
            from deals.models import Deal
            existing_deal = Deal.objects.filter(lead_id=lead_id, is_active=True).first()
            if existing_deal:
                # Update existing deal instead of creating duplicate
                serializer = self.get_serializer(existing_deal, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)
                return Response(serializer.data)
        
        return super().create(request, *args, **kwargs)

    def get_queryset(self):

        user = self.request.user
        if not user.is_authenticated:
            return Deal.objects.none()

        base_qs = Deal.objects.select_related('owner', 'contact', 'account')
        if user.role == 'admin':
            return base_qs.all()
        if user.role == 'manager':
            return base_qs.filter(owner__team=user.team) if user.team else base_qs.none()
        if user.role == 'sales':
            return base_qs.filter(owner=user)
        return base_qs.none()

    def perform_create(self, serializer):
        from django.db import transaction
        from rest_framework.exceptions import ValidationError
        from leads.models import Lead

        with transaction.atomic():
            lead_id = serializer.initial_data.get('lead')
            lead = None
            if lead_id:
                # Lock the lead record to prevent race conditions during creation
                try:
                    lead = Lead.objects.select_for_update().get(pk=lead_id)
                except Lead.DoesNotExist:
                    raise ValidationError({"lead": "Lead not found."})

            # 1. Prevent Duplicate Active Deals
            if lead and Deal.objects.filter(lead=lead, is_active=True).exists():
                error_msg = "An active deal already exists for this lead."
                logger.warning(f"[Deals] Validation failed: {error_msg}")
                raise ValidationError({"lead": error_msg})
            
            # 2. Save the deal (stage defaults to proposal in model)
            try:
                deal = serializer.save(owner=self.request.user)
            except Exception as exc:
                logger.error(f"[Deals] Save failed: {exc}", exc_info=True)
                raise
            
            # 3. Clear deal_required flag and timestamp
            if lead:
                lead.deal_required = False
                lead.deal_required_at = None
                lead.save(update_fields=['deal_required', 'deal_required_at'])

    def perform_update(self, serializer):
        from django.db import transaction
        with transaction.atomic():
            serializer.save()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('name')
    serializer_class = ProductSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['category', 'service_type', 'is_active', 'featured']
    search_fields = ['name', 'sku', 'description']
    ordering_fields = ['name', 'price', 'created_at']
