from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Quote
from .serializers import QuoteSerializer
from users.permissions import RoleBasedAccessPermission, has_perm
from invoices.models import Invoice, InvoiceLineItem


class QuoteViewSet(viewsets.ModelViewSet):
    """
    RBAC rules:
      admin   → all quotes
      manager → quotes owned by users in same team
      sales   → only their own quotes
    """
    serializer_class = QuoteSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['status']
    search_fields = ['quote_number', 'deal__title']
    ordering_fields = ['created_at', 'valid_until', 'amount']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quote.objects.none()

        base_qs = Quote.objects.select_related('owner', 'deal', 'deal__contact')

        if user.role == 'admin':
            return base_qs.all()
        if user.role == 'manager':
            if not user.team:
                return base_qs.none()
            return base_qs.filter(owner__team=user.team)
        if user.role == 'sales':
            return base_qs.filter(owner=user)

        return base_qs.none()

    def perform_create(self, serializer):
        """Always stamp the creating user as owner."""
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        """Owner is immutable after creation."""
        serializer.save()

    @action(detail=True, methods=['post'], permission_classes=[has_perm('invoice.generate')])
    def generate_invoice(self, request, pk=None):
        quote = self.get_object()
        
        if quote.status != 'accepted':
            return Response({'error': 'Invoice can only be generated from an accepted quote.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if Invoice.objects.filter(quote=quote).exists():
            return Response({'error': 'Invoice already exists for this quote.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Create Invoice
        invoice = Invoice.objects.create(
            owner=request.user,
            quote=quote,
            invoice_number=f"INV-{quote.quote_number.split('-')[1]}",
            subtotal=quote.subtotal,
            discount_total=quote.total_discount,
            tax_total=quote.tax_amount,
            grand_total=quote.amount,
            amount=quote.amount,
            status='draft'
        )
        
        # Copy line items
        for item in quote.line_items.all():
            InvoiceLineItem.objects.create(
                invoice=invoice,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                tax_percent=item.tax_percent
            )
            
        return Response({'success': 'Invoice generated successfully!', 'invoice_id': invoice.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[has_perm('quote.approve')])
    def approve(self, request, pk=None):
        quote = self.get_object()
            
        if quote.status != 'sent':
            return Response({'error': 'Only sent quotes can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
            
        quote.status = 'accepted'
        quote.save()
        
        if quote.deal:
            quote.deal.stage = 'won'
            quote.deal.save()
            
        return Response({'success': 'Quote approved successfully!'})
