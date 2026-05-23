from rest_framework import serializers
from .models import Case, Solution, Service, Feedback, CaseAttachment

class CaseAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaseAttachment
        fields = '__all__'

class CaseSerializer(serializers.ModelSerializer):
    attachments = CaseAttachmentSerializer(many=True, read_only=True)
    contact_name = serializers.SerializerMethodField()
    account_name = serializers.CharField(source='account.name', read_only=True)
    deal_title = serializers.CharField(source='deal.title', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)

    class Meta:
        model = Case
        fields = '__all__'

    def get_contact_name(self, obj):
        if obj.contact:
            return f"{obj.contact.first_name} {obj.contact.last_name}".strip()
        return None

class SolutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Solution
        fields = '__all__'

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = '__all__'

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = '__all__'
