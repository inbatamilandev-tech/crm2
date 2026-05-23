from rest_framework import generics, viewsets, mixins, views, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model, update_session_auth_hash
from django.utils import timezone
from .serializers import RegisterSerializer, UserSerializer, CompanyProfileSerializer, RoleSerializer, LoginHistorySerializer, UserSessionSerializer, AuditLogSerializer, CustomTokenObtainPairSerializer, SecurityPolicySerializer, NotificationSerializer
from .models import CompanyProfile, Role, LoginHistory, UserSession, AuditLog, SecurityPolicy, Notification
from .permissions import IsAdmin, IsAdminOrManager, has_perm, get_scoped_queryset
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from django_user_agents.utils import get_user_agent

User = get_user_model()

from rest_framework_simplejwt.views import TokenObtainPairView

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def perform_update(self, serializer):
        instance = self.get_object()
        old_value = {
            'username': instance.username,
            'email': instance.email,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'notifications': instance.notifications
        }
        
        super().perform_update(serializer)
        
        instance.refresh_from_db()
        new_value = {
            'username': instance.username,
            'email': instance.email,
            'first_name': instance.first_name,
            'last_name': instance.last_name,
            'notifications': instance.notifications
        }
        
        user_agent = get_user_agent(self.request)
        device = "Mobile" if user_agent.is_mobile else "Tablet" if user_agent.is_tablet else "PC" if user_agent.is_pc else "Bot" if user_agent.is_bot else "Unknown"
        
        AuditLog.objects.create(
            user=self.request.user,
            action_type='PROFILE_UPDATED',
            module='users',
            old_value=str(old_value),
            new_value=str(new_value),
            ip_address=self.request.META.get('REMOTE_ADDR'),
            device=device
        )

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    
    def get_permissions(self):
        return [has_perm('users.manage')()]

    def get_queryset(self):
        return get_scoped_queryset(User.objects.all(), self.request.user, owner_field='self').order_by('id')

class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    
    def get_permissions(self):
        return [has_perm('roles.manage')()]

    def get_queryset(self):
        return Role.objects.all().order_by('id')

    @action(detail=False, methods=['get'])
    def permissions(self, request):
        from .models import Permission
        perms = Permission.objects.values_list('name', flat=True)
        return Response(list(perms))

class LoginHistoryView(generics.ListAPIView):
    serializer_class = LoginHistorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return LoginHistory.objects.filter(user=self.request.user).order_by('-timestamp')

class CompanyProfileView(views.APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = CompanyProfile.objects.get_or_create(id=1)
        serializer = CompanyProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile, created = CompanyProfile.objects.get_or_create(id=1)
        serializer = CompanyProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not user.check_password(current_password):
            return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        
        update_session_auth_hash(request, user)
        
        user_agent = get_user_agent(request)
        device = "Mobile" if user_agent.is_mobile else "Tablet" if user_agent.is_tablet else "PC" if user_agent.is_pc else "Bot" if user_agent.is_bot else "Unknown"
        
        AuditLog.objects.create(
            user=request.user,
            action_type='PASSWORD_CHANGED',
            module='auth',
            ip_address=request.META.get('REMOTE_ADDR'),
            device=device
        )
        
        return Response({'success': 'Password updated successfully!'})


class UserSessionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSessionSerializer

    def get_queryset(self):
        scope = self.request.user.role_fk.scope if self.request.user.role_fk else 'own'
        if scope == 'global':
            return UserSession.objects.all().order_by('-login_time')
        return UserSession.objects.filter(user=self.request.user).order_by('-login_time')

    @action(detail=True, methods=['post'], url_path='logout')
    def logout_session(self, request, pk=None):
        session = self.get_object()
        if session.user != request.user and (not request.user.role_fk or request.user.role_fk.scope != 'global'):
            return Response({'error': 'You do not have permission to terminate this session.'}, status=status.HTTP_403_FORBIDDEN)
        
        session.is_active = False
        session.logout_time = timezone.now()
        session.save()

        if session.refresh_jti:
            try:
                outstanding_token = OutstandingToken.objects.get(jti=session.refresh_jti)
                BlacklistedToken.objects.get_or_create(token=outstanding_token)
            except OutstandingToken.DoesNotExist:
                pass

        return Response({'success': 'Session terminated successfully.'})

    @action(detail=False, methods=['post'], url_path='logout-all')
    def logout_all(self, request):
        current_jti = None
        if hasattr(request, 'auth') and hasattr(request.auth, 'get'):
            current_jti = request.auth.get('jti')
            
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        if current_jti:
            sessions = sessions.exclude(jti=current_jti)
            
        for session in sessions:
            session.is_active = False
            session.logout_time = timezone.now()
            session.save()
            
            if session.refresh_jti:
                try:
                    outstanding_token = OutstandingToken.objects.get(jti=session.refresh_jti)
                    BlacklistedToken.objects.get_or_create(token=outstanding_token)
                except OutstandingToken.DoesNotExist:
                    pass

        return Response({'success': 'All other sessions terminated successfully.'})


class AuditLogView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AuditLogSerializer
    
    def get_queryset(self):
        # Admins see all, users see their own
        if self.request.user.role_fk and self.request.user.role_fk.scope == 'global':
            return AuditLog.objects.all().order_by('-timestamp')
        
        # Managers see their team
        if self.request.user.role_fk and self.request.user.role_fk.scope == 'team' and self.request.user.team:
            return AuditLog.objects.filter(user__team=self.request.user.team).order_by('-timestamp')
            
        return AuditLog.objects.filter(user=self.request.user).order_by('-timestamp')


class SecurityPolicyView(views.APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [has_perm('security.manage')()]

    def get(self, request):
        policy, created = SecurityPolicy.objects.get_or_create(id=1)
        serializer = SecurityPolicySerializer(policy)
        return Response(serializer.data)

    def put(self, request):
        policy, created = SecurityPolicy.objects.get_or_create(id=1)
        serializer = SecurityPolicySerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'], url_path='read')
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all marked as read'})

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})
