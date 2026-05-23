import React, { useState, useEffect } from 'react';
import { notificationsApi } from '../../services/api';
import { Bell, Check, Trash2, Shield, Info, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll();
      setNotifications(data.results || data);
      
      const countData = await notificationsApi.getUnreadCount();
      setUnreadCount(countData.count);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-[#DF7F09]" />;
      case 'error': return <Shield className="w-5 h-5 text-red-500" />;
      case 'workflow': return <Clock className="w-5 h-5 text-[#095D95]" />;
      default: return <Info className="w-5 h-5 text-[#50B1B9]" />;
    }
  };

  const getBgColor = (type) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10';
      case 'warning': return 'bg-[#DF7F09]/10';
      case 'error': return 'bg-red-500/10';
      case 'workflow': return 'bg-[#095D95]/10';
      default: return 'bg-[#50B1B9]/10';
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-[#095D95] rounded-2xl flex items-center justify-center shadow-xl shadow-[#095D95]/20">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9]">Notification Center</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">Stay updated with real-time alerts, workflow updates, and system activities.</p>
        </div>

        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#50B1B9] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Syncing alerts...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">You're all caught up!</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-xs">No new notifications at the moment. We'll alert you when something important happens.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-6 md:p-8 flex items-start justify-between hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all group ${!n.is_read ? 'bg-[#D2E7E7]/10 dark:bg-[#50B1B9]/5' : ''}`}
              >
                <div className="flex items-start space-x-6 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className={`text-sm font-black uppercase tracking-tight ${!n.is_read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                        {n.title}
                      </h3>
                      {!n.is_read && (
                        <span className="w-2 h-2 bg-[#095D95] rounded-full"></span>
                      )}
                    </div>
                    <p className={`text-sm mb-3 leading-relaxed ${!n.is_read ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-500'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                      <Clock className="w-3 h-3 mr-1.5" />
                      {new Date(n.created_at).toLocaleString()}
                      {n.link && (
                        <a 
                          href={n.link} 
                          className="ml-6 flex items-center text-[#095D95] dark:text-[#50B1B9] hover:underline"
                        >
                          View Details
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                
                {!n.is_read && (
                  <button 
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-3 text-slate-400 hover:text-[#095D95] hover:bg-[#095D95]/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="Mark as Read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-10 p-8 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/5 flex justify-between items-center">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Notification Settings</h4>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Customize how you receive alerts across devices.</p>
        </div>
        <button className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest rounded-xl hover:shadow-md transition-all">
          Manage Preferences
        </button>
      </div>
    </div>
  );
}
