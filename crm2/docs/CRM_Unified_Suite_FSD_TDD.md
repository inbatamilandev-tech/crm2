# Functional Specification Document (FSD) & Technical Design Document (TDD)
## CRM Unified Suite – Enterprise Sales, Support & Operations Management System

---

### 1. Project Overview
The CRM Unified Suite is an enterprise-grade solution designed to streamline sales, customer support, and operational workflows. It serves as a centralized hub for managing leads, deals, accounts, and support cases, providing real-time analytics and automation to drive business growth and efficiency. The system is built with a modern tech stack (React/Vite frontend, Django backend) to ensure scalability, performance, and a premium user experience.

### 2. Objectives
- **Centralize Data**: Provide a single source of truth for all customer, sales, and support data.
- **Automate Workflows**: Reduce manual tasks through intelligent automation triggers and background processing.
- **Enhance Collaboration**: Enable real-time updates and notifications across teams.
- **Drive Insights**: Offer deep analytics and reporting to inform business decisions.
- **Ensure Security**: Implement robust role-based access control (RBAC) and audit logging.

### 3. Scope
The scope of this document covers the design and implementation of 29 core modules, ranging from sales management (Leads, Deals) to support (Cases, Solutions) and system administration (User Management, Settings). It includes both functional requirements and technical execution details.

### 4. Users & Roles
- **System Administrator**: Full access to all modules, settings, and user management.
- **Sales Manager**: Access to sales modules, reporting, and team performance tracking.
- **Sales Representative**: Access to leads, accounts, deals, and activities assigned to them.
- **Support Agent**: Access to support dashboard, cases, and solutions.
- **Marketing Manager**: Access to marketing campaigns and lead capture data.

---

### 5. Functional Requirements (Module Specifications)

#### Module 1: Dashboard
1. **Purpose**: To provide a centralized, high-level view of key performance indicators (KPIs) and daily activities.
2. **Business Objective**: Enable users to quickly assess performance, identify urgent tasks, and make data-driven decisions without navigating multiple modules.
3. **Complete Workflow**: User logs in -> Dashboard loads default widgets based on role. Real-time data streams in via WebSockets (Django Channels). User interacts with widgets (filters, drill-downs). Widget state is persisted in local storage or user preferences.
4. **User Actions**: View KPI cards, filter data by date range/region, click on charts to view detailed records, customize widget layout (drag and drop).
5. **System Actions**: Fetch aggregated data on load via REST API. Subscribe to WebSocket channels for real-time updates. Calculate derived metrics on the fly or via cached values in Redis.
6. **Automation Triggers**: Data refresh on background task completion.
7. **Status Flow**: N/A (Read-only aggregate view).
8. **Validation Rules**: Date range filters must be valid. User can only see data permitted by their role.
9. **Database Relations**: Reads from almost all core tables (Leads, Deals, Cases, etc.) for aggregation.
10. **API Endpoints**: `GET /api/v1/dashboard/metrics/`, `GET /api/v1/dashboard/charts/`.
11. **Notifications Flow**: Displays unread notification count and recent alerts.
12. **Real-Time Sync Behavior**: Updates dynamically when other users create leads, close deals, or resolve cases (via Django Channels).
13. **Role-Based Access Rules**: Sales view for Sales roles, Support view for Support roles, Admin view with full access.
14. **Edge Cases & Failure Handling**: API failure fallback to cached Redis data. Graceful handling of empty states.
15. **Background Jobs / Celery Tasks**: Daily aggregation job to update historical performance metrics.
16. **UI Flow Explanation**: Top section: KPI summary cards. Middle section: Interactive charts (Recharts). Bottom section: Recent activity feed.
17. **Reporting & Analytics Impact**: Direct interface for the Analytics module summaries.
18. **Security Considerations**: Data isolation by role prevents unauthorized visibility of sensitive financial metrics.
19. **Audit Logs & Activity Tracking**: Tracks when a user views the dashboard (read logs).
20. **Technical Execution Flow**: React component mounts -> Dispatches Redux actions -> API call -> Django views query DB (or Redis) -> Returns JSON -> Component renders charts.

#### Module 2: WorkQueue
1. **Purpose**: To manage a prioritized list of tasks, calls, and follow-ups requiring immediate action.
2. **Business Objective**: Ensure no lead or customer interaction falls through the cracks by prioritizing work based on urgency and SLA.
3. **Complete Workflow**: System auto-generates work items based on triggers. User accesses WorkQueue -> Sees prioritized list. User completes item -> Queue updates in real-time.
4. **User Actions**: Claim/Assign item, mark completed, snooze item with a reason, filter queue by type.
5. **System Actions**: Calculate priority score dynamically. Update queue state in Redis for fast retrieval. Send WebSocket event on queue update.
6. **Automation Triggers**: Missed call triggers auto-creation of "Call Back" item. SLA breach triggers escalation.
7. **Status Flow**: Pending -> In Progress -> Completed/Snoozed.
8. **Validation Rules**: Cannot snooze more than 3 times without manager approval.
9. **Database Relations**: Links to Leads, Contacts, Accounts, and Users.
10. **API Endpoints**: `GET /api/v1/workqueue/`, `POST /api/v1/workqueue/{id}/complete/`.
11. **Notifications Flow**: Alert when high-priority item enters queue.
12. **Real-Time Sync Behavior**: Queue refreshes instantly when items are added or removed.
13. **Role-Based Access Rules**: Users see their own queue or team queue if they are managers.
14. **Edge Cases & Failure Handling**: If real-time sync fails, fallback to polling every 30 seconds.
15. **Background Jobs / Celery Tasks**: Nightly reconciliation job to clean up expired items. SLA monitoring job running every 5 minutes.
16. **UI Flow Explanation**: Split screen with list of items on left and detail view on right.
17. **Reporting & Analytics Impact**: Tracks agent productivity and response times.
18. **Security Considerations**: Users cannot view or claim items assigned to other users without specific permissions.
19. **Audit Logs & Activity Tracking**: Logs every claim, completion, and snooze action.
20. **Technical Execution Flow**: Event occurs -> Django signal fires -> Celery task creates WorkItem -> Pushes to Redis -> WebSocket notifies client -> UI updates.

