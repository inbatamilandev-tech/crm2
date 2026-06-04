import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Settings, HelpCircle, Plus, 
  User, CheckSquare, LogOut, ChevronDown, 
  Zap, Command, ShieldCheck, Globe, Activity, Cloud,
  X, LayoutDashboard, Users, Briefcase, FileText, BarChart2,
  UserPlus, CheckCircle, AlertTriangle, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  notificationsApi, 
  leadsApi, 
  dealsApi, 
  contactsApi, 
  accountsApi, 
  tasksApi, 
  callsApi, 
  meetingsApi, 
  invoicesApi 
} from '../services/api';

const QUICK_ACTIONS = [
  { label: 'New Lead', icon: <UserPlus className="w-4 h-4" />, path: '/leads/new' },
  { label: 'New Task', icon: <CheckSquare className="w-4 h-4" />, path: '/tasks/new' },
  { label: 'New Deal', icon: <Briefcase className="w-4 h-4" />, path: '/deals/new' },
  { label: 'Activity Hub', icon: <Activity className="w-4 h-4" />, path: '/activity-hub' },
];

const QUICK_LINKS = {
  'dashboard': '/',
  'workqueue': '/workqueue',
  'leads': '/leads',
  'contacts': '/contacts',
  'accounts': '/accounts',
  'deals': '/deals',
  'tasks': '/tasks',
  'calls': '/calls',
  'emails': '/emails',
  'meetings': '/meetings',
  'overview': '/marketing',
  'campaigns': '/marketing#campaigns',
  'lead capture': '/marketing#capture',
  'ads analytics': '/analytics',
  'analytics': '/analytics',
  'products': '/products',
  'product': '/products',
  'inventory': '/products',
  'inventroy': '/products',
  'quotes': '/quotes',
  'qoutes': '/quotes',
  'invoices': '/invoices',
  'support': '/support',
  'cases': '/cases',
  'solutions': '/solutions',
  'services': '/services',
  'feedback': '/feedback',
  'projects': '/projects',
  'project': '/projects',
  'settings': '/settings',
  'setting': '/settings',
};

