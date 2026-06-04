import React, { useState } from 'react';
import { Plus, GripVertical, Trash2, Save, Activity, LayoutList, GitMerge } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function SalesPreferences() {
  const [activeTab, setActiveTab] = useState('pipelines');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });
  const [stages, setStages] = useState([
    { id: 1, name: 'Lead', probability: 10, color: '#94a3b8' },
    { id: 2, name: 'Qualified', probability: 40, color: '#3b82f6' },
    { id: 3, name: 'Proposal', probability: 75, color: '#eab308' },
    { id: 4, name: 'Negotiation', probability: 90, color: '#f97316' },
    { id: 5, name: 'Closed Won', probability: 100, color: '#22c55e' },
  ]);
  const [routing, setRouting] = useState({ roundRobin: true, notifyOnAssign: true });

  const addStage = () => {
    const newId = Math.max(0, ...stages.map(s => s.id)) + 1;
    setStages([...stages, { id: newId, name: 'New Stage', probability: 0, color: '#50B1B9' }]);
  };

  const removeStage = (id) => setStages(stages.filter(s => s.id !== id));
  
  const updateStage = (id, field, value) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    // Simulate save logic
    setDialogConfig({
      isOpen: true,
      title: "Success",
      description: "Sales preferences updated successfully!",
      onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Sales Preferences</h2>
        <button onClick={handleSave} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5">
          {[
            { id: 'pipelines', label: 'Deal Stages', icon: LayoutList },
            { id: 'routing', label: 'Lead Routing', icon: GitMerge },
            { id: 'general', label: 'General', icon: Activity },
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
          
          {/* Pipelines Tab */}
          {activeTab === 'pipelines' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Pipeline Stages</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure the stages of your default sales pipeline.</p>
                </div>
                <button onClick={addStage} className="px-3 py-1.5 bg-[#50B1B9] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#3d8c93] transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Add Stage
                </button>
              </div>
              
              <div className="space-y-3">
                {stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-white/5 group hover:border-[#50B1B9]/50 transition-colors">
                    <GripVertical className="w-5 h-5 text-slate-400 cursor-grab active:cursor-grabbing" />
                    <span className="w-6 text-xs font-bold text-slate-400">{index + 1}.</span>
                    <input 
                      type="text" 
                      value={stage.name} 
                      onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                      className={`${INPUT_STYLE} !py-1.5 !text-sm flex-1`}
                    />
                    <div className="flex items-center w-32 relative">
                      <input 
                        type="number" 
                        value={stage.probability} 
                        onChange={(e) => updateStage(stage.id, 'probability', e.target.value)}
                        className={`${INPUT_STYLE} !py-1.5 !text-sm !pr-8`}
                        min="0" max="100"
                      />
                      <span className="absolute right-3 text-xs text-slate-400">%</span>
                    </div>
                    <input 
                      type="color" 
                      value={stage.color}
                      onChange={(e) => updateStage(stage.id, 'color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                    <button onClick={() => removeStage(stage.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lead Routing Tab */}
          {activeTab === 'routing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Round Robin Assignment</h3>
                    <p className="text-xs text-slate-500 mt-1">Automatically distribute new leads evenly among active sales reps.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={routing.roundRobin} onChange={() => setRouting({...routing, roundRobin: !routing.roundRobin})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">Notify on Assignment</h3>
                    <p className="text-xs text-slate-500 mt-1">Send immediate alerts when a lead is assigned to a rep.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={routing.notifyOnAssign} onChange={() => setRouting({...routing, notifyOnAssign: !routing.notifyOnAssign})} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Deal Currency</label>
                  <select className={INPUT_STYLE}>
                    {/* <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option> */}
                    <option>INR (₹)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Pipeline</label>
                  <select className={INPUT_STYLE}>
                    <option>Standard Sales Pipeline</option>
                    {/* <option>Enterprise Sales</option> */}
                  </select>
                </div>
              </div>
            </div>
          )}
          
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
