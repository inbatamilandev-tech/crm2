from django.db import models
from django.conf import settings

class Account(models.Model):
    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=100, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    company_size = models.CharField(max_length=100, blank=True, null=True)
    annual_revenue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Contact(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('connected', 'Connected'),
        ('qualified', 'Qualified'),
        ('lost', 'Lost'),
    ]
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="contacts", null=True, blank=True)
    first_name = models.CharField(max_length=100, default='')
    last_name = models.CharField(max_length=100, default='')
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_contacts', null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()
