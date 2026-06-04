from django.db import models
from django.conf import settings
from deals.models import Deal
from deals.models import Product


class Quote(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('viewed', 'Viewed'),
        ('negotiating', 'Negotiating'),
        ('accepted', 'Accepted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_quotes',
    )
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='quotes')
    quote_number = models.CharField(max_length=50, unique=True)
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Financials
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)  # Total amount
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    valid_until = models.DateField(null=True, blank=True)
    
    # Project Requirements
    requirement_summary = models.TextField(blank=True, null=True)
    tech_stack = models.CharField(max_length=255, blank=True, null=True)
    timeline = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    # Terms & Conditions
    payment_terms = models.TextField(blank=True, null=True)
    delivery_terms = models.TextField(blank=True, null=True)
    revision_policy = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.quote_number} - {self.deal.title}"


class QuoteLineItem(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='line_items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='quote_line_items')
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    @property
    def line_total(self):
        base = self.quantity * self.unit_price
        after_discount = base - self.discount
        tax = after_discount * (self.tax_percent / 100)
        return after_discount + tax

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
