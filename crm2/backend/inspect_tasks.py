import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from tasks.models import Task

print("--- Active Tasks in DB ---")
tasks = Task.objects.filter(is_active=True)[:20]
for t in tasks:
    print(f"ID: {t.id} | Title: '{t.title}' | Type: '{t.task_type}' | Status: '{t.status}' | Lead: {t.lead_id} | Lead Name: {t.lead.name if t.lead else 'None'}")
