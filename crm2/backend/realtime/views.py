from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from .metrics import metrics_manager

class RealtimeMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        metrics = metrics_manager.get_metrics()
        return Response(metrics)
