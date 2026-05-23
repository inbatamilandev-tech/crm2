import os
import sys
import pymysql
pymysql.version_info = (2, 2, 8, 'final', 0)
pymysql.install_as_MySQLdb()

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from users.models import Role, Permission, User

def seed_rbac():
    print("Seeding RBAC...")
    
    # Define permissions
    permissions_list = [
        ('quote.create', 'Can create quotes'),
        ('quote.edit', 'Can edit quotes'),
        ('quote.approve', 'Can approve quotes'),
        ('invoice.generate', 'Can generate invoices'),
        ('invoice.send', 'Can send invoices'),
        ('invoice.mark_paid', 'Can mark invoices as paid'),
        ('lead.view', 'Can view leads'),
        ('lead.edit', 'Can edit leads'),
        ('report.view', 'Can view reports'),
        ('admin.access', 'Full admin access'),
        ('ticket.view', 'Can view support tickets'),
        ('ticket.edit', 'Can edit support tickets'),
        ('task.view', 'Can view tasks'),
        ('task.edit', 'Can edit tasks'),
        ('deal.view', 'Can view deals'),
        ('deal.edit', 'Can edit deals'),
        # Enterprise Settings Permissions
        ('profile.manage', 'Can manage personal profile settings'),
        ('users.manage', 'Can manage users in the system'),
        ('roles.manage', 'Can manage roles and permissions'),
        ('workflow.manage', 'Can manage automation workflows'),
        ('security.manage', 'Can manage system security settings'),
        ('auditlogs.view', 'Can view system audit logs'),
        ('integrations.manage', 'Can manage API integrations'),
        ('system.manage', 'Can manage general system settings'),
        ('sales.settings.manage', 'Can manage sales preferences'),
        ('support.settings.manage', 'Can manage support preferences'),
        ('finance.settings.manage', 'Can manage finance preferences'),
    ]
    
    perms = {}
    for name, desc in permissions_list:
        perm, created = Permission.objects.get_or_create(name=name, defaults={'description': desc})
        perms[name] = perm
        if created:
            print(f"Created permission: {name}")
            
    # Define roles, scopes, and map permissions
    roles_mapping = {
        'System Administrator': {
            'scope': 'global',
            'permissions': list(perms.values())
        },
        'Sales Manager': {
            'scope': 'team',
            'permissions': [perms['quote.approve'], perms['report.view'], perms['deal.view'], perms['profile.manage'], perms['sales.settings.manage']]
        },
        'Sales Representative': {
            'scope': 'own',
            'permissions': [perms['lead.view'], perms['lead.edit'], perms['deal.view'], perms['deal.edit'], perms['task.view'], perms['task.edit'], perms['profile.manage']]
        },
        'Support Agent': {
            'scope': 'own',
            'permissions': [perms['ticket.view'], perms['ticket.edit'], perms['profile.manage'], perms['support.settings.manage']]
        },
        'Finance Manager': {
            'scope': 'global',
            'permissions': [perms['invoice.generate'], perms['invoice.send'], perms['invoice.mark_paid'], perms['profile.manage'], perms['finance.settings.manage']]
        },
        'Executive': {
            'scope': 'global',
            'permissions': [perms['report.view'], perms['lead.view'], perms['deal.view'], perms['profile.manage']]
        },
    }
    
    for role_name, role_data in roles_mapping.items():
        role, created = Role.objects.get_or_create(name=role_name)
        role.scope = role_data['scope']
        role.save()
        role.permissions.set(role_data['permissions'])
        if created:
            print(f"Created role: {role_name} with scope {role.scope}")
            
    # Create sample users
    sample_users = [
        ('admin@crm.com', 'admin', 'System Administrator'),
        ('manager@crm.com', 'manager', 'Sales Manager'),
        ('sales@crm.com', 'sales', 'Sales Representative'),
        ('support@crm.com', 'support', 'Support Agent'),
        ('finance@crm.com', 'finance', 'Finance Manager'),
        ('executive@crm.com', 'executive', 'Executive'),
    ]
    
    for email, password, role_name in sample_users:
        username = email.split('@')[0]
        user, created = User.objects.get_or_create(username=username, defaults={
            'email': email,
            'first_name': username.capitalize(),
            'last_name': 'Demo',
            'role': role_name.lower().replace(' ', '_'),
        })
        user.set_password(password)
        if created:
            print(f"Created sample user: {username}")
        else:
            print(f"Reset password for existing user: {username}")
        
        user.email = email
        user.role_fk = Role.objects.get(name=role_name)
        user.save()
        print(f"Updated user {username} with role {role_name}")

if __name__ == '__main__':
    seed_rbac()