#### Module 3: Leads
1. **Purpose**: To capture and manage potential business opportunities.
2. **Business Objective**: Convert prospects into qualified leads and eventually into accounts/deals.
3. **Complete Workflow**: Lead enters system -> Auto-assigned or manually claimed -> Rep contacts lead -> Updates status -> Lead qualified -> Converted to Contact, Account, and Deal.
4. **User Actions**: Create/Edit Lead, log activity, convert Lead, delete Lead (Admin only).
5. **System Actions**: Validate input, run duplicate detection, auto-assign based on rules.
6. **Automation Triggers**: New Lead -> Auto-create "First Contact" task. Lead inactive for 48h -> Trigger follow-up notification.
7. **Status Flow**: New -> Contacted -> Qualified -> Converted / Lost.
8. **Validation Rules**: Email must be unique and valid. Phone number must follow international format.
9. **Database Relations**: One-to-many with Activities, Tasks. Transitions to Contact, Account, Deal on conversion.
10. **API Endpoints**: `POST /api/v1/leads/`, `POST /api/v1/leads/{id}/convert/`.
11. **Notifications Flow**: Email/In-app alert to owner on assignment.
12. **Real-Time Sync Behavior**: Status updates visible to all users viewing the lead.
13. **Role-Based Access Rules**: Reps see assigned leads. Managers see all.
14. **Edge Cases & Failure Handling**: Conversion fails if required fields for Account/Contact are missing. Transaction rollbacks on failure.
15. **Background Jobs / Celery Tasks**: Lead scoring job runs periodically.
16. **UI Flow Explanation**: Kanban view for stages, list view for data management.
17. **Reporting & Analytics Impact**: Source for conversion rate metrics.
18. **Security Considerations**: Sensitive lead data restricted by role.
19. **Audit Logs & Activity Tracking**: Full history of status changes and edits.
20. **Technical Execution Flow**: React Form submit -> API call -> Django View validates -> DB Transaction starts -> Creates Lead -> Fires Signal for Auto-task -> Commits Transaction.

#### Module 4: Contacts
1. **Purpose**: To store and manage individual person records.
2. **Business Objective**: Maintain up-to-date relationship data for effective communication.
3. **Complete Workflow**: Created from Lead or manually -> Linked to Account -> Used in Deals and Support.
4. **User Actions**: Create, edit, link to account, log activity.
5. **System Actions**: Validate, check duplicates.
6. **Automation Triggers**: Birthday or anniversary reminders.
7. **Status Flow**: Active -> Inactive.
8. **Validation Rules**: Email uniqueness per account.
9. **Database Relations**: Many-to-one with Account, One-to-many with Deals, Cases.
10. **API Endpoints**: `GET /api/v1/contacts/`, `PUT /api/v1/contacts/{id}/`.
11. **Notifications Flow**: Task reminders for contact follow-up.
12. **Real-Time Sync Behavior**: Updates reflect across all linked modules.
13. **Role-Based Access Rules**: Shared visibility within account access.
14. **Edge Cases & Failure Handling**: Orphaned contact handling if account is deleted.
15. **Background Jobs / Celery Tasks**: Data enrichment from external APIs (optional).
16. **UI Flow Explanation**: Grid view with quick filters, profile card layout.
17. **Reporting & Analytics Impact**: Demographic analysis.
18. **Security Considerations**: PII protection (masking phone/email if needed).
19. **Audit Logs & Activity Tracking**: Tracks who accessed or edited contact info.
20. **Technical Execution Flow**: Standard CRUD with signal dispatch for cache invalidation.

#### Module 5: Accounts
1. **Purpose**: To manage company or organization records.
2. **Business Objective**: Track B2B relationships and aggregate data at the company level.
3. **Complete Workflow**: Created manually or from Lead -> Holds Contacts and Deals -> Aggregates revenue.
4. **User Actions**: Create, edit, merge duplicates, view hierarchy.
5. **System Actions**: Rollup financial metrics from deals.
6. **Automation Triggers**: Auto-tiering based on revenue.
7. **Status Flow**: Prospect -> Customer -> Former Customer.
8. **Validation Rules**: Tax ID or Company Name uniqueness.
9. **Database Relations**: One-to-many with Contacts, Deals, Invoices.
10. **API Endpoints**: `GET /api/v1/accounts/`, `GET /api/v1/accounts/{id}/metrics/`.
11. **Notifications Flow**: Alert account manager on significant deal updates.
12. **Real-Time Sync Behavior**: Financial metrics update live as deals close.
13. **Role-Based Access Rules**: Territory-based or manual account sharing.
14. **Edge Cases & Failure Handling**: Rollup failures handled by fallback scheduled jobs.
15. **Background Jobs / Celery Tasks**: Nightly financial rollup and tier calculation.
16. **UI Flow Explanation**: Company profile view with tabs for Contacts, Deals, Invoices.
17. **Reporting & Analytics Impact**: Revenue by account, churn analysis.
18. **Security Considerations**: Financial data visibility restricted.
19. **Audit Logs & Activity Tracking**: Ownership changes and tier upgrades logged.
20. **Technical Execution Flow**: DB Triggers or Django signals for rollup calculation.

#### Module 6: Deals
1. **Purpose**: To track sales opportunities through a structured pipeline.
2. **Business Objective**: Forecast revenue, manage sales pipeline, and close deals efficiently.
3. **Complete Workflow**: Created from Lead or manually linked to Account. Moves through Kanban stages. Physics engine calculates scores. High-value deals require approval.
4. **User Actions**: Drag and drop on Kanban board, update deal value, request approval.
5. **System Actions**: Calculate Gravity Score, Momentum Score, Risk calculation. Deal probability auto-updates.
6. **Automation Triggers**: Stage change to "Proposal" triggers Quote task. Deal stalled triggers alert.
7. **Status Flow**: Open -> Pending Approval -> Won -> Lost.
8. **Validation Rules**: Cannot move to "Won" without Quote and Invoice details. High-value threshold triggers approval.
9. **Database Relations**: Many-to-one with Account and Contact. One-to-many with Quotes, Invoices.
10. **API Endpoints**: `POST /api/v1/deals/`, `POST /api/v1/deals/{id}/request-approval/`.
11. **Notifications Flow**: WebSocket alert to manager when approval requested.
12. **Real-Time Sync Behavior**: Kanban board updates live when other users move deals.
13. **Role-Based Access Rules**: Reps manage own deals. Managers can approve and view all.
14. **Edge Cases & Failure Handling**: Concurrent edit conflict resolution. Rollback on failed stage transition.
15. **Background Jobs / Celery Tasks**: Nightly score recalculation job. Stalled deal detection job.
16. **UI Flow Explanation**: Visual Kanban board with drag-and-drop capability. Cards show scores.
17. **Reporting & Analytics Impact**: Core data source for pipeline forecasting.
18. **Security Considerations**: Access controls prevent rep from seeing competitor reps' deals.
19. **Audit Logs & Activity Tracking**: Every stage change and score update logged.
20. **Technical Execution Flow**: User drags card -> Frontend optimistic update -> API call -> Backend validates -> Django transaction updates Deal -> Signal fires -> WebSocket broadcasts.

