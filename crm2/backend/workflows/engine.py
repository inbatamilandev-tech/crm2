import logging

from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .actions import execute_action

logger = logging.getLogger(__name__)


TRIGGER_ALIASES = {
    'create': 'on_create',
    'update': 'on_update',
    'stage_changed': 'stage_change',
    'status_changed': 'stage_change',
}


def trigger_workflows(module_name, trigger_event, instance, extra_context=None, chain_id=None):
    """
    Workflow execution entry point with Chain Tracking.
    """
    from workflows.models import Workflow, WorkflowLog

    trigger = normalize_trigger(trigger_event)
    extra_context = extra_context or {}
    event = {
        'module': module_name,
        'trigger': trigger,
        'legacy_trigger': trigger_event,
        'extra': extra_context,
        'chain_id': chain_id,
    }
    execution_key = _make_execution_key(module_name, trigger, instance, extra_context)

    logger.info(f"[WorkflowEngine] Triggering workflows for {module_name} on {trigger} (Instance: {instance.pk})")
    workflows = Workflow.objects.filter(
        module=module_name,
        trigger_event__in={trigger, trigger_event},
        is_active=True,
    ).prefetch_related('conditions', 'actions__specific_user')

    logger.info(f"[WorkflowEngine] Found {workflows.count()} active workflows for {module_name}:{trigger}")

    for workflow in workflows:
        _run_workflow(workflow, instance, event, execution_key, WorkflowLog, chain_id=chain_id)


def normalize_trigger(trigger_event):
    """Normalize legacy trigger names to canonical names."""
    return TRIGGER_ALIASES.get(trigger_event, trigger_event)


def _make_execution_key(module_name, trigger, instance, extra_context):
    """Generate a deterministic key for debouncing."""
    import hashlib
    import json
    
    raw = {
        'module': module_name,
        'trigger': trigger,
        'object': instance.pk,
        'old_value': extra_context.get('old_value', ''),
        'new_value': extra_context.get('new_value', ''),
    }
    return hashlib.sha256(json.dumps(raw, sort_keys=True, default=str).encode()).hexdigest()


