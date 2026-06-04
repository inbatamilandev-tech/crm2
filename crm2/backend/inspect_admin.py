import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.filter(username='admin').first()
if admin:
    print(f"Username: {admin.username}")
    print(f"Role: {admin.role}")
    print(f"Role_FK: {admin.role_fk}")
    if admin.role_fk:
        print(f"Role_FK Name: {admin.role_fk.name}")
        print(f"Role_FK Scope: {admin.role_fk.scope}")
        print(f"Role_FK Permissions: {[p.name for p in admin.role_fk.permissions.all()]}")
else:
    print("No admin user found by username 'admin'")
