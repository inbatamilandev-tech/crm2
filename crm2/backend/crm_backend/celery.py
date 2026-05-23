"""
Celery Application — Production Grade
========================================
Fix: call autodiscover_tasks() AFTER Django setup so INSTALLED_APPS is
populated and all app tasks.py modules are found.
"""

import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')

app = Celery('crm_backend')

# Pull all CELERY_* settings from Django settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Discover tasks.py in every app listed in INSTALLED_APPS
# Lambda forces lazy import so Django apps are ready first
app.autodiscover_tasks()


@app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    """Register periodic tasks here if needed (Celery Beat)."""
    pass


@app.task(bind=True, name='crm_backend.debug_task')
def debug_task(self):
    """Heartbeat task — run to verify Celery is alive."""
    import logging
    logging.getLogger(__name__).info('[Celery] debug_task executed — request: %r', self.request)
    return 'ok'