#### Module 7: Activities
1. **Purpose**: To log all interactions with prospects and customers.
2. **Business Objective**: Maintain a complete history of customer engagement.
3. **Complete Workflow**: User logs activity (Call, Email, Note) against a Lead/Contact/Deal.
4. **User Actions**: Log activity, add notes, tag colleagues.
5. **System Actions**: Save activity, link to appropriate records, update timeline.
6. **Automation Triggers**: Logging a call may resolve a "Call Back" work queue item.
7. **Status Flow**: Completed.
8. **Validation Rules**: Required fields based on activity type.
9. **Database Relations**: Polymorphic relation to Leads, Contacts, Accounts, Deals.
10. **API Endpoints**: `POST /api/v1/activities/`.
11. **Notifications Flow**: Notify tagged users.
12. **Real-Time Sync Behavior**: Timeline updates instantly.
13. **Role-Based Access Rules**: Visible to anyone with access to the linked record.
14. **Edge Cases & Failure Handling**: Handle attachments exceeding size limits.
15. **Background Jobs / Celery Tasks**: Indexing for search.
16. **UI Flow Explanation**: Timeline feed on detail pages.
17. **Reporting & Analytics Impact**: Activity volume reporting.
18. **Security Considerations**: Notes may contain sensitive info; can be marked private.
19. **Audit Logs & Activity Tracking**: Creation and edits logged.
20. **Technical Execution Flow**: Generic foreign key usage in Django for flexible linking.

#### Module 8: Tasks (Detailed)
1. **Purpose**: To assign and track action items for users.
2. **Business Objective**: Ensure timely completion of operational and sales tasks.
3. **Complete Workflow**:
   - Created manually or auto-generated by system (e.g., on Lead creation).
   - Lifecycle: Created -> Assigned -> In Progress -> Follow-up -> Completed -> Escalated -> Overdue.
   - SLA engine monitors deadlines.
4. **User Actions**: Create, assign, update status, set due date, set dependencies.
5. **System Actions**:
   - Monitor SLAs and trigger escalations.
   - Send reminders via the Reminder engine.
   - Enforce dependency chains (cannot start task B until A is complete).
6. **Automation Triggers**:
   - Task overdue -> Auto-escalate to manager.
   - Dependent task completed -> Auto-activate next task.
7. **Status Flow**: Created -> Assigned -> In Progress -> Follow-up -> Completed -> Escalated -> Overdue.
8. **Validation Rules**:
   - Due date cannot be in the past on creation.
   - Cannot complete if dependent tasks are open.
9. **Database Relations**: Linked to Users (Assignee), Leads, Contacts, Accounts, Deals.
10. **API Endpoints**:
    - `POST /api/v1/tasks/`
    - `PUT /api/v1/tasks/{id}/status/`
11. **Notifications Flow**:
    - Reminder notifications 1 hour before due date.
    - Escalation alerts to managers.
12. **Real-Time Sync Behavior**:
    - Task list updates live as status changes.
13. **Role-Based Access Rules**:
    - Assignees and managers can edit. Others may only view.
14. **Edge Cases & Failure Handling**:
    - Deadlock in dependency chain detected and blocked on creation.
15. **Background Jobs / Celery Tasks**:
    - Task reconciliation jobs running hourly to check for overdue items.
    - Reminder dispatch job running every 15 minutes.
16. **UI Flow Explanation**:
    - Checklist or list view with status indicators and color-coded urgency.
17. **Reporting & Analytics Impact**: Task completion rate and SLA compliance metrics.
18. **Security Considerations**: Restrict task visibility if linked record is restricted.
19. **Audit Logs & Activity Tracking**: Full history of status transitions.
20. **Technical Execution Flow**: Task created -> Celery task scheduled for reminder -> Status change triggers signal to check dependencies.

#### Module 9: Calls
1. **Purpose**: To log and manage phone interactions.
2. **Business Objective**: Track communication volume and outcome.
3. **Complete Workflow**: Call initiated (via CTI or manually logged) -> Logged against record -> Outcome recorded.
4. **User Actions**: Log call, select outcome, add notes.
5. **System Actions**: Update activity history, trigger follow-ups based on outcome.
6. **Automation Triggers**: Outcome "No Answer" triggers auto-scheduling of follow-up call.
7. **Status Flow**: Logged.
8. **Validation Rules**: Call duration cannot be negative.
9. **Database Relations**: Linked to Leads, Contacts.
10. **API Endpoints**: `POST /api/v1/calls/`.
11. **Notifications Flow**: N/A unless follow-up created.
12. **Real-Time Sync Behavior**: Appears in timeline immediately.
13. **Role-Based Access Rules**: Standard visibility rules.
14. **Edge Cases & Failure Handling**: CTI integration failure handled by manual logging fallback.
15. **Background Jobs / Celery Tasks**: Call recording processing (if applicable).
16. **UI Flow Explanation**: Quick log modal or integrated dialer.
17. **Reporting & Analytics Impact**: Call volume and outcome success rate.
18. **Security Considerations**: Masking numbers if required by compliance.
19. **Audit Logs & Activity Tracking**: Logs the creation of call records.
20. **Technical Execution Flow**: API call -> Django saves Call record -> Fires signal for follow-up if needed.

