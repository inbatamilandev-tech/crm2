# CRM Unified Suite – Master Specification Document
## Enterprise Sales, Support & Operations Management System

---

### Table of Contents
1. [Project Overview](#1-project-overview)
2. [Objectives](#2-objectives)
3. [Scope](#3-scope)
4. [Users & Roles](#4-users--roles)
5. [Functional Requirements (FRD)](#5-functional-requirements-frd)
6. [Complete Module-Wise Breakdown (FSD Level)](#6-complete-module-wise-breakdown-fsd-level)
7. [Technical Design Document (TDD)](#7-technical-design-document-tdd)
8. [Workflows, Architecture & Business Logic](#8-workflows-architecture--business-logic)

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
The scope of this document covers the design and implementation of the core CRM modules, ranging from sales management (Leads, Deals) to support (Cases, Solutions) and system administration (User Management, Settings). It includes both functional requirements and technical execution details.

### 4. Users & Roles
The system supports the following roles with distinct permissions:
- **System Administrator**: Full access to all modules, settings, and user management.
- **Sales Manager**: Access to sales modules, reporting, and team performance tracking.
- **Sales Representative**: Access to leads, accounts, deals, and activities assigned to them.
- **Support Agent**: Access to support dashboard, cases, and solutions.
- **Executive**: Read-only access to high-level dashboards and reports.

---

### 5. Functional Requirements (FRD)

#### 5.1 Sales Management
- **Lead Capture**: The system must capture leads from manual entry and external APIs.
- **Pipeline Tracking**: Sales reps must be able to move deals through visual stages.
- **Quote Generation**: The system must allow users to create price quotes with line items.
- **Approval Workflow**: High-value quotes or discounts must require manager approval.

#### 5.2 Customer Support
- **Ticketing System**: Customers or agents must be able to create support tickets.
- **SLA Monitoring**: The system must track time to resolution and escalate overdue tickets.
- **Knowledge Base**: Agents must have access to a searchable database of solutions.

#### 5.3 Operations & Communication
- **Task Management**: Users must be able to create, assign, and track tasks.
- **Calendar Integration**: The system must support scheduling meetings and checking availability.
- **Notifications**: Users must receive alerts for task deadlines and system events.

#### 5.4 Reporting & Analytics
- **Dashboards**: Role-specific dashboards must display key metrics.
- **Custom Reports**: Users must be able to generate reports based on custom filters.

---

### 6. Complete Module-Wise Breakdown (FSD Level)

This section provides a detailed functional and technical breakdown of the 18 core modules.

#### Module 1: Authentication & Role Management
- **Purpose**: To secure access to the CRM and manage user permissions based on roles.
- **Business Problem Solved**: Prevents unauthorized access to sensitive data.
- **Features**: JWT-based auth, RBAC, Password reset, Session management.
- **Workflow**: Credentials entered -> Backend validates -> JWT generated -> Client stores and uses for API.
- **DB Models**: `User`, `Role`, `Permission`.
- **APIs**: Login, Refresh, Logout.
- **Security**: Strict adherence to least privilege.

#### Module 2: Dashboard
- **Purpose**: To provide a summary view of CRM data and activities.
- **Business Problem Solved**: Users need a quick way to see daily tasks and pipeline status.
- **Features**: KPI cards, Interactive charts, Activity feed.
- **Workflow**: Page loads -> API fetches aggregated data -> Components render charts.
- **DB Models**: Reads from Leads, Deals, Cases, Tasks.
- **Real-Time**: Live widget updates via Django Channels.

#### Module 3: Lead Management
- **Purpose**: To capture and nurture potential sales opportunities.
- **Business Problem Solved**: Tracks prospects from initial contact to conversion.
- **Features**: Lead creation, Status pipeline, Conversion to Account/Contact/Deal.
- **Workflow**: Created -> Assigned -> Contacted -> Qualified -> Converted.
- **Automation**: Auto-create "Follow-up" task on creation.

#### Module 4: Contact Management
- **Purpose**: To store and manage individual person records linked to accounts.
- **Business Problem Solved**: Maintains interaction history with specific people.
- **Features**: Contact creation, linking to Accounts, timeline.
- **Workflow**: Created manually or from Lead -> Linked to Account.

#### Module 5: Account/Company Management
- **Purpose**: To manage company or organization records.
- **Business Problem Solved**: Tracks organizational structure and financial metrics.
- **Features**: Company profile, hierarchy, financial rollup.
- **Workflow**: Holds Contacts and Deals -> Aggregates data.

#### Module 6: Opportunity/Deal Pipeline
- **Purpose**: To track sales opportunities through stages to closure.
- **Business Problem Solved**: Helps sales teams manage pipeline and forecast revenue.
- **Features**: Kanban board, deal value tracking, physics engine (Gravity/Momentum).
- **Workflow**: Move through stages (Prospecting -> Won/Lost).
- **Special Feature**: High-value deals require approval.

#### Module 7: Task & Activity Management
- **Purpose**: To track action items and history of customer interactions.
- **Features**: Task list, timeline, reminders.
- **Automation**: Auto-create tasks on specific triggers (e.g., new lead).

#### Module 8: Call Queue / Follow-up System
- **Purpose**: To manage and prioritize phone follow-ups.
- **Features**: Prioritized list, outcome tracking.
- **Real-Time**: Queue updates live as outcomes are logged.

#### Module 9: Meeting Scheduling
- **Purpose**: To schedule and manage appointments with clients.
- **Features**: Calendar view, invite generation.
- **Automation**: Auto-create task for meeting follow-up.

#### Module 10: Quote & Approval Workflow
- **Purpose**: To generate price estimates and manage approval.
- **Features**: Line item editor, discount limits, approval routing.
- **Validation**: Discount limits enforced by role.

#### Module 11: Product & Pricing
- **Purpose**: To manage the catalog of goods and services.
- **Features**: Product list, category management.

#### Module 12: Sales Order / Invoice
- **Purpose**: To bill customers and record sales.
- **Features**: Invoice generation, payment tracking.
- **Automation**: Auto-send reminder on overdue invoices.

#### Module 13: Customer Support / Ticketing
- **Purpose**: To manage customer issues and support requests.
- **Features**: Ticket creation, assignment, SLA tracking.
- **Automation**: Auto-escalate if SLA breached.

#### Module 14: Notifications
- **Purpose**: To keep users informed of system events.
- **Features**: In-app alerts, email alerts, WebSocket broadcasts.

#### Module 15: Reports & Analytics
- **Purpose**: To provide deep insights into CRM data.
- **Features**: Custom report builder, scheduled reports.

#### Module 16: Audit Logs & History Tracking
- **Purpose**: To track changes to data within the system.
- **Features**: Data change logs, login logs.

#### Module 17: Settings & Configuration
- **Purpose**: To manage global CRM settings and personal preferences.

#### Module 18: API & Integrations
- **Purpose**: To connect the CRM with external systems.
- **Features**: REST API, Webhooks.

---

### 7. Technical Design Document (TDD)

#### 7.1 System Architecture
Decoupled client-server architecture:
- **Frontend**: React/Vite SPA.
- **Backend**: Django / Django REST Framework.
- **WebSockets**: Django Channels.
- **DB**: PostgreSQL.
- **Cache**: Redis.

#### 7.2 Background Tasks
Celery handles async tasks like:
- Nightly deal scoring.
- SLA monitoring.
- Email dispatch.
- PDF generation.

---

### 8. Workflows, Architecture & Business Logic

#### 8.1 Lead-to-Cash Workflow
1. Lead Created -> 2. Assigned -> 3. Contacted -> 4. Converted (Account/Contact/Deal) -> 5. Quote Generated -> 6. Approved -> 7. Invoice Generated -> 8. Paid.

#### 5.1 Deal Scoring Engine (Gravity & Momentum)
- **Gravity Score**: `BaseScore - (DaysInStage * DecayFactor)`.
- **Momentum Score**: Based on velocity of stage transitions.

#### 5.2 Quote Approval Logic
- Quotes with discount > 10% or Value > $10,000 must be approved by a Manager.
