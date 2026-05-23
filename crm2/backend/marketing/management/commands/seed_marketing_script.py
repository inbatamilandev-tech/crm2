import os
import django
import random
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

# Setup Django
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from marketing.models import Campaign, CampaignSnapshot
from leads.models import Lead
from deals.models import Deal
from django.contrib.auth import get_user_model

User = get_user_model()

def seed_marketing():
    print("Clearing old data...")
    Lead.objects.all().delete()
    Deal.objects.all().delete()
    Campaign.objects.all().delete()
    CampaignSnapshot.objects.all().delete()
    
    print("Seeding Marketing Module...")
    
    admin = User.objects.filter(role='admin').first()
    sales_users = list(User.objects.filter(role='sales', is_active=True))
    if not sales_users:
        sales_users = [admin]

    # 1. Create Campaigns
    campaign_data = [
        {"name": "Google Ads - Search Q2", "type": "seo", "platform": "google", "budget": 5000, "revenue": 12000},
        {"name": "Facebook Retargeting", "type": "social", "platform": "facebook", "budget": 2000, "revenue": 4500},
        {"name": "LinkedIn Outreach", "type": "social", "platform": "linkedin", "budget": 1500, "revenue": 8000},
        {"name": "Email Newsletter May", "type": "email", "platform": "email", "budget": 200, "revenue": 1500},
        {"name": "WhatsApp Broadcast", "type": "whatsapp", "platform": "whatsapp", "budget": 100, "revenue": 900},
        {"name": "In-Person Direct Event", "type": "event", "platform": "direct", "budget": 3000, "revenue": 15000},
        {"name": "Summer Referral Program", "type": "referral", "platform": "referral", "budget": 1000, "revenue": 5000},
    ]

    campaigns = []
    for data in campaign_data:
        campaign, created = Campaign.objects.update_or_create(
            name=data["name"],
            defaults={
                "type": data["type"],
                "source_platform": data["platform"],
                "status": "active",
                "budget": data["budget"],
                "expected_revenue": data["revenue"] * 1.2,
                "actual_revenue": 0, # Will be updated by deals
                "created_by": admin,
                "start_date": timezone.now().date() - timedelta(days=30),
                "end_date": timezone.now().date() + timedelta(days=60),
            }
        )
        campaigns.append(campaign)
        print(f"  Created Campaign: {campaign.name}")

    # 2. Create Leads & Attribution
    sources = ['google', 'facebook', 'website', 'referral', 'whatsapp', 'linkedin', 'direct', 'email']
    statuses = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
    
    print("  Creating Leads...")
    with transaction.atomic():
        for i in range(150):
            campaign = random.choice(campaigns)
            source_weights = [40, 20, 5, 10, 12, 5, 3, 5] # google, facebook, website, referral, whatsapp, linkedin, direct, email
            source = campaign.source_platform or random.choices(sources, weights=source_weights)[0]
            status = random.choices(statuses, weights=[30, 20, 15, 10, 15, 10])[0]
            
            lead = Lead.objects.create(
                name=f"Lead {i+1}",
                email=f"lead{i+1}@example.com",
                company=f"Company {random.randint(1, 50)}",
                source=source,
                campaign=campaign,
                status=status,
                assigned_to=random.choice(sales_users),
                utm_source=source,
                utm_medium="cpc" if source in ['google', 'facebook'] else "organic",
                utm_campaign=campaign.name.replace(" ", "_"),
                first_touch_source=source,
                latest_touch_source=source,
            )
            
            # Update campaign counter
            campaign.leads_generated += 1
            campaign.save()

            # 3. Create Deals for Won Leads
            if status == 'won':
                value = random.randint(500, 5000)
                Deal.objects.create(
                    title=f"Deal for {lead.name}",
                    lead=lead,
                    value=value,
                    status='won',
                    campaign=campaign,
                    owner=lead.assigned_to,
                    expected_close_date=timezone.now().date()
                )
                campaign.converted_deals += 1
                campaign.actual_revenue += value
                campaign.save()

    # 4. Create Historical Snapshots (Last 30 Days)
    print("  Creating Snapshots...")
    for campaign in campaigns:
        total_leads = campaign.leads_generated
        total_revenue = campaign.actual_revenue
        
        for d in range(30, -1, -1):
            date = timezone.now().date() - timedelta(days=d)
            # Progressive growth for snapshots
            factor = (30 - d) / 30.0
            CampaignSnapshot.objects.update_or_create(
                campaign=campaign,
                date=date,
                defaults={
                    'leads_count': int(total_leads * factor),
                    'deals_count': int(campaign.converted_deals * factor),
                    'revenue': total_revenue * factor,
                    'spend': (campaign.budget / 30) * (30 - d)
                }
            )

    print("Marketing Module Seeding Complete.")

if __name__ == "__main__":
    seed_marketing()