#### Module 10: Emails
1. **Purpose**: To send and track email communication.
2. **Business Objective**: Streamline email outreach and track engagement.
3. **Complete Workflow**: User sends email from CRM or system auto-sends -> Tracked in timeline.
4. **User Actions**: Compose email, use template, view tracking (opens/clicks).
5. **System Actions**: Send via SMTP or API (e.g., SendGrid), track opens via tracking pixel.
6. **Automation Triggers**: Email open triggers notification to sender.
7. **Status Flow**: Sent -> Delivered -> Opened -> Clicked.
8. **Validation Rules**: Valid recipient email required.
9. **Database Relations**: Linked to Leads, Contacts.
10. **API Endpoints**: `POST /api/v1/emails/send/`.
11. **Notifications Flow**: Notify user on email open/click.
12. **Real-Time Sync Behavior**: Status updates live.
13. **Role-Based Access Rules**: Standard visibility.
14. **Edge Cases & Failure Handling**: Bounce handling and retry logic.
15. **Background Jobs / Celery Tasks**: Email dispatch and tracking pixel processing.
16. **UI Flow Explanation**: Rich text editor or template selector.
17. **Reporting & Analytics Impact**: Open and click-through rates.
18. **Security Considerations**: Prevent phishing/spam; scan attachments.
19. **Audit Logs & Activity Tracking**: Logs every email sent.
20. **Technical Execution Flow**: Compose -> Celery job for sending -> Webhook from provider updates status.

#### Module 11: Meetings (Detailed)
1. **Purpose**: To schedule and manage appointments.
2. **Business Objective**: Facilitate face-to-face or virtual meetings with prospects/clients.
3. **Complete Workflow**:
   - Scheduled via calendar interface.
   - Meeting reminders sent to participants.
   - Meeting occurs -> Outcome recorded.
   - Auto task creation after meeting (e.g., follow-up task).
4. **User Actions**: Schedule meeting, invite contacts, record outcome, reschedule.
5. **System Actions**:
   - Check calendar availability (if integrated with GCal/Outlook).
   - Send calendar invites (ICS files).
   - Manage status lifecycle.
6. **Automation Triggers**:
   - Meeting status set to "Completed" -> Auto-create follow-up task.
   - Status set to "No-Show" -> Auto-schedule follow-up call.
7. **Status Flow**: Scheduled -> Confirmed -> Completed -> Cancelled -> No-Show.
8. **Validation Rules**:
   - Meeting time cannot overlap with existing meetings for the user.
   - Cannot schedule in the past.
9. **Database Relations**: Linked to Contacts, Accounts, Deals, Users.
10. **API Endpoints**:
    - `POST /api/v1/meetings/`
    - `POST /api/v1/meetings/{id}/outcome/`
11. **Notifications Flow**:
    - Reminders 24h and 1h before meeting.
12. **Real-Time Sync Behavior**:
    - Calendar view updates live.
13. **Role-Based Access Rules**:
    - Visible to participants and managers.
14. **Edge Cases & Failure Handling**:
    - Calendar sync failure -> Fallback to internal CRM calendar.
15. **Background Jobs / Celery Tasks**:
    - Reminder dispatch job.
    - Sync job with Google/Outlook calendars.
16. **UI Flow Explanation**:
    - Calendar grid view (day/week/month) and list view.
17. **Reporting & Analytics Impact**: Meeting volume and outcome analysis.
18. **Security Considerations**: Calendar privacy settings (hide details if private).
19. **Audit Logs & Activity Tracking**: Logs scheduling, rescheduling, and outcomes.
20. **Technical Execution Flow**: Schedule -> DB save -> Celery task for external sync -> Signal for internal reminders.

#### Module 12: Products
1. **Purpose**: To manage the catalog of goods and services.
2. **Business Objective**: Standardize pricing and product details for quotes and invoices.
3. **Complete Workflow**: Admin creates product -> Used in Quotes and Invoices.
4. **User Actions**: Create, edit product, set price, categorize.
5. **System Actions**: Validate, maintain price history.
6. **Automation Triggers**: Stock alert triggers (if inventory tracked).
7. **Status Flow**: Active -> Inactive.
8. **Validation Rules**: SKU must be unique. Price cannot be negative.
9. **Database Relations**: Many-to-many with Quotes, Invoices via line items.
10. **API Endpoints**: `GET /api/v1/products/`.
11. **Notifications Flow**: N/A.
12. **Real-Time Sync Behavior**: Updates reflect immediately in new quotes.
13. **Role-Based Access Rules**: Viewable by all; editable by Admin.
14. **Edge Cases & Failure Handling**: Discontinuing product used in active quotes (warning).
15. **Background Jobs / Celery Tasks**: N/A.
16. **UI Flow Explanation**: Grid view with search and filters.
17. **Reporting & Analytics Impact**: Product sales volume and revenue contribution.
18. **Security Considerations**: Pricing data integrity.
19. **Audit Logs & Activity Tracking**: Price changes logged.
20. **Technical Execution Flow**: Standard CRUD.

#### Module 13: Quotes
1. **Purpose**: To generate price estimates for deals.
2. **Business Objective**: Provide professional quotes to prospects and track approval.
3. **Complete Workflow**: Created from Deal -> Add line items -> Send to customer -> Approved/Rejected.
4. **User Actions**: Create quote, add products, apply discounts, send to customer.
5. **System Actions**: Calculate totals, generate PDF, track status.
6. **Automation Triggers**: Quote approved -> Auto-create Invoice task or Deal stage update.
7. **Status Flow**: Draft -> Sent -> Approved -> Rejected -> Expired.
8. **Validation Rules**: Total cannot be negative. Discount limits based on role.
9. **Database Relations**: Many-to-one with Deal, One-to-many with Invoices.
10. **API Endpoints**: `POST /api/v1/quotes/`, `POST /api/v1/quotes/{id}/generate-pdf/`.
11. **Notifications Flow**: Notify owner on customer approval/rejection.
12. **Real-Time Sync Behavior**: Status updates live.
13. **Role-Based Access Rules**: Editable by owner/manager.
14. **Edge Cases & Failure Handling**: PDF generation failure -> Retry queue.
15. **Background Jobs / Celery Tasks**: PDF generation and email sending.
16. **UI Flow Explanation**: Line item editor with drag-and-drop ordering.
17. **Reporting & Analytics Impact**: Quote conversion rate.
18. **Security Considerations**: Secure link for customer viewing.
19. **Audit Logs & Activity Tracking**: Version history tracked.
20. **Technical Execution Flow**: Save -> Celery task for PDF -> Webhook for e-signature (if integrated).

