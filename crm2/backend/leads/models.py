from django.db import models
from django.conf import settings
from contacts.models import Contact

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class Lead(models.Model):
    STATUS_CHOICES = (
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('follow_up', 'Follow up'),
        ('qualified', 'Qualified'),
        ('meeting_scheduled', 'Meeting Scheduled'),
        ('proposal', 'Proposal'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    )
    
    STATUS_ORDER = {
        'new': 1,
        'contacted': 2,
        'follow_up': 3,
        'qualified': 4,
        'meeting_scheduled': 5,
        'proposal': 6,
        'won': 7,
        'lost': 7,
    }

    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    score = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Keep old fields temporarily for API compatibility if needed, but allow nulls
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    company = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=30, blank=True, null=True)

    # Marketing Attribution
    SOURCE_CHOICES = (
        ('facebook', 'Facebook'),
        ('instagram', 'Instagram'),
        ('google', 'Google Ads'),
        ('website', 'Website'),
        ('whatsapp', 'WhatsApp'),
        ('referral', 'Referral'),
        ('linkedin', 'LinkedIn'),
        ('direct', 'Direct Call'),
        ('email', 'Email Campaign'),
        ('seo', 'SEO / Organic'),
        ('cold_call', 'Cold Call'),
        ('social_media', 'Social Media'),
        ('other', 'Other'),
    )
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='other', blank=True, null=True)
    campaign = models.ForeignKey(
        'marketing.Campaign',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='leads'
    )
    
    # Advanced Attribution (Enterprise)
    utm_source = models.CharField(max_length=100, blank=True, null=True)
    utm_medium = models.CharField(max_length=100, blank=True, null=True)
    utm_campaign = models.CharField(max_length=100, blank=True, null=True)
    utm_content = models.CharField(max_length=100, blank=True, null=True)
    utm_term = models.CharField(max_length=100, blank=True, null=True)
    
    first_touch_source = models.CharField(max_length=255, blank=True, null=True)
    latest_touch_source = models.CharField(max_length=255, blank=True, null=True)

    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deal_required = models.BooleanField(default=False, help_text="Set to True after successful meeting until deal is created.")
    deal_required_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when deal became required.")


    objects = SoftDeleteManager()
    all_objects = models.Manager()

    def soft_delete(self):
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        self.is_deleted = False
        self.deleted_at = None
        self.save()

    def save(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        if self.pk:
            try:
                old_instance = Lead.objects.get(pk=self.pk)
                old_status = old_instance.status
                
                new_rank = self.STATUS_ORDER.get(self.status, 0)
                old_rank = self.STATUS_ORDER.get(old_status, 0)
                
                if new_rank < old_rank:
                    raise ValidationError(f"Cannot move lead status backwards from '{old_status}' to '{self.status}'.")
            except Lead.DoesNotExist:
                pass
                
        super().save(*args, **kwargs)


    def __str__(self):
        if self.contact:
            return f"Lead: {self.contact.first_name} {self.contact.last_name}"
        return f"Lead: {self.name or self.id}"


