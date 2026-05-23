import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm.settings')
django.setup()

from tasks.models import Task
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.first()

task = Task.objects.create(title="Test Task", task_type="todo", priority="medium", status="not_started")
print(f"Initial status: {task.status}")

# Simulate viewset patch
task.status = "in_progress"
task.save(update_fields=['status'])

# Refetch
task.refresh_from_db()
print(f"Status after update_fields=['status']: {task.status}")

# Simulate complete
task.status = "completed"
task.save(update_fields=['status'])
task.refresh_from_db()
print(f"Status after update_fields=['status'] to completed: {task.status}, active: {task.is_active}, outcome: {task.outcome}")
