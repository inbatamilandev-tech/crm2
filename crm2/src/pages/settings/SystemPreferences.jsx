import React, { useState, useEffect } from 'react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { INPUT_STYLE } from '../../utils/themeUtils';
import { Save, Sun, Moon } from 'lucide-react';
import { useAssistant } from '../../components/assistant/AssistantProvider';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function SystemPreferences() {
  const { user, setUser } = useAuth();
  const { theme, setTheme: setGlobalTheme } = useTheme();
  const { isAssistantEnabled, toggleAssistant } = useAssistant();

  const [prefs, setPrefs] = useState({
    language: 'English',
    timezone: user?.timezone || 'UTC+5:30',
    theme: user?.theme || theme || 'light',
  });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    if (user) {
      setPrefs({
        language: 'English',
        timezone: user.timezone || 'UTC+5:30',
        theme: user.theme || theme || 'light',
      });
    }
  }, [user, theme]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrefs((prev) => ({ ...prev, [name]: value }));
    // Apply theme change immediately for instant preview
    if (name === 'theme') {
      setGlobalTheme(value);
    }
  };

  const handleSave = async () => {
    try {
      const updatedUser = await authService.updateProfile(prefs);
      setUser(updatedUser);
      setGlobalTheme(prefs.theme);
      setDialogConfig({
        isOpen: true,
        title: "Success",
        description: "Preferences saved!",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (error) {
      console.error('Failed to save preferences', error);
      // Still apply theme even if save fails
      setGlobalTheme(prefs.theme);
      setDialogConfig({
        isOpen: true,
        title: "Warning",
        description: "Theme applied locally. Note: server save failed.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">
          System Preferences
        </h2>
        <button
          onClick={handleSave}
          className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Interface Language — English only */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Interface Language
              </label>
              <div className={`${INPUT_STYLE} flex items-center gap-3 cursor-default`}>
                <span className="text-lg">🇬🇧</span>
                <span className="font-semibold text-slate-800 dark:text-white">English</span>
                <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                  Active
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                The application interface is displayed in English.
              </p>
            </div>

            {/* Color Theme — with live preview cards */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Color Theme
              </label>

              {/* Visual theme picker cards */}
              <div className="grid grid-cols-2 gap-3">
                {/* Light Mode card */}
                <button
                  type="button"
                  onClick={() => { setPrefs((p) => ({ ...p, theme: 'light' })); setGlobalTheme('light'); }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    prefs.theme === 'light'
                      ? 'border-[#095D95] bg-[#095D95]/5 shadow-md shadow-[#095D95]/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-slate-700/30'
                  }`}
                >
                  {/* Mini preview */}
                  <div className="w-full h-10 rounded-lg bg-[#F8FAFC] border border-slate-200 flex items-center px-2 gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#095D95]" />
                    <div className="flex-1 h-1.5 rounded bg-slate-200" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Light Mode</span>
                  </div>
                  {prefs.theme === 'light' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#095D95] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* Dark Mode card */}
                <button
                  type="button"
                  onClick={() => { setPrefs((p) => ({ ...p, theme: 'dark' })); setGlobalTheme('dark'); }}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    prefs.theme === 'dark'
                      ? 'border-[#50B1B9] bg-[#50B1B9]/10 shadow-md shadow-[#50B1B9]/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-slate-700/30'
                  }`}
                >
                  {/* Mini preview */}
                  <div className="w-full h-10 rounded-lg bg-slate-900 border border-slate-700 flex items-center px-2 gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#50B1B9]" />
                    <div className="flex-1 h-1.5 rounded bg-slate-700" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
                  </div>
                  {prefs.theme === 'dark' && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#50B1B9] flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 mt-1">
                Click a theme card to preview it instantly. Save to persist.
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Timezone
              </label>
              <select name="timezone" value={prefs.timezone} onChange={handleChange} className={INPUT_STYLE}>
                <option value="UTC"      className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">UTC (Universal Time)</option>
                <option value="UTC-8"    className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Pacific Time (PT)</option>
                <option value="UTC-5"    className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Eastern Time (ET)</option>
                <option value="UTC+1"    className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">Central European Time (CET)</option>
                <option value="UTC+5:30" className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white">India Standard Time (IST)</option>
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                Adjusts the timestamps for all records and analytics.
              </p>
            </div>

            {/* Assistant Settings */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Assistant Settings
              </label>
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Enable Assistant</h4>
                  <p className="text-[10px] text-slate-500 mt-1">Displays a floating Assistant ball across all CRM pages.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isAssistantEnabled}
                    onChange={(e) => toggleAssistant(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#095D95] dark:peer-checked:bg-[#50B1B9]"></div>
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>

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
