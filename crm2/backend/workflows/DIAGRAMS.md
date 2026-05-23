# 🎯 Workflow Automation Engine — Executive Diagram

## System Architecture Visualization

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                     🎯 WORKFLOW AUTOMATION ENGINE                     │
│                                                                        │
│  Inspired by: Salesforce | HubSpot | Zapier                          │
│  Built for: Full-Stack Django CRM + React                            │
│  Status: ✅ PRODUCTION READY                                          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════╗
║                          EXECUTION FLOW                               ║
╚════════════════════════════════════════════════════════════════════════╝


┌─────────────────────────────────────────────────────────────────────┐
│  1. USER ACTION (Create/Update Record)                              │
│     lead = Lead.objects.create(name="John Smith", ...)             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. DJANGO SIGNAL (Pre/Post Save)                                   │
│     ├─ pre_save  → capture_previous_values()                       │
│     └─ post_save → emit_workflow_events()                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. TRIGGER DETERMINATION                                           │
│     • Is this on_create? → Yes                                     │
│     • Is this stage_change? → Check field changes                  │
│     • Is this task complete? → Check status                        │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. WORKFLOW MATCHING                                               │
│     Find all workflows where:                                       │
│     • module = 'lead'                                               │
│     • trigger_event = 'on_create'                                  │
│     • is_active = True                                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
    │ Workflow 1    │ │ Workflow 2    │ │ Workflow 3    │
    │ (Match)       │ │ (No match)    │ │ (Match)       │
    └───────┬───────┘ └───────────────┘ └───────┬───────┘
            │                                    │
            ▼                                    ▼
    ┌────────────────────────────────────────────────────┐
    │  5. FOR EACH MATCHING WORKFLOW:                   │
    │                                                   │
    │  A. CHECK DEBOUNCE                               │
    │     └─ If ran within 5 min → Skip                │
    │                                                   │
    │  B. EVALUATE CONDITIONS                          │
    │     └─ AND: All must match                       │
    │     └─ OR: Any must match                        │
    │                                                   │
    │  C. EXECUTE ACTIONS (in order)                   │
    │     └─ Action 1: Create Task                     │
    │     └─ Action 2: Send Notification               │
    │     └─ Action 3: Update Record                   │
    │     └─ Action N: ...                             │
    │                                                   │
    │  D. LOG EXECUTION                                │
    │     └─ Status: success/partial/failure/skipped   │
    │     └─ Message: Details                          │
    └────────────────────────────────────────────────────┘
            │
            ▼
    ┌────────────────────────────────────────────────────┐
    │  6. ACTION EXECUTION DETAILS (for each action)    │
    │                                                   │
    │  • Check idempotency (fingerprint)               │
    │  • If already executed → Skip                    │
    │  • Otherwise → Execute handler                  │
    │                                                   │
    │  Handlers:                                       │
    │  ├─ create_task()                               │
    │  ├─ create_call()                               │
    │  ├─ create_meeting()                            │
    │  ├─ update_record()                             │
    │  ├─ create_quote()                              │
    │  ├─ create_invoice()                            │
    │  ├─ send_notification()                         │
    │  └─ convert_lead()                              │
    │                                                   │
    │  • Record execution fingerprint                 │
    │  • Update debounce tracking                     │
    │  • Log activity                                 │
    └────────────────────────────────────────────────────┘
            │
            ▼
    ┌────────────────────────────────────────────────────┐
    │  7. RESULT TRACKING                              │
    │                                                   │
    │  • WorkflowLog (execution history)               │
    │  • Activity (audit trail)                        │
    │  • WorkflowDebounce (timing)                     │
    │  • WorkflowActionExecution (idempotency)         │
    └────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════╗
║                     COMPLETE LIFECYCLE EXAMPLE                         ║
╚════════════════════════════════════════════════════════════════════════╝


TIMELINE: Lead → Contact → Deal → Quote → Invoice (Fully Automated)

