import os
import django

# Setup Django
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from marketing.services.analytics_service import AnalyticsService
from crm_backend.views import DashboardStatsAPIView
from rest_framework.test import APIRequestFactory, force_authenticate
from django.contrib.auth import get_user_model

User = get_user_model()

def verify():
    print("Verifying Analytics via View Execution...")
    admin = User.objects.filter(role='admin').first()
    if not admin:
        print("No admin user found")
        return

    factory = APIRequestFactory()
    
    # 1. Test Dashboard Stats (used by /analytics page)
    print("\n--- Testing DashboardStatsAPIView ---")
    request = factory.get('/api/analytics/dashboard/')
    force_authenticate(request, user=admin)
    view = DashboardStatsAPIView.as_view()
    response = view(request)
    
    if response.status_code == 200:
        data = response.data
        print("Success!")
        print(f"  Leads: {data['stats']['leads']}")
        print(f"  Marketing ROI: {data['stats']['marketing_roi']}")
        print(f"  KPIs: {[k['label'] + ': ' + str(k['value']) for k in data['kpis']]}")
        print(f"  Lead Sources: {[ls['name'] + ': ' + str(ls['value']) + '% (Count: ' + str(ls.get('raw_count')) + ')' for ls in data['leadSources']]}")
    else:
        print(f"Failed Dashboard Stats: {response.status_code} {response.data}")

    # 2. Test Team Performance
    from crm_backend.views import TeamPerformanceAPIView
    print("\n--- Testing TeamPerformanceAPIView ---")
    request = factory.get('/api/analytics/team/')
    force_authenticate(request, user=admin)
    view = TeamPerformanceAPIView.as_view()
    response = view(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"Success! Found {len(data)} team members.")
        for member in data[:3]:
            print(f"  - {member['name']}: {member['deals']} deals, ${member['revenue']}")
    else:
        print(f"Failed Team Performance: {response.status_code} {response.data}")

    # 3. Test Marketing Analytics
    from marketing.views import MarketingAnalyticsView
    print("\n--- Testing MarketingAnalyticsView ---")
    request = factory.get('/api/marketing/analytics/')
    force_authenticate(request, user=admin)
    view = MarketingAnalyticsView.as_view()
    response = view(request)
    if response.status_code == 200:
        data = response.data
        print("Success!")
        print(f"  Total Leads: {data['total_leads']}")
        print(f"  Overall ROI: {data['overall_roi']}")
    else:
        print(f"Failed Marketing Analytics: {response.status_code} {response.data}")

    # 4. Test Campaigns Listing
    from marketing.views import CampaignViewSet
    print("\n--- Testing CampaignViewSet ---")
    request = factory.get('/api/marketing/campaigns/')
    force_authenticate(request, user=admin)
    view = CampaignViewSet.as_view({'get': 'list'})
    response = view(request)
    if response.status_code == 200:
        data = response.data
        print("Success!")
        print(f"  Campaigns Count: {data['count'] if isinstance(data, dict) and 'count' in data else len(data)}")
    else:
        print(f"Failed Campaigns: {response.status_code} {response.data}")


if __name__ == "__main__":
    verify()
