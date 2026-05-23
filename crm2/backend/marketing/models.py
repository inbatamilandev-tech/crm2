from django.db import models
from django.conf import settings

class Campaign(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('archived', 'Archived'),
    )
    TYPE_CHOICES = (
        ('email', 'Email Campaign'),
        ('social', 'Social Media'),
        ('sms', 'SMS Campaign'),
        ('event', 'Event'),
        ('whatsapp', 'WhatsApp Campaign'),
        ('referral', 'Referral Campaign'),
        ('seo', 'SEO Campaign'),
    )
    SOURCE_PLATFORM_CHOICES = (
        ('facebook', 'Facebook Ads'),
        ('instagram', 'Instagram Ads'),
        ('google', 'Google Ads'),
        ('email', 'Email Campaign'),
        ('whatsapp', 'WhatsApp'),
        ('referral', 'Referral'),
        ('seo', 'SEO / Organic'),
        ('website', 'Website'),
        ('direct', 'Direct'),
    )

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='email')
    source_platform = models.CharField(max_length=20, choices=SOURCE_PLATFORM_CHOICES, default='website', blank=True, null=True)
    target_audience = models.CharField(max_length=255, blank=True, null=True)
    assigned_team = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    description = models.TextField(blank=True, null=True)

    # Budget & Revenue
    budget = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Email Metrics
    sent = models.IntegerField(default=0)
    opened = models.FloatField(default=0.0)   # percentage
    clicked = models.FloatField(default=0.0)  # percentage

    # Auto-tracked counters
    leads_generated = models.IntegerField(default=0)
    converted_deals = models.IntegerField(default=0)

    start_date = models.DateField(blank=True, null=True)
    end_date = models.DateField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='marketing_campaigns')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class CampaignSnapshot(models.Model):
    """Historical snapshot of campaign performance for accurate enterprise reporting."""
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='snapshots')
    date = models.DateField()
    
    leads_count = models.IntegerField(default=0)
    deals_count = models.IntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    spend = models.DecimalField(max_digits=12, decimal_places=2, default=0) # Daily proportional budget if possible

    class Meta:
        unique_together = ('campaign', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.campaign.name} - {self.date}"
