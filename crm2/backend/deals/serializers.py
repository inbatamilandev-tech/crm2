from rest_framework import serializers
from .models import Deal, Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'


class DealSerializer(serializers.ModelSerializer):
    # Human-readable owner info for frontend display (never writable)
    owner_username = serializers.CharField(
        source='owner.username', read_only=True
    )
    owner_full_name = serializers.SerializerMethodField()
    contact_name = serializers.SerializerMethodField()
    company_name = serializers.SerializerMethodField()

    def get_company_name(self, obj):
        if obj.contact and obj.contact.account:
            return obj.contact.account.name
        return ""

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return ""

    class Meta:
        model = Deal
        fields = [
            'id', 'lead', 'account', 'value', 'is_active', 'status', 
            'created_at', 'updated_at', 'closed_at', 'title', 'stage', 
            'expected_close_date', 'notes', 'owner', 'contact',
            'owner_username', 'owner_full_name', 'contact_name', 
            'company_name', 'probability'
        ]
        read_only_fields = ['owner', 'created_at', 'is_active', 'closed_at', 'probability']
        extra_kwargs = {
            'value': {'required': True, 'allow_null': False},
            'expected_close_date': {'required': True, 'allow_null': False},
        }

    def get_owner_full_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def validate_value(self, value):
        if value < 0:
            raise serializers.ValidationError("Deal value cannot be negative.")
        return value
