"""
seed_permissions.py
-------------------
Run this script ONCE to populate all required RBAC permissions and
ensure the Admin role has full access.

Usage:
    cd backend
    python seed_permissions.py

This is safe to run multiple times — uses get_or_create throughout.
"""

import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from users.models import Permission, Role


# ---------------------------------------------------------------------------
# 1. Master permission list
#    Format: ('codename', 'Human-readable description')
# ---------------------------------------------------------------------------
ALL_PERMISSIONS = [
    # ── Leads ──────────────────────────────────────────────────────────────
    ('lead.create',  'Can create leads'),
    ('lead.view',    'Can view leads'),
    ('lead.edit',    'Can edit leads'),
    ('lead.delete',  'Can delete leads'),

    # ── Contacts ───────────────────────────────────────────────────────────
    ('contact.create', 'Can create contacts'),
    ('contact.view',   'Can view contacts'),
    ('contact.edit',   'Can edit contacts'),
    ('contact.delete', 'Can delete contacts'),

    # ── Deals ──────────────────────────────────────────────────────────────
    ('deal.create', 'Can create deals'),
    ('deal.view',   'Can view deals'),
    ('deal.edit',   'Can edit deals'),
    ('deal.delete', 'Can delete deals'),

    # ── Tasks ──────────────────────────────────────────────────────────────
    ('task.create', 'Can create tasks'),
    ('task.view',   'Can view tasks'),
    ('task.edit',   'Can edit tasks'),
    ('task.delete', 'Can delete tasks'),

    # ── Quotes ─────────────────────────────────────────────────────────────
    ('quote.create',  'Can create quotes'),
    ('quote.view',    'Can view quotes'),
    ('quote.edit',    'Can edit quotes'),
    ('quote.delete',  'Can delete quotes'),
    ('quote.approve', 'Can approve quotes'),

    # ── Invoices ───────────────────────────────────────────────────────────
    ('invoice.create',    'Can create invoices'),
    ('invoice.view',      'Can view invoices'),
    ('invoice.edit',      'Can edit invoices'),
    ('invoice.delete',    'Can delete invoices'),
    ('invoice.generate',  'Can generate invoices from quotes'),
    ('invoice.send',      'Can send invoices to clients'),
    ('invoice.mark_paid', 'Can mark invoices as paid'),

    # ── Calls ──────────────────────────────────────────────────────────────
    ('call.create', 'Can create calls'),
    ('call.view',   'Can view calls'),
    ('call.edit',   'Can edit calls'),
    ('call.delete', 'Can delete calls'),

    # ── Meetings ───────────────────────────────────────────────────────────
    ('meeting.create', 'Can create meetings'),
    ('meeting.view',   'Can view meetings'),
    ('meeting.edit',   'Can edit meetings'),
    ('meeting.delete', 'Can delete meetings'),

    # ── Reports / Analytics ────────────────────────────────────────────────
    ('report.view', 'Can view reports'),

    # ── Support / Tickets ──────────────────────────────────────────────────
    ('ticket.view', 'Can view support tickets'),
    ('ticket.edit', 'Can edit support tickets'),

    # ── Admin shortcut (bypasses all module checks) ────────────────────────
    ('admin.access', 'Full admin access — bypasses all module permission checks'),

    # ── Settings & System ──────────────────────────────────────────────────
    ('profile.manage',           'Can manage personal profile settings'),
    ('users.manage',             'Can manage users in the system'),
    ('roles.manage',             'Can manage roles and permissions'),
    ('workflow.manage',          'Can manage automation workflows'),
    ('security.manage',          'Can manage system security settings'),
    ('auditlogs.view',           'Can view system audit logs'),
    ('integrations.manage',      'Can manage API integrations'),
    ('system.manage',            'Can manage general system settings'),
    ('sales.settings.manage',    'Can manage sales preferences'),
    ('support.settings.manage',  'Can manage support preferences'),
    ('finance.settings.manage',  'Can manage finance preferences'),
]


def seed():
    print("=" * 60)
    print("  CRM RBAC — Seeding Permissions")
    print("=" * 60)

    created_count = 0
    perm_objects = {}

    for codename, description in ALL_PERMISSIONS:
        perm, created = Permission.objects.get_or_create(
            name=codename,
            defaults={'description': description}
        )
        perm_objects[codename] = perm
        if created:
            print(f"  [NEW]      {codename}")
            created_count += 1
        else:
            print(f"  [EXISTS]   {codename}")

    print(f"\n  Created {created_count} new permission(s). "
          f"{len(ALL_PERMISSIONS) - created_count} already existed.\n")

    # -----------------------------------------------------------------------
    # 2. Ensure Admin / System Administrator role has ALL permissions
    # -----------------------------------------------------------------------
    print("=" * 60)
    print("  Syncing Admin role permissions")
    print("=" * 60)

    all_perms = list(perm_objects.values())

    # Try both common admin role names
    for admin_role_name in ('Admin', 'System Administrator'):
        try:
            admin_role = Role.objects.get(name=admin_role_name)
            admin_role.permissions.set(all_perms)
            # Ensure global scope
            if admin_role.data_scope != 'global':
                admin_role.data_scope = 'global'
                admin_role.save(update_fields=['data_scope'])
            print(f"  [OK] '{admin_role_name}' role now has ALL {len(all_perms)} permissions "
                  f"and data_scope='global'.")
        except Role.DoesNotExist:
            print(f"  [SKIP] Role '{admin_role_name}' not found — skipping.")

    print("\nDone! All permissions are seeded.\n")
    print("Next steps:")
    print("  1. Go to Settings -> Roles & Permissions in the CRM UI")
    print("  2. Edit each role and assign the required permissions")
    print("  3. Reassign users to their correct roles if needed")
    print("=" * 60)


if __name__ == '__main__':
    seed()
