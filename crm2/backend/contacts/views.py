from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Contact, Account
from .serializers import ContactSerializer, AccountSerializer
from users.permissions import RoleBasedAccessPermission

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['industry']
    search_fields = ['name', 'industry']
    ordering_fields = ['created_at']

class ContactViewSet(viewsets.ModelViewSet):
    """
    RBAC rules (strict, owner-field only):
      admin   → all contacts
      manager → contacts owned by users in same team
      sales   → only their own contacts
    """
    serializer_class = ContactSerializer
    permission_classes = [RoleBasedAccessPermission]
    filterset_fields = ['status']
    search_fields = ['first_name', 'last_name', 'email', 'status']
    ordering_fields = ['id']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Contact.objects.none()

        base_qs = Contact.objects.select_related('owner', 'account')

        if user.role == 'admin':
            return base_qs.all()

        if user.role == 'manager':
            if not user.team:
                return base_qs.none()
            return base_qs.filter(owner__team=user.team)

        if user.role == 'sales':
            return base_qs.filter(owner=user)

        # Unknown / future roles → deny everything
        return base_qs.none()

    def perform_create(self, serializer):
        """Always stamp the creating user as owner. Never trust client input."""
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        """Owner is immutable after creation — enforced by serializer read_only."""
        serializer.save()