export default function Header() {
  const { user, logout } = useAuth();
  const { lastMessage, status, latency } = useWebSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    if (e.key === 'Enter') {
      const query = searchQuery.trim().toLowerCase();
      if (!query) {
        setSearchResults(null);
        return;
      }
      
      // Quick Navigation Redirect
      if (QUICK_LINKS[query]) {
        navigate(QUICK_LINKS[query]);
        setSearchResults(null);
        setSearchQuery('');
        return;
      }
      
      setIsSearching(true);
      setSearchResults(null);
      try {
        const [
          leadsRes, dealsRes, contactsRes, accountsRes,
          tasksRes, callsRes, meetingsRes, invoicesRes
        ] = await Promise.all([
          leadsApi.getAll({ search: searchQuery }).catch(() => []),
          dealsApi.getAll({ search: searchQuery }).catch(() => []),
          contactsApi.getAll({ search: searchQuery }).catch(() => []),
          accountsApi.getAll({ search: searchQuery }).catch(() => []),
          tasksApi.getAll({ search: searchQuery }).catch(() => []),
          callsApi.getAll({ search: searchQuery }).catch(() => []),
          meetingsApi.getAll({ search: searchQuery }).catch(() => []),
          invoicesApi.getAll({ search: searchQuery }).catch(() => [])
        ]);
        
        const extract = (res) => (res?.results || res || []).slice(0, 3);
        
        setSearchResults({
          leads: extract(leadsRes),
          deals: extract(dealsRes),
          contacts: extract(contactsRes),
          accounts: extract(accountsRes),
          tasks: extract(tasksRes),
          calls: extract(callsRes),
          meetings: extract(meetingsRes),
          invoices: extract(invoicesRes)
        });
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        notificationsApi.getAll(),
        notificationsApi.getUnreadCount()
      ]);
      setNotifications((notifs.results || notifs).slice(0, 5));
      setUnreadCount(count.count);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  }, []);

  // Handle incoming realtime notifications
  useEffect(() => {
    if (lastMessage && lastMessage.event === 'notification.created') {
      const newNotif = lastMessage.payload;
      setNotifications(prev => [newNotif, ...prev].slice(0, 5));
      setUnreadCount(prev => prev + 1);
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchNotifications();
    
    const handleNotificationAdded = () => {
      fetchNotifications();
    };
    
    window.addEventListener('notification-added', handleNotificationAdded);
    
    return () => {
      window.removeEventListener('notification-added', handleNotificationAdded);
    };
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark read", error);
    }
  };

  const handleFlushAll = async () => {
    try {
      await notificationsApi.markAllRead();
      fetchNotifications();
    } catch (error) {
      console.error("Failed to flush", error);
    }
  };

  return (
    <header className="bg-[#F8FAFC]/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-[#0F172A]/10 dark:border-white/10 h-20 flex items-center justify-between px-8 z-30 sticky top-0 shadow-sm">
      {/* Universal Search Command */}
      <div className="flex-1 flex">
        <div className="relative w-full max-w-xl group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Search className="h-4 w-4 text-[#0F172A]/50 group-focus-within:text-[#0F172A] transition-colors" />
          </div>
          <input
            ref={searchRef}
            className="block w-full pl-12 pr-14 py-3 border border-[#0F172A]/10 dark:border-white/10 rounded-2xl leading-5 bg-[#0F172A]/5 dark:bg-white/5 text-[#0F172A] dark:text-slate-100 placeholder:text-[#0F172A]/50 dark:placeholder:text-white/40 focus:outline-none focus:bg-[#F8FAFC] dark:focus:bg-slate-800 focus:border-[#0F172A] dark:focus:border-white/30 focus:ring-4 focus:ring-[#0F172A]/5 dark:focus:ring-white/5 sm:text-sm transition-all relative z-10"
            placeholder="Search leads, deals, contacts… (Ctrl+K)"
            type="search"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
            onKeyDown={handleSearch}
          />
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center z-10">
             <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[9px] font-black text-[#0F172A]/50 dark:text-slate-300 border border-slate-200 dark:border-white/10 uppercase tracking-widest">
                <Command className="w-3 h-3" />
                <span>K</span>
             </div>
          </div>

          {(isSearching || searchResults) && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => { setSearchResults(null); setIsSearching(false); }} />
              <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-slate-800 border border-[#0F172A]/10 dark:border-white/10 shadow-2xl rounded-2xl z-50 max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
                {isSearching ? (
                  <div className="text-center py-6 text-sm text-[#0F172A]/50 dark:text-slate-400 font-bold flex items-center justify-center">
                    <Search className="w-4 h-4 animate-spin mr-2" /> Searching...
                  </div>
                ) : (
                  <>
                    {searchResults?.leads?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Leads</h4>
                        {searchResults.leads.map(lead => (
                          <div key={`lead-${lead.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/leads?id=${lead.id}`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed Lead'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{lead.email || lead.phone || 'No contact info'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.contacts?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Contacts</h4>
                        {searchResults.contacts.map(contact => (
                          <div key={`contact-${contact.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/contacts`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{contact.email || contact.phone || 'No contact info'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.accounts?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Accounts</h4>
                        {searchResults.accounts.map(account => (
                          <div key={`account-${account.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/accounts`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{account.name || account.account_name || account.company_name || 'Unnamed Account'}</p>
                            <p className="text-[11px] text-slate-400 truncate">{account.industry || 'No industry specified'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.deals?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Deals</h4>
                        {searchResults.deals.map(deal => (
                          <div key={`deal-${deal.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/deals`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{deal.title || deal.name || 'Unnamed Deal'}</p>
                            <p className="text-[11px] text-slate-400">Value: ₹{deal.value || 0} • Stage: {deal.stage || 'Unknown'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.tasks?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Tasks</h4>
                        {searchResults.tasks.map(task => (
                          <div key={`task-${task.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/tasks`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{task.title || task.name || 'Unnamed Task'}</p>
                            <p className="text-[11px] text-slate-400">Status: {task.status || 'Pending'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.calls?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Calls</h4>
                        {searchResults.calls.map(call => (
                          <div key={`call-${call.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/calls`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{call.subject || call.title || 'Log a call'}</p>
                            <p className="text-[11px] text-slate-400">Outcome: {call.outcome || 'Pending'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.meetings?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Meetings</h4>
                        {searchResults.meetings.map(meeting => (
                          <div key={`meeting-${meeting.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/meetings`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{meeting.title || meeting.subject || 'Meeting'}</p>
                            <p className="text-[11px] text-slate-400">Time: {meeting.date || meeting.start_time || 'Scheduled'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchResults?.invoices?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-[10px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest px-2 mb-1.5">Invoices</h4>
                        {searchResults.invoices.map(invoice => (
                          <div key={`invoice-${invoice.id}`} className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors" onClick={() => { navigate(`/invoices`); setSearchResults(null); }}>
                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{invoice.invoice_number || invoice.number || invoice.title || 'Invoice'}</p>
                            <p className="text-[11px] text-slate-400">Amount: ₹{invoice.amount || invoice.total || 0}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {(!searchResults?.leads?.length && !searchResults?.deals?.length && !searchResults?.contacts?.length && !searchResults?.accounts?.length && !searchResults?.tasks?.length && !searchResults?.calls?.length && !searchResults?.meetings?.length && !searchResults?.invoices?.length) && (
                      <div className="text-center py-6 text-[13px] text-slate-500 font-medium">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Operational Tools */}
      <div className="ml-8 flex items-center space-x-3">
        {/* 
        <div className="flex items-center space-x-1 px-2 py-1 bg-[#0F172A]/5 border border-[#0F172A]/10 rounded-2xl mr-4">
           <button onClick={() => navigate('/leads')} className="p-2.5 rounded-xl text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all">
            <Globe className="h-4 w-4" />
          </button>
           <div className="relative">
            <button onClick={() => setShowQuickActions(v => !v)} className="p-2.5 rounded-xl text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all">
              <Zap className="h-4 w-4" />
            </button>
            {showQuickActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
                <div className="absolute left-0 mt-3 w-52 bg-white border border-[#0F172A]/10 shadow-xl rounded-2xl z-50 overflow-hidden py-2">
                  <p className="text-[9px] font-black text-[#0F172A]/50 uppercase tracking-widest px-4 pb-2">Quick Actions</p>
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => { navigate(a.path); setShowQuickActions(false); }} className="w-full text-left px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                      <span className="text-blue-500">{a.icon}</span> {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={() => navigate('/settings')} className="p-2.5 rounded-xl text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-[#F8FAFC] transition-all">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        */}

        {/* Intelligence Alert System */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all relative ${
              showNotifications ? 'bg-[#0F172A]/10 text-[#0F172A] border border-[#0F172A]/20 shadow-inner' : 'bg-[#F8FAFC] border border-[#0F172A]/10 text-slate-500 hover:text-[#0F172A] hover:border-[#0F172A]/20 shadow-sm'
            }`}
          >
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
            <Bell className="h-5 w-5" />
          </button>
          
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-4 w-[360px] bg-white border border-[#0F172A]/10 shadow-2xl rounded-[32px] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-[10px] font-black text-[#0F172A] uppercase tracking-widest">Protocol Alerts</h3>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md">{unreadCount}</span>
                    )}
                  </div>
                  <button onClick={handleFlushAll} className="text-[9px] font-black text-[#0F172A]/50 uppercase tracking-widest hover:text-rose-500 transition-colors">Flush All</button>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckSquare className="w-5 h-5 text-slate-200" />
                      </div>
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Zero Threats Detected</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <NotificationItem 
                        key={n.id}
                        id={n.id}
                        type={n.type}
                        title={n.title} 
                        desc={n.message} 
                        time={new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                        urgent={!n.is_read && (n.type === 'error' || n.type === 'warning')}
                        onRead={() => handleMarkRead(n.id)}
                      />
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-slate-50 bg-slate-50/50">
                  <button 
                    onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                    className="w-full py-2.5 text-[10px] font-black text-[#095D95] uppercase tracking-widest hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100"
                  >
                    Enter Notification Center
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-10 w-px bg-slate-100 dark:bg-white/10 mx-2"></div>

        {/* Realtime Infrastructure Status */}
        <div className="flex items-center space-x-3 px-3 py-1.5 bg-white dark:bg-slate-800 border border-[#0F172A]/10 dark:border-white/10 rounded-2xl shadow-sm">
           <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                status === 'connected' ? 'bg-emerald-500 animate-pulse' : 
                status === 'reconnecting' ? 'bg-amber-500 animate-bounce' :
                status === 'degraded' ? 'bg-rose-500' : 'bg-slate-300'
              }`} />
              <span className="text-[9px] font-black uppercase tracking-widest text-[#0F172A]/50 dark:text-slate-400">
                {status === 'connected' ? 'Realtime Matrix' : status}
              </span>
           </div>
           {status === 'connected' && (
             <div className="flex items-center space-x-1.5 border-l border-slate-100 dark:border-white/10 pl-3">
                <Activity className="w-3 h-3 text-[#095D95]/40 dark:text-slate-500" />
                <span className="text-[9px] font-black text-[#0F172A]/40 dark:text-slate-400">{latency}ms</span>
             </div>
           )}
        </div>

        <div className="h-10 w-px bg-slate-100 mx-2"></div>

        {/* Operator Profile Nexus */}
        <div className="relative">
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center space-x-4 pl-3 pr-2 py-2 bg-[#0F172A]/5 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-600/20 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.first_name ? user.first_name[0].toUpperCase() : (user?.username ? user.username[0].toUpperCase() : 'U')
              )}
            </div>
            <div className="hidden lg:flex flex-col items-start pr-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-none">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Operator')}
              </span>
              <span className="text-[9px] text-[#0F172A]/50 dark:text-slate-400 font-black uppercase tracking-widest mt-1.5 flex items-center">
                 <ShieldCheck className="w-3 h-3 mr-1 text-emerald-500" />
                 Verified
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[#0F172A]/50 dark:text-slate-400 transition-transform duration-300 ${showProfile ? 'rotate-180' : ''}`} />
          </button>

          {showProfile && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />
              <div className="absolute right-0 mt-4 w-64 bg-[#F8FAFC] dark:bg-slate-800 border border-[#0F172A]/10 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[32px] z-50 overflow-hidden animate-fade-in p-2">
                <div className="px-5 py-4 border-b border-slate-50 dark:border-white/5 mb-1">
                  <p className="text-[9px] font-black text-[#0F172A]/50 dark:text-slate-400 uppercase tracking-widest">Operator Context</p>
                </div>
                <div className="space-y-1">
                  <button 
                    onClick={() => { navigate('/profile'); setShowProfile(false); }}
                    className="w-full text-left px-4 py-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-[#0F172A]/5 dark:hover:bg-white/5 rounded-2xl flex items-center transition-all group"
                  >
                    <User className="w-4 h-4 mr-3 text-[#0F172A]/50 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white" /> Identity Matrix
                  </button>
                  <button 
                    onClick={() => { navigate('/settings'); setShowProfile(false); }}
                    className="w-full text-left px-4 py-3 text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:bg-[#0F172A]/5 dark:hover:bg-white/5 rounded-2xl flex items-center transition-all group"
                  >
                    <Settings className="w-4 h-4 mr-3 text-[#0F172A]/50 dark:text-slate-400 group-hover:text-[#0F172A] dark:group-hover:text-white" /> Logic Control
                  </button>
                </div>
                <div className="h-px bg-[#0F172A]/5 dark:bg-white/10 my-2 mx-4" />
                <button 
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-[11px] font-black text-rose-600 uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl flex items-center transition-all group"
                >
                  <LogOut className="w-4 h-4 mr-3 text-rose-400" /> Flush Session
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NotificationItem({ id, type, title, desc, time, urgent, onRead }) {
  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <ShieldCheck className="w-4 h-4" />;
      case 'workflow': return <Activity className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getIconBg = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 text-emerald-600';
      case 'warning': return 'bg-amber-50 text-amber-600';
      case 'error': return 'bg-rose-50 text-rose-600';
      case 'workflow': return 'bg-indigo-50 text-indigo-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="p-5 hover:bg-slate-50 cursor-pointer flex items-start transition-all group relative">
      {urgent && (
        <div className="absolute top-5 right-5">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
        </div>
      )}
      <div className={`p-2.5 ${getIconBg(type)} rounded-xl mr-4 group-hover:scale-110 transition-transform`}>
        {getIcon(type)}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex justify-between items-start">
           <h4 className={`text-[10px] font-black uppercase tracking-widest ${urgent ? 'text-slate-900' : 'text-slate-500'}`}>{title}</h4>
           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{time}</span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-tight line-clamp-2 pr-4">{desc}</p>
        
        {!urgent && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRead(); }}
            className="text-[8px] font-black text-[#095D95] uppercase tracking-widest hover:underline mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Clear Alert
          </button>
        )}
      </div>
    </div>
  );
}
