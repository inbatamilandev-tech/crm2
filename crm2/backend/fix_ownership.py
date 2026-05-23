import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from contacts.models import Contact
from deals.models import Deal

User = get_user_model()
admin_user = User.objects.filter(is_superuser=True).first() or User.objects.first()

print(f"Fallback admin user: {admin_user}")

# Update Contacts
contacts_updated = 0
for contact in Contact.objects.all():
    if not contact.owner:
        if contact.linked_lead and contact.linked_lead.assigned_to:
            contact.owner = contact.linked_lead.assigned_to
        else:
            contact.owner = admin_user
        contact.save(update_fields=['owner'])
        contacts_updated += 1

print(f"Updated {contacts_updated} contacts.")

# Update Deals
deals_updated = 0
for deal in Deal.objects.all():
    if not deal.owner:
        if deal.contact and deal.contact.owner:
            deal.owner = deal.contact.owner
        else:
            deal.owner = admin_user
        deal.save(update_fields=['owner'])
        deals_updated += 1

print(f"Updated {deals_updated} deals.")
