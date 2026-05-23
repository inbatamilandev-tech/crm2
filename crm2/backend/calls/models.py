from django.db import models
from django.conf import settings
from leads.models import Lead

class Call(models.Model):
    CALL_TYPE_CHOICES = (
        ('outbound', 'Outbound'),
        ('inbound', 'Inbound'),
    )
    
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    
    OUTCOME_CHOICES = (
        ('connected', 'Connected'),
        ('no_response', 'No Response'),
        ('not_interested', 'Not Interested'),
    )

    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='calls')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='made_calls')
    phone_number = models.CharField(max_length=20)
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='outbound')
    call_status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, null=True, blank=True)
    
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.IntegerField(default=0)  # in seconds
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Call to {self.phone_number} - {self.call_status}"

    class Meta:
        ordering = ['-created_at']
