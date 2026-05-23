import os
import django

# Setup Django
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from leads.models import Lead
from django.db.models import Count

def check_sources():
    print("Checking Raw Lead Sources...")
    counts = Lead.objects.values('source').annotate(count=Count('id')).order_by('-count')
    for c in counts:
        print(f"Source Key: '{c['source']}', Count: {c['count']}")

    print("\nSample Leads with source 'linkedin':")
    for l in Lead.objects.filter(source='linkedin')[:5]:
        print(f" - ID: {l.id}, Name: {l.name}")

    print("\nSample Leads with source 'direct':")
    for l in Lead.objects.filter(source='direct')[:5]:
        print(f" - ID: {l.id}, Name: {l.name}")

if __name__ == "__main__":
    check_sources()
