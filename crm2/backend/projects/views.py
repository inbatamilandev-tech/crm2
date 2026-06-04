from rest_framework import viewsets
from .models import Project, Milestone
from .serializers import ProjectSerializer, MilestoneSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filterset_fields = ['status']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'start_date', 'end_date']

    def perform_create(self, serializer):
        project = serializer.save()
        try:
            import logging
            logger = logging.getLogger(__name__)
            from users.models import Notification
            from users.serializers import NotificationSerializer
            from realtime.bus import emit_notification

            notification = Notification.objects.create(
                user=self.request.user,
                title="New Project Created",
                message=f'Project "{project.name}" has been successfully created with status "{project.get_status_display()}".',
                type="success",
                link="/projects"
            )
            notif_data = NotificationSerializer(notification).data
            emit_notification(self.request.user.id, notif_data)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to emit notification for project creation: {e}")

class MilestoneViewSet(viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    filterset_fields = ['project', 'status']
    search_fields = ['title']
    ordering_fields = ['created_at', 'due_date']
