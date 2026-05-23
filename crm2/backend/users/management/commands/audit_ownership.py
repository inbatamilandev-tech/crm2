"""
Management command: audit_ownership
====================================
Production-grade data integrity command for the CRM ownership model.

Usage:
    python manage.py audit_ownership              # Dry-run (report only)
    python manage.py audit_ownership --fix         # Fix all orphan records
    python manage.py audit_ownership --fix --admin-id 1  # Use a specific fallback user

What it does:
    1. Finds all Contact records with NULL owner
    2. Finds all Deal records with NULL owner
    3. Finds all Task records with NULL assigned_to
    4. Finds all Lead records with NULL assigned_to
    5. Reports user role mismatches (superusers without role='admin')
    6. Reports counts per user/model
    7. If --fix is passed: assigns fallback owner (admin user or --admin-id)

This command is idempotent and safe to re-run at any time.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Audit and optionally fix ownership gaps across Contacts, Deals, and Tasks.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            default=False,
            help='Apply fixes (without this flag the command runs in dry-run mode).',
        )
        parser.add_argument(
            '--admin-id',
            type=int,
            default=None,
            help='User ID to use as fallback owner when fixing orphan records. '
                 'Defaults to the first superuser or first admin-role user found.',
        )

    def handle(self, *args, **options):
        dry_run = not options['fix']
        admin_id = options['admin_id']

        self.stdout.write(self.style.WARNING(
            '\n' + '=' * 60
        ))
        self.stdout.write(self.style.WARNING(
            '  CRM Ownership Audit' + (' [DRY RUN]' if dry_run else ' [FIX MODE]')
        ))
        self.stdout.write(self.style.WARNING(
            '=' * 60 + '\n'
        ))

        # ── Resolve fallback owner ──────────────────────────────────────
        fallback_user = None
        if not dry_run:
            fallback_user = self._resolve_fallback_user(admin_id)
            if fallback_user is None:
                raise CommandError(
                    'No fallback owner found. Create a superuser first or '
                    'specify --admin-id.'
                )
            self.stdout.write(
                f'  Fallback owner: {fallback_user.username} '
                f'(id={fallback_user.id}, role={fallback_user.role})\n'
            )

        # ── Import models here (after django.setup()) ───────────────────
        from contacts.models import Contact
        from deals.models import Deal
        from tasks.models import Task
        from leads.models import Lead

        total_issues = 0

        # ── Check user roles ─────────────────────────────────────────────
        self.stdout.write('\n  --- User Role Verification ---')
        superusers_wrong_role = User.objects.filter(is_superuser=True).exclude(role='admin')
        if superusers_wrong_role.exists():
            self.stdout.write(self.style.ERROR(
                f'  [ERROR] {superusers_wrong_role.count()} superuser(s) do NOT have role="admin"'
            ))
            for u in superusers_wrong_role:
                self.stdout.write(f'      - id={u.id} username={u.username} role={u.role}')
            if not dry_run:
                fixed = superusers_wrong_role.update(role='admin')
                self.stdout.write(self.style.SUCCESS(
                    f'      --> Fixed {fixed} user(s) to role="admin"'
                ))
                total_issues += fixed
            else:
                total_issues += superusers_wrong_role.count()
        else:
            self.stdout.write(self.style.SUCCESS(
                '  [OK] All superusers have role="admin"'
            ))

        # ── Check model ownership ────────────────────────────────────────
        self.stdout.write('\n  --- Record Ownership Verification ---')
        total_issues += self._audit_model(
            model=Lead,
            model_name='Lead',
            owner_field='assigned_to',
            fallback_user=fallback_user,
            dry_run=dry_run,
        )
        total_issues += self._audit_model(
            model=Contact,
            model_name='Contact',
            owner_field='owner',
            fallback_user=fallback_user,
            dry_run=dry_run,
        )
        total_issues += self._audit_model(
            model=Deal,
            model_name='Deal',
            owner_field='owner',
            fallback_user=fallback_user,
            dry_run=dry_run,
        )
        total_issues += self._audit_model(
            model=Task,
            model_name='Task',
            owner_field='assigned_to',
            fallback_user=fallback_user,
            dry_run=dry_run,
        )

        # ── Summary ─────────────────────────────────────────────────────
        self.stdout.write('\n' + '=' * 60)
        if total_issues == 0:
            self.stdout.write(self.style.SUCCESS(
                '  [OK] All records have valid ownership. No action required.'
            ))
        elif dry_run:
            self.stdout.write(self.style.WARNING(
                f'  [WARN] {total_issues} orphan record(s) found. '
                f'Run with --fix to repair them.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'  [FIXED] {total_issues} orphan record(s) repaired successfully.'
            ))
        self.stdout.write('=' * 60 + '\n')

    def _audit_model(self, model, model_name, owner_field, fallback_user, dry_run):
        """Audit one model for NULL ownership. Returns count of issues found."""
        filter_kwargs = {f'{owner_field}__isnull': True}
        orphans = model.objects.filter(**filter_kwargs)
        count = orphans.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                f'  [OK] {model_name}: all {model.objects.count()} records have owners'
            ))
            return 0

        self.stdout.write(self.style.ERROR(
            f'  [ERROR] {model_name}: {count} record(s) with NULL {owner_field}'
        ))

        # Show details of each orphan
        for obj in orphans[:20]:  # cap output at 20 for readability
            self.stdout.write(f'      - id={obj.id} | {obj}')

        if count > 20:
            self.stdout.write(f'      ... and {count - 20} more')

        if not dry_run:
            with transaction.atomic():
                update_kwargs = {owner_field: fallback_user}
                updated = orphans.update(**update_kwargs)
                self.stdout.write(self.style.SUCCESS(
                    f'      → Assigned {updated} record(s) to {fallback_user.username}'
                ))

        return count

    def _resolve_fallback_user(self, admin_id):
        """
        Find the best fallback user:
          1. Explicit --admin-id argument
          2. First Django superuser
          3. First user with role='admin'
        """
        if admin_id is not None:
            try:
                return User.objects.get(pk=admin_id)
            except User.DoesNotExist:
                raise CommandError(f'No user found with id={admin_id}.')

        # Try superuser first
        superuser = User.objects.filter(is_superuser=True).order_by('id').first()
        if superuser:
            return superuser

        # Fall back to any admin-role user
        admin_user = User.objects.filter(role='admin').order_by('id').first()
        return admin_user
