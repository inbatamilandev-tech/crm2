from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CampaignViewSet, MarketingAnalyticsView, MarketingLeadCaptureView, WebhookDispatcher

router = DefaultRouter()
router.register(r'campaigns', CampaignViewSet, basename='campaign')

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', MarketingAnalyticsView.as_view(), name='marketing-analytics'),
    path('capture-lead/', MarketingLeadCaptureView.as_view(), name='marketing-capture-lead'),
    path('webhook/<str:provider>/', WebhookDispatcher.as_view(), name='marketing-webhook'),
]
