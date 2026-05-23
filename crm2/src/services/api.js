import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});



// Interceptor for request: inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for response: handle errors & auto-refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent infinite loops if refreshing token fails
    if (originalRequest.url.includes('/auth/token/refresh/')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = res.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // Update header and retry original request
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh token is expired or invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login/', credentials);
    if (response.data.access) {
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      if (response.data.session_id) {
        localStorage.setItem('session_id', response.data.session_id);
      }
    }
    return response.data;
  },
  register: async (userData) => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  },
  getCurrentUser: async () => {
    const response = await api.get('/profile/');
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.patch('/profile/', data);
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password/', data);
    return response.data;
  },
  getLoginHistory: async () => {
    const response = await api.get('/settings/login-history/');
    return response.data;
  },
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.patch('/auth/me/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  getSessions: async () => {
    const response = await api.get('/security/sessions/');
    return response.data;
  },
  logoutSession: async (id) => {
    const response = await api.post(`/security/sessions/${id}/logout/`);
    return response.data;
  },
  logoutAllSessions: async () => {
    const response = await api.post('/security/sessions/logout-all/');
    return response.data;
  },
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/security/audit-logs/', { params });
    return response.data;
  },
  getSecurityPolicy: async () => {
    const response = await api.get('/security/policy/');
    return response.data;
  },
  updateSecurityPolicy: async (data) => {
    const response = await api.put('/security/policy/', data);
    return response.data;
  }
};

export const securityApi = {
  getPolicy: async () => {
    const response = await api.get('/security/policy/');
    return response.data;
  },
  updatePolicy: async (data) => {
    const response = await api.put('/security/policy/', data);
    return response.data;
  },
  getSessions: async () => {
    const response = await api.get('/security/sessions/');
    return response.data;
  },
  logoutSession: async (id) => {
    const response = await api.post(`/security/sessions/${id}/logout/`);
    return response.data;
  },
  logoutAllSessions: async () => {
    const response = await api.post('/security/sessions/logout-all/');
    return response.data;
  }
};

export const auditLogsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/security/audit-logs/', { params });
    return response.data;
  }
};

export const notificationsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/notifications/', { params });
    return response.data;
  },
  markAsRead: async (id) => {
    const response = await api.post(`/notifications/${id}/read/`);
    return response.data;
  },
  markAllRead: async () => {
    const response = await api.post('/notifications/mark-all-read/');
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count/');
    return response.data;
  }
};

export const commentsApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/comments/', { params });
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/comments/', data);
    return response.data;
  },
  getByRecord: async (contentType, objectId) => {
    const response = await api.get('/comments/', { params: { content_type: contentType, object_id: objectId } });
    return response.data;
  }
};

export const activityFeedApi = {
  getFeed: async () => {
    const response = await api.get('/activity-feed/');
    return response.data;
  }
};

export const companyProfileApi = {
  get: async () => {
    const response = await api.get('/auth/company-profile/');
    return response.data;
  },
  update: async (data) => {
    const response = await api.put('/auth/company-profile/', data);
    return response.data;
  },
};

// Generic CRUD Generator — baseURL is http://127.0.0.1:8000/api
export const createResource = (endpoint) => ({
  getAll: async (params = {}, config = {}) => {
    const response = await api.get(`/${endpoint}/`, { params, ...config });
    return response.data;
  },
  getById: async (id, config = {}) => {
    const response = await api.get(`/${endpoint}/${id}/`, config);
    return response.data;
  },
  create: async (data, config = {}) => {
    const response = await api.post(`/${endpoint}/`, data, config);
    return response.data;
  },
  update: async (id, data, config = {}) => {
    const response = await api.put(`/${endpoint}/${id}/`, data, config);
    return response.data;
  },
  patch: async (id, data, config = {}) => {
    const response = await api.patch(`/${endpoint}/${id}/`, data, config);
    return response.data;
  },
  delete: async (id, config = {}) => {
    const response = await api.delete(`/${endpoint}/${id}/`, config);
    return response.data;
  }
});

