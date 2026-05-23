import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { INPUT_STYLE } from '../../utils/themeUtils';
import { Save } from 'lucide-react';

export default function SystemPreferences() {
  const { user, setUser } = useAuth();
  const { setTheme: setGlobalTheme } = useTheme();
  
  const [prefs, setPrefs] = useState({
    language: user?.language || 'English',
    timezone: user?.timezone || 'UTC',
    theme: user?.theme || 'light',
  });

  useEffect(() => {
    if (user) {
      setPrefs({
        language: user.language || 'English',
        timezone: user.timezone || 'UTC',
        theme: user.theme || 'light',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setPrefs({ ...prefs, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const updatedUser = await authService.updateProfile(prefs);
      setUser(updatedUser);
      setGlobalTheme(prefs.theme);
      alert("Preferences saved!");
    } catch (error) {
      console.error("Failed to save preferences", error);
      alert("Failed to save preferences.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">System Preferences</h2>
        <button onClick={handleSave} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Interface Language</label>
              <select name="language" value={prefs.language} onChange={handleChange} className={INPUT_STYLE}>
                <option value="English" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">English</option>
                <option value="Spanish" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Español</option>
                <option value="French" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Français</option>
                <option value="German" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Deutsch</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Changes the main language used across the application.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Color Theme</label>
              <select name="theme" value={prefs.theme} onChange={handleChange} className={INPUT_STYLE}>
                <option value="light" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Light Mode</option>
                <option value="dark" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Dark Mode</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Select your preferred visual appearance.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timezone</label>
              <select name="timezone" value={prefs.timezone} onChange={handleChange} className={INPUT_STYLE}>
                <option value="UTC" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">UTC (Universal Time)</option>
                <option value="UTC-8" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Pacific Time (PT)</option>
                <option value="UTC-5" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Eastern Time (ET)</option>
                <option value="UTC+1" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Central European Time (CET)</option>
                <option value="UTC+5:30" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">India Standard Time (IST)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Adjusts the timestamps for all records and analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
