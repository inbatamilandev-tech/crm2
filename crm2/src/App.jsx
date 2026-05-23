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
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="deals" element={<Deals />} />
            <Route path="emails" element={<Emails />} />
            <Route path="quotes" element={<Quotes />} />
            <Route path="support" element={<Support />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="workqueue" element={<Workqueue />} />
            
            {/* Phase 1 Modules */}
            <Route path="accounts" element={<Accounts />} />
            <Route path="profile" element={<Profile />} />
            <Route path="account" element={<AccountSettings />} />
            
            <Route path="settings" element={<Settings />}>
              <Route index element={<SettingsIndex />} />
              <Route path="profile" element={<ProtectedRoute permission="profile.manage"><ProfileSettings /></ProtectedRoute>} />
              <Route path="password" element={<ProtectedRoute permission="profile.manage"><PasswordSettings /></ProtectedRoute>} />
              <Route path="sessions" element={<ProtectedRoute permission="profile.manage"><SessionHistory /></ProtectedRoute>} />
              <Route path="notifications" element={<ProtectedRoute permission="profile.manage"><NotificationSettings /></ProtectedRoute>} />
              <Route path="preferences" element={<ProtectedRoute permission="profile.manage"><SystemPreferences /></ProtectedRoute>} />
              <Route path="users" element={<ProtectedRoute permission="users.manage"><UserManagement /></ProtectedRoute>} />
              <Route path="roles" element={<ProtectedRoute permission="roles.manage"><RolesPermissions /></ProtectedRoute>} />
              <Route path="security" element={<ProtectedRoute permission="security.manage"><SecuritySettings /></ProtectedRoute>} />
              <Route path="sales" element={<ProtectedRoute permission="sales.settings.manage"><SalesPreferences /></ProtectedRoute>} />
              <Route path="support" element={<ProtectedRoute permission="support.settings.manage"><SupportPreferences /></ProtectedRoute>} />
              <Route path="finance" element={<ProtectedRoute permission="finance.settings.manage"><FinancePreferences /></ProtectedRoute>} />
              <Route path="company" element={<ProtectedRoute permission="system.manage"><CompanySettings /></ProtectedRoute>} />
              <Route path="audit-logs" element={<ProtectedRoute permission="auditlogs.view"><AuditLogs /></ProtectedRoute>} />
              
              <Route path="workflows" element={<ProtectedRoute permission="workflow.manage"><WorkflowList /></ProtectedRoute>} />
              <Route path="workflows/create" element={<ProtectedRoute permission="workflow.manage"><WorkflowBuilder /></ProtectedRoute>} />
              <Route path="workflows/:id" element={<ProtectedRoute permission="workflow.manage"><WorkflowBuilder /></ProtectedRoute>} />
              <Route path="workflows/:id/logs" element={<ProtectedRoute permission="workflow.manage"><WorkflowLogs /></ProtectedRoute>} />
              <Route path="realtime" element={<ProtectedRoute permission="security.manage"><RealtimeDashboard /></ProtectedRoute>} />
            </Route>

            <Route path="unauthorized" element={<Unauthorized />} />
            <Route path="users" element={<Users />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="calls" element={<Calls />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="workflows" element={<Workflows />} />

            {/* Phase 2 Modules */}
            <Route path="products" element={<Products />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="cases" element={<Cases />} />

            {/* Phase 3 Modules */}
            <Route path="solutions" element={<Solutions />} />
            <Route path="apps" element={<Apps />} />
            <Route path="api-console" element={<ApiConsole />} />
            <Route path="services" element={<Services />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="feedback" element={<Feedback />} />
            <Route path="notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
            <Route path="activity-hub" element={<ProtectedRoute><ActivityHub /></ProtectedRoute>} />
          </Route>
          <Route path="/login" element={<Login />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
