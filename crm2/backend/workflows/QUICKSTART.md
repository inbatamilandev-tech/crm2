# Workflow Automation Engine — Quick Start Guide

## ✅ What Was Implemented

A complete, production-grade **Event-Driven Workflow Automation Engine** for your Django CRM with:

### 🎯 Core Features
- ✅ **Multiple Trigger Events**: on_create, on_update, stage_change, on_task_complete
- ✅ **Flexible Conditions**: AND/OR logic, nested field paths, 12+ operators
- ✅ **7 Action Types**: create_task, create_call, create_meeting, update_record, create_quote, create_invoice, send_notification
- ✅ **Smart Task Assignment**: owner, round-robin, manager, specific user
- ✅ **Lead Conversion Action**: Automatic Lead → Contact + Account + Deal
- ✅ **Task-Driven Automation**: Task completion triggers next workflow
- ✅ **Idempotency**: Fingerprint-based duplicate prevention
- ✅ **Debouncing**: Configurable time-window to prevent repeated execution
- ✅ **Activity Logging**: Complete audit trail for all actions
- ✅ **9 Example Workflows**: Ready to use reference implementations

### 📁 Files Enhanced/Created

**Enhanced:**
- ✅ `models.py` - Added debounce_minutes, WorkflowDebounce model, improved indexes
- ✅ `engine.py` - Enhanced with debounce checks, improved logging, better error handling
- ✅ `actions.py` - Complete rewrite with debouncing, convert_lead action, better templates
- ✅ `signals.py` - Enhanced with task completion chaining, project support
- ✅ `services.py` - Added workflow orchestration, analytics, bulk operations

**Created:**
- ✅ `examples.py` - 9 complete workflow examples ready to load
- ✅ `ARCHITECTURE.md` - Comprehensive architecture guide (40+ pages)

---

## 🚀 Getting Started

### 1. Load Example Workflows

```bash
cd d:/crm2/backend
python manage.py shell
```

```python
from workflows.examples import create_example_workflows, list_example_workflows

# Create all 9 example workflows
result = create_example_workflows()
print(result)
# {'total_workflows': 9, 'newly_created': 9, 'already_existed': 0}

# List all examples
workflows = list_example_workflows()
for wf in workflows:
    print(f"{wf['name']} ({wf['module']}: {wf['trigger']})")
```

### 2. Test the Complete Lead → Invoice Flow

```python
from leads.models import Lead
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

# Create a lead
lead = Lead.objects.create(
    name="John Smith",
    email="john@acme.com",
    company="Acme Inc",
    assigned_to=user,
    status="new"
)
# ✓ Automatically creates "Initial Call" task (Workflow 1)

# Mark task as completed
task = lead.tasks.first()
task.status = "completed"
task.save()
# ✓ Automatically creates "Follow-up" task (Workflow 2)

# Qualify the lead
lead.status = "qualified"
lead.save()
# ✓ Automatically converts to Contact + Account + Deal (Workflow 3)

# Check what was created
print(lead.contact)    # Contact instance
print(lead.deal)       # Deal instance created
print(lead.deal.account)  # Account instance

# Move deal to proposal
deal = lead.deal
deal.stage = "Proposal"
deal.save()
# ✓ Automatically creates Quote (Workflow 4)

# Accept quote
quote = deal.deals_quotes.first()
quote.status = "accepted"
quote.save()
# ✓ Automatically creates Invoice (Workflow 5)

# Verify invoice
invoice = quote.quote.deals_invoice
print(invoice)  # Invoice instance
```

### 3. Check Workflow Execution Logs

```python
from workflows.models import WorkflowLog, Workflow

# Get logs for last 24 hours
logs = WorkflowLog.objects.filter(executed_at__gte=timezone.now() - timedelta(days=1))

for log in logs:
    print(f"{log.workflow.name}: {log.status} - {log.message}")

# Check execution stats
from workflows.services import get_workflow_execution_stats

stats = get_workflow_execution_stats(workflow_id=1, days=7)
print(stats)
# {
#   'total_executions': 42,
#   'status_breakdown': {'success': 40, 'partial': 1, 'failure': 1, 'skipped': 0},
#   'success_rate': 95.2,
# }
```

### 4. Create a Custom Workflow

