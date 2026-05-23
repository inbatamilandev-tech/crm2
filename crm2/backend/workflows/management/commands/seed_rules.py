from django.core.management.base import BaseCommand
from workflows.models import WorkflowRule

class Command(BaseCommand):
    help = 'Seed WorkflowRule records'

    def handle(self, *args, **options):
        # Clear existing rules to start fresh with the new sales process
        WorkflowRule.objects.all().delete()
        
        rules = [
            {
                'name': 'Call Interested -> Qualify Lead & Schedule Discovery',
                'trigger_task_type': 'call',
                'trigger_outcome': 'interested',
                'actions': [
                    {'type': 'update_lead', 'status': 'qualified'},
                    {'type': 'create_task', 'task_type': 'meeting', 'title': 'Schedule Discovery Meeting', 'due_in_days': 1, 'priority': 'high'}
                ]
            },
            {
                'name': 'Call No Response -> Retry Call',
                'trigger_task_type': 'call',
                'trigger_outcome': 'no_response',
                'actions': [
                    {'type': 'create_task', 'task_type': 'call', 'title': 'Retry Call (Follow-up)', 'due_in_days': 1, 'priority': 'medium'}
                ]
            },
            {
                'name': 'Call Not Interested -> Mark Lost',
                'trigger_task_type': 'call',
                'trigger_outcome': 'not_interested',
                'actions': [
                    {'type': 'update_lead', 'status': 'lost'}
                ]
            },
            {
                'name': 'Meeting Success -> Prompt for Deal',
                'trigger_task_type': 'meeting',
                'trigger_outcome': 'success',
                'actions': [
                    # We don't auto-create the deal here anymore because it requires user input.
                    # Instead, we just update the lead to proposal stage.
                    {'type': 'update_lead', 'status': 'proposal'},
                ]
            }
        ]

        for rule_data in rules:
            rule = WorkflowRule.objects.create(
                name=rule_data['name'],
                trigger_task_type=rule_data['trigger_task_type'],
                trigger_outcome=rule_data['trigger_outcome'],
                actions=rule_data['actions'],
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f"Created rule: {rule.name}"))
