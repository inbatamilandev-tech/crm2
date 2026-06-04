from rest_framework import serializers
from .models import Invoice, InvoiceLineItem


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'discount', 'tax_percent', 'line_total']


class InvoiceSerializer(serializers.ModelSerializer):
    owner_full_name = serializers.SerializerMethodField()
    quote_number = serializers.CharField(source='quote.quote_number', read_only=True, allow_null=True)
    deal_title = serializers.CharField(source='quote.deal.title', read_only=True, allow_null=True)
    customer_name = serializers.SerializerMethodField()
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['owner', 'created_at', 'updated_at']

    def get_owner_full_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def get_customer_name(self, obj):
        if obj.quote and obj.quote.customer_name:
            return obj.quote.customer_name
        return "N/A"
