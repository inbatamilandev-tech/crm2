from django.contrib.auth.models import AbstractUser
from django.db import models

class Permission(models.Model):
    name = models.CharField(max_length=50, unique=True) # e.g., quote.approve
    description = models.CharField(max_length=200, blank=True)

    def __str__(self):
        return self.name

class Role(models.Model):
    SCOPE_CHOICES = (
        ('own', 'Own Records Only'),
        ('team', 'Team Records'),
        ('global', 'Global Access'),
    )
    name = models.CharField(max_length=50, unique=True) # e.g., Admin, Manager
    data_scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='own')
    permissions = models.ManyToManyField(Permission, related_name='roles')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class User(AbstractUser):
    team = models.CharField(max_length=100, blank=True, null=True)
    
    # FK to Role model
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    language = models.CharField(max_length=50, default='English')
    timezone = models.CharField(max_length=50, default='UTC-8')
    theme = models.CharField(max_length=10, default='light')
    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    notifications = models.JSONField(default=dict, blank=True)
    two_factor_enabled = models.BooleanField(default=False)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    def __str__(self):
        role_name = self.role.name if self.role else 'No Role'
        return f"{self.username} ({role_name})"

class LoginHistory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=255, blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} at {self.timestamp}"

class CompanyProfile(models.Model):
    name = models.CharField(max_length=255, default="Acme Corporation")
    website = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    street_address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    logo = models.CharField(max_length=255, blank=True, null=True)
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')

    def __str__(self):
        return self.name


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_key = models.CharField(max_length=255, unique=True, null=True, blank=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    browser = models.CharField(max_length=50, blank=True, null=True)
    os = models.CharField(max_length=50, blank=True, null=True)
    device = models.CharField(max_length=50, blank=True, null=True)
    location = models.CharField(max_length=255, default='Localhost / Unknown Location')
    user_agent = models.TextField(blank=True, null=True)
    login_time = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(auto_now=True)
    logout_time = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # JWT tracking fields
    jti = models.CharField(max_length=255, null=True, blank=True)
    refresh_jti = models.CharField(max_length=255, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} session ({'Active' if self.is_active else 'Inactive'})"


class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='audit_logs')
    action_type = models.CharField(max_length=50) # e.g., PROFILE_UPDATED
    module = models.CharField(max_length=50) # e.g., users, deals
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    device = models.CharField(max_length=255, blank=True, null=True)
    impersonated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='impersonated_actions')
    is_suspicious = models.BooleanField(default=False)
    risk_score = models.IntegerField(default=0) # 0-100
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.action_type} at {self.timestamp}"


class SecurityPolicy(models.Model):
    min_password_length = models.PositiveIntegerField(default=8)
    require_special_chars = models.BooleanField(default=True)
    require_numbers = models.BooleanField(default=True)
    require_uppercase = models.BooleanField(default=True)
    password_expiry_days = models.PositiveIntegerField(default=90)
    max_login_attempts = models.PositiveIntegerField(default=5)
    session_timeout_minutes = models.PositiveIntegerField(default=30)
    enforce_2fa_globally = models.BooleanField(default=False)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Security Policies"

    def __str__(self):
        return f"Global Security Policy (Last Updated: {self.last_updated})"


class Notification(models.Model):
    TYPES = (
        ('info', 'Information'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('workflow', 'Workflow Alert'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications_set')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPES, default='info')
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title}"
