import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.db import connection
try:
    with connection.cursor() as cursor:
        cursor.execute("SHOW COLUMNS FROM users_user;")
        columns = cursor.fetchall()
        for row in columns:
            print(row)
except Exception as e:
    print("Error:", e)