#### Module 14: Invoices (Detailed)
1. **Purpose**: To bill customers for products/services.
2. **Business Objective**: Manage accounts receivable and track revenue.
3. **Complete Workflow**:
   - Created manually or converted from Quote.
   - Sent to customer.
   - Payment tracked (online or manual).
   - Overdue detection and aging calculation.
4. **User Actions**: Create invoice, add line items, record payment, send reminders.
5. **System Actions**:
   - Calculate totals and taxes.
   - Detect overdue status.
   - Calculate aging (Current, 30-60, 60-90, 90+ days).
   - Generate fiscal analytics.
6. **Automation Triggers**:
   - Invoice overdue -> Auto-send payment reminder.
   - Payment received -> Auto-update Deal status or create Project.
7. **Status Flow**: Draft -> Sent -> Paid -> Partially Paid -> Overdue -> Void.
8. **Validation Rules**:
   - Invoice date cannot be in the future (unless allowed by settings).
   - Line items must have positive values (except discounts).
9. **Database Relations**: Many-to-one with Account and Deal.
10. **API Endpoints**:
    - `POST /api/v1/invoices/`
    - `POST /api/v1/invoices/{id}/record-payment/`
11. **Notifications Flow**:
    - Automated payment reminders to customer.
    - Alert to account manager on overdue status.
12. **Real-Time Sync Behavior**:
    - Financial rollups on Account update live on payment.
13. **Role-Based Access Rules**:
    - Restricted to Sales Managers, Admins, and Finance roles.
14. **Edge Cases & Failure Handling**:
    - Payment gateway failure -> Log error and retry; notify user.
15. **Background Jobs / Celery Tasks**:
    - Nightly aging calculation job.
    - Automated reminder dispatch job.
16. **UI Flow Explanation**:
    - Formal invoice layout with printable view and payment link.
17. **Reporting & Analytics Impact**: Direct impact on revenue reporting and cash flow forecasting.
18. **Security Considerations**: Financial data protection and payment gateway security (PCI compliance if handling cards directly).
19. **Audit Logs & Activity Tracking**: Every payment and status change logged.
20. **Technical Execution Flow**: Create -> Generate invoice number (idempotent) -> Save -> Signal for financial rollup.

#### Module 15: Support Dashboard
1. **Purpose**: To provide support teams with an overview of case metrics.
2. **Business Objective**: Monitor support performance and ticket volume.
3. **Complete Workflow**: View metrics -> Drill down to cases.
4. **User Actions**: Filter by priority, assignee, status.
5. **System Actions**: Aggregate case data, calculate average resolution time.
6. **Automation Triggers**: N/A.
7. **Status Flow**: N/A.
8. **Validation Rules**: Standard role checks.
9. **Database Relations**: Reads from Cases table.
10. **API Endpoints**: `GET /api/v1/support/dashboard/`.
11. **Notifications Flow**: Display active alerts for SLA breaches.
12. **Real-Time Sync Behavior**: Live case counts.
13. **Role-Based Access Rules**: Support roles only.
14. **Edge Cases & Failure Handling**: Fallback to cached data.
15. **Background Jobs / Celery Tasks**: Nightly aggregation.
16. **UI Flow Explanation**: Grid of metrics cards and top cases list.
17. **Reporting & Analytics Impact**: Support KPI tracking.
18. **Security Considerations**: Data isolation.
19. **Audit Logs & Activity Tracking**: N/A.
20. **Technical Execution Flow**: Direct aggregation query or Redis fetch.

#### Module 16: Cases (Detailed)
1. **Purpose**: To track customer issues and requests.
2. **Business Objective**: Resolve customer issues effectively to maintain satisfaction.
3. **Complete Workflow**:
   - Case created (manually, via email, or portal).
   - Assigned to agent.
   - Agent works on case, adds internal notes, communicates with customer.
   - Resolution tracking and feedback collection.
   - SLA engine monitors resolution time.
4. **User Actions**: Create case, assign, update status, add internal notes, resolve.
5. **System Actions**:
   - Auto-assign based on workload or expertise.
   - Monitor SLA and trigger escalation flow.
   - Send notifications to customer on status change.
6. **Automation Triggers**:
   - Case created -> Auto-send confirmation email to customer.
   - SLA breached -> Escalate to support manager.
7. **Status Flow**: New -> Assigned -> In Progress -> Pending Customer -> Resolved -> Closed.
8. **Validation Rules**:
   - Cannot close without a resolution summary.
9. **Database Relations**: Linked to Contacts, Accounts, Products.
10. **API Endpoints**:
    - `POST /api/v1/cases/`
    - `POST /api/v1/cases/{id}/add-note/`
11. **Notifications Flow**:
    - WebSocket alert to agent on assignment.
    - Email to customer on resolution.
12. **Real-Time Sync Behavior**:
    - Case list updates live for the team.
13. **Role-Based Access Rules**:
    - Support agents see all or assigned cases.
14. **Edge Cases & Failure Handling**:
    - Email ingestion failure -> Fallback to error log and manual entry.
15. **Background Jobs / Celery Tasks**:
    - SLA monitoring job.
    - Email ingestion job (polling IMAP or processing webhooks).
16. **UI Flow Explanation**:
    - Split view with case list and conversation/timeline view.
17. **Reporting & Analytics Impact**: Resolution time and ticket volume metrics.
18. **Security Considerations**: Customer data privacy; internal notes hidden from customer portals.
19. **Audit Logs & Activity Tracking**: Full history of ownership and status changes.
20. **Technical Execution Flow**: Case created -> Signal triggers SLA timer start -> Celery job monitors.

*(Continuing to cover all 29 modules. I will generate the complete text.)*