def _run_workflow(workflow, instance, event, execution_key, WorkflowLog, chain_id=None):
    """Execute a single workflow with granular action logging and partial failure handling."""
    from workflows.models import WorkflowActionLog, WorkflowDebounce
    
    log = None
    try:
        # 0. Chain Guard: Prevent same workflow from running multiple times on same object in same chain
        if chain_id:
            from workflows.models import WorkflowLog
            if WorkflowLog.objects.filter(
                workflow=workflow, 
                object_id=str(instance.pk), 
                chain_id=chain_id,
                status__in=['success', 'partial', 'failure']
            ).exists():
                logger.info(f"[Workflow] Guard: Skipping {workflow.name} for {instance.pk} (already ran in chain {chain_id})")
                return

        # 1. Check debounce
        logger.info(f"[WorkflowEngine] Checking debounce for {workflow.name}")
        if _is_debounced(workflow, instance):
            WorkflowLog.objects.create(
                workflow=workflow,
                status='skipped',
                trigger_event=event['trigger'],
                object_id=str(instance.pk),
                execution_key=execution_key,
                chain_id=chain_id or '',
                message='Debounced: executed too recently',
            )
            return

        # 2. Evaluate conditions
        logger.info(f"[WorkflowEngine] Evaluating conditions for {workflow.name} on {instance.pk}")
        passed, reason = evaluate_conditions(workflow, instance, event.get('extra', {}))
        if not passed:
            WorkflowLog.objects.create(
                workflow=workflow,
                status='skipped',
                trigger_event=event['trigger'],
                object_id=str(instance.pk),
                execution_key=execution_key,
                chain_id=chain_id or '',
                message=f"Conditions not met: {reason}",
            )
            return

        # 3. Create the Main Workflow Log
        logger.info(f"[WorkflowEngine] Running workflow {workflow.name} for {instance.pk}")
        log = WorkflowLog.objects.create(
            workflow=workflow,
            status='failure',  # Initial state
            trigger_event=event['trigger'],
            object_id=str(instance.pk),
            execution_key=execution_key,
            chain_id=chain_id or '',
        )

        # 4. Execute actions with DAG (Tree) traversal
        success_count = 0
        failure_count = 0
        completed_actions = []  # Track for compensation logic
        
        actions = workflow.actions.all().order_by('order', 'pk')
        logger.info(f"[WorkflowEngine] Found {actions.count()} actions for workflow {workflow.name}")
        
        # Build DAG representation
        action_map = {action.pk: action for action in actions}
        children_map = {action.pk: [] for action in actions}
        root_actions = []
        
        for action in actions:
            if action.parent_action_id:
                if action.parent_action_id in children_map:
                    children_map[action.parent_action_id].append(action)
            else:
                root_actions.append(action)

        def traverse_and_execute(action_node):
            nonlocal success_count, failure_count
            action_status = 'failure'
            action_message = ''
            error_details = ''
            
            # 4a. Idempotency Check
            idempotency_key = _make_action_idempotency_key(action_node, instance, event)
            from workflows.models import WorkflowActionExecution
            if WorkflowActionExecution.objects.filter(fingerprint=idempotency_key).exists():
                logger.info(f"[Workflow] Action {action_node.pk} already executed for this chain. Skipping.")
                success_count += 1
                return True # continue traversal
                
            # 4b. Simple retry loop
            for attempt in range(3):
                try:
                    with transaction.atomic():
                        event['chain_id'] = chain_id
                        logger.info(f"[WorkflowEngine] Executing action {action_node.pk} ({action_node.action_type}) for {workflow.name}")
                        result = execute_action(action_node, instance, event)
                        action_status = result.status
                        action_message = result.message
                        
                        if action_status in {'success', 'skipped'}:
                            WorkflowActionExecution.objects.create(
                                action=action_node,
                                workflow=workflow,
                                fingerprint=idempotency_key,
                                object_key=f"{instance._meta.label_lower}:{instance.pk}"
                            )
                            completed_actions.append((action_node, result))
                        break  # Success!
                except Exception as exc:
                    action_message = str(exc)
                    error_details = f"Attempt {attempt+1} failed: {exc}"
                    if attempt < 2:
                        continue
                    logger.error(f"[Workflow] Permanent failure for action {action_node.pk}: {exc}", exc_info=True)

            # Log granular action result
            WorkflowActionLog.objects.create(
                workflow_log=log,
                action=action_node,
                status=action_status,
                message=action_message,
                error_details=error_details,
                retry_count=attempt,
                idempotency_key=idempotency_key
            )
            
            if action_status in {'success', 'skipped'}:
                success_count += 1
                
                # DAG Traversal: Branch Logic Evaluation (Future expansion point for IF/ELSE)
                # Currently we execute all children. Future: filter children based on branch_label evaluation
                children = children_map.get(action_node.pk, [])
                for child in children:
                    traverse_and_execute(child)
                return True
            else:
                failure_count += 1
                return False

        # Start traversal from root nodes
        for root in root_actions:
            success = traverse_and_execute(root)
            if not success and workflow.actions.count() > 1:
                logger.warning(f"[Workflow] Permanent failure in multi-step workflow {workflow.name}. Triggering compensation.")
                _compensate_workflow(completed_actions, instance, event)
                break # Stop executing further root actions

        # 5. Determine final status
        if failure_count == 0:
            log.status = 'success'
        elif success_count > 0:
            log.status = 'partial'
        else:
            log.status = 'failure'
        
        log.message = f"Actions: {success_count} succeeded, {failure_count} failed."
        log.save(update_fields=['status', 'message', 'executed_at'])

        # 6. Update debounce record
        if log.status in {'success', 'partial'}:
            object_key = f"{instance._meta.label_lower}:{instance.pk}"
            WorkflowDebounce.objects.update_or_create(
                workflow=workflow,
                object_key=object_key,
                defaults={'execution_key': execution_key}
            )
    except Exception as exc:
        logger.error("[Workflow] engine failed workflow=%s: %s", workflow.pk, exc, exc_info=True)
        try:
            WorkflowLog.objects.create(
                workflow=workflow,
                status='failure',
                trigger_event=event['trigger'],
                object_id=str(getattr(instance, 'pk', '')),
                execution_key=execution_key,
                message=f"Engine error: {exc}",
            )
        except Exception:
            pass


