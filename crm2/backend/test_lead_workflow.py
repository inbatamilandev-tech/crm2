import os
import django
import sys
import uuid

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from leads.models import Lead
from workflows.models import WorkflowLog, WorkflowEvent

print("--- Testing Lead Creation Workflow ---")

# Create a new lead
lead_name = f"Test Lead {uuid.uuid4().hex[:6]}"
print(f"Creating lead: {lead_name}")
lead = Lead.objects.create(
    name=lead_name,
    email=f"test_{uuid.uuid4().hex[:4]}@example.com",
    company="Test Co",
    status='new'
)
print(f"Lead created with ID: {lead.id}")

# Check for events
event = WorkflowEvent.objects.filter(module='lead', object_id=str(lead.id), trigger='on_create').first()
if event:
    print(f"Event recorded: {event.event_key}")
else:
    print("No event recorded for lead creation!")

# Check for logs
log = WorkflowLog.objects.filter(object_id=str(lead.id)).order_by('-executed_at').first()
if log:
    print(f"Workflow Log found: {log.workflow.name} | Status: {log.status} | Msg: {log.message}")
else:
    print("No workflow log found for this lead.")