┌─────────────────────────────────────────────────────────────────────────┐
│ Day 1: Lead Created                                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Input:  lead = Lead.objects.create(name="John", company="Acme", ...) │
│                                                                        │
│ Triggered:  Workflow "Lead Created - Create Initial Call"            │
│ Condition: None (always execute)                                     │
│ Action 1:  Create Task "Initial Call: John" (Due +1 day)            │
│ Action 2:  Send Notification "New lead created"                     │
│                                                                        │
│ Result:    ✓ Task created                                            │
│            ✓ Notification logged                                     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Day 2: Initial Call Task Completed                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Input:  task.status = "completed"                                    │
│         task.save()                                                  │
│                                                                        │
│ Triggered:  Workflow "Call Completed - Create Follow-up"            │
│ Condition: task_type == 'call'  ✓ Match                            │
│ Action 1:  Create Task "Follow-up: Initial Call" (Due +3 days)     │
│                                                                        │
│ Result:    ✓ Follow-up task created                                 │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Day 5: Lead Status Changed to Qualified                               │
│ ──────────────────────────────────────────────────────────────────────── │
│ Input:  lead.status = "qualified"                                    │
│         lead.save()                                                  │
│                                                                        │
│ Triggered:  Workflow "Lead Qualified - Convert to Deal"             │
│ Condition: status == "qualified"  ✓ Match                           │
│ Action 1:  convert_lead()                                            │
│            ├─ Create Contact: "John Smith"                           │
│            ├─ Create Account: "Acme Inc"                            │
│            ├─ Create Deal: "Acme Deal"                              │
│            └─ Link all tasks to contact & deal                      │
│ Action 2:  Send Notification "Lead converted"                       │
│                                                                        │
│ Result:    ✓ Contact created                                        │
│            ✓ Account created                                        │
│            ✓ Deal created                                           │
│            ✓ All linked together                                    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Day 10: Deal Moved to Proposal Stage                                  │
│ ──────────────────────────────────────────────────────────────────────── │
│ Input:  deal.stage = "Proposal"                                      │
│         deal.save()                                                  │
│                                                                        │
│ Triggered:  Workflow "Deal in Proposal - Create Quote"              │
│ Condition: stage == "Proposal"  ✓ Match                             │
│ Action 1:  create_quote()                                            │
│            └─ Generate Quote with $value amount                     │
│ Action 2:  Send Notification "Quote ready to send"                  │
│                                                                        │
│ Result:    ✓ Quote created with deal value                          │
│            ✓ Ready to send to customer                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ Day 20: Quote Accepted by Customer                                    │
│ ──────────────────────────────────────────────────────────────────────── │
│ Input:  quote.status = "accepted"                                    │
│         quote.save()                                                 │
│                                                                        │
│ Triggered:  Workflow "Quote Accepted - Create Invoice"              │
│ Condition: status == "accepted"  ✓ Match                            │
│ Action 1:  create_invoice()                                          │
│            └─ Generate Invoice with quote amount                    │
│            └─ Set due date to +30 days                              │
│ Action 2:  Send Notification "Invoice ready"                        │
│                                                                        │
│ Result:    ✓ Invoice created                                        │
│            ✓ Ready to send for payment                              │
│            ✓ Deal lifecycle complete!                               │
└─────────────────────────────────────────────────────────────────────────┘

FINAL STATE:
├─ Lead: "John Smith" (Qualified)
├─ Contact: "John Smith"
├─ Account: "Acme Inc"
├─ Deal: "Acme Deal" (Proposal → Complete)
├─ Quote: Generated & Accepted
├─ Invoice: Generated & Ready
├─ Tasks: Initial Call + Follow-up (completed)
└─ Activity Log: All events tracked


╔════════════════════════════════════════════════════════════════════════╗
║                          CORE FEATURES                                ║
╚════════════════════════════════════════════════════════════════════════╝


1️⃣  IDEMPOTENCY (No Duplicates)
    ┌─────────────────────────────────────────────────────────────────┐
    │ Fingerprint = SHA256({action_id, module, object_id, trigger})  │
    │                                                                 │
    │ If fingerprint already executed → Action SKIPPED                │
    │ Guarantee: Same action never runs twice                        │
    └─────────────────────────────────────────────────────────────────┘

