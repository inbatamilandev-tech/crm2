import React, { useState, useEffect } from 'react';
import { securityApi, auditLogsApi } from '../../services/api';
import { Shield, Lock, Key, Clock, ShieldAlert, CheckCircle2, AlertTriangle, Users, Monitor, MousePointer2 } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function SecuritySettings() {
  const [activeTab, setActiveTab] = useState('overview');
  const [policy, setPolicy] = useState({
    min_password_length: 8,
    require_special_chars: true,
    require_numbers: true,
    require_uppercase: true,
    password_expiry_days: 90,
    max_login_attempts: 5,
    session_timeout_minutes: 30,
    enforce_2fa_globally: false
  });
  const [metrics, setMetrics] = useState({
    activeSessions: 0,
    failedLogins: 0,
    riskAlerts: 0,
    mfaAdoption: '0%'
  });
  const [suspiciousLogs, setSuspiciousLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [policyData, logsData, sessionsData] = await Promise.all([
        securityApi.getPolicy(),
        auditLogsApi.getAll({ is_suspicious: true }),
        securityApi.getSessions()
      ]);
      
      setPolicy(policyData);
      setSuspiciousLogs((logsData.results || logsData).slice(0, 5));
      
      // Calculate basic metrics
      const activeSessions = (sessionsData.results || sessionsData).filter(s => s.is_active).length;
      const riskAlertsCount = logsData.count || (logsData.results || logsData).length;
      
      setMetrics({
        activeSessions,
        failedLogins: 12, // Mock for now
        riskAlerts: riskAlertsCount,
        mfaAdoption: '15%' // Mock for now
      });

    } catch (error) {
      console.error("Failed to fetch security data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async () => {
    try {
      setSaving(true);
      await securityApi.updatePolicy(policy);
      setDialogConfig({
        isOpen: true,
        title: "Success",
        description: "Security policy updated successfully!",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (error) {
      console.error("Failed to update security policy", error);
      setDialogConfig({
        isOpen: true,
        title: "Error",
        description: "Failed to update security policy.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (field) => {
    setPolicy({ ...policy, [field]: !policy[field] });
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-10 h-10 border-4 border-[#50B1B9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading enterprise security engine...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-[#095D95] rounded-xl flex items-center justify-center shadow-lg shadow-[#095D95]/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9]">Enterprise Security</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium ml-1">Manage organizational security posture, policies, and threat detection.</p>
        </div>

        <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-2xl flex">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'policies', label: 'Global Policies', icon: Lock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-[#095D95] dark:text-[#50B1B9] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Sessions', value: metrics.activeSessions, icon: Monitor, color: 'text-[#095D95] bg-[#095D95]/10' },
              { label: 'Risk Alerts', value: metrics.riskAlerts, icon: AlertTriangle, color: 'text-red-500 bg-red-500/10' },
              { label: 'MFA Adoption', value: metrics.mfaAdoption, icon: Key, color: 'text-[#50B1B9] bg-[#50B1B9]/10' },
              { label: 'Locked Accounts', value: '0', icon: Lock, color: 'text-slate-500 bg-slate-500/10' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Risk Alerts List */}
            <div className="md:col-span-2 bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden">
              <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Security Risk Alerts</h3>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] hover:underline">View All Alerts</button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {suspiciousLogs.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-500">No high-risk activity detected.</p>
                  </div>
                ) : (
                  suspiciousLogs.map((log) => (
                    <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center">
                          <ShieldAlert className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Suspicious Login Detected</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">IP: {log.ip_address} • User ID: #{log.user}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[8px] font-black uppercase tracking-widest rounded mb-1">High Risk</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Security Score Card */}
            <div className="bg-gradient-to-b from-[#095D95] to-[#074773] rounded-3xl p-8 text-white flex flex-col justify-between shadow-2xl shadow-[#095D95]/30">
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight mb-2">Security Posture Score</h3>
                <p className="text-xs text-white/60 font-medium">Your organization's current safety rating based on policy adoption and risk factors.</p>
              </div>
              
              <div className="my-10 flex flex-col items-center">
                <div className="w-32 h-32 rounded-full border-[10px] border-white/10 flex items-center justify-center relative">
                  <span className="text-4xl font-black">82</span>
                  <div className="absolute inset-0 rounded-full border-[10px] border-[#50B1B9] border-t-transparent animate-pulse"></div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest mt-6 text-[#50B1B9]">Score: Good</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest border-t border-white/10 pt-4">
                  <span>MFA Enforcement</span>
                  <span className="text-red-400">Low</span>
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest border-t border-white/10 pt-4">
                  <span>Password Complexity</span>
                  <span className="text-emerald-400">High</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="animate-in slide-in-from-right-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Password Policy */}
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="p-8 md:p-10">
                  <div className="flex items-center space-x-4 mb-10">
                    <div className="w-12 h-12 bg-[#DF7F09]/10 rounded-2xl flex items-center justify-center">
                      <Key className="w-6 h-6 text-[#DF7F09]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Password Requirements</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Enforce complexity and expiration</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Minimum Length</label>
                      <input 
                        type="number" 
                        value={policy.min_password_length} 
                        onChange={(e) => setPolicy({...policy, min_password_length: parseInt(e.target.value)})}
                        className={INPUT_STYLE} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Expiry (Days)</label>
                      <input 
                        type="number" 
                        value={policy.password_expiry_days} 
                        onChange={(e) => setPolicy({...policy, password_expiry_days: parseInt(e.target.value)})}
                        className={INPUT_STYLE} 
                      />
                    </div>
                  </div>

                  <div className="space-y-4 mb-10">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-[#50B1B9]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Require Special Characters</span>
                      </div>
                      <button onClick={() => toggle('require_special_chars')} className={`w-12 h-6 rounded-full transition-colors relative ${policy.require_special_chars ? 'bg-[#50B1B9]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${policy.require_special_chars ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="w-5 h-5 text-[#50B1B9]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Require Uppercase Letters</span>
                      </div>
                      <button onClick={() => toggle('require_uppercase')} className={`w-12 h-6 rounded-full transition-colors relative ${policy.require_uppercase ? 'bg-[#50B1B9]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${policy.require_uppercase ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center space-x-3">
                        <ShieldAlert className="w-5 h-5 text-[#50B1B9]" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Require Numbers</span>
                      </div>
                      <button onClick={() => toggle('require_numbers')} className={`w-12 h-6 rounded-full transition-colors relative ${policy.require_numbers ? 'bg-[#50B1B9]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${policy.require_numbers ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handleUpdatePolicy}
                    disabled={saving}
                    className="px-10 py-4 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#074773] transition-all transform hover:scale-[1.02] shadow-xl shadow-[#095D95]/20 disabled:opacity-50"
                  >
                    {saving ? 'Updating Policies...' : 'Save Global Policies'}
                  </button>
                </div>
              </div>
            </div>

            {/* Account & Session Controls */}
            <div className="space-y-8">
              <div className="bg-[#D2E7E7]/30 dark:bg-[#50B1B9]/5 p-8 rounded-3xl border border-[#50B1B9]/20">
                <h3 className="text-sm font-black text-[#095D95] dark:text-[#50B1B9] uppercase tracking-widest mb-6">Account Controls</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Login Attempts</label>
                    <input type="number" value={policy.max_login_attempts} onChange={(e) => setPolicy({...policy, max_login_attempts: parseInt(e.target.value)})} className={INPUT_STYLE} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Session Timeout (Mins)</label>
                    <input type="number" value={policy.session_timeout_minutes} onChange={(e) => setPolicy({...policy, session_timeout_minutes: parseInt(e.target.value)})} className={INPUT_STYLE} />
                  </div>
                  <div className="pt-4 border-t border-[#50B1B9]/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">Enforce 2FA Globally</p>
                      <button onClick={() => toggle('enforce_2fa_globally')} className={`w-12 h-6 rounded-full transition-colors relative ${policy.enforce_2fa_globally ? 'bg-[#50B1B9]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${policy.enforce_2fa_globally ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <MousePointer2 className="w-5 h-5 text-[#50B1B9]" />
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Audit Policy</h3>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">All administrative changes are tracked in the enterprise audit logs with impersonation history.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="OK"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
