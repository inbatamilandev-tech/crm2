"""
Example Workflows — Production CRM Automation Patterns
=====================================================
Reference workflows demonstrating the Workflow Engine capabilities.

These workflows showcase:
  - Lead creation → Task assignment
  - Task completion → Chained next step
  - Deal progression → Quote creation
  - Quote acceptance → Invoice generation
  - Status-based automation
  - Smart assignment (owner, round-robin, specific user)

Usage:
  from workflows.examples import create_example_workflows
  create_example_workflows()
"""

from django.db import transaction
from workflows.models import Workflow, WorkflowCondition, WorkflowAction


# =============================================================================
# WORKFLOW 1: Lead Created → Create Initial Call Task
# =============================================================================
WORKFLOW_1_LEAD_CREATED = {
    'name': 'Lead Created - Create Initial Call',
    'description': 'Automatically create an Initial Call task when a new lead is created',
    'module': 'lead',
    'trigger_event': 'on_create',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [],  # No conditions - trigger for all leads
    'actions': [
        {
            'order': 1,
            'action_type': 'create_task',
            'assignment_type': 'owner',
            'priority': 'high',
            'action_data': {
                'title': 'Initial Call: {name}',
                'description': 'Call lead {name} to introduce products/services',
                'task_type': 'call',
                'due_days': 1,
                'status': 'pending',
            }
        },
        {
            'order': 2,
            'action_type': 'send_notification',
            'action_data': {
                'message': 'New lead {name} created - Initial call task assigned'
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 2: Initial Call Complete → Create Follow-up Task
# =============================================================================
WORKFLOW_2_TASK_COMPLETED = {
    'name': 'Call Task Complete - Create Follow-up',
    'description': 'When Initial Call task is completed, create Follow-up Call task',
    'module': 'task',
    'trigger_event': 'on_task_complete',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'task_type',
            'operator': 'equals',
            'value': 'call'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_task',
            'assignment_type': 'owner',
            'priority': 'medium',
            'action_data': {
                'title': 'Follow-up Call: {title}',
                'description': 'Follow up on previous call discussion',
                'task_type': 'call',
                'due_days': 3,
                'status': 'pending',
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 3: Lead Qualified → Convert Lead + Create Deal
# =============================================================================
WORKFLOW_3_LEAD_QUALIFIED = {
    'name': 'Lead Qualified - Convert to Deal',
    'description': 'When a lead is marked qualified, convert to contact/account/deal',
    'module': 'lead',
    'trigger_event': 'stage_change',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'status',
            'operator': 'equals',
            'value': 'qualified'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'convert_lead',
            'action_data': {
                'create_deal': True,
                'deal_title': '{company} - {name} Deal',
                'deal_stage': 'Qualification',
                'deal_value': 0,
            }
        },
        {
            'order': 2,
            'action_type': 'send_notification',
            'action_data': {
                'message': 'Lead {name} converted to deal'
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 4: Deal Stage = Proposal → Create Quote
# =============================================================================
WORKFLOW_4_DEAL_PROPOSAL = {
    'name': 'Deal in Proposal - Create Quote',
    'description': 'When deal moves to Proposal stage, automatically create a quote',
    'module': 'deal',
    'trigger_event': 'stage_change',
    'condition_logic': 'AND',
    'debounce_minutes': 10,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'stage',
            'operator': 'equals',
            'value': 'Proposal'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_quote',
            'action_data': {
                'status': 'draft',
                'valid_days': 30,
                'products': []  # Will use deal value
            }
        },
        {
            'order': 2,
            'action_type': 'send_notification',
            'action_data': {
                'message': 'Quote created for deal - review and send to client'
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 5: Quote Accepted → Create Invoice
# =============================================================================
WORKFLOW_5_QUOTE_ACCEPTED = {
    'name': 'Quote Accepted - Create Invoice',
    'description': 'When quote is accepted, generate invoice automatically',
    'module': 'quote',
    'trigger_event': 'stage_change',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'status',
            'operator': 'equals',
            'value': 'accepted'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_invoice',
            'action_data': {
                'status': 'draft',
                'due_days': 30,
            }
        },
        {
            'order': 2,
            'action_type': 'send_notification',
            'action_data': {
                'message': 'Invoice created and ready to send'
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 6: High-Value Deal → Assign Manager
# =============================================================================
WORKFLOW_6_HIGH_VALUE_DEAL = {
    'name': 'High-Value Deal - Assign Manager',
    'description': 'Deals over $50k automatically get assigned a manager for oversight',
    'module': 'deal',
    'trigger_event': 'on_create',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'value',
            'operator': 'gte',
            'value': '50000'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_task',
            'assignment_type': 'manager',
            'priority': 'urgent',
            'action_data': {
                'title': 'High-Value Deal Oversight: {title}',
                'description': 'Manager review required for deal value: {value}',
                'task_type': 'proposal',
                'due_days': 1,
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 7: Contact Updated → Create Meeting
# =============================================================================
WORKFLOW_7_CONTACT_UPDATE = {
    'name': 'Contact Updated - Schedule Meeting',
    'description': 'When contact information is updated, schedule a check-in meeting',
    'module': 'contact',
    'trigger_event': 'on_update',
    'condition_logic': 'AND',
    'debounce_minutes': 60,  # Don't trigger too frequently for same contact
    'is_active': True,
    'conditions': [],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_meeting',
            'assignment_type': 'owner',
            'action_data': {
                'title': 'Check-in: {name}',
                'notes': 'Contact information was updated - schedule follow-up',
                'due_days': 7,
                'duration_minutes': 30,
                'meeting_type': 'Check-in',
                'status': 'scheduled',
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 8: Deal Won → Update Contact Status
# =============================================================================
WORKFLOW_8_DEAL_WON = {
    'name': 'Deal Won - Update Contact Status',
    'description': 'Mark contact as Customer when their deal is won',
    'module': 'deal',
    'trigger_event': 'stage_change',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'stage',
            'operator': 'equals',
            'value': 'Won'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'update_record',
            'action_data': {
                'fields': {
                    'status': 'Customer'
                }
            }
        },
        {
            'order': 2,
            'action_type': 'send_notification',
            'action_data': {
                'message': 'Deal Won! Contact updated to Customer status'
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 9: Round-Robin Task Assignment
# =============================================================================
WORKFLOW_9_ROUND_ROBIN = {
    'name': 'New Account - Round Robin Assignment',
    'description': 'New accounts are assigned to sales reps in round-robin fashion',
    'module': 'account',
    'trigger_event': 'on_create',
    'condition_logic': 'AND',
    'debounce_minutes': 5,
    'is_active': True,
    'conditions': [],
    'actions': [
        {
            'order': 1,
            'action_type': 'create_task',
            'assignment_type': 'round_robin',  # Distribute equally among reps
            'priority': 'high',
            'action_data': {
                'title': 'Account Setup: {name}',
                'description': 'Initial contact and setup for new account',
                'task_type': 'follow_up',
                'due_days': 0,
            }
        }
    ]
}


# =============================================================================
# WORKFLOW 10: Call Connected → Update Lead Status
# =============================================================================
WORKFLOW_10_CALL_CONNECTED = {
    'name': 'Call Connected - Update Lead',
    'description': 'When a call outcome is "connected", update lead status to "contacted"',
    'module': 'call',
    'trigger_event': 'on_task_complete', # Reusing this trigger for Call completion
    'condition_logic': 'AND',
    'is_active': True,
  'conditions': [
        {
            'order': 1,
            'field_name': 'outcome',
            'operator': 'equals',
            'value': 'interested'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'update_record',
            'action_data': {
                'target': 'lead',
                'fields': {
                    'status': 'contacted'
                }
            }
        }
    ]
}

# =============================================================================
# WORKFLOW 11: Call Success → Qualify Lead
# =============================================================================
WORKFLOW_11_CALL_SUCCESS = {
    'name': 'Call Success - Qualify Lead',
    'description': 'When a call outcome is "success", automatically qualify the lead',
    'module': 'call',
    'trigger_event': 'on_task_complete',
    'condition_logic': 'AND',
    'is_active': True,
    'conditions': [
        {
            'order': 1,
            'field_name': 'outcome',
            'operator': 'equals',
            'value': 'success'
        }
    ],
    'actions': [
        {
            'order': 1,
            'action_type': 'update_record',
            'action_data': {
                'target': 'lead',
                'fields': {
                    'status': 'qualified'
                }
            }
        }
    ]
}


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_example_workflows():
    """
    Create all example workflows in the database.
    Idempotent - safe to call multiple times.
    """
    examples = [
        WORKFLOW_1_LEAD_CREATED,
        WORKFLOW_2_TASK_COMPLETED,
        WORKFLOW_3_LEAD_QUALIFIED,
        WORKFLOW_4_DEAL_PROPOSAL,
        WORKFLOW_5_QUOTE_ACCEPTED,
        WORKFLOW_6_HIGH_VALUE_DEAL,
        WORKFLOW_7_CONTACT_UPDATE,
        WORKFLOW_8_DEAL_WON,
        WORKFLOW_9_ROUND_ROBIN,
        WORKFLOW_10_CALL_CONNECTED,
        WORKFLOW_11_CALL_SUCCESS,
    ]
    
    created_count = 0
    with transaction.atomic():
        for example in examples:
            workflow, created = _create_workflow(example)
            if created:
                created_count += 1
    
    return {
        'total_workflows': len(examples),
        'newly_created': created_count,
        'already_existed': len(examples) - created_count,
    }


def _create_workflow(workflow_spec):
    """Create a workflow with conditions and actions from spec."""
    workflow, created = Workflow.objects.get_or_create(
        name=workflow_spec['name'],
        defaults={
            'description': workflow_spec['description'],
            'module': workflow_spec['module'],
            'trigger_event': workflow_spec['trigger_event'],
            'condition_logic': workflow_spec['condition_logic'],
            'debounce_minutes': workflow_spec.get('debounce_minutes', 5),
            'is_active': workflow_spec.get('is_active', True),
        }
    )
    
    if not created:
        return workflow, False
    
    # Add conditions
    for condition_spec in workflow_spec.get('conditions', []):
        WorkflowCondition.objects.create(
            workflow=workflow,
            order=condition_spec['order'],
            field_name=condition_spec['field_name'],
            operator=condition_spec['operator'],
            value=condition_spec['value'],
        )
    
    # Add actions
    for action_spec in workflow_spec.get('actions', []):
        WorkflowAction.objects.create(
            workflow=workflow,
            order=action_spec['order'],
            action_type=action_spec['action_type'],
            assignment_type=action_spec.get('assignment_type', 'owner'),
            priority=action_spec.get('priority', 'medium'),
            action_data=action_spec.get('action_data', {}),
        )
    
    return workflow, True


def list_example_workflows():
    """Return list of all example workflow names and descriptions."""
    examples = [
        WORKFLOW_1_LEAD_CREATED,
        WORKFLOW_2_TASK_COMPLETED,
        WORKFLOW_3_LEAD_QUALIFIED,
        WORKFLOW_4_DEAL_PROPOSAL,
        WORKFLOW_5_QUOTE_ACCEPTED,
        WORKFLOW_6_HIGH_VALUE_DEAL,
        WORKFLOW_7_CONTACT_UPDATE,
        WORKFLOW_8_DEAL_WON,
        WORKFLOW_9_ROUND_ROBIN,
        WORKFLOW_10_CALL_CONNECTED,
        WORKFLOW_11_CALL_SUCCESS,
    ]
    
    return [
        {
            'name': wf['name'],
            'module': wf['module'],
            'trigger': wf['trigger_event'],
            'description': wf['description'],
            'action_count': len(wf.get('actions', [])),
        }
        for wf in examples
    ]
