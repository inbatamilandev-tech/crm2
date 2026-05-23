import React, { useState } from 'react';
import { authService } from '../../services/api';
import { INPUT_STYLE } from '../../utils/themeUtils';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

export default function PasswordSettings() {
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value });
  };

  const getStrength = (password) => {
    if (!password) return { label: 'None', color: 'bg-slate-200', width: '0%' };
    if (password.length < 6) return { label: 'Weak', color: 'bg-red-500', width: '33%' };
    if (password.length < 10) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getStrength(passwords.new_password);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      alert("Passwords do not match!");
      return;
    }
    if (passwords.new_password.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);
      await authService.changePassword({
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      alert("Password updated successfully!");
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      console.error("Failed to update password", error);
      alert(error.response?.data?.error || "Failed to update password. Please check your current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="mb-10">
        <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9] mb-2">Security & Password</h2>
        <p className="text-sm text-slate-500 font-medium">Protect your account by managing your password and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Password Change Card */}
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex items-center space-x-4 mb-10">
              <div className="w-12 h-12 bg-[#DF7F09]/10 rounded-2xl flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#DF7F09]" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">Change Password</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Last updated: Recently</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                <div className="relative">
                  <input 
                    type="password" 
                    name="current_password" 
                    value={passwords.current_password} 
                    onChange={handleChange} 
                    required
                    placeholder="••••••••••••" 
                    className={`${INPUT_STYLE} h-14 bg-slate-50/50 focus:bg-white dark:bg-white/5`} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password" 
                    name="new_password" 
                    value={passwords.new_password} 
                    onChange={handleChange} 
                    required
                    placeholder="••••••••••••" 
                    className={`${INPUT_STYLE} h-14 bg-slate-50/50 focus:bg-white dark:bg-white/5`} 
                  />
                  {/* Strength Indicator */}
                  <div className="mt-3 px-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Strength</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${strength.color} transition-all duration-500 ease-out`} 
                        style={{ width: strength.width }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                  <input 
                    type="password" 
                    name="confirm_password" 
                    value={passwords.confirm_password} 
                    onChange={handleChange} 
                    required
                    placeholder="••••••••••••" 
                    className={`${INPUT_STYLE} h-14 bg-slate-50/50 focus:bg-white dark:bg-white/5`} 
                  />
                  {passwords.confirm_password && passwords.new_password !== passwords.confirm_password && (
                    <p className="text-[10px] font-bold text-red-500 mt-2 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Passwords do not match
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto px-10 py-4 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[#074773] transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-[#095D95]/20 disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-[#D2E7E7] to-white dark:from-[#50B1B9]/10 dark:to-slate-800/50 p-8 rounded-3xl border border-[#50B1B9]/20 flex items-start space-x-6">
          <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-[#50B1B9]" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#095D95] dark:text-[#50B1B9] uppercase tracking-widest mb-1 text-left">Password Requirements</h4>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside font-bold uppercase tracking-tight text-left">
              <li>Minimum 8 characters long</li>
              <li>At least one uppercase letter</li>
              <li>At least one number or symbol</li>
              <li>Avoid using common words or names</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
