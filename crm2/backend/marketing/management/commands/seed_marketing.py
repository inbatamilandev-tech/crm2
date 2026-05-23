from django.core.management.base import BaseCommand
from marketing.management.commands.seed_marketing_script import seed_marketing

class Command(BaseCommand):
    help = 'Seeds the Marketing module with realistic data'

    def handle(self, *args, **options):
        seed_marketing()
        self.stdout.write(self.style.SUCCESS('Successfully seeded marketing module'))
