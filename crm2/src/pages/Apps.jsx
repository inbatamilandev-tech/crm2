import React, { useState } from 'react';
import { 
  Puzzle, ToggleLeft, ToggleRight, ExternalLink, 
  Settings2, Activity, Globe, Zap, CheckCircle2, 
  Search, Filter, Plus
} from 'lucide-react';

const initialApps = [
  { id: 1, name: 'Slack', description: 'Real-time synchronization of deal milestones to specific Slack channels.', category: 'Communication', enabled: true, color: 'emerald' },
  { id: 2, name: 'Mailchimp', description: 'Automated bidirectional sync for audience segmentation and marketing leads.', category: 'Marketing', enabled: false, color: 'amber' },
  { id: 3, name: 'Google Workspace', description: 'Seamless integration of calendar, meetings, and shared drive protocols.', category: 'Productivity', enabled: true, color: 'blue' },
  { id: 4, name: 'QuickBooks', description: 'Direct export of finalized invoices and fiscal reports to accounting ledgers.', category: 'Finance', enabled: false, color: 'indigo' },
  { id: 5, name: 'Zendesk', description: 'Synchronize support tickets and client case histories with CRM accounts.', category: 'Support', enabled: true, color: 'rose' },
];

export default function Apps() {
  const [apps, setApps] = useState(initialApps);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleApp = (id) => {
    setApps(apps.map(app => app.id === id ? { ...app, enabled: !app.enabled } : app));
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    app.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <Puzzle className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Connective Ecosystem</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">App Integrations</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search marketplace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredApps.map(app => (
          <div key={app.id} className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 flex flex-col hover:shadow-2xl hover:shadow-slate-200/60 transition-all group relative overflow-hidden">
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                <div className={`p-4 bg-${app.color}-50 border border-${app.color}-100 rounded-2xl mr-4 group-hover:scale-110 transition-transform`}>
                  <Puzzle className={`w-7 h-7 text-${app.color}-600`} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{app.name}</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 block">{app.category}</span>
                </div>
              </div>
              <button 
                onClick={() => toggleApp(app.id)} 
                className="focus:outline-none transition-transform active:scale-95"
              >
                {app.enabled ? (
                  <ToggleRight className="w-10 h-10 text-blue-600 fill-blue-50" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-slate-200 hover:text-slate-300" />
                )}
              </button>
            </div>
            
            <p className="text-sm font-medium text-slate-500 flex-1 leading-relaxed">
              {app.description}
            </p>

            <div className={`mt-8 pt-6 border-t border-slate-50 flex items-center justify-between transition-all duration-300 ${app.enabled ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none'}`}>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center">
                Configure protocol <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </button>
              {app.enabled && (
                <div className="flex items-center text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Linked
                </div>
              )}
            </div>
            
            {/* Subtle background decoration */}
            <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-50 pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Discovery Section */}
      <div className="bg-slate-900 rounded-[40px] p-12 text-white relative overflow-hidden group mt-12">
         <div className="relative z-10 max-w-2xl">
            <h3 className="text-3xl font-black mb-4 tracking-tight">Expand Your Ecosystem</h3>
            <p className="text-slate-400 font-medium leading-relaxed mb-8">
               Explore over 200+ enterprise-grade integrations in the Zoho CRM Marketplace. 
               Automate cross-platform data synchronization and enhance your strategic workflows.
            </p>
            <div className="flex items-center space-x-4">
               <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all">
                  Browse Marketplace
               </button>
               <button className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-sm hover:bg-slate-700 transition-all border border-slate-700">
                  Developer API Docs
               </button>
            </div>
         </div>
         <Globe className="absolute -right-10 -bottom-10 w-80 h-80 text-white opacity-5 rotate-12 group-hover:scale-110 transition-transform duration-1000" />
      </div>
    </div>
  );
}
