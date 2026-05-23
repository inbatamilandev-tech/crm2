from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

class AnalyticsService:
    """
    Central source of truth for Marketing KPI formulas.
    Decouples calculation logic from serializers and views.
    """

    @staticmethod
    def calculate_roi(revenue, budget):
        """Formula: ((Revenue - Spend) / Spend) * 100"""
        revenue = float(revenue or 0)
        budget = float(budget or 0)
        if budget > 0:
            return round(((revenue - budget) / budget) * 100, 1)
        return 0.0

    @staticmethod
    def calculate_cost_per_lead(budget, leads_count):
        """Formula: Campaign Spend / Total Leads"""
        budget = float(budget or 0)
        leads_count = int(leads_count or 0)
        if leads_count > 0:
            return round(budget / leads_count, 2)
        return 0.0

    @staticmethod
    def calculate_conversion_rate(converted_leads, total_leads):
        """Formula: Converted Leads / Total Leads"""
        converted_leads = int(converted_leads or 0)
        total_leads = int(total_leads or 0)
        if total_leads > 0:
            return round((converted_leads / total_leads) * 100, 1)
        return 0.0

    @classmethod
    def get_campaign_metrics(cls, campaign):
        """Aggregate all metrics for a specific campaign."""
        return {
            'roi': cls.calculate_roi(campaign.actual_revenue, campaign.budget),
            'cost_per_lead': cls.calculate_cost_per_lead(campaign.budget, campaign.leads_generated),
            'conversion_rate': cls.calculate_conversion_rate(campaign.converted_deals, campaign.leads_generated)
        }

    @classmethod
    def get_overall_marketing_stats(cls):
        """Global marketing stats for the dashboard."""
        from marketing.models import Campaign
        from leads.models import Lead
        from deals.models import Deal

        campaigns = Campaign.objects.all()
        leads = Lead.objects.filter(is_deleted=False)
        # Only campaign-linked deals for marketing ROI
        won_deals = Deal.objects.filter(status='won', campaign__isnull=False)
        
        total_budget = campaigns.aggregate(total=Sum('budget'))['total'] or 0
        total_revenue = won_deals.aggregate(total=Sum('value'))['total'] or 0
        total_leads = leads.filter(campaign__isnull=False).count()
        won_deals_count = won_deals.count()

        return {
            'total_leads': leads.count(),
            'campaign_leads': total_leads,
            'active_campaigns': campaigns.filter(status='active').count(),
            'won_deals_count': won_deals_count,
            'total_won_revenue': float(total_revenue),
            'total_budget': float(total_budget),
            'cost_per_lead': cls.calculate_cost_per_lead(total_budget, total_leads),
            'overall_roi': cls.calculate_roi(total_revenue, total_budget),
            'conversion_rate': cls.calculate_conversion_rate(won_deals_count, total_leads),
        }

    @staticmethod
    def get_marketing_trends(days=30):
        """
        Calculates trends by comparing current metrics with metrics from N days ago.
        """
        from django.db.models import Sum
        from marketing.models import CampaignSnapshot
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now().date()
        current_date = now
        prev_date = now - timedelta(days=days)

        # Current total metrics (latest snapshots)
        curr_stats = CampaignSnapshot.objects.filter(date=current_date).aggregate(
            total_revenue=Sum('revenue'),
            total_spend=Sum('spend')
        )
        
        # Previous total metrics
        prev_stats = CampaignSnapshot.objects.filter(date=prev_date).aggregate(
            total_revenue=Sum('revenue'),
            total_spend=Sum('spend')
        )

        curr_rev = float(curr_stats['total_revenue'] or 0)
        curr_spend = float(curr_stats['total_spend'] or 0)
        prev_rev = float(prev_stats['total_revenue'] or 0)
        prev_spend = float(prev_stats['total_spend'] or 0)

        curr_roi = ((curr_rev - curr_spend) / curr_spend * 100) if curr_spend > 0 else 0
        prev_roi = ((prev_rev - prev_spend) / prev_spend * 100) if prev_spend > 0 else 0

        roi_change = curr_roi - prev_roi
        return f"{'+' if roi_change >= 0 else ''}{round(roi_change, 1)}%"
