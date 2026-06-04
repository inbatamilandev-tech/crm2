import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crm_backend.settings')
django.setup()

from django.db import connection

try:
    with connection.cursor() as cursor:
        cursor.execute("ALTER TABLE users_user CHANGE role_id legacy_role VARCHAR(20);")
        print("Renamed role_id to legacy_role")
        
        cursor.execute("ALTER TABLE users_user ADD COLUMN role_id bigint NULL;")
        print("Added role_id bigint")
        
        cursor.execute("ALTER TABLE users_user ADD CONSTRAINT users_user_role_id_fk_users_role_id FOREIGN KEY (role_id) REFERENCES users_role (id);")
        print("Added FK constraint")
        
except Exception as e:
    print("Error:", e)
