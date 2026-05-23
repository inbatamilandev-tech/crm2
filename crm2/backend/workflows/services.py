"""
Workflow Services — Production Grade
===================================
High-level orchestration for complex CRM workflows:

  - Lead conversion (lead → contact + account + deal)
  - Deal progression (deal → quote → invoice)
  - Task-driven automation chaining
  - Bulk workflow operations
  - Workflow analytics and reporting
"""

from django.db import transaction
from django.utils import timezone
from datetime import timedelta


def convert_lead(lead, owner=None, create_deal=True, deal_data=None):
    """
    Convert a Lead into Contact, Account, and optionally Deal.
    
    This is service-level so views and workflows share one path.
    Ensures consistent conversion logic across the system.
    
    Args:
        lead: Lead instance to convert
        owner: User to assign to created contact/account/deal
        create_deal: Whether to create a Deal
        deal_data: Dict with 'title', 'value', 'stage' overrides
    
    Returns:
        Dict with 'lead', 'contact', 'account', 'deal' keys
    """
    from contacts.models import Account, Contact
    from deals.models import Deal

    deal_data = deal_data or {}
    owner = owner or lead.assigned_to
    company_name = (lead.company or '').strip()

    with transaction.atomic():
        # Lock lead for conversion
        lead = type(lead).objects.select_for_update().get(pk=lead.pk)

        # Get or create account
        account = None
        if company_name:
            account, _ = Account.objects.get_or_create(name=company_name)

        # Get or create contact
        first_name, last_name = _split_name(lead.name or '')
        email = lead.email or f"lead-{lead.pk}@example.invalid"
        contact, _ = Contact.objects.get_or_create(
            email=email,
            defaults={
                'first_name': first_name,
                'last_name': last_name,
                'account': account,
                'owner': owner,
            },
        )

        # Update contact if needed
        changed = []
        if account and contact.account_id != account.id:
            contact.account = account
            changed.append('account')
        if owner and contact.owner_id is None:
            contact.owner = owner
            changed.append('owner')
        if changed:
            contact.save(update_fields=changed + ['updated_at'])

        # Update lead status
        if lead.contact_id != contact.id or lead.status != 'qualified':
            lead.contact = contact
            lead.status = 'qualified'
            lead.save(update_fields=['contact', 'status', 'updated_at'])

        # Create deal if requested
        deal = None
        if create_deal:
            # Check for existing ACTIVE deal
            deal = Deal.objects.filter(lead=lead, is_active=True).first()
            
            deal_defaults = {
                'account': account,
                'contact': contact,
                'owner': owner,
                'title': deal_data.get('title') or f"{company_name or lead.name or 'Lead'} Deal",
                'value': deal_data.get('value') or lead.score or 1000,  # Fallback to score or fixed min
                'stage': deal_data.get('stage') or 'proposal',
                'expected_close_date': deal_data.get('expected_close_date') or (timezone.now() + timedelta(days=30)).date(),
                'is_active': True,
                'status': 'open',
            }

            if not deal:
                deal = Deal.objects.create(lead=lead, **deal_defaults)
            else:
                # Update existing active deal
                updates = []
                for field, value in deal_defaults.items():
                    if value and getattr(deal, field) != value:
                        setattr(deal, field, value)
                        updates.append(field)
                if updates:
                    deal.save(update_fields=updates + ['updated_at'])

            # Backend track pending deal requirement: Clear the flag and timestamp
            lead.deal_required = False
            lead.deal_required_at = None
            lead.save(update_fields=['deal_required', 'deal_required_at', 'contact', 'status', 'updated_at'])

            # Link existing tasks to deal
            lead.tasks.filter(is_active=True).update(contact=contact, deal=deal)

    return {'lead': lead, 'contact': contact, 'account': account, 'deal': deal}


def create_deal_workflow_chain(deal, include_quote=False, include_invoice=False):
    """
    Orchestrate a deal through its complete workflow chain.
    
    Optionally creates quotes and invoices from the deal.
    This is typically triggered by on_create or stage_change workflows.
    
    Args:
        deal: Deal instance
        include_quote: Whether to create a quote
        include_invoice: Whether to create an invoice (requires quote)
    
    Returns:
        Dict with 'deal', 'quote', 'invoice' keys
    """
    from quotes.models import Quote
    from invoices.models import Invoice
    
    result = {'deal': deal, 'quote': None, 'invoice': None}
    
    if include_quote:
        quote = _create_quote_from_deal(deal)
        result['quote'] = quote
        
        if include_invoice and quote:
            invoice = _create_invoice_from_quote(quote)
            result['invoice'] = invoice
    
    return result


