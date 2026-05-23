from django.db import models
from django.conf import settings
from contacts.models import Contact, Account
from deals.models import Deal
import uuid

class Case(models.Model):
    STATUS_CHOICES = (
        ('New', 'New'),
        ('Open', 'Open'),
        ('In Progress', 'In Progress'),
        ('Waiting for Customer', 'Waiting for Customer'),
        ('Escalated', 'Escalated'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    )
    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Critical', 'Critical'),
    )
    SOURCE_CHOICES = (
        ('Email', 'Email'),
        ('Web', 'Web'),
        ('Phone', 'Phone'),
        ('WhatsApp', 'WhatsApp'),
    )
    
    case_id = models.CharField(max_length=50, unique=True, editable=False, null=True)
    subject = models.CharField(max_length=255)
    description = models.TextField()
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='cases', null=True, blank=True)
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name='cases', null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.SET_NULL, null=True, blank=True, related_name='cases')
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='New')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    category = models.CharField(max_length=50, blank=True, null=True)
    subcategory = models.CharField(max_length=50, blank=True, null=True)
    
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='support_cases')
    sla_deadline = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='Web')
    
    internal_notes = models.TextField(blank=True, null=True)
    resolution_summary = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    escalated_at = models.DateTimeField(null=True, blank=True)
    merged_into = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='merged_cases')
    duplicate_reference = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='duplicate_references')
    last_customer_reply_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.case_id:
            # Generate a simple unique ID
            self.case_id = f"CAS-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.case_id} - {self.subject}"

class CaseAttachment(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='support_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.case.case_id}"

class Solution(models.Model):
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    content = models.TextField() # Rich text content
    tags = models.CharField(max_length=255, blank=True, null=True)
    is_published = models.BooleanField(default=False)
    views_count = models.PositiveIntegerField(default=0)
    helpful_count = models.PositiveIntegerField(default=0)
    not_helpful_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Service(models.Model):
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    billing_type = models.CharField(max_length=50) # e.g., Monthly, One-time
    sla_policy = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Feedback(models.Model):
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='feedback')
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    rating = models.PositiveIntegerField() # 1 to 5
    comment = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Feedback for {self.case.case_id} - {self.rating} Stars"
