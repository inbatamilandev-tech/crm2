from rest_framework import serializers
from .models import Contact, Account

class AccountSerializer(serializers.ModelSerializer):
    contacts_count = serializers.SerializerMethodField()
    open_deals_count = serializers.SerializerMethodField()
    pipeline_value = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            'id', 'name', 'industry', 'website', 'location', 'phone', 
            'company_size', 'annual_revenue', 'contacts_count', 
            'open_deals_count', 'pipeline_value', 'created_at'
        ]

    def get_contacts_count(self, obj):
        return obj.contacts.count()

    def get_open_deals_count(self, obj):
        from deals.models import Deal
        from django.db.models import Q
        return Deal.objects.filter(Q(account=obj) | Q(contact__account=obj), status='open').distinct().count()

    def get_pipeline_value(self, obj):
        from deals.models import Deal
        from django.db.models import Sum, Q
        return float(Deal.objects.filter(Q(account=obj) | Q(contact__account=obj), status='open').distinct().aggregate(total=Sum('value'))['total'] or 0)

class ContactSerializer(serializers.ModelSerializer):
    # Human-readable owner info for frontend display (never writable)
    owner_username = serializers.CharField(
        source='owner.username', read_only=True
    )
    owner_full_name = serializers.SerializerMethodField()
    linked_lead_name = serializers.SerializerMethodField()
    
    # Virtual fields for frontend compatibility
    name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    company = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def get_linked_lead_name(self, obj):
        lead = obj.lead_set.first()
        if lead:
            if lead.name:
                return lead.name
            return f"Lead {lead.id}"
        return None

    class Meta:
        model = Contact
        fields = '__all__'
        read_only_fields = ['owner']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        ret['name'] = f"{instance.first_name} {instance.last_name}".strip()
        ret['company'] = instance.account.name if instance.account else ""
        return ret

    def create(self, validated_data):
        name = validated_data.pop('name', '')
        company = validated_data.pop('company', '')
        
        if name:
            parts = name.split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''
            
        if company:
            from .models import Account
            account, _ = Account.objects.get_or_create(name=company)
            validated_data['account'] = account
            
        return super().create(validated_data)

    def update(self, instance, validated_data):
        name = validated_data.pop('name', None)
        company = validated_data.pop('company', None)
        
        if name is not None:
            parts = name.split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''
            
        if company is not None:
            from .models import Account
            if company:
                account, _ = Account.objects.get_or_create(name=company)
                validated_data['account'] = account
            else:
                validated_data['account'] = None
                
        return super().update(instance, validated_data)

    def get_owner_full_name(self, obj):
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.username
        return None

    def validate_email(self, value):
        # For update operations, exclude current instance from uniqueness check
        request = self.context.get('request')
        qs = Contact.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("A contact with this email already exists.")
        return value

    def validate_status(self, value):
        valid_statuses = ['new', 'connected', 'qualified', 'lost']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Invalid status '{value}'. Allowed values are: {', '.join(valid_statuses)}.")
        return value