```python
from workflows.models import Workflow, WorkflowAction, WorkflowCondition

# Create workflow
workflow = Workflow.objects.create(
    name="My Custom Workflow",
    description="High-value leads get special treatment",
    module="lead",
    trigger_event="on_create",
    condition_logic="AND",
    debounce_minutes=5,
    is_active=True,
)

# Add condition: score >= 100
WorkflowCondition.objects.create(
    workflow=workflow,
    order=1,
    field_name="score",
    operator="gte",
    value="100",
)

# Add action: Create high-priority task
WorkflowAction.objects.create(
    workflow=workflow,
    order=1,
    action_type="create_task",
    assignment_type="manager",  # Assign to manager
    priority="urgent",
    action_data={
        'title': 'VIP Lead: {name}',
        'description': 'High-score lead from {company}',
        'task_type': 'proposal',
        'due_days': 0,  # Immediate
    }
)

# Test it
high_score_lead = Lead.objects.create(
    name="VIP Client",
    company="Fortune 500",
    score=150,
    assigned_to=user,
)
# ✓ Workflow triggers automatically
# ✓ Task created and assigned to manager
```

---

## 🎯 Workflow Components Explained

### Triggers
```
on_create          → New record created
on_update          → Any field updated
stage_change       → Status/stage field changed
on_task_complete   → Task marked completed
```

### Conditions
```
field_name: 'status'           # What field to check
operator: 'equals'             # How to check: =, !=, >, <, contains, etc.
value: 'qualified'             # What value to compare against

logic: 'AND'                   # All conditions must match
logic: 'OR'                    # Any condition can match
```

### Actions (in order)
```
1. create_task          → Creates a task
   - assignment_type: owner/round_robin/manager/specific_user
   - title: Support templates like {name}, {status}, {value}
   
2. create_call          → Logs a call activity
3. create_meeting       → Schedules a meeting
4. update_record        → Updates fields on the record
5. create_quote         → Generates quote from deal
6. create_invoice       → Generates invoice from quote
7. send_notification    → Logs activity
8. convert_lead         → Converts lead to contact/account/deal
```

---

## 🔒 Safety Guarantees

### ✅ No Duplicate Actions
```
Fingerprint = SHA256({action_id, module, object_id, trigger})
If fingerprint already executed → Skip
```

### ✅ No Repeated Execution
```
If workflow ran for this object within N minutes (configurable) → Skip
Prevents loops and resource exhaustion
```

### ✅ All-or-Nothing Execution
```
Entire workflow wrapped in transaction.atomic()
If any action fails → rollback all changes
```

### ✅ Complete Audit Trail
```
WorkflowLog: Every execution recorded
Activity: Every action logged with timestamp & user
```

---

## 📊 Example Workflow Gallery

### 1️⃣ Lead Created → Initial Call
**When:** New lead created
**Condition:** None (always)
**Actions:**
- Create task "Initial Call: {name}"
- Send notification

### 2️⃣ Call Completed → Follow-up
**When:** Call task marked complete
**Condition:** task_type == 'call'
**Actions:**
- Create task "Follow-up: {title}"
- Assign same owner

### 3️⃣ Lead Qualified → Convert + Deal
**When:** Lead status changes to 'qualified'
**Condition:** status == 'qualified'
**Actions:**
- Convert lead to Contact/Account/Deal
- Send notification

### 4️⃣ Deal in Proposal → Create Quote
**When:** Deal stage changes to 'Proposal'
**Condition:** stage == 'Proposal'
**Actions:**
- Create quote with deal value
- Send notification

### 5️⃣ Quote Accepted → Create Invoice
**When:** Quote status changes to 'accepted'
**Condition:** status == 'accepted'
**Actions:**
- Create invoice from quote
- Set due date to +30 days

### 6️⃣ High-Value Deal → Manager Review
**When:** Deal created with value >= $50k
**Condition:** value >= 50000
**Actions:**
- Create urgent task
- Assign to manager (not sales rep)

