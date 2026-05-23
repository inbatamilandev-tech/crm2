"""
Quick DB Verification Test
============================
Creates a workflow + lead, waits 2s, verifies Task row exists in DB.
Run: python verify_task_in_db.py
"""
import sys, io, requests, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = 'http://127.0.0.1:8000/api'
SEP  = '-' * 60

def line(msg): print(f"  {msg}")
def ok(msg):   print(f"  [OK]   {msg}")
def fail(msg): print(f"  [FAIL] {msg}")
def hdr(msg):  print(f"\n{SEP}\n  {msg}\n{SEP}")

# ── 1. Login ─────────────────────────────────────────────────────────────────
hdr("Step 1 — Login")
try:
    r = requests.post(f"{BASE}/auth/token/",
                      json={"username": "admin", "password": "Admin@1234"}, timeout=8)
    token = r.json()["access"]
    ok("JWT token obtained")
except Exception as e:
    fail(f"Cannot connect to Django: {e}")
    sys.exit(1)

H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# ── 2. Tasks before ───────────────────────────────────────────────────────────
hdr("Step 2 — Baseline Task Count")
r = requests.get(f"{BASE}/tasks/", headers=H, timeout=8)
tasks_data    = r.json()
tasks_before  = tasks_data.get("count") or len(tasks_data.get("results", tasks_data if isinstance(tasks_data, list) else []))
line(f"Tasks in DB right now: {tasks_before}")

# ── 3. Create workflow ────────────────────────────────────────────────────────
hdr("Step 3 — Create Test Workflow (owner, immediate)")
wf_payload = {
    "name":            "[DB-VERIFY] Lead Create -> Task",
    "module":          "lead",
    "trigger_event":   "create",
    "condition_logic": "AND",
    "is_active":       True,
    "conditions": [
        {"field_name": "source", "operator": "equals", "value": "Website", "order": 1}
    ],
    "actions": [{
        "action_type":     "create_task",
        "order":           1,
        "assignment_type": "owner",
        "delay_days":      0,
        "priority":        "high",
        "action_data": {
            "title":       "DB-VERIFY follow-up: {name}",
            "description": "Source={source} Company={company}"
        }
    }]
}
wf_r  = requests.post(f"{BASE}/workflows/", headers=H, json=wf_payload, timeout=8)
wf_id = wf_r.json().get("id")
if wf_r.ok:
    ok(f"Workflow created id={wf_id}")
else:
    fail(f"Workflow creation failed: {wf_r.text[:200]}")
    sys.exit(1)

# ── 4. Create lead — triggers the workflow ────────────────────────────────────
hdr("Step 4 — Create Lead (triggers workflow signal)")
ts   = int(time.time())
lead_payload = {
    "name":    f"DB-Verify Lead {ts}",
    "email":   f"dbverify_{ts}@test.com",
    "company": "VerifyCorp Ltd",
    "source":  "Website",
    "status":  "new",
}
lead_r  = requests.post(f"{BASE}/leads/", headers=H, json=lead_payload, timeout=12)
lead_id = lead_r.json().get("id")
if lead_r.ok:
    ok(f"Lead created id={lead_id} — workflow signal should have fired")
else:
    fail(f"Lead creation failed: {lead_r.text[:200]}")

# ── 5. Wait for background thread ─────────────────────────────────────────────
line("Waiting 2s for background thread to complete...")
time.sleep(2)

# ── 6. Check task count ───────────────────────────────────────────────────────
hdr("Step 5 — Verify Task Created in DB")
r2         = requests.get(f"{BASE}/tasks/", headers=H, timeout=8)
tasks_data2 = r2.json()
tasks_after = tasks_data2.get("count") or len(tasks_data2.get("results", tasks_data2 if isinstance(tasks_data2, list) else []))
delta       = tasks_after - tasks_before

line(f"Tasks before : {tasks_before}")
line(f"Tasks after  : {tasks_after}")
line(f"Delta        : +{delta}")

print()
if delta > 0:
    print(f"\n  *** SUCCESS: {delta} Task(s) auto-created in the database! ***\n")
    results_list = tasks_data2.get("results", tasks_data2 if isinstance(tasks_data2, list) else [])
    if results_list:
        t = results_list[0]
        print("  Latest auto-created task:")
        print(f"    id            : {t.get('id')}")
        print(f"    title         : {t.get('title')}")
        print(f"    priority      : {t.get('priority')}")
        print(f"    status        : {t.get('status')}")
        print(f"    assigned_to   : {t.get('assigned_to')} ({t.get('assigned_to_name')})")
        print(f"    source_wf     : {t.get('source_workflow')}")
        print(f"    source_obj_id : {t.get('source_object_id')}")
        print(f"    due_date      : {t.get('due_date')}")
else:
    print("\n  *** FAIL: No tasks created. See Django server output for errors. ***\n")

# ── 7. Workflow logs ──────────────────────────────────────────────────────────
hdr("Step 6 — Workflow Logs for This Run")
logs_r    = requests.get(f"{BASE}/workflows/{wf_id}/logs/", headers=H, timeout=8)
log_list  = logs_r.json().get("results", logs_r.json())
line(f"Log entries for workflow {wf_id}: {len(log_list)}")
for log in log_list[:5]:
    print(f"    [{log.get('status','?'):8}] trigger={log.get('trigger_event')}  "
          f"obj={log.get('object_id')}  msg={str(log.get('message',''))[:70]}")

# ── 8. All workflow logs ──────────────────────────────────────────────────────
hdr("Step 7 — Global Workflow Log Summary")
all_logs_r = requests.get(f"{BASE}/workflow-logs/", headers=H, timeout=8)
all_logs   = all_logs_r.json().get("results", all_logs_r.json())
line(f"Total workflow log entries: {len(all_logs)}")
status_counts = {}
for log in all_logs:
    s = log.get("status", "unknown")
    status_counts[s] = status_counts.get(s, 0) + 1
for s, c in status_counts.items():
    print(f"    {s:10} : {c}")

# ── 9. Cleanup ────────────────────────────────────────────────────────────────
hdr("Step 8 — Cleanup")
del_r = requests.delete(f"{BASE}/workflows/{wf_id}/", headers=H, timeout=8)
if del_r.status_code in (200, 204):
    ok(f"Workflow {wf_id} deleted")
else:
    fail(f"Cleanup failed: {del_r.status_code}")

# ── Final verdict ─────────────────────────────────────────────────────────────
hdr("FINAL VERDICT")
if delta > 0:
    print("  Celery pipeline is FULLY OPERATIONAL.")
    print("  Workflow -> Signal -> Engine -> Thread -> _create_task_in_db -> DB [CONFIRMED]")
else:
    print("  Pipeline needs investigation.")
    print("  Check Django terminal output for [Engine] / [Tasks] log lines.")
print()
