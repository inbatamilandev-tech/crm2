import os
import django
import sys

# Setup Django
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from activities.models import Campaign as OldCampaign
from marketing.models import Campaign as NewCampaign
from django.db import transaction

def migrate_campaigns():
    print("Starting campaign data migration...")
    old_campaigns = OldCampaign.objects.all()
    count = old_campaigns.count()
    print(f"Found {count} campaigns to migrate.")

    with transaction.atomic():
        for old in old_campaigns:
            # Check if already migrated (by name and created_at)
            if NewCampaign.objects.filter(name=old.name, created_at=old.created_at).exists():
                print(f"Skipping {old.name} (already migrated)")
                continue
                
            new = NewCampaign.objects.create(
                id=old.id, # Keep ID if possible to maintain FK integrity during transition
                name=old.name,
                type=old.type,
                source_platform=old.source_platform,
                target_audience=old.target_audience,
                assigned_team=old.assigned_team,
                status=old.status,
                description=old.description,
                budget=old.budget,
                expected_revenue=old.expected_revenue,
                actual_revenue=old.actual_revenue,
                sent=old.sent,
                opened=old.opened,
                clicked=old.clicked,
                leads_generated=old.leads_generated,
                converted_deals=old.converted_deals,
                start_date=old.start_date,
                end_date=old.end_date,
                created_by=old.created_by,
                created_at=old.created_at,
                updated_at=old.updated_at
            )
            print(f"Migrated: {new.name}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate_campaigns()
