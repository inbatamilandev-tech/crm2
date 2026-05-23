import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from workflows.models import WorkflowLog, Workflow
from leads.models import Lead

print("--- Recent Workflow Logs ---")
logs = WorkflowLog.objects.order_by('-executed_at')[:10]
for log in logs:
    print(f"Workflow: {log.workflow.name} | Status: {log.status} | Object: {log.object_id} | Msg: {log.message}")

print("\n--- Active Lead Workflows ---")
workflows = Workflow.objects.filter(module='lead', is_active=True)
for wf in workflows:
    print(f"WF: {wf.name} | Trigger: {wf.trigger_event}")

print("\n--- Recent Leads ---")
leads = Lead.objects.order_by('-created_at')[:5]
for lead in leads:
    print(f"Lead ID: {lead.id} | Status: {lead.status} | Created: {lead.created_at}")
