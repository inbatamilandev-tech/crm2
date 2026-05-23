import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Count, Q

User = get_user_model()

def detect_priority(subject, description):
    text = f"{subject} {description}".lower()
    
    critical_keywords = ['server down', 'payment failed', 'website not working', 'emergency', 'critical']
    medium_keywords = ['slow', 'bug', 'issue', 'error', 'broken']
    
    for word in critical_keywords:
        if word in text:
            return 'Critical'
            
    for word in medium_keywords:
        if word in text:
            return 'Medium'
            
    return 'Low'

def calculate_sla_deadline(priority):
    now = timezone.now()
    if priority == 'Critical':
        return now + datetime.timedelta(hours=1)
    elif priority == 'High':
        return now + datetime.timedelta(hours=4)
    elif priority == 'Medium':
        return now + datetime.timedelta(hours=24)
    else:
        return now + datetime.timedelta(hours=48)

def auto_assign_agent(case):
    # Find agents and count their active cases (not resolved or closed)
    agents = User.objects.annotate(
        active_case_count=Count('support_cases', filter=~Q(support_cases__status__in=['Resolved', 'Closed']))
    ).order_by('active_case_count')
    
    if agents.exists():
        return agents.first()
    return None
