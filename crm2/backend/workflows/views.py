"""
Workflow API Views
==================
Provides full CRUD for Workflows + read-only WorkflowLogs.
Includes a test-trigger endpoint for development.
"""

import logging

from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Workflow, WorkflowLog, WorkflowChain
from .serializers import (
    WorkflowSerializer, WorkflowLogSerializer, WorkflowTraceSerializer
)

logger = logging.getLogger(__name__)


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    CRUD for Workflows.
    GET /api/workflows/
    POST /api/workflows/
    GET/PUT/PATCH/DELETE /api/workflows/{id}/
    GET /api/workflows/{id}/logs/
    POST /api/workflows/{id}/test_trigger/
    """
    queryset           = Workflow.objects.prefetch_related('conditions', 'actions').order_by('-created_at')
    serializer_class   = WorkflowSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ['module', 'trigger_event', 'is_active']
    search_fields      = ['name', 'description']
    ordering_fields    = ['created_at', 'updated_at', 'name']

    # ── Logs sub-resource ─────────────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """GET /api/workflows/{id}/logs/"""
        workflow = self.get_object()
        logs     = workflow.logs.all().order_by('-executed_at')
        page     = self.paginate_queryset(logs)
        if page is not None:
            serializer = WorkflowLogSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = WorkflowLogSerializer(logs, many=True)
        return Response(serializer.data)

    # ── Manual test trigger ────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def test_trigger(self, request, pk=None):
        """
        POST /api/workflows/{id}/test_trigger/
        Body: { "object_id": 5 }  — PK of the object to test against.

        Manually fires the workflow against a real record.
        Useful for dev/QA without needing to create/modify a real record.
        """
        from django.apps import apps
        from .engine import trigger_workflows

        workflow  = self.get_object()
        object_id = request.data.get('object_id')

        if not object_id:
            return Response(
                {'detail': "'object_id' is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Map module → app_label
        MODULE_APP_MAP = {
            'lead':    'leads',
            'deal':    'deals',
            'task':    'tasks',
            'contact': 'contacts',
            'project': 'projects',
            'quote':   'quotes',
            'invoice': 'invoices',
            'case':    'support',
        }
        app_label  = MODULE_APP_MAP.get(workflow.module)
        model_name = workflow.module

        if not app_label:
            return Response(
                {'detail': f"Unknown module '{workflow.module}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            Model    = apps.get_model(app_label=app_label, model_name=model_name)
            instance = Model.objects.get(pk=object_id)
        except Exception as exc:
            return Response(
                {'detail': f"Could not load {workflow.module} id={object_id}: {exc}"},
                status=status.HTTP_404_NOT_FOUND
            )

        import threading

        trigger_error = []

        def _run():
            try:
                trigger_workflows(
                    module_name=workflow.module,
                    trigger_event=workflow.trigger_event,
                    instance=instance,
                )
            except Exception as exc:
                logger.error("[Views] test_trigger thread error: %s", exc, exc_info=True)
                trigger_error.append(str(exc))

        # Run in a thread so we don't block the HTTP response
        # (important on Django's single-threaded dev server)
        t = threading.Thread(target=_run, daemon=True)
        t.start()
        t.join(timeout=6)   # Wait up to 6 s for engine to write log

        if trigger_error:
            return Response(
                {'detail': f'Trigger failed: {trigger_error[0]}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        latest_log = workflow.logs.order_by('-executed_at').first()
        return Response({
            'detail': 'Workflow test-triggered successfully.',
            'log': WorkflowLogSerializer(latest_log).data if latest_log else None,
        })

    # ── Toggle active ─────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """POST /api/workflows/{id}/toggle/ — flip is_active."""
        workflow           = self.get_object()
        workflow.is_active = not workflow.is_active
        workflow.save(update_fields=['is_active'])
        return Response({
            'id':        workflow.pk,
            'is_active': workflow.is_active,
            'detail':    f"Workflow {'activated' if workflow.is_active else 'deactivated'}.",
        })

    # ── Versioning ────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        from django.utils import timezone
        from django.db import models
        workflow = self.get_object()
        
        if workflow.parent_workflow_id:
            root_id = workflow.parent_workflow_id
        else:
            root_id = workflow.pk
            
        Workflow.objects.filter(
            models.Q(pk=root_id) | models.Q(parent_workflow_id=root_id)
        ).exclude(pk=workflow.pk).update(status='ARCHIVED', is_active_version=False, is_active=False)
        
        workflow.status = 'PUBLISHED'
        workflow.is_active_version = True
        workflow.is_active = True
        workflow.published_at = timezone.now()
        workflow.save(update_fields=['status', 'is_active_version', 'is_active', 'published_at'])
        
        return Response({'detail': 'Workflow published successfully', 'version': workflow.version})
        
    @action(detail=True, methods=['post'])
    def create_draft(self, request, pk=None):
        workflow = self.get_object()
        
        if workflow.status != 'PUBLISHED':
            return Response({'detail': 'Can only create draft from a PUBLISHED workflow'}, status=status.HTTP_400_BAD_REQUEST)
            
        new_workflow = Workflow.objects.get(pk=workflow.pk)
        new_workflow.pk = None
        new_workflow.status = 'DRAFT'
        new_workflow.is_active_version = False
        new_workflow.is_active = False
        new_workflow.version = workflow.version + 1
        new_workflow.parent_workflow_id = workflow.parent_workflow_id or workflow.pk
        new_workflow.save()
        
        for cond in workflow.conditions.all():
            cond.pk = None
            cond.workflow = new_workflow
            cond.save()
            
        action_mapping = {}
        for action in workflow.actions.all().order_by('order'):
            old_pk = action.pk
            action.pk = None
            action.workflow = new_workflow
            if action.parent_action_id and action.parent_action_id in action_mapping:
                action.parent_action_id = action_mapping[action.parent_action_id]
            action.save()
            action_mapping[old_pk] = action.pk
            
        return Response(WorkflowSerializer(new_workflow).data)


class WorkflowLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet
):
    """
    Read-only log access.
    GET /api/workflow-logs/
    GET /api/workflow-logs/{id}/
    """
    queryset           = WorkflowLog.objects.select_related('workflow').order_by('-executed_at')
    serializer_class   = WorkflowLogSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields   = ['status', 'workflow', 'trigger_event']
    search_fields      = ['message', 'object_id']
    ordering_fields    = ['executed_at']

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        log = self.get_object()
        workflow = log.workflow
        
        MODULE_APP_MAP = {
            'lead':    'leads', 'deal':    'deals', 'task':    'tasks',
            'contact': 'contacts', 'project': 'projects', 'quote':   'quotes',
            'invoice': 'invoices', 'case':    'support',
        }
        from django.apps import apps
        from .engine import _run_workflow
        import threading
        
        try:
            Model = apps.get_model(app_label=MODULE_APP_MAP[workflow.module], model_name=workflow.module)
            instance = Model.objects.get(pk=log.object_id)
        except Exception as exc:
            return Response({'detail': f"Object missing: {exc}"}, status=status.HTTP_404_NOT_FOUND)
            
        def _run():
            try:
                event = {
                    'module': workflow.module,
                    'trigger': log.trigger_event,
                    'extra': {},
                }
                _run_workflow(workflow, instance, event, log.execution_key, WorkflowLog)
            except Exception as e:
                logger.error(e)
                
        t = threading.Thread(target=_run, daemon=True)
        t.start()
        t.join(timeout=6)
        
        return Response({'detail': 'Retry execution initiated.'})


class WorkflowTraceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Advanced Trace Viewer (Requirement 5)
    GET /api/workflow-traces/
    GET /api/workflow-traces/{chain_id}/
    
    Returns full visibility into an execution chain:
    - Triggering events
    - All workflows in the chain
    - Every action and its status (success/fail/compensated)
    """
    queryset           = WorkflowChain.objects.all().order_by('-created_at')
    serializer_class   = WorkflowTraceSerializer
    permission_classes = [IsAuthenticated]
    lookup_field       = 'chain_id'
    filterset_fields   = ['parent_chain_id', 'is_active']
    search_fields      = ['chain_id', 'root_event_key']