#### Module 17: Solutions
1. **Purpose**: To manage a knowledge base of common issue resolutions.
2. **Business Objective**: Enable self-service and speed up ticket resolution.
3. **Complete Workflow**: Agent documents solution -> Approved -> Published -> Linked to cases.
4. **User Actions**: Create article, search, link to case.
5. **System Actions**: Index for full-text search.
6. **Automation Triggers**: N/A.
7. **Status Flow**: Draft -> Reviewed -> Published.
8. **Validation Rules**: Title and content required.
9. **Database Relations**: Linked to Cases and Products.
10. **API Endpoints**: `GET /api/v1/solutions/`.
11. **Notifications Flow**: N/A.
12. **Real-Time Sync Behavior**: Instantly searchable.
13. **Role-Based Access Rules**: Editable by senior agents/admins.
14. **Edge Cases & Failure Handling**: N/A.
15. **Background Jobs / Celery Tasks**: Search indexing.
16. **UI Flow Explanation**: Articles list with search bar.
17. **Reporting & Analytics Impact**: Solution usage tracking.
18. **Security Considerations**: Public vs. private articles.
19. **Audit Logs & Activity Tracking**: Edit history.
20. **Technical Execution Flow**: Standard content management flow.

#### Module 18: Services
1. **Purpose**: To manage professional services or maintenance contracts.
2. **Business Objective**: Track service delivery and contracts.
3. **Complete Workflow**: Contract signed -> Service record created -> Scheduled delivery -> Completed.
4. **User Actions**: Create service record, assign technician, update status.
5. **System Actions**: Track delivery against contract.
6. **Automation Triggers**: Contract expiration triggers renewal task.
7. **Status Flow**: Scheduled -> In Progress -> Completed.
8. **Validation Rules**: Valid contract required.
9. **Database Relations**: Linked to Accounts and Contracts.
10. **API Endpoints**: `POST /api/v1/services/`.
11. **Notifications Flow**: Notify customer of schedule.
12. **Real-Time Sync Behavior**: Live schedule updates.
13. **Role-Based Access Rules**: Service team access.
14. **Edge Cases & Failure Handling**: Technician unavailability handling.
15. **Background Jobs / Celery Tasks**: Contract expiration checks.
16. **UI Flow Explanation**: Gantt chart or calendar for scheduling.
17. **Reporting & Analytics Impact**: Service delivery efficiency.
18. **Security Considerations**: Secure customer location data.
19. **Audit Logs & Activity Tracking**: Delivery logs.
20. **Technical Execution Flow**: Complex scheduling logic.

#### Module 19: Feedback
1. **Purpose**: To collect customer feedback after interaction.
2. **Business Objective**: Measure customer satisfaction (CSAT/NPS).
3. **Complete Workflow**: Case resolved -> Survey sent -> Customer submits -> Analyzed.
4. **User Actions**: View feedback scores.
5. **System Actions**: Auto-send survey, calculate average score.
6. **Automation Triggers**: Negative feedback triggers follow-up task.
7. **Status Flow**: Sent -> Received.
8. **Validation Rules**: Score within range.
9. **Database Relations**: Linked to Cases and Contacts.
10. **API Endpoints**: `POST /api/v1/feedback/submit/` (public).
11. **Notifications Flow**: Notify manager on negative feedback.
12. **Real-Time Sync Behavior**: Score updates live on dashboard.
13. **Role-Based Access Rules**: Visible to managers and assigned agents.
14. **Edge Cases & Failure Handling**: Duplicate submission prevention.
15. **Background Jobs / Celery Tasks**: Survey dispatch.
16. **UI Flow Explanation**: Simple survey form for customer; dashboard view for internal users.
17. **Reporting & Analytics Impact**: CSAT and NPS reporting.
18. **Security Considerations**: Anonymization options.
19. **Audit Logs & Activity Tracking**: N/A.
20. **Technical Execution Flow**: Webhook or API submission -> Signal updates metrics.

#### Module 20: Marketing
1. **Purpose**: To manage lead generation campaigns.
2. **Business Objective**: Attract prospects and convert them to leads.
3. **Complete Workflow**: Campaign created -> Leads captured via landing pages/forms -> Passed to sales.
4. **User Actions**: Create campaign, view leads captured, track ROI.
5. **System Actions**: Track UTM parameters, capture leads via API.
6. **Automation Triggers**: Form submission creates Lead and triggers welcome email.
7. **Status Flow**: Planned -> Active -> Completed.
8. **Validation Rules**: Unique campaign name.
9. **Database Relations**: One-to-many with Leads.
10. **API Endpoints**: `POST /api/v1/marketing/lead-capture/`.
11. **Notifications Flow**: Notify sales on high-intent lead capture.
12. **Real-Time Sync Behavior**: Lead counts update live.
13. **Role-Based Access Rules**: Marketing team access.
14. **Edge Cases & Failure Handling**: Spam form submission detection.
15. **Background Jobs / Celery Tasks**: Campaign performance calculation.
16. **UI Flow Explanation**: Campaign list and lead source charts.
17. **Reporting & Analytics Impact**: Campaign ROI and conversion funnel.
18. **Security Considerations**: CAPTCHA on forms.
19. **Audit Logs & Activity Tracking**: Campaign budget edits logged.
20. **Technical Execution Flow**: API receives lead -> Validates -> Creates Lead -> Fires signal.

#### Module 21: Projects
1. **Purpose**: To manage post-sale implementation projects.
2. **Business Objective**: Ensure successful product/service delivery.
3. **Complete Workflow**: Deal closed -> Project created -> Tasks assigned -> Completed.
4. **User Actions**: Create project, add tasks, assign team members.
5. **System Actions**: Track project progress and milestones.
6. **Automation Triggers**: Project completion triggers account status update to "Customer".
7. **Status Flow**: Not Started -> In Progress -> On Hold -> Completed.
8. **Validation Rules**: Valid account required.
9. **Database Relations**: Linked to Accounts and Deals.
10. **API Endpoints**: `POST /api/v1/projects/`.
11. **Notifications Flow**: Notify team on task assignment.
12. **Real-Time Sync Behavior**: Progress bar updates live.
13. **Role-Based Access Rules**: Project team access.
14. **Edge Cases & Failure Handling**: Milestone delay handling.
15. **Background Jobs / Celery Tasks**: Progress calculation.
16. **UI Flow Explanation**: Gantt chart or list view.
17. **Reporting & Analytics Impact**: Project delivery time metrics.
18. **Security Considerations**: Project file storage security.
19. **Audit Logs & Activity Tracking**: Milestone updates logged.
20. **Technical Execution Flow**: Standard project management flow.

