from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Case
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .automation import detect_priority, calculate_sla_deadline, auto_assign_agent

@receiver(pre_save, sender=Case)
def handle_pre_save_case(sender, instance, **kwargs):
    # Store old status for post_save comparison
    if instance.pk:
        try:
            old_instance = Case.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Case.DoesNotExist:
            instance._old_status = None
            
    # Apply automation on creation
    else:
        # 1. Auto priority detection
        instance.priority = detect_priority(instance.subject, instance.description)
            
        # 2. Auto SLA calculation
        instance.sla_deadline = calculate_sla_deadline(instance.priority)
            
        # 3. Auto assignment
        if not instance.assigned_to:
            instance.assigned_to = auto_assign_agent(instance)

@receiver(post_save, sender=Case)
def broadcast_case_update(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_status', None)
    
    # Only broadcast if created or status changed
    if created or old_status != instance.status:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'global_notifications',
                {
                    'type': 'send_notification',
                    'message': {
                        'event': 'case_created' if created else 'case_updated',
                        'case_id': instance.case_id,
                        'subject': instance.subject,
                        'status': instance.status,
                        'priority': instance.priority,
                        'assigned_to': instance.assigned_to.username if instance.assigned_to else None,
                    }
                }
            )
