import React, { useState, useEffect } from 'react';
import { auditLogsApi } from '../../services/api';
import { Activity, Clock, Shield, User, Globe, Filter, Search, ChevronRight } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = filter === 'ALL' ? {} : { action_type: filter };
      const data = await auditLogsApi.getAll(params);
      setLogs(data.results || data || []);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    if (action.includes('LOGIN_SUCCESS')) return 'text-emerald-500 bg-emerald-500/10';
    if (action.includes('PASSWORD_CHANGED')) return 'text-[#DF7F09] bg-[#DF7F09]/10';
    if (action.includes('PROFILE_UPDATED')) return 'text-[#095D95] bg-[#095D95]/10';
    if (action.includes('FAILED')) return 'text-red-500 bg-red-500/10';
    return 'text-slate-500 bg-slate-500/10';
  };

  const getActionIcon = (action) => {
    if (action.includes('LOGIN')) return <Globe className="w-4 h-4" />;
    if (action.includes('PASSWORD')) return <Shield className="w-4 h-4" />;
    if (action.includes('PROFILE')) return <User className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9] mb-2">Activity Timeline</h2>
          <p className="text-sm text-slate-500 font-medium">A complete audit trail of security events and account modifications.</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-white/5 p-1 flex">
            {['ALL', 'LOGIN_SUCCESS', 'PASSWORD_CHANGED', 'PROFILE_UPDATED'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  filter === f 
                    ? 'bg-[#095D95] text-white shadow-lg shadow-[#095D95]/20' 
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-[#50B1B9] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading audit trail...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <Activity className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">No events recorded</h3>
            <p className="text-xs text-slate-500 mt-2">Activities will appear here as they happen.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Module</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location / Device</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getActionColor(log.action_type)}`}>
                          {getActionIcon(log.action_type)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{log.action_type.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">User ID: #{log.user}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        <Globe className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {log.ip_address}
                        <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                        {log.device || 'PC'}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center text-xs font-bold text-slate-600 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 mr-2 text-slate-400" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-center">
        <button className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm">
          Load More History
        </button>
      </div>
    </div>
  );
}
