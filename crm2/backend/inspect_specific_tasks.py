import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from tasks.models import Task

print("--- Inspecting Call Queue Tasks ---")
# Let's search for tasks with titles like "Initial Contact Call" or similar
tasks = Task.objects.filter(title="Initial Contact Call").order_by('id')[:10]
for t in tasks:
    print(f"ID: {t.id} | Title: '{t.title}' | Status: '{t.status}' | Assigned To: {t.assigned_to.username if t.assigned_to else 'None'} | Assigned To Role: {t.assigned_to.role if t.assigned_to else 'None'} | Lead: {t.lead_id} | Lead Name: {t.lead.name if t.lead else 'None'}")
