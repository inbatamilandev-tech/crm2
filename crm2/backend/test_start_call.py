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
request = view.initialize_request(request)
view.request = request
view.format_kwarg = None
view.kwargs = {'pk': task.id}
view.action = 'start_call'

try:
    print("Checking permissions...")
    view.check_permissions(request)
    print("Permissions check passed.")
    
    print("Getting object...")
    obj = view.get_object()
    print(f"get_object returned: {obj}")
    
    print("Checking object permissions...")
    view.check_object_permissions(request, obj)
    print("Object permissions check passed.")
    
    print("Calling start_call view method...")
    response = view.start_call(request, pk=task.id)
    print(f"Response status: {response.status_code}")
    print(f"Response data: {response.data}")
except Exception as e:
    import traceback
    traceback.print_exc()
