import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Clock, CalendarDays, AlertCircle, 
  PhoneCall, Mail, CheckSquare, ArrowDown, ArrowUp, 
  Minus, Loader2, ListTodo, Search, Filter,
  Zap, MoreHorizontal, ChevronRight, LayoutGrid, Trash2
} from 'lucide-react';
import { tasksApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Workqueue() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('All');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });
  const { addToast } = useToast();

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const data = await tasksApi.getAll();
      
      const formattedTasks = (data.results || []).map(t => {
        const isOverdue = new Date(t.due_date) < new Date() && t.status !== 'completed';
        const isToday = new Date(t.due_date).toDateString() === new Date().toDateString();
        return {
          id: t.id,
          type: t.priority === 'high' || t.priority === 'urgent' ? 'Critical' : 'Operational',
          title: t.title,
          relatedTo: t.lead_name || t.description || 'System Protocol',
          priority: t.priority || 'medium',
          dueDate: t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No Registry',
          status: isOverdue ? 'Overdue' : isToday ? 'Today' : 'Upcoming',
          completed: t.status === 'completed'
        };
      });
      setTasks(formattedTasks.filter(t => !t.completed));
    } catch (err) {
      addToast('Protocol Sync Failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'urgent':
      case 'high': return <ArrowUp className="w-4 h-4 text-rose-500" />;
      case 'medium': return <Minus className="w-4 h-4 text-amber-500" />;
      case 'low': return <ArrowDown className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Overdue': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Today': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'Upcoming': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getTypeBadge = (type) => {
    switch(type) {
      case 'Critical': return 'bg-slate-900 text-white';
      case 'Operational': return 'bg-slate-100 text-slate-900';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesFilter = filter === 'All' || task.status === filter;
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) || 
                          task.relatedTo.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const markComplete = async (id) => {
    try {
      await tasksApi.patch(id, { status: 'completed' });
      addToast('Registry Entry Finalized');
      fetchTasks();
    } catch (err) {
      addToast('Finalization Failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Task",
      description: "Are you sure you want to delete this task? This action cannot be undone.",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await tasksApi.delete(id);
          addToast('Task deleted successfully');
          fetchTasks();
        } catch (err) {
          addToast('Failed to delete task', 'error');
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] animate-fade-in max-w-[1400px] mx-auto p-4 gap-3 overflow-hidden">
      
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
           <div className="flex items-center space-x-2 mb-0.5">
             <ListTodo className="w-4 h-4 text-blue-600" />
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activities</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Workqueue</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search active protocols..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
          <button className="hidden inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
            <Zap className="mr-2 w-4 h-4 fill-current" />
            Integrate Protocol
          </button>
        </div>
      </div>

      {/* Filter Stats Bar */}
      <div className="flex-shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
         {['All', 'Overdue', 'Today', 'Upcoming'].map((f) => (
           <button
             key={f}
             onClick={() => setFilter(f)}
             className={`glass-card p-4 flex flex-col items-start transition-all ${
               filter === f ? 'bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/20' : 'hover:bg-slate-50'
             }`}
           >
              <span className={`text-[9px] font-black uppercase tracking-widest ${filter === f ? 'text-slate-400' : 'text-slate-500'}`}>
                 {f} Logic
              </span>
              <div className="flex items-center justify-between w-full mt-1">
                 <h4 className={`text-xl font-black ${filter === f ? 'text-white' : 'text-slate-900'}`}>
                    {f === 'All' ? tasks.length : tasks.filter(t => t.status === f).length}
                 </h4>
                 {filter === f && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
              </div>
           </button>
         ))}
      </div>

      {/* Registry Container */}
      <div className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
             <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
             <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Synchronizing Workqueue Registry...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-[32px] flex items-center justify-center text-emerald-500 mb-6 shadow-inner">
               <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Protocol Zero Achieved</h3>
            <p className="text-slate-400 text-sm max-w-sm font-medium">All active registry entries have been successfully processed or no matches exist for the current filter.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {filteredTasks.map((task) => (
              <div key={task.id} className="p-3 md:p-4 hover:bg-slate-50/50 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-4">
                  {/* Executive Action Trigger */}
                  <button 
                    onClick={() => markComplete(task.id)}
                    className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 hover:bg-emerald-50 hover:text-emerald-500 transition-all border border-slate-100 group-hover:scale-105"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getTypeBadge(task.type)}`}>
                        {task.type}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-widest ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                      <div className="flex items-center text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
                        {getPriorityIcon(task.priority)}
                        <span className="ml-1.5 capitalize">{task.priority} Priority</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                    <div className="flex items-center space-x-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center">
                         <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                         Registry: <span className="text-slate-600 ml-1.5">{task.relatedTo}</span>
                      </span>
                      <span className="flex items-center border-l border-slate-200 pl-4">
                        <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                        Deadline: <span className="text-slate-600 ml-1.5">{task.dueDate}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operator Tools */}
                <div className="flex items-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                  <button 
                    onClick={() => navigate('/calls')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    title="Navigate to Calls"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => navigate('/emails')}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
                    title="Navigate to Emails"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-slate-200 mx-1" />
                  <div className="relative">
                    <button 
                      onClick={() => setOpenMenuId(openMenuId === task.id ? null : task.id)}
                      className="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                      title="More Actions"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openMenuId === task.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg z-50 py-1">
                        <button 
                          onClick={() => { markComplete(task.id); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                        >
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                          <span>Complete Task</span>
                        </button>
                        <button 
                          onClick={() => { handleDelete(task.id); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete Task</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
