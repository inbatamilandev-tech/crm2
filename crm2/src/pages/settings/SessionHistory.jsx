import React, { useState, useEffect } from 'react';
import { securityApi } from '../../services/api';
import { Monitor, Smartphone, Tablet, Globe, Clock, XCircle, LogOut, Shield } from 'lucide-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function SessionHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await securityApi.getSessions();
      setSessions(data.results || data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Terminate Session",
      description: "Are you sure you want to terminate this session?",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await securityApi.logoutSession(id);
          setSessions(prev => prev.map(s => s.id === id ? { ...s, is_active: false } : s));
        } catch (error) {
          console.error("Failed to logout session", error);
        }
      }
    });
  };

  const handleLogoutAll = async () => {
    setDialogConfig({
      isOpen: true,
      title: "Logout All Devices",
      description: "This will log you out of all other devices. Continue?",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await securityApi.logoutAllSessions();
          fetchSessions();
        } catch (error) {
          console.error("Failed to logout all sessions", error);
        }
      }
    });
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <Smartphone className="w-5 h-5 text-[#50B1B9]" />;
      case 'tablet': return <Tablet className="w-5 h-5 text-[#DF7F09]" />;
      default: return <Monitor className="w-5 h-5 text-[#095D95]" />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9] mb-2">Active Sessions</h2>
          <p className="text-sm text-slate-500 font-medium">Manage your active sessions and connected devices across all platforms.</p>
        </div>
        <button 
          onClick={handleLogoutAll}
          className="px-6 py-3 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors flex items-center"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Logout Other Devices
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="bg-white dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#50B1B9] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Retrieving sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
            <Globe className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No active sessions found.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {sessions.map((session) => (
                <div key={session.id} className="p-6 md:p-8 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                  <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-white/5">
                      {getDeviceIcon(session.device)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                          {session.browser || 'Unknown Browser'} on {session.os || 'Unknown OS'}
                        </p>
                        {session.is_active && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded">
                            Active Now
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-y-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        <span className="flex items-center">
                          <Globe className="w-3 h-3 mr-1" /> {session.ip_address}
                        </span>
                        <span className="mx-3 text-slate-200 dark:text-slate-700">•</span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" /> Last active: {new Date(session.last_seen).toLocaleString()}
                        </span>
                        {session.location && (
                          <>
                            <span className="mx-3 text-slate-200 dark:text-slate-700">•</span>
                            <span>{session.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {session.is_active ? (
                    <button 
                      onClick={() => handleLogout(session.id)}
                      className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                      title="Terminate Session"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  ) : (
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">Logged Out</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MFA Teaser */}
        <div className="bg-gradient-to-r from-[#095D95] to-[#50B1B9] p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-[#095D95]/30">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Two-Factor Authentication (MFA)</h3>
                <p className="text-xs text-white/80 font-medium max-w-lg mt-1">Add an extra layer of security. We are preparing support for Authenticator Apps and SMS verification codes. Check back soon for availability.</p>
              </div>
            </div>
            <div className="px-6 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
          {/* Abstract blobs */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#DF7F09]/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Confirm"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