def _is_debounced(workflow, instance):
    """Check if workflow execution is debounced (too soon after last run)."""
    from workflows.models import WorkflowDebounce
    
    object_key = f"{instance._meta.label_lower}:{instance.pk}"
    debounce_window = timedelta(minutes=workflow.debounce_minutes)
    cutoff_time = timezone.now() - debounce_window
    
    return WorkflowDebounce.objects.filter(
        workflow=workflow,
        object_key=object_key,
        last_executed_at__gte=cutoff_time
    ).exists()


def evaluate_conditions(workflow, instance, extra_context):
    """Evaluate all workflow conditions using AND/OR logic."""
    conditions = list(workflow.conditions.all().order_by('order', 'pk'))
    if not conditions:
        return True, 'No conditions'

    results = []
    for condition in conditions:
        value = extra_context.get(condition.field_name, _resolve_field(instance, condition.field_name))
        is_match = apply_operator(condition.operator, value, condition.value)
        results.append((is_match, condition.field_name, value, condition.operator, condition.value))

    if workflow.condition_logic == 'OR':
        return any(result[0] for result in results), str(results)
    return all(result[0] for result in results), str(results)


def apply_operator(operator, value, expected):
    """Apply a condition operator to evaluate a field value."""
    if operator in {'=', 'equals'}:
        return str(value).lower() == str(expected).lower()
    if operator in {'!=', 'not_equals'}:
        return str(value).lower() != str(expected).lower()
    if operator == 'contains':
        return str(expected).lower() in str(value).lower()
    if operator == 'not_contains':
        return str(expected).lower() not in str(value).lower()
    if operator in {'>', 'gt'}:
        try:
            return float(value) > float(expected)
        except (ValueError, TypeError):
            return False
    if operator in {'<', 'lt'}:
        try:
            return float(value) < float(expected)
        except (ValueError, TypeError):
            return False
    if operator == 'gte':
        try:
            return float(value) >= float(expected)
        except (ValueError, TypeError):
            return False
    if operator == 'lte':
        try:
            return float(value) <= float(expected)
        except (ValueError, TypeError):
            return False
    if operator == 'starts_with':
        return str(value).startswith(str(expected))
    if operator == 'ends_with':
        return str(value).endswith(str(expected))
    if operator == 'in':
        # Match if value is in a comma-separated list of expected values
        expected_list = [v.strip().lower() for v in str(expected).split(',')]
        return str(value).lower() in expected_list
    if operator == 'not_in':
        expected_list = [v.strip().lower() for v in str(expected).split(',')]
        return str(value).lower() not in expected_list
    return False
def _resolve_field(instance, field_path):
    """
    Resolve a potentially nested field path on an instance.
    Example: 'contact.account.name' -> instance.contact.account.name
    """
    if not field_path:
        return None
    
    parts = field_path.split('.')
    value = instance
    for part in parts:
        try:
            # Handle both attributes and dict-like items if needed
            if hasattr(value, part):
                value = getattr(value, part)
            elif isinstance(value, dict):
                value = value.get(part)
            else:
                return None
        except Exception:
            return None
    
    return value


def _make_action_idempotency_key(action, instance, event):
    """Generate a unique fingerprint for an action execution within a chain."""
    import hashlib
    import json
    
    raw = {
        'action_id': action.pk,
        'object_id': str(instance.pk),
        'chain_id': event.get('chain_id', 'no_chain'),
        'trigger': event.get('trigger', '')
    }
    payload = json.dumps(raw, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode()).hexdigest()