#### Module 22: Analytics (Detailed)
1. **Purpose**: To provide in-depth data analysis and reporting.
2. **Business Objective**: Drive business decisions through data.
3. **Complete Workflow**:
   - Data collected from all modules.
   - KPI calculations and pipeline forecasting models run.
   - Dashboard widgets and charts update.
4. **User Actions**: Build custom reports, view dashboards, export data.
5. **System Actions**:
   - Calculate KPIs (Revenue, Conversion, CSAT).
   - Run forecasting algorithms based on historical deal data.
   - Update charts in real-time (WebSockets).
6. **Automation Triggers**: Scheduled report generation.
7. **Status Flow**: N/A.
8. **Validation Rules**: Report parameters must be valid.
9. **Database Relations**: Queries across all tables.
10. **API Endpoints**: `GET /api/v1/analytics/kpis/`, `GET /api/v1/analytics/forecast/`.
11. **Notifications Flow**: Email reports to subscribers.
12. **Real-Time Sync Behavior**: Charts update as transactions occur.
13. **Role-Based Access Rules**: Restricted to managers and executives.
14. **Edge Cases & Failure Handling**: Large data queries optimized with read replicas or summary tables.
15. **Background Jobs / Celery Tasks**: Nightly aggregation and forecasting jobs.
16. **UI Flow Explanation**: Visual dashboard with Recharts; report builder interface.
17. **Reporting & Analytics Impact**: The core module for reporting.
18. **Security Considerations**: Data masking for sensitive financial figures.
19. **Audit Logs & Activity Tracking**: Tracks who viewed or exported reports.
20. **Technical Execution Flow**: Query -> Compute -> Cache in Redis -> Serve via API.

#### Module 23: Profile Settings
1. **Purpose**: To manage individual user preferences.
2. **Business Objective**: Personalize the user experience.
3. **Complete Workflow**: User updates info -> Saved.
4. **User Actions**: Update name, password, notification preferences.
5. **System Actions**: Validate, update DB, reset session if password changed.
6. **Automation Triggers**: N/A.
7. **Status Flow**: N/A.
8. **Validation Rules**: Password strength requirements.
9. **Database Relations**: One-to-one with User.
10. **API Endpoints**: `PUT /api/v1/profile/`.
11. **Notifications Flow**: Confirmation email on password change.
12. **Real-Time Sync Behavior**: N/A.
13. **Role-Based Access Rules**: Self-only.
14. **Edge Cases & Failure Handling**: Invalid password handling.
15. **Background Jobs / Celery Tasks**: N/A.
16. **UI Flow Explanation**: Simple form layout.
17. **Reporting & Analytics Impact**: N/A.
18. **Security Considerations**: Secure password hashing.
19. **Audit Logs & Activity Tracking**: Password change logged.
20. **Technical Execution Flow**: Standard update.

#### Module 24: Account Settings
1. **Purpose**: To manage company-wide CRM configuration.
2. **Business Objective**: Tailor the system to company processes.
3. **Complete Workflow**: Admin updates settings -> Applied system-wide.
4. **User Actions**: Update company info, currency, time zone, module enabling.
5. **System Actions**: Update global config, invalidate caches.
6. **Automation Triggers**: N/A.
7. **Status Flow**: N/A.
8. **Validation Rules**: Valid currency code required.
9. **Database Relations**: Global config table.
10. **API Endpoints**: `PUT /api/v1/settings/account/`.
11. **Notifications Flow**: N/A.
12. **Real-Time Sync Behavior**: Affects all users immediately.
13. **Role-Based Access Rules**: Admin only.
14. **Edge Cases & Failure Handling**: Reverting invalid settings.
15. **Background Jobs / Celery Tasks**: N/A.
16. **UI Flow Explanation**: Tabbed settings view.
17. **Reporting & Analytics Impact**: Currency settings affect financial reporting.
18. **Security Considerations**: Restrict access heavily.
19. **Audit Logs & Activity Tracking**: All settings changes logged.
20. **Technical Execution Flow**: Update record -> Cache clear.

#### Module 25: Users Management (Detailed)
1. **Purpose**: To manage system users and access.
2. **Business Objective**: Secure the system and manage the team.
3. **Complete Workflow**: Admin creates user -> Assigns role -> User receives invite -> Logs in.
4. **User Actions**: Create user, assign roles, deactivate user, reset password.
5. **System Actions**: Enforce RBAC rules, manage sessions, track activity.
6. **Automation Triggers**: User creation triggers invitation email.
7. **Status Flow**: Active -> Inactive -> Pending Invite.
8. **Validation Rules**: Email uniqueness. Role must exist.
9. **Database Relations**: Linked to Roles and Permissions tables.
10. **API Endpoints**: `POST /api/v1/users/`, `PUT /api/v1/users/{id}/roles/`.
11. **Notifications Flow**: Invitation email with secure link.
12. **Real-Time Sync Behavior**: Permissions changes apply on next request or session refresh.
13. **Role-Based Access Rules**: Admin only.
14. **Edge Cases & Failure Handling**: Locking out on too many failed attempts.
15. **Background Jobs / Celery Tasks**: Expired invite cleanup.
16. **UI Flow Explanation**: User list with status and role badges.
17. **Reporting & Analytics Impact**: User activity metrics.
18. **Security Considerations**: Strong password policies, 2FA support (if implemented).
19. **Audit Logs & Activity Tracking**: Full audit trail of user creation, role changes, and logins.
20. **Technical Execution Flow**: Create -> Generate token -> Send email via Celery -> User completes registration.

