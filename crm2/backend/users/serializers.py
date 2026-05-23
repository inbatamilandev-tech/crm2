from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CompanyProfile, Role, LoginHistory, UserSession, AuditLog, Permission, SecurityPolicy, Notification
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django_user_agents.utils import get_user_agent
from django.utils import timezone

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    notifications = serializers.JSONField(required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'permissions', 'language', 'timezone', 'theme', 'phone', 'bio', 'notifications', 'avatar')
        read_only_fields = ('id',)

    def get_permissions(self, obj):
        if obj.role_fk:
            return list(obj.role_fk.permissions.values_list('name', flat=True))
        return []

    def update(self, instance, validated_data):
        notifications_data = validated_data.pop('notifications', None)
        if notifications_data is not None:
            existing_notifications = instance.notifications or {}
            
            if isinstance(notifications_data, dict):
                for key, value in notifications_data.items():
                    if isinstance(value, dict) and isinstance(existing_notifications.get(key), dict):
                        existing_notifications[key].update(value)
                    else:
                        existing_notifications[key] = value
            
            instance.notifications = existing_notifications
            
        return super().update(instance, validated_data)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'first_name', 'last_name')

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role=validated_data.get('role', 'sales'),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        return user

class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyProfile
        fields = '__all__'

class RoleSerializer(serializers.ModelSerializer):
    permissions_list = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    permissions = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Role
        fields = ('id', 'name', 'scope', 'permissions', 'permissions_list')

    def get_permissions(self, obj):
        return list(obj.permissions.values_list('name', flat=True))

    def create(self, validated_data):
        permissions_data = validated_data.pop('permissions_list', [])
        role = Role.objects.create(**validated_data)
        if permissions_data:
            perms = Permission.objects.filter(name__in=permissions_data)
            role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('permissions_list', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if permissions_data is not None:
            perms = Permission.objects.filter(name__in=permissions_data)
            instance.permissions.set(perms)
            
        return instance

class LoginHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LoginHistory
        fields = '__all__'

class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'action_type', 'module', 'old_value', 'new_value', 'ip_address', 'timestamp', 'device', 'impersonated_by', 'is_suspicious', 'risk_score', 'metadata')

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        
        user = self.user
        request = self.context.get('request')
        
        if request:
            user_agent_str = request.META.get('HTTP_USER_AGENT', '')
            user_agent = get_user_agent(request)
            
            browser = user_agent.browser.family
            os = user_agent.os.family
            device = "Mobile" if user_agent.is_mobile else "Tablet" if user_agent.is_tablet else "PC" if user_agent.is_pc else "Bot" if user_agent.is_bot else "Unknown"
            
            # Extract IP
            ip_address = request.META.get('REMOTE_ADDR')
            
            # Basic Risk Detection
            is_suspicious = False
            risk_score = 0
            risk_metadata = {}
            
            last_login = LoginHistory.objects.filter(user=user).order_by('-timestamp').first()
            if last_login:
                if last_login.ip_address != ip_address:
                    is_suspicious = True
                    risk_score += 20
                    risk_metadata['new_ip'] = True
            
            # Create UserSession
            refresh_token = RefreshToken(data['refresh'])
            refresh_jti = refresh_token['jti']
            access_token = refresh_token.access_token
            jti = access_token['jti']
            expires_at = timezone.now() + refresh_token.lifetime
            
            UserSession.objects.create(
                user=user,
                session_key=jti,
                ip_address=ip_address,
                browser=browser,
                os=os,
                device=device,
                user_agent=user_agent_str,
                jti=jti,
                refresh_jti=refresh_jti,
                expires_at=expires_at
            )
            
            # Create Audit Log with risk flags
            AuditLog.objects.create(
                user=user,
                action_type='LOGIN_SUCCESS',
                module='auth',
                ip_address=ip_address,
                device=device,
                is_suspicious=is_suspicious,
                risk_score=risk_score,
                metadata=risk_metadata
            )
            
            data['session_id'] = jti
            
        return data


class SecurityPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityPolicy
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
