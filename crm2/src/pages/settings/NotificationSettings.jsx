import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function NotificationSettings() {
  const { user, setUser } = useAuth();
  const [notifications, setNotifications] = useState(user?.notifications || {});

  useEffect(() => {
    if (user?.notifications) {
      setNotifications(user.notifications);
    }
  }, [user]);

  const handleToggle = async (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      const updatedUser = await authService.updateProfile({ notifications: updated });
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to update notifications", error);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Notification Settings</h2>
      </div>
      
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-white/5">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">Email Notifications</h3>
              <p className="text-xs text-slate-500 mt-1">Receive updates, alerts, and weekly summaries directly to your inbox.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.email || false} onChange={() => handleToggle('email')} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
            </label>
          </div>

          <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-white/5">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">SMS Notifications</h3>
              <p className="text-xs text-slate-500 mt-1">Receive urgent priority alerts and security codes via SMS to your mobile phone.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.sms || false} onChange={() => handleToggle('sms')} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
            </label>
          </div>

          <div className="flex justify-between items-center pb-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">In-App Alerts</h3>
              <p className="text-xs text-slate-500 mt-1">Show real-time toast notifications, activity badges, and bell alerts while you work.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={notifications.in_app || false} onChange={() => handleToggle('in_app')} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