// Resources
export const leadsApi = {
  ...createResource('leads'),
  convert: async (id, data) => {
    const response = await api.post(`/leads/${id}/convert/`, data);
    return response.data;
  },
  getConversionRate: async () => {
    const response = await api.get('/leads/conversion-rate/');
    return response.data;
  },
};
export const dealsApi = {
  ...createResource('deals'),
  search: async (query) => {
    const response = await api.get('/deals/', { params: { search: query } });
    return response.data;
  },
};
export const tasksApi = {
  ...createResource('tasks'),
  startCall: async (id) => {
    const response = await api.post(`/tasks/${id}/start_call/`);
    return response.data;
  },
  completeTask: async (id, data) => {
    const response = await api.post(`/tasks/${id}/complete_task/`, data);
    return response.data;
  },
  callDashboard: async () => {
    const response = await api.get('/tasks/call_dashboard/');
    return response.data;
  },
  metrics: async () => {
    const response = await api.get('/tasks/metrics/');
    return response.data;
  },
  activityLog: async (id) => {
    const response = await api.get(`/tasks/${id}/activity_log/`);
    return response.data;
  },
};
export const activityLogsApi = createResource('activity-logs');
export const accountsApi = createResource('accounts');
export const contactsApi = createResource('contacts');
export const activitiesApi = createResource('activities');
export const projectsApi = createResource('projects');
export const milestonesApi = createResource('milestones');
export const workflowsApi = {
  ...createResource('workflows'),
  toggle: async (id) => {
    const response = await api.post(`/workflows/${id}/toggle/`);
    return response.data;
  },
  publish: async (id) => {
    const response = await api.post(`/workflows/${id}/publish/`);
    return response.data;
  },
  createDraft: async (id) => {
    const response = await api.post(`/workflows/${id}/create_draft/`);
    return response.data;
  },
  testTrigger: async (id, object_id) => {
    const response = await api.post(`/workflows/${id}/test_trigger/`, { object_id });
    return response.data;
  },
  getLogs: async (id, params = {}) => {
    const response = await api.get(`/workflows/${id}/logs/`, { params });
    return response.data;
  }
};
export const workflowLogsApi = {
  ...createResource('workflow-logs'),
  retry: async (id) => {
    const response = await api.post(`/workflow-logs/${id}/retry/`);
    return response.data;
  }
};
export const workflowTracesApi = createResource('workflow-traces');
export const quotesApi = {
  ...createResource('quotes'),
  generateInvoice: async (id) => {
    const response = await api.post(`/quotes/${id}/generate_invoice/`);
    return response.data;
  },
  approve: async (id) => {
    const response = await api.post(`/quotes/${id}/approve/`);
    return response.data;
  },
};
export const invoicesApi = {
  ...createResource('invoices'),
  sendInvoice: async (id) => {
    const response = await api.post(`/invoices/${id}/send_invoice/`);
    return response.data;
  },
  markPaid: async (id) => {
    const response = await api.post(`/invoices/${id}/mark_paid/`);
    return response.data;
  },
};
export const casesApi = createResource('cases');
export const solutionsApi = createResource('solutions');
export const servicesApi = createResource('services');
export const feedbackApi = createResource('feedback');
export const supportStatsApi = {
  get: async () => {
    const response = await api.get('/support/stats/');
    return response.data;
  }
};
export const usersApi = createResource('users');
export const meetingsApi = createResource('meetings');
export const productsApi = createResource('products');
export const rolesApi = {
  ...createResource('roles'),
  getPermissions: async () => {
    const response = await api.get('/roles/permissions/');
    return response.data;
  }
};
export const callsApi = {
  ...createResource('calls'),
  startCall: async (data) => {
    const response = await api.post('/calls/start_call/', data);
    return response.data;
  },
  endCall: async (id) => {
    const response = await api.post(`/calls/${id}/end_call/`);
    return response.data;
  },
  setOutcome: async (id, outcome) => {
    const response = await api.post(`/calls/${id}/set_outcome/`, { outcome });
    return response.data;
  },
  metrics: async () => {
    const response = await api.get('/calls/metrics/');
    return response.data;
  },
};

export const campaignsApi = createResource('marketing/campaigns');

// Email API — wraps the real send endpoint + activity log
export const emailsApi = {
  /** GET logged email activities */
  getAll: async (params = {}) => {
    const response = await api.get('/activities/', { params: { type: 'email', ...params } });
    return response.data;
  },
  /** DELETE an email activity log */
  delete: async (id) => {
    const response = await api.delete(`/activities/${id}/`);
    return response.data;
  },
  /**
   * Send a real email AND log it as an Activity.
   * @param {{ to_email, subject, body, contact_id? }} payload
   */
  send: async (payload) => {
    const response = await api.post('/emails/send/', payload);
    return response.data;
  },
};

export const analyticsApi = {
  getDashboardStats: async (params = {}) => {
    const response = await api.get('/analytics/dashboard/', { params });
    return response.data;
  },
  getTeamPerformance: async (params = {}) => {
    const response = await api.get('/analytics/team/', { params });
    return response.data;
  }
};

export const marketingApi = {
  // Aggregate analytics
  getAnalytics: async () => {
    const response = await api.get('/marketing/analytics/');
    return response.data;
  },
  // Campaign summary for overview dashboard
  getCampaignSummary: async () => {
    const response = await api.get('/campaigns/summary/');
    return response.data;
  },
  // Per-campaign analytics
  getCampaignAnalytics: async (id) => {
    const response = await api.get(`/campaigns/${id}/analytics/`);
    return response.data;
  },
  // Public lead capture (web form, landing page)
  captureLead: async (data) => {
    const response = await api.post('/marketing/capture-lead/', data);
    return response.data;
  },
};

export default api;
