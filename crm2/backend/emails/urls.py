from django.urls import path, include
from rest_framework.routers import DefaultRouter
from emails.views import EmailViewSet, EmailTemplateViewSet, email_webhook

router = DefaultRouter()
router.register(r'templates', EmailTemplateViewSet)
router.register(r'', EmailViewSet)

urlpatterns = [
    path('webhook/', email_webhook, name='email_webhook'),
    path('', include(router.urls)),
]