def _compensate_workflow(completed_actions, instance, event):
    """
    Roll back successfully completed actions if a subsequent action in the same 
    workflow fails permanently. Executes compensation logic in reverse order.
    """
    from .actions import execute_compensation
    
    # Iterate in reverse order of completion
    for action, result in reversed(completed_actions):
        if not action.compensation_action:
            logger.info(f"[Compensation] No rollback logic for action {action.pk}. Skipping.")
            continue
            
        try:
            logger.info(f"[Compensation] Rolling back action {action.pk}...")
            with transaction.atomic():
                execute_compensation(action, instance, event, result)
        except Exception as exc:
            logger.error(f"[Compensation] Rollback failed for action {action.pk}: {exc}", exc_info=True)


# ---------------------------------------------------------------------------
# NEW: WorkflowRule Engine (Config-driven / Production-grade)
# ---------------------------------------------------------------------------

def execute_workflow_rules(task, chain_id=None):
    """
    Unified entry point for dynamic, config-driven task automation.
    Fetches WorkflowRule records based on task_type and outcome.
    """
    from workflows.models import WorkflowRule, WorkflowExecutionLog, WorkflowActionLog
    from leads.models import Lead
    from tasks.models import Task
    
    rules = WorkflowRule.objects.filter(
        trigger_task_type=task.task_type,
        trigger_outcome=task.outcome,
        is_active=True
    )
    
    # Special case for meeting success (legacy hardcoded logic)
    if not rules.exists() and not (task.task_type == 'meeting' and task.outcome == 'success'):
        return []

    actions_taken = []
    
    # 1. Root-level safety guard: meetings always require deals
    if task.task_type == 'meeting' and task.outcome == 'success' and task.lead:
        from deals.models import Deal
        if not Deal.objects.filter(lead=task.lead, is_active=True).exists():
            from django.utils import timezone
            task.lead.deal_required = True
            task.lead.deal_required_at = timezone.now()
            task.lead.save(update_fields=['deal_required', 'deal_required_at'])
            actions_taken.append("Marked Deal Required on Lead")

    # Special case for no_response
    if task.task_type == 'call' and task.outcome == 'no_response' and task.lead:
        from tasks.models import Task
        from django.utils import timezone
        
        logger.info(f"[execute_workflow_rules] Handling no_response for task {task.pk}, lead {task.lead.id}")
        
        # Count previous failed calls
        retry_count = Task.objects.filter(
            lead=task.lead, 
            task_type='call', 
            outcome='no_response',
            status='completed'
        ).count()
        
        logger.info(f"[execute_workflow_rules] retry_count={retry_count}")
        
        delay_days = 0
        if retry_count == 1:
            delay_days = 1
        elif retry_count == 2:
            delay_days = 3
        elif retry_count == 3:
            delay_days = 7
        elif retry_count >= 4:
            actions_taken.append(f"Reached max unreachability (Retry count: {retry_count})")
            return actions_taken
        
        if delay_days > 0:
            from tasks.services import TaskService
            due_date = timezone.now() + timedelta(days=delay_days)
            
            # Ensure only ONE active retry task allowed per lead
            Task.objects.filter(
                lead=task.lead,
                task_type='call',
                status='not_started'
            ).update(status='completed', outcome='follow_up', is_active=False)
            
            new_task, created = TaskService.create_task(
                task_type='call',
                title=f"Retry Call (Attempt {retry_count + 1})",
                lead=task.lead,
                assigned_to=task.assigned_to,
                priority='medium',
                due_date=due_date,
                status='not_started'
            )
            actions_taken.append(f"Created retry call task in {delay_days} days")

    # Special case for not_interested
    if task.task_type == 'call' and task.outcome == 'not_interested' and task.lead:
        from tasks.models import Task
        from leads.models import Lead
        
        # Update lead status to lost
        task.lead.status = 'lost'
        task.lead.save(update_fields=['status'])
        
        # Close all pending follow-up tasks
        Task.objects.filter(
            lead=task.lead,
            status='not_started'
        ).update(status='completed', outcome='canceled', is_active=False)
        
        actions_taken.append("Marked Lead as Lost and cancelled pending tasks")

    # Special case for callback_later
    if task.task_type == 'call' and task.outcome == 'callback_later' and task.lead:
        from tasks.models import Task
        from tasks.services import TaskService
        from django.utils import timezone
        from leads.models import Lead
        
        # Create callback task (default to 1 day later)
        due_date = timezone.now() + timedelta(days=1)
        
        new_task, created = TaskService.create_task(
            task_type='call',
            title=f"Callback: {task.lead.name}",
            lead=task.lead,
            assigned_to=task.assigned_to,
            priority='high',
            due_date=due_date,
            status='not_started'
        )
        actions_taken.append("Marked Lead as Callback Scheduled and created task")

    # 2. Process Rules
    for rule in rules:
        try:
            with transaction.atomic():
                # Log execution start
                exec_log = WorkflowExecutionLog.objects.create(
                    task=task,
                    rule=rule,
                    status='success'  # Default, updated if failure
                )
                
                # Process each action in the JSON config
                for action_cfg in rule.actions:
                    action_type = action_cfg.get('type')
                    action_status = 'success'
                    action_message = ''
                    
                    try:
                        if action_type == 'update_lead':
                            if task.lead:
                                for field, value in action_cfg.items():
                                    if field != 'type':
                                        setattr(task.lead, field, value)
                                # Pass chain_id via instance attribute for signals to pick up
                                task.lead._chain_id = chain_id
                                task.lead.save()
                                action_message = f"Updated lead {task.lead.id}"
                                
                        elif action_type == 'convert_lead':
                            if task.lead:
                                from workflows.services import convert_lead
                                result = convert_lead(
                                    task.lead,
                                    owner=task.assigned_to,
                                    create_deal=action_cfg.get('create_deal', True),
                                    deal_data={
                                        'stage': action_cfg.get('deal_stage', 'qualification'),
                                        'title': action_cfg.get('deal_title', '').replace('{company}', task.lead.company or '').replace('{name}', task.lead.name or '')
                                    }
                                )
                                action_message = f"Converted lead {task.lead.id} to contact {result['contact'].id}"

                        elif action_type == 'create_task':
                            target_type = action_cfg.get('task_type', 'todo')
                            target_title = action_cfg.get('title') or f"Follow-up: {task.title}"
                            
                            from tasks.services import TaskService
                            from django.utils import timezone
                            
                            due_date = timezone.now() + timedelta(days=action_cfg.get('due_in_days', 1))
                            
                            try:
                                new_task, created = TaskService.create_task(
                                    task_type=target_type,
                                    title=target_title,
                                    lead=task.lead,
                                    assigned_to=task.assigned_to,
                                    priority=action_cfg.get('priority', 'medium'),
                                    due_date=due_date,
                                    status='not_started'
                                )
                                
                                if created:
                                    action_message = f"Created task {new_task.id} ({target_type})"
                                else:
                                    action_message = f"Found existing task {new_task.id} ({target_type}). Skipping creation."
                            except Exception as exc:
                                action_status = 'failure'
                                action_message = str(exc)
                                logger.error(f"[WorkflowRule] Failed to create task: {exc}")


                        
                        actions_taken.append(action_message)
                        
                    except Exception as exc:
                        action_status = 'failure'
                        action_message = str(exc)
                        logger.error(f"[WorkflowRule] Action failed: {exc}")

                    # Note: WorkflowRule doesn't have WorkflowAction objects, 
                    # but we can still log granularly if needed. 
                    # For now, we update the main execution log.

                if any(msg for msg in actions_taken if "failed" in msg.lower()):
                    exec_log.status = 'failed'
                    exec_log.save(update_fields=['status'])

        except Exception as exc:
            logger.error("[WorkflowRule] Execution failed task=%s rule=%s: %s", task.pk, rule.pk, exc, exc_info=True)
            WorkflowExecutionLog.objects.create(
                task=task,
                rule=rule,
                status='failed',
                error_message=str(exc)
            )

    return actions_taken

