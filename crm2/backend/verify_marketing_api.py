import requests
import json

BASE_URL = "http://localhost:8000/api"

def get_token():
    # Attempting to login or use a known token if possible
    # For now, I'll assume we need to authenticate
    login_url = f"{BASE_URL}/users/login/"
    resp = requests.post(login_url, json={"username": "admin", "password": "123"})
    if resp.status_code == 200:
        return resp.json().get('access')
    return None

def verify_marketing():
    token = get_token()
    if not token:
        print("Failed to get token")
        return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Check Analytics
    print("\nVerifying Marketing Analytics...")
    resp = requests.get(f"{BASE_URL}/marketing/analytics/", headers=headers)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Success! ROI: {data.get('overall_roi')}%")
        print(f"Total Leads: {data.get('total_leads')}")
        print(f"Campaign Leads: {data.get('campaign_leads')}")
    else:
        print(f"Failed Analytics: {resp.status_code} {resp.text}")

    # 2. Check Campaigns
    print("\nVerifying Campaigns...")
    resp = requests.get(f"{BASE_URL}/marketing/campaigns/", headers=headers)
    if resp.status_code == 200:
        campaigns = resp.json()
        print(f"Found {len(campaigns.get('results', []))} campaigns.")
        for c in campaigns.get('results', [])[:3]:
            print(f" - {c.get('name')}: {c.get('leads_generated')} leads, ROI: {c.get('roi_percentage')}%")
    else:
        print(f"Failed Campaigns: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    verify_marketing()
