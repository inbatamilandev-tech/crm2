import { 
  User, Lock, Building, Users, Shield, Bell, Settings as SettingsIcon,
  Activity, DollarSign, Headset, GitMerge, Zap
} from 'lucide-react';

export const settingsConfig = [
  {
    group: 'Personal',
    icon: User,
    items: [
      {
        label: 'Profile Settings',
        icon: User,
        route: '/settings/profile',
        permission: 'profile.manage',
        keywords: ['account', 'personal', 'avatar', 'name', 'bio']
      },
      {
        label: 'Change Password',
        icon: Lock,
        route: '/settings/password',
        permission: 'profile.manage',
        keywords: ['security', 'password', 'login', 'credentials']
      },
      {
        label: 'Session History',
        icon: Activity,
        route: '/settings/sessions',
        permission: 'profile.manage',
        keywords: ['devices', 'login', 'active', 'logout', 'security']
      },
      {
        label: 'Activity Timeline',
        icon: GitMerge,
        route: '/settings/audit-logs',
        permission: 'profile.manage',
        keywords: ['history', 'actions', 'tracking', 'events', 'personal']
      },
      {
        label: 'Notification Settings',
        icon: Bell,
        route: '/settings/notifications',
        permission: 'profile.manage',
        keywords: ['alerts', 'emails', 'sms', 'messages']
      },
      {
        label: 'System Preferences',
        icon: SettingsIcon,
        route: '/settings/preferences',
        permission: 'profile.manage',
        keywords: ['theme', 'dark mode', 'language', 'timezone']
      }
    ]
  },
  {
    group: 'Administration',
    icon: Shield,
    items: [
      {
        label: 'User Management',
        icon: Users,
        route: '/settings/users',
        permission: 'users.manage',
        keywords: ['team', 'employees', 'accounts', 'add user', 'admin', 'administration']
      },
      {
        label: 'Roles & Permissions',
        icon: Shield,
        route: '/settings/roles',
        permission: 'roles.manage',
        keywords: ['access', 'rbac', 'security', 'levels', 'admin', 'administration']
      },
      {
        label: 'Security Policies',
        icon: Lock,
        route: '/settings/security',
        permission: 'security.manage',
        keywords: ['2fa', 'authentication', 'passwords', 'policies', 'admin', 'administration']
      },
      {
        label: 'Workflow Automation',
        icon: GitMerge,
        route: '/settings/workflows',
        permission: 'workflow.manage',
        keywords: ['automation', 'triggers', 'actions', 'bot', 'rules', 'admin', 'administration']
      },
      {
        label: 'Realtime Observability',
        icon: Zap,
        route: '/settings/realtime',
        permission: 'security.manage',
        keywords: ['websocket', 'metrics', 'live', 'infrastructure', 'admin', 'administration', 'status']
      }
    ]
  },
  {
    group: 'Module Preferences',
    icon: SettingsIcon,
    items: [
      {
        label: 'Sales Preferences',
        icon: Activity,
        route: '/settings/sales',
        permission: 'sales.settings.manage',
        keywords: ['pipeline', 'deals', 'leads', 'stages']
      },
      {
        label: 'Support Preferences',
        icon: Headset,
        route: '/settings/support',
        permission: 'support.settings.manage',
        keywords: ['tickets', 'cases', 'sla', 'service']
      },
      {
        label: 'Finance Preferences',
        icon: DollarSign,
        route: '/settings/finance',
        permission: 'finance.settings.manage',
        keywords: ['invoices', 'quotes', 'taxes', 'currency']
      }
    ]
  },
  {
    group: 'System',
    icon: Building,
    items: [
      {
        label: 'Company Settings',
        icon: Building,
        route: '/settings/company',
        permission: 'system.manage',
        keywords: ['business', 'address', 'gst', 'tax id', 'website']
      },
      {
        label: 'Audit Logs',
        icon: Activity,
        route: '/settings/audit-logs',
        permission: 'auditlogs.view',
        keywords: ['history', 'actions', 'tracking', 'events', 'admin', 'administration']
      }
    ]
  }
];
