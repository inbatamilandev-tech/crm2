"""
URL configuration for crm_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from leads.views import LeadViewSet
from contacts.views import ContactViewSet, AccountViewSet
from deals.views import DealViewSet, ProductViewSet
from tasks.views import TaskViewSet, ActivityLogViewSet
from activities.views import ActivityViewSet, MeetingViewSet, SendEmailAPIView, CommentViewSet, UnifiedActivityViewSet
from calls.views import CallViewSet
from projects.views import ProjectViewSet, MilestoneViewSet
from workflows.views import WorkflowViewSet, WorkflowLogViewSet, WorkflowTraceViewSet
from quotes.views import QuoteViewSet
from invoices.views import InvoiceViewSet
from support.views import CaseViewSet, SolutionViewSet, ServiceViewSet, FeedbackViewSet, SupportStatsAPIView
from users.views import UserViewSet, RoleViewSet, PermissionViewSet, LoginHistoryView, UserDetailView, UserSessionViewSet, AuditLogView, SecurityPolicyView, NotificationViewSet

router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'deals', DealViewSet, basename='deal')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-log')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'meetings', MeetingViewSet, basename='meeting')
router.register(r'calls', CallViewSet, basename='call')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'activity-feed', UnifiedActivityViewSet, basename='activity-feed')
router.register(r'projects', ProjectViewSet)
router.register(r'milestones', MilestoneViewSet)
router.register(r'workflows', WorkflowViewSet)
router.register(r'workflow-logs', WorkflowLogViewSet)
router.register(r'workflow-traces', WorkflowTraceViewSet, basename='workflow-trace')
router.register(r'quotes', QuoteViewSet, basename='quote')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'cases', CaseViewSet)
router.register(r'solutions', SolutionViewSet)
router.register(r'services', ServiceViewSet)
router.register(r'feedback', FeedbackViewSet)
router.register(r'users', UserViewSet, basename='user')
router.register(r'roles', RoleViewSet, basename='role')
router.register(r'permissions', PermissionViewSet, basename='permission')
router.register(r'security/sessions', UserSessionViewSet, basename='security-session')
router.register(r'notifications', NotificationViewSet, basename='notification')

from .views import DashboardStatsAPIView, TeamPerformanceAPIView
from realtime.views import RealtimeMetricsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('users.urls')),
    path('api/profile/', UserDetailView.as_view(), name='profile'),
    path('api/settings/login-history/', LoginHistoryView.as_view(), name='settings_login_history'),
    path('api/login-history/', LoginHistoryView.as_view(), name='login-history'),
    path('api/security/audit-logs/', AuditLogView.as_view(), name='security-audit-logs'),
    path('api/security/policy/', SecurityPolicyView.as_view(), name='security-policy'),
    path('api/analytics/dashboard/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    path('api/analytics/team/', TeamPerformanceAPIView.as_view(), name='team-performance'),
    path('api/emails/send/', SendEmailAPIView.as_view(), name='send-email'),
    path('api/emails/', include('emails.urls')),
    path('api/support/stats/', SupportStatsAPIView.as_view(), name='support-stats'),
    # Realtime & Marketing
    path('api/marketing/', include('marketing.urls')),
    path('api/realtime/metrics/', RealtimeMetricsView.as_view(), name='realtime-metrics'),
    path('api/', include(router.urls)),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
