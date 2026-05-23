"""
Management command to seed example workflows into the database.

Usage:
    python manage.py seed_workflows
    python manage.py seed_workflows --reset  # Delete all first, then recreate
"""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed example workflows for CRM automation"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete all existing workflows before seeding (destructive!)',
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List available example workflows without creating them',
        )

    def handle(self, *args, **options):
        from workflows.examples import create_example_workflows, list_example_workflows
        from workflows.models import Workflow

        if options['list']:
            examples = list_example_workflows()
            self.stdout.write(self.style.SUCCESS(f"\n{'='*60}"))
            self.stdout.write(self.style.SUCCESS("  Available Example Workflows"))
            self.stdout.write(self.style.SUCCESS(f"{'='*60}"))
            for i, wf in enumerate(examples, 1):
                self.stdout.write(
                    f"\n  {i}. {self.style.NOTICE(wf['name'])}\n"
                    f"     Module: {wf['module']} | Trigger: {wf['trigger']}\n"
                    f"     {wf['description']}\n"
                    f"     Actions: {wf['action_count']}"
                )
            self.stdout.write("")
            return

        if options['reset']:
            count = Workflow.objects.count()
            Workflow.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f"Deleted {count} existing workflow(s).")
            )

        result = create_example_workflows()

        self.stdout.write(self.style.SUCCESS(f"\n{'='*60}"))
        self.stdout.write(self.style.SUCCESS("  Workflow Seeding Complete"))
        self.stdout.write(self.style.SUCCESS(f"{'='*60}"))
        self.stdout.write(f"  Total examples : {result['total_workflows']}")
        self.stdout.write(f"  Newly created  : {self.style.SUCCESS(str(result['newly_created']))}")
        self.stdout.write(f"  Already existed: {result['already_existed']}")
        self.stdout.write("")
        self.stdout.write("  >> Run 'python manage.py seed_workflows --list' to view workflows")
        self.stdout.write("")
