# Functional Specification Document (FSD)
## CRM Unified Suite – Enterprise Sales, Support & Operations Management System

---

### 1. Introduction
This document provides the detailed functional specifications for the CRM Unified Suite. It translates the requirements from the FRD into specific system behaviors, user interface descriptions, and business rules.

### 2. System Overview & Navigation
The CRM is a web-based application with a responsive design. The main navigation is a sidebar containing links to all accessible modules based on the user's role.

### 3. Detailed Functional Specifications

#### 3.1 Authentication & Access Control
- **Login**: Users enter Email and Password. On success, redirected to Dashboard.
- **Session Timeout**: Sessions expire after 2 hours of inactivity.
- **RBAC**: Permissions are granular (View, Create, Edit, Delete) per module.

#### 3.2 Dashboard Specification
- **Widgets**:
  - **Metric Cards**: Display counts (e.g., "Active Leads", "Deals This Month").
  - **Charts**: Use bar/line charts for trends. Clickable to view details.
  - **Activity Feed**: Shows recent actions by the user or team.

#### 3.3 Lead Management Specification
- **Lead Creation**:
  - Fields: First Name (Req), Last Name (Req), Email (Req, Unique), Company (Req), Status (Default: New).
- **Lead Conversion**:
  - Action: Click "Convert" on a qualified lead.
  - Result: Creates an Account (using Company name), a Contact (using lead name), and optionally a Deal.
  - Business Rule: Lead data is mapped to the new records; the lead record is marked "Converted" and read-only.

#### 3.4 Opportunity/Deal Pipeline Specification
- **Kanban Board**:
  - Columns represent stages: Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost.
  - Action: Drag card to change stage.
- **Deal Scoring**:
  - **Gravity Score**: Decreases if no activity recorded.
  - **Momentum Score**: Increases with frequent stage movements.

#### 3.5 Quote & Approval Workflow Specification
- **Quote Builder**:
  - Allows adding products from catalog, setting quantity, and applying percentage discount.
- **Approval Flow**:
  - If discount > 10% or total > $10,000, status becomes "Pending Approval".
  - Manager receives notification and can "Approve" or "Reject" with comments.

### 4. Workflow Specifications

#### 4.1 Lead-to-Invoice End-to-End Workflow
1. **Lead Created** -> 2. **Rep Contacts Lead** -> 3. **Lead Qualified** -> 4. **Converted to Account/Contact/Deal** -> 5. **Quote Generated** -> 6. **Quote Approved** -> 7. **Invoice Generated** -> 8. **Payment Recorded**.

### 5. UI/UX Standards
- **Design System**: Modern, clean aesthetics with consistent use of colors and typography.
- **Feedback**: Loading spinners for async actions, toast notifications for success/error.
