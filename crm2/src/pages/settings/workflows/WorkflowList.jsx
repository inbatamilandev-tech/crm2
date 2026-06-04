import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Play, Pause, Activity, MoreVertical, Edit2, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { workflowsApi } from '../../../services/api';
import ConfirmationDialog from '../../../components/ConfirmationDialog';

export default function WorkflowList() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const data = await workflowsApi.getAll();
      setWorkflows(data.results || data);
    } catch (error) {
      console.error("Failed to fetch workflows", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id, currentStatus) => {
    try {
      // Optimistic update
      setWorkflows(workflows.map(wf => wf.id === id ? { ...wf, is_active: !currentStatus } : wf));
      await workflowsApi.toggle(id);
    } catch (error) {
      console.error("Failed to toggle workflow", error);
      // Revert on failure
      setWorkflows(workflows.map(wf => wf.id === id ? { ...wf, is_active: currentStatus } : wf));
    }
  };

  const deleteWorkflow = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Workflow",
      description: "Are you sure you want to delete this workflow? This action cannot be undone.",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await workflowsApi.delete(id);
          setWorkflows(prev => prev.filter(wf => wf.id !== id));
        } catch (error) {
          console.error("Failed to delete workflow", error);
        }
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9] flex items-center">
            <Activity className="w-6 h-6 mr-3" />
            Workflow Automation
          </h2>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Manage and monitor automated business processes</p>
        </div>
        <button 
          onClick={() => navigate('/settings/workflows/create')}
          className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center shadow-sm">
          <div className="w-12 h-12 bg-[#50B1B9]/10 rounded-full flex items-center justify-center mr-4">
            <Play className="w-5 h-5 text-[#50B1B9]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Flows</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{workflows.filter(w => w.is_active).length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mr-4">
            <Pause className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paused Flows</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{workflows.filter(w => !w.is_active).length}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center shadow-sm">
          <div className="w-12 h-12 bg-[#095D95]/10 rounded-full flex items-center justify-center mr-4">
            <CheckCircle2 className="w-5 h-5 text-[#095D95]" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Executions</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {workflows.reduce((acc, curr) => acc + (curr.log_count || 0), 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-sm">
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Workflow Name</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trigger Module</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Executions</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</th>
                <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 text-sm">Loading workflows...</td>
                </tr>
              ) : workflows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 text-sm flex flex-col items-center">
                    <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                    <p>No workflows created yet.</p>
                    <button onClick={() => navigate('/settings/workflows/create')} className="mt-4 text-[#095D95] dark:text-[#50B1B9] text-xs font-black uppercase tracking-widest hover:underline">
                      Create your first workflow
                    </button>
                  </td>
                </tr>
              ) : (
                workflows.map((wf) => (
                  <tr key={wf.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={wf.is_active} onChange={() => toggleWorkflow(wf.id, wf.is_active)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-[#50B1B9]"></div>
                      </label>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white">{wf.name}</p>
                          {wf.description && <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{wf.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {wf.module}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Activity className="w-3 h-3 mr-1.5 text-slate-400" />
                        {wf.log_count || 0}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        <Clock className="w-3 h-3 mr-1.5 text-slate-400" />
                        {new Date(wf.updated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/settings/workflows/${wf.id}/logs`)} className="p-2 text-slate-400 hover:text-[#50B1B9] hover:bg-[#50B1B9]/10 rounded-lg transition-colors" title="View Logs">
                          <Activity className="w-4 h-4" />
                        </button>
                        <button onClick={() => navigate(`/settings/workflows/${wf.id}`)} className="p-2 text-slate-400 hover:text-[#095D95] hover:bg-[#095D95]/10 rounded-lg transition-colors" title="Edit Workflow">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteWorkflow(wf.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Workflow">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Delete"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
