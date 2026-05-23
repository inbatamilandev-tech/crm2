import logging
from datetime import timedelta

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from activities.models import Activity
from .models import ActivityLog, Task
from .serializers import ActivityLogSerializer, TaskSerializer
from users.permissions import RoleBasedAccessPermission

logger = logging.getLogger(__name__)


class TaskViewSet(viewsets.ModelViewSet):
    """
    Task execution engine endpoint.

    RBAC:
      admin   → all tasks
      manager → tasks assigned to users in same team
      sales   → only tasks assigned to themselves

    Custom actions:
      POST /tasks/{id}/start_call/      → marks task in_progress, starts timer
      POST /tasks/{id}/complete_task/   → completes task, sets outcome, fires workflow
      GET  /tasks/{id}/activity_log/    → returns full ActivityLog for a task
      GET  /tasks/call_dashboard/       → returns call tasks grouped by priority/overdue
    """
    serializer_class = TaskSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['status', 'priority', 'task_type', 'source_object_id', 'is_active', 'lead', 'project', 'milestone']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']

    # ------------------------------------------------------------------
    # Queryset
    # ------------------------------------------------------------------

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()

        base_qs = Task.objects.select_related('assigned_to', 'lead', 'contact', 'deal')

        from django.db.models import Q
        if user.role == 'admin':
            return base_qs.all()
        if user.role == 'manager':
            if not user.team:
                return base_qs.none()
            return base_qs.filter(Q(assigned_to__team=user.team) | Q(active_by=user))
        if user.role == 'sales':
            return base_qs.filter(Q(assigned_to=user) | Q(active_by=user))

        return base_qs.none()

    # ------------------------------------------------------------------
    # Standard CRUD overrides
    # ------------------------------------------------------------------

    def create(self, request, *args, **kwargs):
        from tasks.services import TaskService
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        lead = data.get('lead')
        task_type = data.get('task_type', 'follow_up')
        title = data.get('title')
        
        try:
            # Use service to create or get task
            task, created = TaskService.create_task(
                task_type=task_type,
                title=title,
                lead=lead,
                assigned_to=data.get('assigned_to') or request.user,
                priority=data.get('priority', 'medium'),
                due_date=data.get('due_date'),
                **{k: v for k, v in data.items() if k not in ['lead', 'task_type', 'title', 'assigned_to', 'priority', 'due_date']}
            )
            
            if not created:
                # Task already existed, return it
                serializer = self.get_serializer(task)
                return Response(serializer.data, status=status.HTTP_200_OK)
                
            if lead and title:
                self._log_activity('created', f"Task created: {title}", lead.id, request.user)
                
            serializer = self.get_serializer(task)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            from django.core.exceptions import ValidationError
            if isinstance(e, ValidationError):
                return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        user = self.request.user
        task = serializer.save(
            assigned_to=serializer.validated_data.get('assigned_to') or user
        )
        task._current_user = user

    def perform_update(self, serializer):
        incoming_status = serializer.validated_data.get('status')
        instance = serializer.instance

        extra = {}
        now = timezone.now()

        # Auto-set is_active and completed_at based on status
        if incoming_status == 'completed':
            extra['is_active'] = False
            if not instance.completed_at:
                extra['completed_at'] = now
        elif incoming_status and incoming_status != 'completed':
            extra['is_active'] = True

        instance._current_user = self.request.user
        instance = serializer.save(**extra)

        # Log to activity feed when task is completed
        if instance.status == 'completed' and instance.lead_id:
            self._log_activity(
                'completed',
                f"Task completed: {instance.title} — outcome: {instance.outcome or 'N/A'}",
                instance.lead_id,
                self.request.user,
            )

    # ------------------------------------------------------------------
    # Custom Action: start_call
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'], url_path='start_call')
    def start_call(self, request, pk=None):
        """
        Mark a call-type task as in_progress.
        Records call start time in metadata.
        """
        task = self.get_object()

        if task.task_type != 'call':
            return Response(
                {'error': 'This action is only available for call-type tasks.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if task.status == 'completed':
            return Response(
                {'error': 'Task is already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            task = Task.objects.select_for_update().get(pk=task.pk)
            if task.status == 'completed':
                return Response(
                    {'error': 'Task is already completed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            task._current_user = request.user
            task.status = 'in_progress'
            task.is_active = True
            
            # Requirement: Reassign to current executor if different from original assignee
            if task.assigned_to != request.user:
                logger.info(f"[Tasks] Reassigning task {task.pk} to {request.user.username} for call execution")
                task.assigned_to = request.user
            
            task.active_by = request.user

            metadata = task.metadata or {}
            metadata['call_started_at'] = timezone.now().isoformat()
            task.metadata = metadata
            task.save(update_fields=['status', 'is_active', 'metadata', 'assigned_to', 'active_by', 'updated_at'])

        serializer = self.get_serializer(task)
        return Response({'message': 'Call started.', 'task': serializer.data})

    # ------------------------------------------------------------------
    # Custom Action: complete_task
    # ------------------------------------------------------------------

    @action(detail=True, methods=['post'], url_path='complete_task')
    def complete_task(self, request, pk=None):
        """
        Complete a task with a required outcome.
        Fires the workflow engine to auto-create next steps.

        Body: { "outcome": "interested|no_response|success|failed|not_interested", "notes": "..." }
        """
        task = self.get_object()
        outcome = request.data.get('outcome', '').strip()
        notes = request.data.get('notes', '')

        logger.info(f"[Tasks] Completing task {task.pk} ({task.task_type}) with outcome={outcome}")

        if not outcome:
            return Response(
                {'error': 'outcome is required to complete a task.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_outcomes = [o[0] for o in Task.OUTCOME_CHOICES]
        if outcome not in valid_outcomes:
            return Response(
                {'error': f"Invalid outcome. Choose from: {', '.join(valid_outcomes)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if task.status == 'completed':
            return Response(
                {'error': 'Task is already completed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Use select_for_update to prevent race conditions during completion
            logger.info(f"[Tasks] Locking task {task.pk} for completion")
            task = Task.objects.select_for_update().get(pk=task.pk)
            
            if task.status == 'completed':
                return Response(
                    {'error': 'Task is already completed.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            now = timezone.now()

            # Calculate call duration if applicable
            metadata = task.metadata or {}
            call_duration = 0
            if task.task_type == 'call' and metadata.get('call_started_at'):
                try:
                    from datetime import datetime
                    started = datetime.fromisoformat(metadata['call_started_at'])
                    if started.tzinfo is None:
                        started = timezone.make_aware(started)
                    call_duration = int((now - started).total_seconds())
                except Exception:
                    pass

            metadata['call_ended_at'] = now.isoformat()
            metadata['call_duration_seconds'] = call_duration

            task._current_user = request.user
            task.status = 'completed'
            task.outcome = outcome
            task.is_active = False
            task.completed_at = now
            task.active_by = None
            task.metadata = metadata
            
            # Ensure ownership is transferred to the person who actually completed the work
            if task.assigned_to != request.user:
                logger.info(f"[Tasks] Transferring ownership of task {task.pk} to {request.user.username}")
                task.assigned_to = request.user

            if notes:
                task.notes = notes
            if call_duration:
                task.call_duration = call_duration
                task.call_outcome = outcome

            logger.info(f"[Tasks] Saving task {task.pk} as completed with outcome={outcome}")
            task.save()
            
            # Workflow actions are now automatically triggered via signals in workflows/signals.py
            # This ensures consistency whether tasks are completed via API or background jobs.
            workflow_actions = [] 

        from workflows.context import get_captured_tasks, clear_captured_tasks
        captured = get_captured_tasks()
        logger.info(f"[Tasks] Captured {len(captured)} new tasks from workflows for task {task.pk}")
        new_tasks_data = self.get_serializer(captured, many=True).data
        clear_captured_tasks()

        serializer = self.get_serializer(task)
        return Response({
            'message': 'Task completed successfully.',
            'task': serializer.data,
            'new_tasks': new_tasks_data,
            'workflow_actions': workflow_actions,
            'call_duration_seconds': call_duration if task.task_type == 'call' else None,
        })


    def _create_followup_task(self, title, task_type, priority, due_date, lead, assigned_to, notes=''):
        """Create a follow-up task with deduplication check."""
        # Deduplication: don't create if same active task exists for this lead+type
        if lead:
            existing = Task.objects.filter(
                lead=lead,
                task_type=task_type,
                title__iexact=title,
                is_active=True,
                status__in=['not_started', 'pending', 'in_progress'],
            ).first()
            if existing:
                return existing

        task = Task.objects.create(
            title=title,
            task_type=task_type,
            priority=priority,
            due_date=due_date,
            lead=lead,
            assigned_to=assigned_to,
            notes=notes,
            status='not_started',
            is_active=True,
        )
        task._current_user = assigned_to
        return task

    # ------------------------------------------------------------------
    # Custom Action: activity_log
    # ------------------------------------------------------------------

    @action(detail=True, methods=['get'], url_path='activity_log')
    def activity_log(self, request, pk=None):
        """Return full ActivityLog timeline for a specific task."""
        task = self.get_object()
        logs = ActivityLog.objects.filter(task=task).order_by('-timestamp')
        serializer = ActivityLogSerializer(logs, many=True)
        return Response(serializer.data)

    # ------------------------------------------------------------------
    # Custom Action: call_dashboard
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='call_dashboard')
    def call_dashboard(self, request):
        """
        Returns call tasks grouped into buckets for the Call Execution Dashboard.
        Buckets: overdue, due_today, upcoming, in_progress
        """
        qs = self.get_queryset().filter(
            task_type='call'
        ).select_related('lead', 'assigned_to').order_by('-updated_at')

        now = timezone.now()
        today_end = now.replace(hour=23, minute=59, second=59)

        overdue = []
        due_today = []
        upcoming = []
        in_progress = []
        completed = []

        last_24h = now - timedelta(hours=24)

        for task in qs:
            s = self.get_serializer(task).data
            if task.status == 'completed':
                # Only show recently completed calls in the dashboard
                if task.completed_at and task.completed_at >= last_24h:
                    completed.append(s)
                continue

            if task.status == 'in_progress':
                in_progress.append(s)
            elif task.due_date and task.due_date < now:
                overdue.append(s)
            elif task.due_date and task.due_date <= today_end:
                due_today.append(s)
            else:
                upcoming.append(s)

        return Response({
            'overdue': overdue,
            'due_today': due_today,
            'in_progress': in_progress,
            'upcoming': upcoming,
            'completed': completed,
            'stats': {
                'total_call_tasks': qs.count(),
                'overdue_count': len(overdue),
                'due_today_count': len(due_today),
                'in_progress_count': len(in_progress),
            }
        })

    # ------------------------------------------------------------------
    # Analytics: metrics
    # ------------------------------------------------------------------

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        """Computed analytics: conversion rates, overdue counts, completion times."""
        from django.db.models import Avg, Count, F, ExpressionWrapper, DurationField

        qs = self.get_queryset()
        now = timezone.now()

        total_calls = qs.filter(task_type='call', status='completed').count()
        converted_calls = qs.filter(
            task_type='call', status='completed', outcome='interested'
        ).count()
        call_to_conversion_rate = (
            round(converted_calls / total_calls * 100, 1) if total_calls else 0
        )

        overdue_count = qs.filter(
            due_date__lt=now,
            status__in=['not_started', 'pending', 'in_progress'],
        ).count()

        avg_completion_time = qs.filter(
            status='completed',
            completed_at__isnull=False,
        ).annotate(
            completion_time=ExpressionWrapper(
                F('completed_at') - F('created_at'),
                output_field=DurationField()
            )
        ).aggregate(avg=Avg('completion_time'))['avg']

        avg_call_duration_success = qs.filter(
            task_type='call', status='completed', outcome='interested'
        ).aggregate(avg=Avg('call_duration'))['avg']

        avg_call_duration_failed = qs.filter(
            task_type='call', status='completed', outcome__in=['no_response', 'not_interested']
        ).aggregate(avg=Avg('call_duration'))['avg']

        return Response({
            'call_to_conversion_rate': call_to_conversion_rate,
            'overdue_tasks_count': overdue_count,
            'avg_completion_hours': (
                round(avg_completion_time.total_seconds() / 3600, 1)
                if avg_completion_time else None
            ),
            'avg_call_duration_success': round(avg_call_duration_success, 1) if avg_call_duration_success else 0,
            'avg_call_duration_failed': round(avg_call_duration_failed, 1) if avg_call_duration_failed else 0,
            'total_completed': qs.filter(status='completed').count(),
            'total_active': qs.filter(is_active=True).count(),
        })

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _log_activity(self, activity_type, notes, lead_id, user):
        try:
            Activity.objects.create(
                type=activity_type,
                notes=notes,
                object_id=lead_id,
                content_type=ContentType.objects.get(model='lead'),
                created_by=user,
            )
        except Exception:
            pass


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only API for ActivityLogs. Supports filtering by task."""
    serializer_class = ActivityLogSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['task', 'action_type']
    ordering_fields = ['timestamp']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return ActivityLog.objects.none()

        # Admin sees all; sales/manager sees logs for their tasks
        if user.role == 'admin':
            return ActivityLog.objects.select_related('task', 'user').all()

        # Filter via the tasks the user can see
        if user.role == 'manager' and user.team:
            task_ids = Task.objects.filter(
                assigned_to__team=user.team
            ).values_list('id', flat=True)
        else:
            task_ids = Task.objects.filter(
                assigned_to=user
            ).values_list('id', flat=True)

        return ActivityLog.objects.filter(
            task_id__in=task_ids
        ).select_related('task', 'user').order_by('-timestamp')
