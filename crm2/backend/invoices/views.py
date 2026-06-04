from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Invoice
from .serializers import InvoiceSerializer
from users.permissions import HasModulePermission, has_perm


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    RBAC rules:
      global scope → all invoices
      team scope   → invoices owned by users in same team
      own scope    → only their own invoices
    """
    serializer_class = InvoiceSerializer
    permission_classes = [HasModulePermission]
    rbac_module = 'invoice'
    filterset_fields = ['status']
    search_fields = ['invoice_number', 'quote__deal__title']
    ordering_fields = ['created_at', 'due_date', 'amount']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Invoice.objects.none()
        if not user.role:
            return Invoice.objects.none()

        base_qs = Invoice.objects.filter(is_active=True).select_related('owner', 'quote', 'quote__deal')
        scope = user.role.data_scope

        if scope == 'global':
            return base_qs.all()
        if scope == 'team':
            if not user.team:
                return base_qs.none()
            return base_qs.filter(owner__team=user.team)
        # 'own' scope
        return base_qs.filter(owner=user)

    def perform_create(self, serializer):
        """Always stamp the creating user as owner."""
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        """Owner is immutable after creation."""
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Soft delete invoice."""
        instance = self.get_object()
        instance.status = 'deleted'
        instance.is_active = False
        instance.deleted_at = timezone.now()
        instance.deleted_by = request.user
        instance.save()
        return Response({"message": "Invoice deleted successfully"})

    @action(detail=True, methods=['post'], permission_classes=[has_perm('invoice.send')])
    def send_invoice(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status != 'draft':
            return Response({'error': 'Only draft invoices can be sent.'}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = 'sent'
        invoice.save()
        return Response({'success': 'Invoice marked as sent!'})

    @action(detail=True, methods=['post'], permission_classes=[has_perm('invoice.mark_paid')])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'paid':
            return Response({'error': 'Invoice is already marked as paid.'}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = 'paid'
        invoice.save()
        return Response({'success': 'Invoice marked as paid!'})
