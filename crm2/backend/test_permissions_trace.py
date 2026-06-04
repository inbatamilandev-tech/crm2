import os
import django
import sys

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from tasks.models import Task
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.get(username='admin')
task = Task.objects.get(id=1241)

from rest_framework.test import APIRequestFactory, force_authenticate
from tasks.views import TaskViewSet

factory = APIRequestFactory()
request = factory.post(f'/api/tasks/{task.id}/start_call/')
force_authenticate(request, user=admin)

view = TaskViewSet()
view.action_map = {'post': 'start_call'}
# Initialize view request
request = view.initialize_request(request)
view.request = request
view.format_kwarg = None
view.kwargs = {'pk': task.id}
view.action = 'start_call'

print(f"Task type: {task.task_type} | assigned_to: {task.assigned_to}")
print(f"User: {admin.username} | role: {admin.role} | scope: {admin.role_fk.scope if admin.role_fk else 'None'}")

# Check general permission
print("Checking has_permission...")
for perm in view.get_permissions():
    res = perm.has_permission(request, view)
    print(f"  Permission {perm.__class__.__name__}: {res}")

# Check object permission
print("Checking has_object_permission...")
for perm in view.get_permissions():
    res = perm.has_object_permission(request, view, task)
    print(f"  Permission {perm.__class__.__name__}: {res}")
