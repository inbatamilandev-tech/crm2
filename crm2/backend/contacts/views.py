from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Contact, Account
from .serializers import ContactSerializer, AccountSerializer
from users.permissions import HasModulePermission

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['industry']
    search_fields = ['name', 'industry']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        account = serializer.save()
        
        try:
            from users.models import Notification
            from users.serializers import NotificationSerializer
            from realtime.bus import emit_notification
            import logging
            logger = logging.getLogger(__name__)
            
            notification = Notification.objects.create(
                user=self.request.user,
                title="New Account Created",
                message=f"Account {account.name} was successfully added.",
                type="success",
                link="/accounts"
            )
            notif_data = NotificationSerializer(notification).data
            emit_notification(self.request.user.id, notif_data)
        except Exception as e:
            logger.error(f"Failed to emit notification for account creation: {e}")

class ContactViewSet(viewsets.ModelViewSet):
    """
    RBAC rules (strict, owner-field only):
      global scope → all contacts
      team scope   → contacts owned by users in same team
      own scope    → only their own contacts
    """
    serializer_class = ContactSerializer
    permission_classes = [HasModulePermission]
    rbac_module = 'contact'
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email', 'status']
    ordering_fields = ['id']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Contact.objects.none()
        if not user.role:
            return Contact.objects.none()

        base_qs = Contact.objects.select_related('owner', 'account')
        scope = user.role.data_scope

        if scope == 'global':
            return base_qs.all()
        if scope == 'team':
            if not user.team:
                return base_qs.none()
            return base_qs.filter(owner__team=user.team)
        # 'own' scope
        return base_qs.filter(owner=user)

    def perform_create(self, serializer):
        """Always stamp the creating user as owner. Never trust client input."""
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        """Owner is immutable after creation — enforced by serializer read_only."""
        serializer.save()