### 7️⃣ Contact Updated → Schedule Meeting
**When:** Contact info updated
**Condition:** None
**Actions:**
- Create check-in meeting
- Due in 7 days
- Debounce: 60 minutes (don't spam)

### 8️⃣ Deal Won → Update Status
**When:** Deal stage changes to 'Won'
**Condition:** stage == 'Won'
**Actions:**
- Update contact status to 'Customer'
- Send celebration notification

### 9️⃣ New Account → Round-Robin
**When:** Account created
**Condition:** None (always)
**Actions:**
- Create task assigned via round-robin
- Distribute equally among sales reps

---

## 🧪 Testing Scenarios

### Scenario A: Full Lifecycle
```python
# Lead created
lead = Lead.objects.create(name="Test", ...)
# ✓ Task created

# Complete initial call
task = lead.tasks.first()
task.status = "completed"
task.save()
# ✓ Follow-up task created

# Qualify lead
lead.status = "qualified"
lead.save()
# ✓ Contact, Account, Deal created

# Move deal to proposal
lead.deal.stage = "Proposal"
lead.deal.save()
# ✓ Quote created

# Accept quote
quote = lead.deal.deals_quotes.first()
quote.status = "accepted"
quote.save()
# ✓ Invoice created

# Verify full chain
assert lead.contact is not None
assert lead.deal is not None
assert Quote.objects.filter(deal=lead.deal).exists()
assert Invoice.objects.filter(quote=quote).exists()
```

### Scenario B: Debouncing Works
```python
lead = Lead.objects.create(name="Test", ...)
task_count_1 = Task.objects.count()

# Trigger same event again (within debounce window)
trigger_workflows('lead', 'on_create', lead)
task_count_2 = Task.objects.count()

# No new task created (debounced)
assert task_count_1 == task_count_2

# Wait 5+ minutes
import time
time.sleep(301)

# Trigger again (outside debounce window)
trigger_workflows('lead', 'on_create', lead)
task_count_3 = Task.objects.count()

# New task created
assert task_count_3 > task_count_2
```

### Scenario C: Conditions Work
```python
# Create low-value deal
deal_low = Deal.objects.create(value=10000, ...)
# Manager task NOT created (< $50k)

# Create high-value deal
deal_high = Deal.objects.create(value=75000, ...)
# Manager task created (>= $50k)

tasks_high = Task.objects.filter(
    source_object_id=str(deal_high.pk),
    priority="urgent"
)
assert tasks_high.exists()
```

---

## 📖 Documentation Files

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete 40+ page architecture guide
- **[examples.py](examples.py)** - 9 example workflows with code
- **[models.py](models.py)** - Detailed model definitions
- **[engine.py](engine.py)** - Workflow execution engine logic
- **[actions.py](actions.py)** - All action handler implementations
- **[signals.py](signals.py)** - Signal emission logic
- **[services.py](services.py)** - High-level orchestration functions

---

## 🔧 Advanced Usage

### Manual Workflow Trigger
```python
from workflows.engine import trigger_workflows

# Manually trigger workflow for testing
trigger_workflows(
    module_name='lead',
    trigger_event='on_create',
    instance=lead_obj,
    extra_context={'field': 'value'}
)
```

### Bulk Operations
```python
from workflows.services import bulk_create_workflow_tasks

leads = Lead.objects.filter(status='new')
result = bulk_create_workflow_tasks(
    records=leads,
    workflow_id=1,
    task_title='Campaign: {name}',
    task_type='follow_up',
    days_offset=7,
)
print(result)
# {'success': 245, 'failed': 3, 'total': 248}
```

### Get Statistics
```python
from workflows.services import get_workflow_execution_stats

stats = get_workflow_execution_stats(workflow_id=1, days=30)
print(f"Success rate: {stats['success_rate']:.1f}%")
```

### Cleanup Old Logs
```python
from workflows.services import cleanup_old_logs

result = cleanup_old_logs(days=90)
print(f"Deleted {result['deleted_logs']} old logs")
```

---

## 🐛 Troubleshooting

### Workflow not executing?
1. Check `is_active` flag is True
2. Verify conditions match the data
3. Check `WorkflowLog` for skipped execution
4. Verify signal is registered in app config

### Duplicate tasks being created?
1. Check debounce_minutes setting
2. Verify fingerprint logic
3. Check `WorkflowActionExecution` table

### Task not assigned correctly?
1. Verify `assignment_type` is set
2. Check `_resolve_assignee()` logic
3. Ensure user has proper role for round-robin

### Condition not matching?
1. Use correct field_name (check model)
2. Verify operator (=, !=, >, <, etc.)
3. Test with known values first
4. Check log message for condition evaluation

---

## 🚀 Next Steps

1. **Load Examples**
   ```bash
   python manage.py shell
   from workflows.examples import create_example_workflows
   create_example_workflows()
   ```

2. **Run Tests**
   ```bash
   python manage.py test workflows
   ```

3. **Monitor Executions**
   - Check `WorkflowLog` table
   - Review `Activity` log entries
   - Get stats with `get_workflow_execution_stats()`

4. **Create Custom Workflows**
   - Use provided examples as templates
   - Test with small dataset first
   - Use Django admin to create/edit

5. **Optimize Performance**
   - Set appropriate `debounce_minutes`
   - Monitor log table size
   - Use `cleanup_old_logs()` periodically

---

## 📞 Support

For questions or issues:
1. Check ARCHITECTURE.md for detailed explanations
2. Review examples.py for working implementations
3. Check WorkflowLog for execution details
4. Enable DEBUG logging to see step-by-step execution

---

**🎉 Your Workflow Engine is Ready!**

Go from manual CRM operations to fully automated business processes. Welcome to enterprise-grade automation! 🚀
