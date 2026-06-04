import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from users.models import User, Role, Permission

# 1. Run seed_rbac manually if needed to ensure Admin role exists
try:
    from django.core.management import call_command
    call_command('seed_rbac')
    print("Seeded RBAC successfully.")
except Exception as e:
    print("Could not seed RBAC:", e)

try:
    # 2. Get the Admin role
    admin_role = Role.objects.filter(name__icontains='admin').first()
    if not admin_role:
        print("Admin role not found. Creating it...")
        admin_role = Role.objects.create(name='System Administrator', data_scope='all')
        # Assign all permissions
        all_perms = Permission.objects.all()
        admin_role.permissions.set(all_perms)
        print(f"Created Admin role with {all_perms.count()} permissions.")

    # 3. Assign to all superusers or users without a role
    users_updated = 0
    for user in User.objects.filter(is_superuser=True):
        user.role = admin_role
        user.save()
        users_updated += 1
        print(f"Assigned Admin role to superuser: {user.username}")
    
    # Also assign to 'admin' username if it exists
    admin_user = User.objects.filter(username='admin').first()
    if admin_user and not admin_user.is_superuser:
        admin_user.role = admin_role
        admin_user.save()
        users_updated += 1
        print(f"Assigned Admin role to admin user: {admin_user.username}")

    print(f"Total users updated: {users_updated}")

except Exception as e:
    print("Error assigning role:", e)
