import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from workflows.engine import trigger_workflows
from workflows.models import Workflow
from leads.models import Lead

lead = Lead.objects.get(id=38)
print(f"Testing trigger_workflows for Lead {lead.id} (status={lead.status})")

# Check if any workflows match the query
module_name = 'lead'
trigger_event = 'stage_change'
workflows = Workflow.objects.filter(
    module=module_name,
    trigger_event__in={trigger_event},
    is_active=True,
)
print(f"Workflows matching module={module_name}, trigger={trigger_event}: {workflows.count()}")
for wf in workflows:
    print(f"  - {wf.name}")

print("\nExecuting trigger_workflows...")
trigger_workflows(module_name, trigger_event, lead, extra_context={'field': 'status', 'old_value': 'new', 'new_value': 'qualified'})

print("\nChecking logs...")
from workflows.models import WorkflowLog
logs = WorkflowLog.objects.filter(object_id='38').order_by('-executed_at')
for log in logs:
    print(f"Log: {log.workflow.name} | Status: {log.status} | Msg: {log.message}")