2️⃣  DEBOUNCING (Smart Rate Limiting)
    ┌─────────────────────────────────────────────────────────────────┐
    │ Per workflow: configurable debounce_minutes (default 5)        │
    │                                                                 │
    │ If workflow ran within N minutes → Execution SKIPPED            │
    │ Prevents loops and resource exhaustion                         │
    └─────────────────────────────────────────────────────────────────┘

3️⃣  TASK-DRIVEN AUTOMATION (Chaining)
    ┌─────────────────────────────────────────────────────────────────┐
    │ Task Completed → Triggers Next Workflow → Creates Next Task    │
    │                                                                 │
    │ Creates automatic workflow chains without programming         │
    └─────────────────────────────────────────────────────────────────┘

4️⃣  SMART ASSIGNMENT (4 Strategies)
    ┌─────────────────────────────────────────────────────────────────┐
    │ • owner         → Assign to record owner                        │
    │ • round_robin   → Distribute equally among sales reps          │
    │ • manager       → Assign to owner's manager                    │
    │ • specific_user → Assign to specific user                      │
    └─────────────────────────────────────────────────────────────────┘

5️⃣  DYNAMIC TEMPLATES (Field Replacement)
    ┌─────────────────────────────────────────────────────────────────┐
    │ "{name}" → instance.name                                        │
    │ "{company}" → instance.company                                 │
    │ "{status}" → instance.status                                   │
    │ "{value}" → instance.value                                     │
    │ Custom: event.extra['field']                                   │
    └─────────────────────────────────────────────────────────────────┘

6️⃣  ATOMIC TRANSACTIONS (All-or-Nothing)
    ┌─────────────────────────────────────────────────────────────────┐
    │ Entire workflow wrapped in transaction.atomic()                │
    │ If any action fails → All changes rolled back                  │
    │ Guarantee: No partial state corruption                         │
    └─────────────────────────────────────────────────────────────────┘

7️⃣  AUDIT LOGGING (Complete Trail)
    ┌─────────────────────────────────────────────────────────────────┐
    │ • WorkflowLog → Every workflow execution                        │
    │ • Activity → Every action taken                                 │
    │ • WorkflowDebounce → Timing of executions                      │
    │ • WorkflowActionExecution → Fingerprints recorded              │
    └─────────────────────────────────────────────────────────────────┘

8️⃣  CONDITION LOGIC (Flexible)
    ┌─────────────────────────────────────────────────────────────────┐
    │ AND: (status='qualified' AND score > 50)                       │
    │ OR:  (status='won' OR revenue > 100k)                          │
    │ Operators: =, !=, >, <, >=, <=, contains, is_empty, etc.     │
    │ Paths: 'contact.email', 'owner.team.name', etc.               │
    └─────────────────────────────────────────────────────────────────┘

9️⃣  LEAD CONVERSION (Orchestrated)
    ┌─────────────────────────────────────────────────────────────────┐
    │ Lead → Contact (unique by email)                                │
    │     → Account (from company name)                              │
    │     → Deal (linked to lead)                                    │
    │     → All tasks linked to contact & deal                       │
    │ Atomic: All-or-nothing transaction                             │
    └─────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════╗
║                       BUILT-IN WORKFLOWS (9)                          ║
╚════════════════════════════════════════════════════════════════════════╝


 1️⃣  Lead Created → Create Initial Call
     When: New lead created
     Conditions: None (always)
     Actions: Create task "Initial Call" + Send notification

 2️⃣  Call Completed → Create Follow-up
     When: Call task marked complete
     Conditions: task_type == 'call'
     Actions: Create task "Follow-up Call"

 3️⃣  Lead Qualified → Convert to Deal
     When: Lead status changes to 'qualified'
     Conditions: status == 'qualified'
     Actions: Convert lead + Send notification

 4️⃣  Deal in Proposal → Create Quote
     When: Deal stage changes to 'Proposal'
     Conditions: stage == 'Proposal'
     Actions: Create quote + Send notification

 5️⃣  Quote Accepted → Create Invoice
     When: Quote status changes to 'accepted'
     Conditions: status == 'accepted'
     Actions: Create invoice + Send notification

 6️⃣  High-Value Deal → Assign Manager
     When: Deal created with value >= $50k
     Conditions: value >= 50000
     Actions: Create urgent task assigned to manager

 7️⃣  Contact Updated → Schedule Meeting
     When: Contact info updated
     Conditions: None (always)
     Actions: Create check-in meeting (debounced 60 min)

 8️⃣  Deal Won → Update Status
     When: Deal stage changes to 'Won'
     Conditions: stage == 'Won'
     Actions: Update contact status to 'Customer'

 9️⃣  New Account → Round-Robin Assignment
     When: New account created
     Conditions: None (always)
     Actions: Create task assigned via round-robin


