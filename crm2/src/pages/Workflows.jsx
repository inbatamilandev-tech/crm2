import React, { useState, useEffect } from 'react';
import { workflowsApi } from '../services/api';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Play, Pause, Plus, Trash2, Edit, CheckSquare, 
  Settings, AlertCircle, Loader2, List, FileText,
  Zap, Workflow as WorkflowIcon, ChevronRight, Activity, Filter
} from 'lucide-react';
import WorkflowFormModal from '../components/WorkflowFormModal';
import WorkflowLogsModal from '../components/WorkflowLogsModal';
import Table from '../components/Table';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Workflows() {
  const [workflows, setWorkflows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [logsWorkflow, setLogsWorkflow] = useState(null);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  const { addToast } = useToast();

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const data = await workflowsApi.getAll();
      setWorkflows(data.results || data);
    } catch (err) {
      setError("Failed to sync automation protocol");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleToggleActive = async (workflow) => {
    try {
      await workflowsApi.update(workflow.id, { ...workflow, is_active: !workflow.is_active });
      addToast(`Protocol ${!workflow.is_active ? 'Activated' : 'Suspended'}`);
      fetchWorkflows();
    } catch (err) {
      addToast("Protocol sync failed", "error");
    }
  };

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Archive Protocol",
      description: "Archive and purge this automation protocol? This action cannot be undone.",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await workflowsApi.delete(id);
          addToast("Protocol purged");
          fetchWorkflows();
        } catch (err) {
          addToast("Purge failed", "error");
        }
      }
    });
  };

  const openForm = (workflow = null) => {
    setSelectedWorkflow(workflow);
    setIsFormOpen(true);
  };

  const openLogs = (workflow) => {
    setLogsWorkflow(workflow);
    setIsLogsOpen(true);
  };

  const columns = [
    { 
      header: 'Protocol State', 
      accessor: 'is_active',
      render: (row) => (
        <button 
          onClick={() => handleToggleActive(row)}
          className={`flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
            row.is_active 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-100' 
              : 'bg-slate-50 text-slate-400 border border-slate-100'
          }`}
        >
          {row.is_active ? <Zap className="w-3 h-3 mr-1.5 fill-emerald-500" /> : <Pause className="w-3 h-3 mr-1.5" />}
          {row.is_active ? 'Live' : 'Paused'}
        </button>
      )
    },
    { 
      header: 'Automation Specification', 
      accessor: 'name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{row.name}</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{row.module} Module Integrity</span>
        </div>
      )
    },
    { 
      header: 'Event Trigger', 
      accessor: 'trigger_event',
      render: (row) => (
        <div className="flex items-center space-x-2">
           <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm" />
           <span className="text-sm font-bold text-slate-700 capitalize">On {row.trigger_event} Protocol</span>
        </div>
      )
    },
    { 
      header: 'Execution Analytics', 
      accessor: 'actions',
      render: (row) => (
        <div className="flex justify-end space-x-2">
          <button onClick={() => openLogs(row)} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={() => openForm(row)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <WorkflowIcon className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Settings</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Workflows</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Activity className="w-4 h-4" />
          </button>
          <button 
            onClick={() => openForm()}
            className="inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Workflow
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass-card p-6 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Engines</p>
               <h4 className="text-2xl font-black text-slate-900 mt-1">{workflows.filter(w => w.is_active).length}</h4>
            </div>
            <Zap className="w-8 h-8 text-emerald-500 opacity-20" />
         </div>
         <div className="glass-card p-6 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Automation Yield</p>
               <h4 className="text-2xl font-black text-slate-900 mt-1">1,242 <span className="text-xs font-bold text-emerald-500">+12%</span></h4>
            </div>
            <Activity className="w-8 h-8 text-blue-500 opacity-20" />
         </div>
         <div className="glass-card p-6 flex items-center justify-between">
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Health</p>
               <h4 className="text-2xl font-black text-slate-900 mt-1">99.9%</h4>
            </div>
            <CheckSquare className="w-8 h-8 text-indigo-500 opacity-20" />
         </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
             <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Protocol Database...</p>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center h-[400px] p-8 text-center">
             <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
             <h3 className="text-xl font-black text-slate-900">Protocol Disconnected</h3>
             <p className="text-slate-500 mt-2 font-medium">{error}</p>
             <button onClick={fetchWorkflows} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest">Reconnect Engine</button>
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
               <Settings className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900">No Automation Protocols</h3>
            <p className="text-slate-500 mt-2 font-medium">Initialize your first rule to automate repetitive tasks.</p>
          </div>
        ) : (
          <Table columns={columns} data={workflows} />
        )}
      </div>

      {isFormOpen && (
        <WorkflowFormModal 
          workflow={selectedWorkflow} 
          onClose={() => setIsFormOpen(false)} 
          onSuccess={() => {
            setIsFormOpen(false);
            fetchWorkflows();
          }} 
        />
      )}

      {isLogsOpen && (
        <WorkflowLogsModal 
          workflow={logsWorkflow} 
          onClose={() => setIsLogsOpen(false)} 
        />
      )}

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
