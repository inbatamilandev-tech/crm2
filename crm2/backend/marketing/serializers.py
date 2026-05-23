from rest_framework import serializers
from .models import Campaign, CampaignSnapshot
from .services.analytics_service import AnalyticsService

class CampaignSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    source_platform_display = serializers.CharField(source='get_source_platform_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    # KPIs from AnalyticsService
    roi_percentage = serializers.SerializerMethodField()
    cost_per_lead = serializers.SerializerMethodField()
    conversion_rate = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            'id', 'name', 'type', 'type_display', 'source_platform', 'source_platform_display',
            'target_audience', 'assigned_team', 'status', 'status_display',
            'description', 'budget', 'expected_revenue', 'actual_revenue',
            'sent', 'opened', 'clicked',
            'leads_generated', 'converted_deals',
            'start_date', 'end_date',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
            'roi_percentage', 'cost_per_lead', 'conversion_rate',
        ]
        read_only_fields = [
            'created_by', 'created_at', 'updated_at',
            'leads_generated', 'converted_deals',
            'roi_percentage', 'cost_per_lead', 'conversion_rate',
            'created_by_name', 'status_display', 'type_display', 'source_platform_display',
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_roi_percentage(self, obj):
        return AnalyticsService.calculate_roi(obj.actual_revenue, obj.budget)

    def get_cost_per_lead(self, obj):
        return AnalyticsService.calculate_cost_per_lead(obj.budget, obj.leads_generated)

    def get_conversion_rate(self, obj):
        return AnalyticsService.calculate_conversion_rate(obj.converted_deals, obj.leads_generated)

class CampaignSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignSnapshot
        fields = '__all__'
