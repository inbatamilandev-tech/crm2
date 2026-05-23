from django.db import models
from leads.models import Lead
from contacts.models import Account, Contact
from django.conf import settings

class Deal(models.Model):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('won', 'Won'),
        ('lost', 'Lost'),
    )

    lead = models.ForeignKey(Lead, on_delete=models.SET_NULL, related_name="deals", null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, null=True, blank=True)
    value = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    # Old fields for compatibility
    title = models.CharField(max_length=255, blank=True, null=True)
    stage = models.CharField(max_length=50, blank=True, null=True, default='proposal')
    expected_close_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    contact = models.ForeignKey(Contact, on_delete=models.SET_NULL, null=True, blank=True)
    campaign = models.ForeignKey('marketing.Campaign', on_delete=models.SET_NULL, null=True, blank=True, related_name='campaign_deals')

    # Advanced Attribution (Enterprise)
    utm_source = models.CharField(max_length=100, blank=True, null=True)
    utm_medium = models.CharField(max_length=100, blank=True, null=True)
    utm_campaign = models.CharField(max_length=100, blank=True, null=True)
    utm_content = models.CharField(max_length=100, blank=True, null=True)
    utm_term = models.CharField(max_length=100, blank=True, null=True)

    probability = models.IntegerField(default=20, help_text='Win probability (0–100%).')
    gravity_score = models.FloatField(default=0.0, help_text='Gravity score for physics engine.')
    momentum = models.FloatField(default=0.0, help_text='Momentum for physics engine.')
    y_position = models.FloatField(default=0.0, help_text='Y position for physics engine.')
    gravity_weight = models.FloatField(default=1.0, help_text='Weight for physics engine.')
    lift_force = models.FloatField(default=0.0, help_text='Lift force for physics engine.')
    risk_score = models.FloatField(default=0.0, help_text='Risk score.')
    floating_height = models.FloatField(default=0.0, help_text='Floating height.')
    glow_intensity = models.FloatField(default=0.0, help_text='Glow intensity.')



    def clean(self):
        from django.core.exceptions import ValidationError
        from django.utils import timezone

        # 1. Strict Validation: amount & expected_close_date
        if not self.value or self.value <= 0:
            raise ValidationError({'value': 'Deal value must be greater than zero.'})
        if not self.expected_close_date:
            raise ValidationError({'expected_close_date': 'Expected close date is required.'})

        # 2. Ensure only one active deal per lead (Enterprise Rule)
        if self.is_active and self.lead:
            existing = Deal.objects.filter(lead=self.lead, is_active=True)
            if self.pk:
                existing = existing.exclude(pk=self.pk)
            if existing.exists():
                raise ValidationError({'lead': 'An active deal already exists for this lead. Close it before creating a new one.'})

        # 3. Lifecycle Rules: When won/lost → mark closed
        if self.status in ['won', 'lost']:
            self.is_active = False
            if not self.closed_at:
                self.closed_at = timezone.now()
        else:
            self.is_active = True
            self.closed_at = None

    def calculate_probability_and_metrics(self):
        mapping = {
            'qualification': 10,
            'needs analysis': 25,
            'needs_analysis': 25,
            'value proposition': 40,
            'value_proposition': 40,
            'identify decision makers': 40,
            'identify_decision_makers': 40,
            'proposal/price quote': 60,
            'proposal': 60,
            'negotiation/review': 80,
            'negotiation': 80,
            'closed won': 100,
            'closed_won': 100,
            'closed lost': 0,
            'closed_lost': 0,
            'closed lost to competition': 0,
            'closed_lost_to_competition': 0,
        }

        self.probability = mapping.get(self.stage.lower() if self.stage else '', 0)
        
        # Simple gravity calculation based on probability
        self.gravity_score = self.probability / 100.0
        self.y_position = self.probability * 5.0 # Just a placeholder scale
        
        # Extended physics metrics
        self.gravity_weight = 1.0 + (float(self.value) / 50000.0) if self.value else 1.0
        self.lift_force = self.probability / 100.0
        self.risk_score = 100.0 - self.probability
        self.floating_height = self.probability * 5.0
        self.glow_intensity = self.probability / 100.0


    def save(self, *args, **kwargs):
        self.calculate_probability_and_metrics()
        
        # Handle update_fields
        update_fields = kwargs.get('update_fields')
        if update_fields is not None:
            update_fields = list(update_fields)
            if 'stage' in update_fields:
                for field in ['probability', 'gravity_score', 'y_position', 'gravity_weight', 'lift_force', 'risk_score', 'floating_height', 'glow_intensity']:
                    if field not in update_fields:
                        update_fields.append(field)
            kwargs['update_fields'] = update_fields
            
        self.full_clean()
        super().save(*args, **kwargs)




    def __str__(self):
        return f"Deal: {self.title or 'Unnamed'} ({self.status})"

class Product(models.Model):
    PRODUCT_TYPE_CHOICES = (
        ('service', 'Service'),
        ('software_package', 'Software Package'),
        ('website_package', 'Website Package'),
        ('subscription', 'Subscription'),
        ('maintenance_plan', 'Maintenance Plan'),
        ('add_on', 'Add-on Service'),
    )

    CATEGORY_CHOICES = (
        ('web_dev', 'Website Development'),
        ('software', 'Software Services'),
        ('seo', 'SEO Services'),
        ('hosting', 'Hosting & Maintenance'),
        ('other', 'Other'),
    )

    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=True, null=True, blank=True)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='web_dev')
    service_type = models.CharField(max_length=50, choices=PRODUCT_TYPE_CHOICES, default='service')
    description = models.TextField(blank=True, null=True)
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2) # Base Price
    discount_allowed = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    tax_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default='USD')

    # Project Details
    estimated_timeline = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. 2 weeks, 1 month")
    delivery_type = models.CharField(max_length=50, default='digital')
    support_duration = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. 3 months, 1 year")

    # Business Details
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True, null=True)

    # Optional
    tech_stack = models.CharField(max_length=255, blank=True, null=True)
    features_included = models.JSONField(default=list, blank=True, null=True)
    limitations = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Quote(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="deals_quotes")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="deals_quotes")
    total_amount = models.DecimalField(max_digits=20, decimal_places=2)
    is_accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Quote for {self.deal}"

class Invoice(models.Model):
    deal = models.OneToOneField(Deal, on_delete=models.CASCADE, related_name="deals_invoice")
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice for {self.deal}"
