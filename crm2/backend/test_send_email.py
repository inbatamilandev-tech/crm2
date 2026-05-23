import os
from pathlib import Path
from dotenv import load_dotenv
import resend

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent

# Load .env from parent directory (d:\crm2\.env)
load_dotenv(BASE_DIR.parent / '.env')

api_key = os.getenv("RESEND_API_KEY")
print(f"API Key found: {api_key}")

resend.api_key = api_key

try:
    print("Attempting to send email...")
    r = resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": ["test@example.com"], # This will likely fail if domain unverified, but will give us the exact error!
        "subject": "Test from CRM",
        "text": "Hello from CRM email module test.",
    })
    print("Success response:", r)
except Exception as e:
    print("Exception caught:", str(e))
