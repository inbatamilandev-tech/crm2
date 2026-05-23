from celery import shared_task
from django.db import transaction
from django.core.cache import cache
from leads.models import Lead
from leads.constants import VALID_TRANSITIONS
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def process_lead_autopilot(self, lead_id):
    """
    AutoPilot strictly evaluates the lead and ONLY updates Lead.status.
    It never creates tasks directly.
    """
    try:
        lead = Lead.objects.filter(id=lead_id).first()
        if not lead or lead.status in ['won', 'lost']:
            return

        # 1. Evaluation Logic
        if lead.score < 40:
            new_status = 'lost'
        elif lead.score >= 70 and lead.status == 'contacted':
            new_status = 'qualified'
        elif lead.score >= 40 and lead.status == 'new':
            new_status = 'contacted'
        else:
            return # No action needed

        # 2. Idempotency & Transition Rules Before Lock
        if lead.status == new_status:
            return
            
        if new_status not in VALID_TRANSITIONS.get(lead.status, []):
            logger.warning(f"Invalid transition blocked: {lead.status} -> {new_status}")
            return

        dedupe_key = f"autopilot:{lead.id}:{new_status}"
        if cache.get(dedupe_key):
            return
        cache.set(dedupe_key, True, timeout=60)

        # 3. Safe DB Update
        with transaction.atomic():
            locked_lead = Lead.objects.select_for_update().get(id=lead.id)
            if locked_lead.status == new_status or locked_lead.status in ['won', 'lost']:
                return
            if new_status not in VALID_TRANSITIONS.get(locked_lead.status, []):
                return
            
            logger.info(f"[AutoPilot] Advancing Lead:{locked_lead.id} {locked_lead.status} -> {new_status}")
            locked_lead.status = new_status
            locked_lead.save()

    except Exception as e:
        logger.error(f"[AutoPilot Error] {str(e)}", exc_info=True)
        raise self.retry(exc=e, countdown=30)
