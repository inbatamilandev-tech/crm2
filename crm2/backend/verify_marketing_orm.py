import os
import django

# Setup Django
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from marketing.models import Campaign
from marketing.services.analytics_service import AnalyticsService

def verify():
    print("Verifying Marketing Data via ORM...")
    campaigns = Campaign.objects.all()
    print(f"Total Campaigns: {campaigns.count()}")
    
    for c in campaigns[:3]:
        metrics = AnalyticsService.get_campaign_metrics(c)
        print(f"Campaign: {c.name}")
        print(f"  Leads: {c.leads_generated}")
        print(f"  Deals: {c.converted_deals}")
        print(f"  ROI: {metrics['roi']}%")
        print(f"  Cost Per Lead: ${metrics['cost_per_lead']}")

    stats = AnalyticsService.get_overall_marketing_stats()
    print("\nOverall Marketing Stats:")
    print(f"  Total Leads: {stats['total_leads']}")
    print(f"  Overall ROI: {stats['overall_roi']}%")
    print(f"  Conversion Rate: {stats['conversion_rate']}%")

if __name__ == "__main__":
    verify()