#### Module 26: Workflow Automation Engine
1. **Purpose**: To manage automated triggers and actions.
2. **Business Objective**: Automate business processes without code.
3. **Complete Workflow**: Admin defines rule (Trigger -> Condition -> Action) -> System executes.
4. **User Actions**: Create rule, view execution logs.
5. **System Actions**: Evaluate triggers on DB events, execute actions (Celery).
6. **Automation Triggers**: DB create/update events.
7. **Status Flow**: Active -> Paused.
8. **Validation Rules**: Prevent infinite loops.
9. **Database Relations**: Stores rules and execution logs.
10. **API Endpoints**: `POST /api/v1/workflows/`.
11. **Notifications Flow**: Alert on failed automation.
12. **Real-Time Sync Behavior**: N/A.
13. **Role-Based Access Rules**: Admin only.
14. **Edge Cases & Failure Handling**: Loop detection and circuit breaker.
15. **Background Jobs / Celery Tasks**: Action execution.
16. **UI Flow Explanation**: Visual rule builder (If This Then That style).
17. **Reporting & Analytics Impact**: Automation volume tracking.
18. **Security Considerations**: Restrict execution of sensitive actions.
19. **Audit Logs & Activity Tracking**: Execution logs.
20. **Technical Execution Flow**: Django signal -> Workflow engine evaluates -> Celery task dispatched.

#### Module 27: Authentication & RBAC
1. **Purpose**: To secure access to the system.
2. **Business Objective**: Ensure only authorized users access data.
3. **Complete Workflow**: User logs in -> Receives JWT -> Used for subsequent requests.
4. **User Actions**: Login, logout, refresh token.
5. **System Actions**: Validate credentials, check permissions on every request.
6. **Automation Triggers**: N/A.
7. **Status Flow**: Authenticated -> Unauthenticated.
8. **Validation Rules**: Standard auth checks.
9. **Database Relations**: Reads from Users, Roles, Permissions.
10. **API Endpoints**: `POST /api/v1/auth/login/`, `POST /api/v1/auth/refresh/`.
11. **Notifications Flow**: N/A.
12. **Real-Time Sync Behavior**: Permissions changes affect new tokens.
13. **Role-Based Access Rules**: Core module for enforcing rules.
14. **Edge Cases & Failure Handling**: Token expiration handling.
15. **Background Jobs / Celery Tasks**: N/A.
16. **UI Flow Explanation**: Login screen.
17. **Reporting & Analytics Impact**: Login frequency tracking.
18. **Security Considerations**: JWT storage (HttpOnly cookies or secure local storage), CSRF protection.
19. **Audit Logs & Activity Tracking**: Login and failed attempts logged.
20. **Technical Execution Flow**: Credential check -> JWT generation -> Return to client.

#### Module 28: Notifications System
1. **Purpose**: To deliver alerts to users.
2. **Business Objective**: Keep users informed in real-time.
3. **Complete Workflow**: System generates notification -> Delivered via WebSocket or email.
4. **User Actions**: View notifications, mark as read.
5. **System Actions**: Store notification, broadcast via WebSocket.
6. **Automation Triggers**: Triggered by other modules (e.g., Task assigned).
7. **Status Flow**: Unread -> Read.
8. **Validation Rules**: N/A.
9. **Database Relations**: Linked to Users.
10. **API Endpoints**: `GET /api/v1/notifications/`.
11. **Notifications Flow**: The core module for this.
12. **Real-Time Sync Behavior**: Instantly appears in UI.
13. **Role-Based Access Rules**: Self-only.
14. **Edge Cases & Failure Handling**: Offline delivery queue.
15. **Background Jobs / Celery Tasks**: Email fallback dispatch.
16. **UI Flow Explanation**: Notification bell with dropdown and full list view.
17. **Reporting & Analytics Impact**: Notification read rates.
18. **Security Considerations**: Do not include sensitive data in notification body.
19. **Audit Logs & Activity Tracking**: Creation logged.
20. **Technical Execution Flow**: Event -> Save Notification -> Broadcast via Redis/Channels.

#### Module 29: Real-Time Sync System
1. **Purpose**: To ensure data consistency across clients.
2. **Business Objective**: Enable collaboration without manual refresh.
3. **Complete Workflow**: Data changes -> WebSocket event broadcast -> Client updates state.
4. **User Actions**: N/A (Transparent to user).
5. **System Actions**: Detect changes, serialize payload, broadcast to subscribed channels.
6. **Automation Triggers**: DB save/update.
7. **Status Flow**: Connected -> Disconnected.
8. **Validation Rules**: N/A.
9. **Database Relations**: N/A.
10. **API Endpoints**: WebSocket endpoint (`/ws/sync/`).
11. **Notifications Flow**: N/A.
12. **Real-Time Sync Behavior**: The core module for this.
13. **Role-Based Access Rules**: Users only receive events they have permission to see.
14. **Edge Cases & Failure Handling**: Reconnection logic and state catch-up.
15. **Background Jobs / Celery Tasks**: N/A.
16. **UI Flow Explanation**: UI updates seamlessly without spinners where possible.
17. **Reporting & Analytics Impact**: N/A.
18. **Security Considerations**: Channel authentication.
19. **Audit Logs & Activity Tracking**: Connection logs.
20. **Technical Execution Flow**: Django Signal -> Channels Layer -> Redis -> WebSocket -> Client.

---

### 6. Non-Functional Requirements
- **Performance**: API response time < 200ms for 95% of requests. Real-time updates delivered within 500ms.
- **Scalability**: Support up to 10,000 concurrent users. Horizontal scaling for both Django and React.
- **Reliability**: 99.9% uptime. Automated backups and failover.
- **Security**: Data encryption at rest and in transit. Regular security audits.
- **Usability**: Intuitive UI with micro-animations. Accessible (WCAG 2.1 AA).

### 7. Database Requirements
- **Primary DB**: PostgreSQL for structured data (Leads, Deals, Accounts, etc.).
- **Cache/PubSub**: Redis for session caching, queue management, and WebSocket pub/sub.
- **Transactions**: Strict transaction handling with rollback on failure to maintain data integrity.

### 8. Tech Stack
- **Frontend**: React, Vite, Redux Toolkit, Recharts, TailwindCSS (if requested, else Vanilla CSS with custom design system), Lucide React (icons).
- **Backend**: Django, Django REST Framework, Django Channels (WebSockets), Celery (Background tasks).
- **Infrastructure**: Redis, PostgreSQL.

### 9. Key Features Summary
- **Intelligent WorkQueue**: Prioritized task management.
- **Advanced Deal Pipeline**: With Gravity and Momentum physics engine.
- **Real-Time Collaboration**: Powered by Django Channels and Redis.
- **Automated Workflow Engine**: To minimize manual work.
- **Comprehensive Support Suite**: With SLA monitoring and feedback loops.
