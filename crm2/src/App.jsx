import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { ThemeProvider } from './context/ThemeContext';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Lazy load all pages for better performance and smaller chunks
const Dashboard      = lazy(() => import('./pages/Dashboard'));
const Leads          = lazy(() => import('./pages/Leads'));
const Contacts       = lazy(() => import('./pages/Contacts'));
const Deals          = lazy(() => import('./pages/Deals'));
const Emails         = lazy(() => import('./pages/Emails'));
const Quotes         = lazy(() => import('./pages/Quotes'));
const Support        = lazy(() => import('./pages/Support'));
const Marketing      = lazy(() => import('./pages/Marketing'));
const Analytics      = lazy(() => import('./pages/Analytics'));
const Workqueue      = lazy(() => import('./pages/Workqueue'));
const Accounts       = lazy(() => import('./pages/Accounts'));
const Tasks          = lazy(() => import('./pages/Tasks'));
const Calls          = lazy(() => import('./pages/Calls'));
const Meetings       = lazy(() => import('./pages/Meetings'));
const Workflows      = lazy(() => import('./pages/Workflows'));
const Products       = lazy(() => import('./pages/Products'));
const Profile        = lazy(() => import('./pages/Profile'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Settings       = lazy(() => import('./pages/Settings'));
const Users          = lazy(() => import('./pages/Users'));
const Invoices       = lazy(() => import('./pages/Invoices'));
const Cases          = lazy(() => import('./pages/Cases'));
const Solutions      = lazy(() => import('./pages/Solutions'));
const Apps           = lazy(() => import('./pages/Apps'));
const ApiConsole     = lazy(() => import('./pages/ApiConsole'));
const Services       = lazy(() => import('./pages/Services'));
const Projects       = lazy(() => import('./pages/Projects'));
const ProjectDetail  = lazy(() => import('./pages/ProjectDetail'));
const Feedback       = lazy(() => import('./pages/Feedback'));
const Login          = lazy(() => import('./pages/Login'));
const Unauthorized   = lazy(() => import('./pages/Unauthorized'));
const NotificationCenter = lazy(() => import('./pages/NotificationCenter'));
const ActivityHub = lazy(() => import('./pages/ActivityHub'));

// Settings Pages
const SettingsIndex  = lazy(() => import('./pages/settings/SettingsIndex'));
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const PasswordSettings = lazy(() => import('./pages/settings/PasswordSettings'));
const SessionHistory = lazy(() => import('./pages/settings/SessionHistory'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const SystemPreferences = lazy(() => import('./pages/settings/SystemPreferences'));
const UserManagement = lazy(() => import('./pages/settings/UserManagement'));
const RolesPermissions = lazy(() => import('./pages/settings/RolesPermissions'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const CompanySettings = lazy(() => import('./pages/settings/CompanySettings'));
const AuditLogs = lazy(() => import('./pages/settings/AuditLogs'));
const SalesPreferences = lazy(() => import('./pages/settings/SalesPreferences'));
const SupportPreferences = lazy(() => import('./pages/settings/SupportPreferences'));
const FinancePreferences = lazy(() => import('./pages/settings/FinancePreferences'));
const WorkflowList = lazy(() => import('./pages/settings/workflows/WorkflowList'));
const WorkflowBuilder = lazy(() => import('./pages/settings/workflows/WorkflowBuilder'));
const WorkflowLogs = lazy(() => import('./pages/settings/workflows/WorkflowLogs'));
const RealtimeDashboard = lazy(() => import('./pages/settings/RealtimeDashboard'));

const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-slate-50/50">
    <div className="flex flex-col items-center">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Initializing Module...</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Dashboard — visible to all authenticated users */}
            <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* ── Sales Module ── */}
            <Route path="leads"       element={<ProtectedRoute permission="lead.view"><Leads /></ProtectedRoute>} />
            <Route path="leads/new"   element={<ProtectedRoute permission="lead.create"><Leads /></ProtectedRoute>} />
            <Route path="contacts"    element={<ProtectedRoute permission="contact.view"><Contacts /></ProtectedRoute>} />
            <Route path="deals"       element={<ProtectedRoute permission="deal.view"><Deals /></ProtectedRoute>} />
            <Route path="deals/new"   element={<ProtectedRoute permission="deal.create"><Deals /></ProtectedRoute>} />

            {/* ── Activities Module ── */}
            <Route path="tasks"       element={<ProtectedRoute permission="task.view"><Tasks /></ProtectedRoute>} />
            <Route path="tasks/new"   element={<ProtectedRoute permission="task.create"><Tasks /></ProtectedRoute>} />
            <Route path="calls"       element={<ProtectedRoute permission="call.view"><Calls /></ProtectedRoute>} />
            <Route path="meetings"    element={<ProtectedRoute permission="meeting.view"><Meetings /></ProtectedRoute>} />
            <Route path="emails"      element={<ProtectedRoute><Emails /></ProtectedRoute>} />

            {/* ── Inventory / Finance Module ── */}
            <Route path="quotes"      element={<ProtectedRoute permission="quote.view"><Quotes /></ProtectedRoute>} />
            <Route path="invoices"    element={<ProtectedRoute permission="invoice.view"><Invoices /></ProtectedRoute>} />
            <Route path="products"    element={<ProtectedRoute><Products /></ProtectedRoute>} />

            {/* ── Other authenticated modules ── */}
            <Route path="accounts"    element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="marketing"   element={<ProtectedRoute><Marketing /></ProtectedRoute>} />
            <Route path="analytics"   element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="workqueue"   element={<ProtectedRoute><Workqueue /></ProtectedRoute>} />
            <Route path="support"     element={<ProtectedRoute><Support /></ProtectedRoute>} />
            <Route path="workflows"   element={<ProtectedRoute><Workflows /></ProtectedRoute>} />
            <Route path="users"       element={<ProtectedRoute permission="users.manage"><Users /></ProtectedRoute>} />

            {/* ── Profile ── */}
            <Route path="profile"     element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="account"     element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

            {/* ── Settings (nested) ── */}
            <Route path="settings" element={<Settings />}>
              <Route index element={<SettingsIndex />} />
              <Route path="profile"       element={<ProtectedRoute permission="profile.manage"><ProfileSettings /></ProtectedRoute>} />
              <Route path="password"      element={<ProtectedRoute permission="profile.manage"><PasswordSettings /></ProtectedRoute>} />
              <Route path="sessions"      element={<ProtectedRoute permission="profile.manage"><SessionHistory /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute permission="profile.manage"><NotificationSettings /></ProtectedRoute>} />
              <Route path="preferences"   element={<ProtectedRoute permission="profile.manage"><SystemPreferences /></ProtectedRoute>} />
              <Route path="users"         element={<ProtectedRoute permission="users.manage"><UserManagement /></ProtectedRoute>} />
              <Route path="roles"         element={<ProtectedRoute permission="roles.manage"><RolesPermissions /></ProtectedRoute>} />
              <Route path="security"      element={<ProtectedRoute permission="security.manage"><SecuritySettings /></ProtectedRoute>} />
              <Route path="sales"         element={<ProtectedRoute permission="sales.settings.manage"><SalesPreferences /></ProtectedRoute>} />
              <Route path="support"       element={<ProtectedRoute permission="support.settings.manage"><SupportPreferences /></ProtectedRoute>} />
              <Route path="finance"       element={<ProtectedRoute permission="finance.settings.manage"><FinancePreferences /></ProtectedRoute>} />
              <Route path="company"       element={<ProtectedRoute permission="system.manage"><CompanySettings /></ProtectedRoute>} />
              <Route path="audit-logs"    element={<ProtectedRoute permission="auditlogs.view"><AuditLogs /></ProtectedRoute>} />
              <Route path="workflows"          element={<ProtectedRoute permission="workflow.manage"><WorkflowList /></ProtectedRoute>} />
              <Route path="workflows/create"   element={<ProtectedRoute permission="workflow.manage"><WorkflowBuilder /></ProtectedRoute>} />
              <Route path="workflows/:id"      element={<ProtectedRoute permission="workflow.manage"><WorkflowBuilder /></ProtectedRoute>} />
              <Route path="workflows/:id/logs" element={<ProtectedRoute permission="workflow.manage"><WorkflowLogs /></ProtectedRoute>} />
              <Route path="realtime"      element={<ProtectedRoute permission="security.manage"><RealtimeDashboard /></ProtectedRoute>} />
            </Route>

            {/* ── Phase 2 / 3 Modules ── */}
            <Route path="cases"       element={<ProtectedRoute><Cases /></ProtectedRoute>} />
            <Route path="solutions"   element={<ProtectedRoute><Solutions /></ProtectedRoute>} />
            <Route path="apps"        element={<ProtectedRoute><Apps /></ProtectedRoute>} />
            <Route path="api-console" element={<ProtectedRoute><ApiConsole /></ProtectedRoute>} />
            <Route path="services"    element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="projects"    element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
            <Route path="feedback"    element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
            <Route path="activity-hub"  element={<ProtectedRoute><ActivityHub /></ProtectedRoute>} />

            {/* ── Misc ── */}
            <Route path="unauthorized" element={<Unauthorized />} />
          </Route>

          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
