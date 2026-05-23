import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from workflows.models import Workflow, WorkflowCondition, WorkflowAction, WorkflowRule

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seeds task lifecycle workflows with deal creation on meeting success'

    def handle(self, *args, **kwargs):
        with transaction.atomic():
            self.stdout.write("Purging ALL existing workflows and rules to enforce clean state...")
            
            # Delete ALL Rules and Workflows
            WorkflowRule.objects.all().delete()
            Workflow.objects.all().delete()
            
            self.stdout.write("Seeding task lifecycle workflows...")

            # ---------------------------------------------------------
            # 1. Lead Creation -> Auto Call Task
            # ---------------------------------------------------------
            wf_lead_create = Workflow.objects.create(
                name="[AUTO] Lead Creation - Create Call Task",
                description="Automatically creates a high-priority call task when a new Lead is created.",
                module="lead",
                trigger_event="on_create",
                is_active=True,
                debounce_minutes=1
            )
            
            WorkflowAction.objects.create(
                workflow=wf_lead_create,
                action_type="create_task",
                order=1,
                priority="high",
                action_data={
                    "task_type": "call",
                    "status": "pending",
                    "title": "Initial Contact Call",
                    "description": "Call the lead to introduce ourselves.",
                    "due_days": 0
                }
            )

            # ---------------------------------------------------------
            # 2. Call Task Complete (Connected) -> Repurpose to Follow-up
            # ---------------------------------------------------------
            wf_call_connected = Workflow.objects.create(
                name="[AUTO] (TASK) Call Connected - Move to Follow-up",
                description="Updates Lead to Contacted and repurposes task to Follow-up.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_call_connected, field_name="task_type", operator="equals", value="call", order=1)
            WorkflowCondition.objects.create(workflow=wf_call_connected, field_name="outcome", operator="in", value="success,connected", order=2)
            
            # Action 1: Update Lead Status
            WorkflowAction.objects.create(
                workflow=wf_call_connected,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "contacted"
                }
            )
            # Action 2: Repurpose Task
            WorkflowAction.objects.create(
                workflow=wf_call_connected,
                action_type="update_record",
                order=2,
                action_data={
                    "target": "self",
                    "fields": {
                        "task_type": "follow_up",
                        "status": "pending",
                        "title": "Follow-up Required: {name}",
                        "description": "Call connected. Follow up with the lead."
                    }
                }
            )

            # ---------------------------------------------------------
            # 3. Follow-up Task Complete (Interested) -> Repurpose to Meeting
            # ---------------------------------------------------------
            wf_fu_interested = Workflow.objects.create(
                name="[AUTO] Follow-up Interested - Move to Meeting",
                description="Updates Lead to Qualified and repurposes task to Meeting.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_fu_interested, field_name="task_type", operator="equals", value="follow_up", order=1)
            WorkflowCondition.objects.create(workflow=wf_fu_interested, field_name="outcome", operator="in", value="success,interested", order=2)
            
            # Action 1: Update Lead Status
            WorkflowAction.objects.create(
                workflow=wf_fu_interested,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "qualified"
                }
            )
            # Action 2: Repurpose Task
            WorkflowAction.objects.create(
                workflow=wf_fu_interested,
                action_type="update_record",
                order=2,
                action_data={
                    "target": "self",
                    "fields": {
                        "task_type": "meeting",
                        "status": "pending",
                        "title": "Schedule Meeting: {name}",
                        "description": "Lead is interested. Schedule a meeting."
                    }
                }
            )

            # ---------------------------------------------------------
            # 4. Meeting Task Complete (Success) -> Convert Lead (Auto Part)
            # ---------------------------------------------------------
            wf_meeting_success = Workflow.objects.create(
                name="[AUTO] Meeting Successful - Convert Lead",
                description="Converts Lead to Contact/Account after successful meeting.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_meeting_success, field_name="task_type", operator="equals", value="meeting", order=1)
            WorkflowCondition.objects.create(workflow=wf_meeting_success, field_name="outcome", operator="equals", value="success", order=2)
            
            # Action 1: Convert Lead (But DO NOT create deal!)
            WorkflowAction.objects.create(
                workflow=wf_meeting_success,
                action_type="convert_lead",
                order=1,
                action_data={
                    "create_deal": False
                }
            )

            # ---------------------------------------------------------
            # 4b. Meeting Task Complete (Interested/Follow-up) -> Repurpose to Follow-up
            # ---------------------------------------------------------
            wf_meeting_follow_up = Workflow.objects.create(
                name="[AUTO] Meeting Needs Follow-up - Move to Follow-up",
                description="Repurposes task to Follow-up after meeting.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_meeting_follow_up, field_name="task_type", operator="equals", value="meeting", order=1)
            WorkflowCondition.objects.create(workflow=wf_meeting_follow_up, field_name="outcome", operator="equals", value="interested", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_meeting_follow_up,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "self",
                    "fields": {
                        "task_type": "follow_up",
                        "status": "pending",
                        "title": "Follow-up After Meeting: {name}",
                        "description": "Meeting completed but needs follow-up."
                    }
                }
            )

            # ---------------------------------------------------------
            # 4c. Meeting Task Complete (Not Interested) -> Mark Lost
            # ---------------------------------------------------------
            wf_meeting_not_interested = Workflow.objects.create(
                name="[AUTO] Meeting Not Interested - Mark Lost",
                description="Marks Lead as Lost after meeting.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_meeting_not_interested, field_name="task_type", operator="equals", value="meeting", order=1)
            WorkflowCondition.objects.create(workflow=wf_meeting_not_interested, field_name="outcome", operator="equals", value="not_interested", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_meeting_not_interested,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "lost"
                }
            )

            # ---------------------------------------------------------
            # 4d. Proposal Task Complete (Qualification) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_qual = Workflow.objects.create(
                name="[AUTO] Proposal Qualification - Update Deal Stage",
                description="Updates Deal stage to Qualification.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_qual, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_qual, field_name="outcome", operator="equals", value="Qualification", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_qual,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Qualification"
                }
            )

            # ---------------------------------------------------------
            # 4e. Proposal Task Complete (Needs Analysis) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_needs = Workflow.objects.create(
                name="[AUTO] Proposal Needs Analysis - Update Deal Stage",
                description="Updates Deal stage to Needs Analysis.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_needs, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_needs, field_name="outcome", operator="equals", value="Needs Analysis", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_needs,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Needs Analysis"
                }
            )

            # ---------------------------------------------------------
            # 4f. Proposal Task Complete (Value Proposition) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_val = Workflow.objects.create(
                name="[AUTO] Proposal Value Proposition - Update Deal Stage",
                description="Updates Deal stage to Value Proposition.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_val, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_val, field_name="outcome", operator="equals", value="Value Proposition", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_val,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Value Proposition"
                }
            )

            # ---------------------------------------------------------
            # 4g. Proposal Task Complete (Identify Decision Makers) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_dec = Workflow.objects.create(
                name="[AUTO] Proposal Identify Decision Makers - Update Deal Stage",
                description="Updates Deal stage to Identify Decision Makers.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_dec, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_dec, field_name="outcome", operator="equals", value="Identify Decision Makers", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_dec,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Identify Decision Makers"
                }
            )

            # ---------------------------------------------------------
            # 5. Proposal Task Complete (Proposal/Price Quote) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_quote = Workflow.objects.create(
                name="[AUTO] Proposal Quote - Update Deal Stage",
                description="Updates Deal stage to Proposal/Price Quote.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_quote, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_quote, field_name="outcome", operator="equals", value="Proposal/Price Quote", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_quote,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Proposal/Price Quote"
                }
            )

            # ---------------------------------------------------------
            # 6. Proposal Task Complete (Negotiation/Review) -> Update Deal Stage
            # ---------------------------------------------------------
            wf_proposal_negotiation = Workflow.objects.create(
                name="[AUTO] Proposal Negotiation - Update Deal Stage",
                description="Updates Deal stage to Negotiation/Review.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_negotiation, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_negotiation, field_name="outcome", operator="equals", value="Negotiation/Review", order=2)
            
            WorkflowAction.objects.create(
                workflow=wf_proposal_negotiation,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Negotiation/Review"
                }
            )

            # ---------------------------------------------------------
            # 7. Proposal Task Complete (Closed Won) -> Mark Won & Update Deal
            # ---------------------------------------------------------
            wf_proposal_won = Workflow.objects.create(
                name="[AUTO] Proposal Won - Mark Won",
                description="Marks Lead as Won and updates Deal stage to Closed Won.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_won, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_won, field_name="outcome", operator="equals", value="Closed Won", order=2)
            
            # Action 1: Update Lead Status to Won
            WorkflowAction.objects.create(
                workflow=wf_proposal_won,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "won"
                }
            )
            # Action 2: Update Deal Stage to Closed Won
            WorkflowAction.objects.create(
                workflow=wf_proposal_won,
                action_type="update_record",
                order=2,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Closed Won"
                }
            )

            # ---------------------------------------------------------
            # 8. Proposal Task Complete (Closed Lost) -> Mark Lost & Update Deal
            # ---------------------------------------------------------
            wf_proposal_lost = Workflow.objects.create(
                name="[AUTO] Proposal Lost - Mark Lost",
                description="Marks Lead as Lost and updates Deal stage to Closed Lost.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_lost, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_lost, field_name="outcome", operator="equals", value="Closed Lost", order=2)
            
            # Action 1: Update Lead Status to Lost
            WorkflowAction.objects.create(
                workflow=wf_proposal_lost,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "lost"
                }
            )
            # Action 2: Update Deal Stage to Closed Lost
            WorkflowAction.objects.create(
                workflow=wf_proposal_lost,
                action_type="update_record",
                order=2,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Closed Lost"
                }
            )

            # ---------------------------------------------------------
            # 9. Proposal Task Complete (Closed Lost to Competition) -> Mark Lost & Update Deal
            # ---------------------------------------------------------
            wf_proposal_lost_comp = Workflow.objects.create(
                name="[AUTO] Proposal Lost to Competition - Mark Lost",
                description="Marks Lead as Lost and updates Deal stage to Closed Lost to Competition.",
                module="task",
                trigger_event="on_task_complete",
                is_active=True,
                debounce_minutes=1
            )
            WorkflowCondition.objects.create(workflow=wf_proposal_lost_comp, field_name="task_type", operator="equals", value="proposal", order=1)
            WorkflowCondition.objects.create(workflow=wf_proposal_lost_comp, field_name="outcome", operator="equals", value="Closed Lost to Competition", order=2)
            
            # Action 1: Update Lead Status to Lost
            WorkflowAction.objects.create(
                workflow=wf_proposal_lost_comp,
                action_type="update_record",
                order=1,
                action_data={
                    "target": "lead",
                    "field": "status",
                    "value": "lost"
                }
            )
            # Action 2: Update Deal Stage to Closed Lost to Competition
            WorkflowAction.objects.create(
                workflow=wf_proposal_lost_comp,
                action_type="update_record",
                order=2,
                action_data={
                    "target": "deal",
                    "field": "stage",
                    "value": "Closed Lost to Competition"
                }
            )

            self.stdout.write("Successfully seeded workflows with deal creation!")
