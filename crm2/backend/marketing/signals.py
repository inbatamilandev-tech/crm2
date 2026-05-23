import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .services.campaign_service import CampaignService

logger = logging.getLogger(__name__)

def broadcast_marketing_update(event_type, data):
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                'global_notifications',
                {
                    'type': 'send_notification',
                    'message': {
                        'module': 'marketing',
                        'event': event_type,
                        **data
                    }
                }
            )
        except Exception as e:
            logger.error(f"Broadcast failed: {e}")

@receiver(post_save, sender='leads.Lead')
def on_lead_created(sender, instance, created, **kwargs):
    if not created or not instance.campaign_id:
        return

    # Trigger counter update via service (can be enqueued in production)
    CampaignService.increment_lead_counter(instance.campaign_id)
    
    # Trigger snapshot creation
    CampaignService.create_daily_snapshot(instance.campaign_id)

    # Incremental broadcast
    broadcast_marketing_update('lead_captured', {
        'lead_id': instance.pk,
        'campaign_id': instance.campaign_id,
        'source': instance.source
    })

@receiver(post_save, sender='deals.Deal')
def on_deal_won(sender, instance, created, **kwargs):
    if instance.status != 'won' or not instance.campaign_id:
        return
    
    # Check if status JUST changed to won
    # In a real system, we'd use __init__ tracker or similar
    
    CampaignService.increment_conversion_metrics(instance.campaign_id, instance.value)
    CampaignService.create_daily_snapshot(instance.campaign_id)

    broadcast_marketing_update('deal_won', {
        'deal_id': instance.pk,
        'campaign_id': instance.campaign_id,
        'revenue': float(instance.value)
    })
