import os
import django
import sys

# Setup Django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from workflows.models import WorkflowAction

print("--- Workflow Actions ---")
actions = WorkflowAction.objects.all()
for action in actions:
    print(f"ID: {action.id} | Type: {action.action_type} | Data: {action.action_data}")
