import React, { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { settingsConfig } from '../config/settingsConfig';
import { usePermission } from '../hooks/usePermission';
import { Search, ChevronRight } from 'lucide-react';
import { INPUT_STYLE } from '../utils/themeUtils';

export default function Settings() {
  const { hasPermission } = usePermission();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter settings based on permissions and search query
  const filteredConfig = useMemo(() => {
    return settingsConfig.map(group => {
      const filteredItems = group.items.filter(item => {
        // Check permission
        if (!hasPermission(item.permission)) return false;
        
        // Check search query
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          item.label.toLowerCase().includes(query) ||
          group.group.toLowerCase().includes(query) ||
          item.keywords.some(keyword => keyword.toLowerCase().includes(query))
        );
      });
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0); // Hide empty groups
  }, [hasPermission, searchQuery]);

  // Dynamic breadcrumbs
  const currentItem = useMemo(() => {
    for (const group of settingsConfig) {
      for (const item of group.items) {
        if (location.pathname.includes(item.route)) {
          return { group: group.group, label: item.label };
        }
      }
    }
    return null;
  }, [location.pathname]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col md:flex-row gap-8 pb-8">
      {/* Sidebar */}
      <div className="w-full md:w-72 flex-shrink-0">
        <div className="sticky top-8 bg-white dark:bg-slate-800/50 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-120px)]">
          <div className="mb-6">
            <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9]">Settings</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search settings..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${INPUT_STYLE} pl-10 text-xs py-2`}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
            {filteredConfig.length === 0 ? (
              <div className="text-center py-8 text-xs font-bold text-slate-500 uppercase tracking-widest">
                No settings found.
              </div>
            ) : (
              filteredConfig.map(group => (
                <div key={group.group} className="mb-6">
                  <div className="flex items-center space-x-2 mb-3 px-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.group === 'Administration' ? 'bg-[#DF7F09]/10 text-[#DF7F09]' : 'bg-[#50B1B9]/10 text-[#50B1B9]'}`}>
                      {group.icon ? <group.icon className="w-4 h-4" /> : <SettingsIcon className="w-4 h-4" />}
                    </div>
                    <h3 className={`text-[10px] font-black uppercase tracking-widest ${group.group === 'Administration' ? 'text-[#DF7F09]' : 'text-slate-400'}`}>
                      {group.group}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const isActive = location.pathname === item.route;
                      return (
                        <button
                          key={item.route}
                          onClick={() => navigate(item.route)}
                          className={`w-full flex items-center px-4 py-3 text-xs font-bold rounded-xl transition-all duration-200 group/btn ${
                            isActive 
                              ? 'bg-[#095D95] text-white shadow-lg shadow-[#095D95]/20' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <item.icon className={`w-4 h-4 mr-3 transition-colors ${
                            isActive 
                              ? 'text-white' 
                              : group.group === 'Administration' 
                                ? 'text-[#DF7F09] group-hover/btn:text-[#DF7F09]' 
                                : 'text-[#50B1B9] group-hover/btn:text-[#095D95]'
                          }`} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
          <span className="text-slate-400">Settings</span>
          {currentItem && (
            <>
              <ChevronRight className="w-3 h-3 mx-2 text-[#50B1B9]" />
              <span className="text-slate-400">{currentItem.group}</span>
              <ChevronRight className="w-3 h-3 mx-2 text-[#DF7F09]" />
              <span className="text-[#095D95] dark:text-[#50B1B9]">{currentItem.label}</span>
            </>
          )}
        </div>
        
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-3xl border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm min-h-[500px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
