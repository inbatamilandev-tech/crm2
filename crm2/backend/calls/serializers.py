from rest_framework import serializers
from .models import Call
from leads.serializers import LeadSerializer

class CallSerializer(serializers.ModelSerializer):
    lead_name = serializers.ReadOnlyField(source='lead.contact.first_name') # Or lead.name
    user_name = serializers.ReadOnlyField(source='user.get_full_name')

    class Meta:
        model = Call
        fields = '__all__'
        read_only_fields = ('user', 'duration', 'call_status', 'created_at', 'updated_at')

    def to_representation(self, instance):
        repr = super().to_representation(instance)
        if instance.lead and instance.lead.contact:
            repr['lead_name'] = f"{instance.lead.contact.first_name} {instance.lead.contact.last_name}"
        elif instance.lead:
            repr['lead_name'] = instance.lead.name or f"Lead #{instance.lead.id}"
        return repr
