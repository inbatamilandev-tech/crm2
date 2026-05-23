import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from leads.models import Lead
from workflows.dispatcher import dispatch_event
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(role='admin').first()

print("Creating test lead...")
lead = Lead.objects.create(
    name="Test Conversion Bug",
    company="Bug Hunters",
    status="new",
    assigned_to=admin
)
print(f"Lead created: {lead.id}")

print("Triggering conversion event manually...")
# Trigger the 'stage_change' event which should fire the conversion workflow if rules exist
lead.status = 'qualified'
lead.save()

# Since we want to test 'convert_lead' action, we need a workflow that uses it.
# Based on logs, 'Lead Qualified - Convert to Deal' exists.
# Let's ensure it runs.
print("Checking logs for result...")
from workflows.models import WorkflowLog
logs = WorkflowLog.objects.filter(object_id=str(lead.id)).order_by('executed_at')
if logs:
    for log in logs:
        print(f"Workflow: {log.workflow.name} | Status: {log.status} | Msg: {log.message}")
else:
    print("No log found.")
