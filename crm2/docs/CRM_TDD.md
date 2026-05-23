# Technical Design Document (TDD)
## CRM Unified Suite – Enterprise Sales, Support & Operations Management System

---

### 1. Introduction
This document outlines the technical architecture and design for the CRM Unified Suite. It provides guidance for developers on the technologies, database structure, and API design used in the project.

### 2. System Architecture
The system follows a decoupled client-server architecture:
- **Frontend**: Single Page Application (SPA) built with React and Vite. Communicates with backend via REST APIs and WebSockets.
- **Backend**: Django application using Django REST Framework (DRF) for APIs and Django Channels for WebSockets.
- **Database**: PostgreSQL for persistent data storage.
- **Cache/Broker**: Redis for session caching, task queue (Celery), and WebSocket channel layer.

### 3. Technology Stack
- **Frontend**: React 18, Vite, Redux Toolkit (state management), Recharts (charts), TailwindCSS or Vanilla CSS.
- **Backend**: Python 3.x, Django 4.x, Django REST Framework, Django Channels.
- **Async Tasks**: Celery, Redis.
- **Database**: PostgreSQL.

### 4. Database Design (Key Models)

#### 4.1 Authentication & Authorization
- `User`: Standard Django user or extended with profile fields.
- `Role`: Custom model for roles (Admin, Manager, Rep).
- `Permission`: Links roles to specific actions.

#### 4.2 Core CRM Models
- `Lead`: Fields for contact info, status, owner.
- `Account`: Fields for company name, revenue, linked contacts.
- `Contact`: Fields for individual info, linked to Account.
- `Deal`: Fields for value, stage, account, owner. Includes `gravity_score` and `momentum_score` fields.

#### 4.3 Support Models
- `Ticket`: Fields for subject, status, priority, assignee, SLA deadline.

### 5. API Design & Security
- **Authentication**: JWT tokens passed in the `Authorization` header (`Bearer <token>`).
- **REST Principles**: Standard HTTP methods (GET, POST, PUT, DELETE).
- **Pagination**: Implemented on list endpoints to handle large datasets.
- **Throttling**: Rate limiting on sensitive endpoints (e.g., login).

### 6. Real-Time Architecture (WebSockets)
- **Django Channels**: Used to handle WebSocket connections.
- **Redis Channel Layer**: Facilitates communication between Django processes and WebSocket clients.
- **Events**: Broadcasted on data changes (e.g., deal stage update) to specific user channels or group channels.

### 7. Background Tasks (Celery)
- **Periodic Jobs**:
  - Nightly scoring recalculation for deals.
  - SLA monitoring (runs every 5 minutes).
- **Event-Driven Tasks**:
  - Sending emails (prevents blocking API response).
  - Generating PDFs for quotes and invoices.