╔════════════════════════════════════════════════════════════════════════╗
║                         DATA MODELS                                   ║
╚════════════════════════════════════════════════════════════════════════╝

Workflow (Configuration)
├─ name
├─ module (lead, deal, contact, task, etc.)
├─ trigger_event (on_create, on_update, stage_change, on_task_complete)
├─ condition_logic (AND / OR)
├─ debounce_minutes (5-1440)
├─ is_active
└─ Relationships
   ├─ conditions (1-to-many WorkflowCondition)
   ├─ actions (1-to-many WorkflowAction)
   ├─ logs (1-to-many WorkflowLog)
   ├─ action_executions (1-to-many WorkflowActionExecution)
   └─ debounce_records (1-to-many WorkflowDebounce)

WorkflowCondition (Conditions)
├─ workflow (ForeignKey)
├─ field_name
├─ operator
├─ value
└─ order

WorkflowAction (Actions)
├─ workflow (ForeignKey)
├─ action_type
├─ assignment_type
├─ action_data (JSON)
├─ priority
└─ order

WorkflowLog (Execution History)
├─ workflow (ForeignKey)
├─ status (success/partial/failure/skipped)
├─ executed_at
├─ trigger_event
├─ object_id
├─ message
└─ execution_key

WorkflowActionExecution (Idempotency Ledger)
├─ action (ForeignKey)
├─ workflow (ForeignKey)
├─ object_key
├─ fingerprint (unique with action)
├─ created_object
└─ created_at

WorkflowDebounce (Debounce Tracking)
├─ workflow (ForeignKey)
├─ object_key
├─ execution_key
└─ last_executed_at


╔════════════════════════════════════════════════════════════════════════╗
║                           FILES CREATED                               ║
╚════════════════════════════════════════════════════════════════════════╝

ENHANCED:
  ✅ models.py              → Added debounce model, indexes
  ✅ engine.py              → Improved condition evaluation, debouncing
  ✅ actions.py             → Complete rewrite with all handlers
  ✅ signals.py             → Enhanced module coverage
  ✅ services.py            → High-level orchestration

CREATED:
  ✅ examples.py            → 9 production workflows
  ✅ ARCHITECTURE.md        → 40+ page comprehensive guide
  ✅ QUICKSTART.md          → Quick reference guide
  ✅ IMPLEMENTATION_SUMMARY.md → Complete overview
  ✅ FILE_INDEX.md          → This file index
  ✅ DIAGRAMS.md            → Visual diagrams (this file)


╔════════════════════════════════════════════════════════════════════════╗
║                        🎉 SUMMARY                                     ║
╚════════════════════════════════════════════════════════════════════════╝

✅ Complete event-driven workflow system
✅ 8 action types covering all major CRM operations
✅ 9 production-ready example workflows
✅ Idempotency guarantees (no duplicates)
✅ Debouncing prevents repeated execution
✅ Smart assignment strategies
✅ Task-driven automation chaining
✅ Complete audit trail logging
✅ Atomic transactions (all-or-nothing)
✅ 40+ pages of comprehensive documentation
✅ Production-ready code with error handling
✅ Performance optimized with indexes

Zero manual intervention after initial setup!
Fully automates: Lead → Contact → Deal → Quote → Invoice

🚀 Ready for production deployment!
