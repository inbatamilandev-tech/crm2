import React, { useState } from 'react';
import { Save, Clock, Tag, MessageSquare, Trash2, Plus } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';

export default function SupportPreferences() {
  const [activeTab, setActiveTab] = useState('slas');
  const [categories, setCategories] = useState([
    { id: 1, name: 'Billing Issue' },
    { id: 2, name: 'Technical Support' },
    { id: 3, name: 'Feature Request' },
    { id: 4, name: 'General Inquiry' },
  ]);
  const [slas, setSlas] = useState({ firstResponse: 4, resolution: 24 });
  const [autoRespond, setAutoRespond] = useState(true);

  const addCategory = () => {
    const newId = Math.max(0, ...categories.map(c => c.id)) + 1;
    setCategories([...categories, { id: newId, name: 'New Category' }]);
  };

  const updateCategory = (id, val) => {
    setCategories(categories.map(c => c.id === id ? { ...c, name: val } : c));
  };

  const removeCategory = (id) => setCategories(categories.filter(c => c.id !== id));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Support Preferences</h2>
        <button className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5">
          {[
            { id: 'slas', label: 'SLA Policies', icon: Clock },
            { id: 'categories', label: 'Categories', icon: Tag },
            { id: 'auto', label: 'Auto-Responses', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 flex items-center justify-center text-xs font-black uppercase tracking-widest transition-colors ${
                activeTab === tab.id 
                  ? 'border-b-2 border-[#095D95] text-[#095D95] dark:border-[#50B1B9] dark:text-[#50B1B9] bg-slate-50 dark:bg-white/5' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* SLA Tab */}
          {activeTab === 'slas' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Time to First Response</h3>
                  <p className="text-xs text-slate-500 mt-1">Maximum hours allowed before an agent must reply to a new ticket.</p>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" max="48" 
                    value={slas.firstResponse} 
                    onChange={(e) => setSlas({...slas, firstResponse: e.target.value})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-[#50B1B9]"
                  />
                  <div className="w-16 text-center font-bold text-[#095D95] dark:text-[#50B1B9] bg-slate-50 dark:bg-white/5 py-2 rounded-lg border border-slate-200 dark:border-white/5">
                    {slas.firstResponse}h
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Resolution Time</h3>
                  <p className="text-xs text-slate-500 mt-1">Maximum hours allowed to completely resolve and close a ticket.</p>
                </div>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" max="168" step="12"
                    value={slas.resolution} 
                    onChange={(e) => setSlas({...slas, resolution: e.target.value})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-[#50B1B9]"
                  />
                  <div className="w-16 text-center font-bold text-[#095D95] dark:text-[#50B1B9] bg-slate-50 dark:bg-white/5 py-2 rounded-lg border border-slate-200 dark:border-white/5">
                    {slas.resolution}h
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Ticket Categories</h3>
                  <p className="text-xs text-slate-500 mt-1">Define categories for organizing support requests.</p>
                </div>
                <button onClick={addCategory} className="px-3 py-1.5 bg-[#50B1B9] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#3d8c93] transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-white/5 group hover:border-[#50B1B9]/50 transition-colors">
                    <input 
                      type="text" 
                      value={cat.name} 
                      onChange={(e) => updateCategory(cat.id, e.target.value)}
                      className={`${INPUT_STYLE} !py-1.5 !text-sm flex-1`}
                    />
                    <button onClick={() => removeCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto Responses Tab */}
          {activeTab === 'auto' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Ticket Acknowledgment</h3>
                  <p className="text-xs text-slate-500 mt-1">Automatically send an email when a new ticket is received.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoRespond} onChange={() => setAutoRespond(!autoRespond)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
                </label>
              </div>

              {autoRespond && (
                <div className="space-y-2 animate-in fade-in">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Response Template</label>
                  <textarea 
                    className={INPUT_STYLE} 
                    rows="4" 
                    defaultValue="Hi there,\n\nWe have received your request and our support team is looking into it. We will get back to you within our standard SLA time.\n\nThank you!"
                  />
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
