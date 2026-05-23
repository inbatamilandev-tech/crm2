"""
Workflow Event Dispatcher — Explicit Automation Entry Point
===========================================================
Replaces signal reliance with explicit business event dispatching.
Supports event deduplication and chain tracking.
"""

import logging
import uuid
import hashlib
import json
from django.db import transaction
from .models import WorkflowEvent, WorkflowChain
from .engine import trigger_workflows

logger = logging.getLogger(__name__)

def dispatch_event(module, trigger, instance, extra_context=None, parent_chain_id=None):
    """
    Explicitly dispatch a business event to the workflow engine.
    
    Args:
        module: The entity type (lead, deal, task, etc.)
        trigger: The event trigger (on_create, stage_change, etc.)
        instance: The model instance being processed
        extra_context: Additional data for conditions/actions
        parent_chain_id: The chain_id of the workflow that triggered this event (if any)
    """
    # 0. Normalization (Handle shorthand event names if needed)
    if not module and "_" in trigger:
        # e.g. dispatch_event(None, "task_completed", task)
        module, _, trigger_type = trigger.partition("_")
        if trigger_type == "completed":
            trigger = "on_task_complete"

    # 1. Ordering Check (Requirement 1)
    # Ignore events that arrive out-of-order (older version than what's already processed)
    version = (extra_context or {}).get('version') or getattr(instance, 'version', 1)
    latest_event = WorkflowEvent.objects.filter(
        module=module, 
        object_id=str(instance.pk)
    ).order_by('-version').first()
    
    if latest_event and latest_event.version > version:
        logger.warning(f"[Dispatcher] Ignoring out-of-order event for {module}:{instance.pk}. Current v{version}, Latest v{latest_event.version}")
        return None

    event_key = _generate_event_key(module, trigger, instance, extra_context)
    
    # 2. Deduplication Check
    if WorkflowEvent.objects.filter(event_key=event_key).exists():
        logger.info(f"[Dispatcher] Skipping duplicate event: {event_key}")
        return None

    try:
        with transaction.atomic():
            # 3. Record the Event
            from django.utils import timezone
            WorkflowEvent.objects.create(
                event_key=event_key,
                module=module,
                trigger=trigger,
                object_id=str(instance.pk),
                version=version,
                source_timestamp=(extra_context or {}).get('timestamp') or timezone.now()
            )

            # 4. Handle Chain Tracking & Loop Prevention
            chain_id, depth = _resolve_chain(event_key, parent_chain_id)
            if depth > 10:  # Safety guard against infinite loops
                logger.critical(f"[WORKFLOW_CRITICAL] Depth limit exceeded! Chain: {chain_id}, Object: {module}:{instance.pk}, Depth: {depth}")
                _notify_admin(chain_id, module, instance.pk, depth)
                return None

            # 5. Trigger Workflows
            logger.info(f"[Dispatcher] Dispatching {trigger} on {module}:{instance.pk} (v{version}) (Chain: {chain_id})")
            
            # Use thread-local to propagate chain_id to any downstream signals
            from .context import _state
            _state.chain_id = chain_id
            
            try:
                trigger_workflows(
                    module, 
                    trigger, 
                    instance, 
                    extra_context=extra_context, 
                    chain_id=chain_id
                )
            finally:
                # Clean up thread-local
                if hasattr(_state, 'chain_id'):
                    del _state.chain_id
            
            return chain_id

    except Exception as exc:
        logger.error(f"[Dispatcher] Failed to dispatch event {event_key}: {exc}", exc_info=True)
        return None


def _generate_event_key(module, trigger, instance, extra):
    """Generate a unique key for an event to prevent duplicates."""
    # For completion and creation, the fact it happened is enough for deduplication.
    # For updates/stage changes, the specific data change might matter.
    key_extra = extra or {}
    if trigger in {'on_create', 'delete'}:
        key_extra = {}
    
    raw = {
        'module': module,
        'trigger': trigger,
        'pk': str(instance.pk),
        'extra': key_extra
    }
    # Use deterministic JSON for hashing
    payload = json.dumps(raw, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode()).hexdigest()


def _resolve_chain(event_key, parent_id):
    """Create or extend an execution chain."""
    if parent_id:
        try:
            parent = WorkflowChain.objects.get(chain_id=parent_id)
            depth = parent.depth + 1
            chain_id = f"{parent_id}.{uuid.uuid4().hex[:6]}"
        except WorkflowChain.DoesNotExist:
            depth = 0
            chain_id = uuid.uuid4().hex
    else:
        depth = 0
        chain_id = uuid.uuid4().hex

    WorkflowChain.objects.create(
        chain_id=chain_id,
        root_event_key=event_key,
        parent_chain_id=parent_id,
        depth=depth
    )
    return chain_id, depth


def _notify_admin(chain_id, module, object_id, depth):
    """Notify system administrators about critical workflow failures."""
    from django.core.mail import send_mail
    from django.conf import settings
    
    subject = f"[URGENT] Workflow Depth Limit Exceeded - Chain {chain_id}"
    message = (
        f"Critical Failure: Workflow depth limit (10) has been exceeded.\n\n"
        f"Chain ID: {chain_id}\n"
        f"Module: {module}\n"
        f"Object ID: {object_id}\n"
        f"Depth: {depth}\n\n"
        f"Execution has been halted to prevent system instability."
    )
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [admin[1] for admin in settings.ADMINS] if settings.ADMINS else [],
            fail_silently=True
        )
    except Exception:
        logger.error("[Dispatcher] Failed to send admin notification email.")
