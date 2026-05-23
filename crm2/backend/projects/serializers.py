from rest_framework import serializers
from .models import Project, Milestone

class MilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    milestones = MilestoneSerializer(many=True, read_only=True)
    account_display = serializers.StringRelatedField(source='account', read_only=True)
    deal_display = serializers.StringRelatedField(source='deal', read_only=True)
    
    class Meta:
        model = Project
        fields = '__all__'