def _create_quote_from_deal(deal):
    """Create a quote from a deal."""
    from quotes.models import Quote
    
    if not deal:
        return None
    
    quote, created = Quote.objects.get_or_create(
        deal=deal,
        defaults={
            'owner': deal.owner,
            'amount': deal.value or 0,
            'status': 'draft',
            'valid_until': timezone.now().date(),
        }
    )
    return quote if created else None


def _create_invoice_from_quote(quote):
    """Create an invoice from a quote."""
    from invoices.models import Invoice
    
    if not quote:
        return None
    
    invoice, created = Invoice.objects.get_or_create(
        quote=quote,
        defaults={
            'owner': quote.owner,
            'amount': quote.amount,
            'status': 'draft',
            'due_date': timezone.now().date(),
        }
    )
    return invoice if created else None


def bulk_create_workflow_tasks(records, workflow_id, task_title, task_type='follow_up', days_offset=0):
    """
    Bulk create tasks for multiple records using a workflow.
    Useful for marketing campaigns or bulk user actions.
    
    Args:
        records: Iterable of model instances
        workflow_id: ID of workflow to use
        task_title: Title template for tasks
        task_type: Type of task (call, meeting, follow_up, proposal)
        days_offset: Days to add to due date
    
    Returns:
        Dict with 'success', 'failed', 'total' counts
    """
    from tasks.models import Task
    from workflows.models import Workflow
    
    workflow = Workflow.objects.get(pk=workflow_id)
    results = {'success': 0, 'failed': 0, 'total': 0}
    
    with transaction.atomic():
        for record in records:
            results['total'] += 1
            try:
                due_date = timezone.now() + timezone.timedelta(days=days_offset)
                Task.objects.create(
                    title=task_title.format(
                        name=getattr(record, 'name', ''),
                        company=getattr(record, 'company', '')
                    ),
                    task_type=task_type,
                    due_date=due_date,
                    assigned_to=getattr(record, 'assigned_to', None) or getattr(record, 'owner', None),
                    **_task_links_for_record(record)
                )
                results['success'] += 1
            except Exception as exc:
                results['failed'] += 1
    
    return results


def get_workflow_execution_stats(workflow_id, days=30):
    """
    Get execution statistics for a workflow.
    
    Args:
        workflow_id: ID of workflow
        days: Number of past days to analyze
    
    Returns:
        Dict with execution stats
    """
    from django.utils import timezone
    from datetime import timedelta
    from workflows.models import WorkflowLog
    
    cutoff = timezone.now() - timedelta(days=days)
    logs = WorkflowLog.objects.filter(
        workflow_id=workflow_id,
        executed_at__gte=cutoff
    )
    
    status_counts = {}
    for status in ['success', 'partial', 'failure', 'skipped']:
        status_counts[status] = logs.filter(status=status).count()
    
    return {
        'total_executions': logs.count(),
        'status_breakdown': status_counts,
        'success_rate': (status_counts.get('success', 0) / logs.count() * 100) if logs.exists() else 0,
        'period_days': days,
    }


def cleanup_old_logs(days=90):
    """
    Clean up old workflow logs to maintain database performance.
    
    Args:
        days: Delete logs older than N days
    
    Returns:
        Dict with count of deleted logs
    """
    from django.utils import timezone
    from datetime import timedelta
    from workflows.models import WorkflowLog
    
    cutoff = timezone.now() - timedelta(days=days)
    count, _ = WorkflowLog.objects.filter(executed_at__lt=cutoff).delete()
    
    return {'deleted_logs': count}


def _split_name(name):
    """Split full name into first and last name."""
    parts = name.strip().split(' ', 1)
    if not parts or not parts[0]:
        return '', ''
    return parts[0], parts[1] if len(parts) > 1 else ''


def _task_links_for_record(record):
    """Get appropriate task links for a record."""
    model_name = record._meta.model_name
    links = {'lead': None, 'contact': None, 'account': None, 'deal': None}
    
    if model_name in links:
        links[model_name] = record
    else:
        # Try to find linked records
        for field in links:
            linked = getattr(record, field, None)
            if linked:
                links[field] = linked
    
    return {k: v for k, v in links.items() if v is not None}
