import logging
from django.db.models import F
from marketing.models import Campaign, CampaignSnapshot
from django.utils import timezone

logger = logging.getLogger(__name__)

class CampaignService:
    """
    Business logic for campaign management.
    Handles counter increments, snapshotting, and performance tracking.
    """

    @staticmethod
    def increment_lead_counter(campaign_id):
        if not campaign_id:
            return
        Campaign.objects.filter(pk=campaign_id).update(
            leads_generated=F('leads_generated') + 1
        )
        logger.info(f"Incremented lead counter for campaign {campaign_id}")

    @staticmethod
    def increment_conversion_metrics(campaign_id, revenue):
        if not campaign_id:
            return
        Campaign.objects.filter(pk=campaign_id).update(
            converted_deals=F('converted_deals') + 1,
            actual_revenue=F('actual_revenue') + revenue
        )
        logger.info(f"Incremented conversion metrics for campaign {campaign_id} with revenue {revenue}")

    @staticmethod
    def create_daily_snapshot(campaign_id):
        """Record a snapshot of the current metrics for historical reporting."""
        try:
            campaign = Campaign.objects.get(pk=campaign_id)
            today = timezone.now().date()
            
            CampaignSnapshot.objects.update_or_create(
                campaign=campaign,
                date=today,
                defaults={
                    'leads_count': campaign.leads_generated,
                    'deals_count': campaign.converted_deals,
                    'revenue': campaign.actual_revenue,
                    'spend': campaign.budget / 30 if campaign.budget else 0 # Simple daily spend approximation
                }
            )
        except Campaign.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f"Failed to create snapshot for campaign {campaign_id}: {e}")
