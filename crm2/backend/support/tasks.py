from celery import shared_task
from .models import Case
from django.utils import timezone

@shared_task
def check_sla_breaches():
    now = timezone.now()
    # Find open cases where SLA deadline has passed and not already escalated
    breached_cases = Case.objects.filter(
        sla_deadline__lt=now,
        status__in=['New', 'Open', 'In Progress']
    )
    
    for case in breached_cases:
        case.status = 'Escalated'
        case.save() # Triggers post_save signal and broadcasts update
