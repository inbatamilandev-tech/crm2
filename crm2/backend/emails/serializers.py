from rest_framework import serializers
from emails.models import Email, EmailTemplate

class EmailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Email
        fields = '__all__'
        read_only_fields = ('provider_message_id', 'sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'failed_reason', 'created_by')

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = ('created_by',)
