import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count, Sum
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Campaign, CampaignSnapshot
from .serializers import CampaignSerializer, CampaignSnapshotSerializer
from .services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

class CampaignViewSet(viewsets.ModelViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    filterset_fields = ['status', 'type', 'source_platform']
    search_fields = ['name', 'target_audience', 'assigned_team']
    ordering_fields = ['created_at', 'start_date', 'leads_generated', 'actual_revenue']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Detailed per-campaign analytics."""
        campaign = self.get_object()
        metrics = AnalyticsService.get_campaign_metrics(campaign)
        
        # Add trend data from snapshots
        snapshots = campaign.snapshots.all()[:30]
        trend = CampaignSnapshotSerializer(snapshots, many=True).data
        
        return Response({
            'campaign_id': campaign.pk,
            'name': campaign.name,
            'metrics': metrics,
            'trend': trend[::-1] # Reverse for chronological order
        })

class MarketingAnalyticsView(APIView):
    """
    GET /api/marketing/analytics/
    High-performance real-time analytics for the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from leads.models import Lead
        from deals.models import Deal

        stats = AnalyticsService.get_overall_marketing_stats()
        
        leads = Lead.objects.filter(is_deleted=False)
        
        # Funnel data
        funnel_stages = ['new', 'contacted', 'qualified', 'proposal', 'won']
        funnel = {s: leads.filter(status=s).count() for s in funnel_stages}
        
        # Leads by source
        leads_by_source = list(
            leads.exclude(source__isnull=True)
            .values('source')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Monthly trend
        now = timezone.now()
        monthly_trend = []
        for i in range(5, -1, -1):
            start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
            end = (start + timedelta(days=32)).replace(day=1)
            count = leads.filter(created_at__gte=start, created_at__lt=end).count()
            monthly_trend.append({
                'month': start.strftime('%b %Y'),
                'leads': count
            })

        # Top campaigns
        top_campaigns = Campaign.objects.all().order_by('-actual_revenue')[:5]
        top_campaigns_data = CampaignSerializer(top_campaigns, many=True).data

        return Response({
            **stats,
            'funnel': funnel,
            'leads_by_source': leads_by_source,
            'monthly_trend': monthly_trend,
            'top_campaigns': top_campaigns_data
        })

class MarketingLeadCaptureView(APIView):
    """
    Public endpoint for multi-channel lead injection.
    Supports UTM attribution and auto-assignment.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        from leads.models import Lead
        from django.contrib.auth import get_user_model
        User = get_user_model()

        # Basic fields
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()
        
        # Attribution fields
        campaign_id = data.get('campaign_id')
        source = data.get('source', 'website')
        utm_params = {
            'utm_source': data.get('utm_source'),
            'utm_medium': data.get('utm_medium'),
            'utm_campaign': data.get('utm_campaign'),
            'utm_content': data.get('utm_content'),
            'utm_term': data.get('utm_term'),
        }

        # Auto-assignment (Round Robin)
        sales_user = User.objects.filter(role='sales', is_active=True).annotate(
            lead_count=Count('lead')
        ).order_by('lead_count').first()

        try:
            lead = Lead.objects.create(
                name=name,
                email=email,
                phone=phone,
                source=source,
                campaign_id=campaign_id,
                assigned_to=sales_user,
                first_touch_source=source,
                latest_touch_source=source,
                **utm_params
            )
            return Response({
                'detail': 'Lead captured successfully',
                'lead_id': lead.id
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.error(f"Lead capture failed: {e}")
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class WebhookDispatcher(APIView):
    """
    Provider-agnostic webhook handler.
    Routes incoming payloads from WhatsApp, Twilio, Meta, etc.
    """
    permission_classes = [AllowAny]

    def post(self, request, provider):
        logger.info(f"Incoming webhook from {provider}")
        payload = request.data
        
        # Route to specific provider logic
        if provider == 'whatsapp':
            return self.handle_whatsapp(payload)
        elif provider == 'twilio':
            return self.handle_twilio(payload)
            
        return Response({'detail': f'Provider {provider} not supported'}, status=status.HTTP_400_BAD_REQUEST)

    def handle_whatsapp(self, payload):
        # WhatsApp specific extraction logic
        # Meta API handshake verification often goes here too
        return Response({'status': 'logged'})

    def handle_twilio(self, payload):
        # Twilio specific logic
        return Response({'status': 'logged'})
