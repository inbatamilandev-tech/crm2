from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/main/$', consumers.MainConsumer.as_asgi()),
]
