import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Layers, Plus, CheckSquare, Clock, Users, Search, X, 
  Loader2, AlertCircle, Trash2, Calendar, Target,
  ChevronRight, BarChart3, List, Grid, Paperclip, MessageSquare,
  Filter, Edit2, MoreVertical, ArrowLeft
} from 'lucide-react';
import { projectsApi, tasksApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useWebSocket } from '../context/WebSocketContext';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { lastMessage } = useWebSocket();
  
  const [project, setProject] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({ title: '', task_type: 'todo', priority: 'medium', due_date: '', status: 'not_started' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const projectData = await projectsApi.getById(id);
      setProject(projectData);
      setMilestones(projectData.milestones || []);
      
      // Fetch tasks filtered by project
      const tasksData = await tasksApi.getAll({ project: id });
      setTasks(tasksData.results || tasksData);
    } catch (err) {
      setError("Failed to load project details");
      addToast("Error loading project", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'task_update' || data.type === 'project_update') {
          fetchData();
        }
      } catch (e) {
        // Handle parse error
      }
    }
  }, [lastMessage]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await tasksApi.create({ ...taskFormData, project: id });
      addToast("Task created successfully");
      setIsTaskModalOpen(false);
      setTaskFormData({ title: '', task_type: 'todo', priority: 'medium', due_date: '', status: 'not_started' });
      fetchData();
    } catch (err) {
      addToast("Failed to create task", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">Loading Project Workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-20 flex flex-col items-center justify-center text-center bg-white rounded-[32px] border border-slate-200">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100">
          <AlertCircle className="w-10 h-10 text-rose-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900">Project Not Found</h3>
        <p className="text-slate-500 mt-2 font-medium">The project might have been removed or does not exist.</p>
        <button onClick={() => navigate('/projects')} className="mt-6 inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:-translate-y-0.5 transition-all">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <button onClick={() => navigate('/projects')} className="flex items-center text-slate-500 hover:text-slate-900 mb-2 text-sm font-bold transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
          </button>
          <div className="flex items-center space-x-2 mb-1">
            <Layers className="w-5 h-5 text-blue-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Space</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <MoreVertical className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsTaskModalOpen(true)}
            className="inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {['overview', 'tasks', 'team', 'files'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-black text-sm uppercase tracking-widest transition-all ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-8">
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-4">Project Scope</h3>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {project.description || "No detailed specification provided for this project."}
                </p>
              </div>

              {/* Milestones */}
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Milestones</h3>
                  <button className="text-sm font-black text-blue-600 hover:underline flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Add Milestone
                  </button>
                </div>
                <div className="space-y-4">
                  {milestones.length === 0 ? (
                    <p className="text-slate-400 text-sm">No milestones defined yet.</p>
                  ) : (
                    milestones.map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${m.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="font-bold text-slate-900">{m.title}</span>
                        </div>
                        <div className="flex items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                          <Calendar className="w-3.5 h-3.5 mr-1.5" />
                          {m.due_date || 'TBD'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-8">
              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6">Status & Timeline</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest">
                        {project.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</span>
                    <div className="mt-1 font-bold text-slate-900">{project.start_date || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</span>
                    <div className="mt-1 font-bold text-slate-900">{project.end_date || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget</span>
                    <div className="mt-1 font-bold text-slate-900">{project.budget ? `$${project.budget}` : 'Not Set'}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 mb-6">Context</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Account</span>
                    <div className="mt-1 font-bold text-slate-900">{project.account_name || 'Internal Project'}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Deal</span>
                    <div className="mt-1 font-bold text-slate-900">{project.deal_name || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {/* View Mode Toggle & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setViewMode('kanban')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search tasks..."
                    className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
                  />
                </div>
                <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tasks Kanban View */}
            {viewMode === 'kanban' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['not_started', 'in_progress', 'completed'].map(status => (
                  <div key={status} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-black text-sm uppercase tracking-widest text-slate-500">
                        {status.replace('_', ' ')}
                      </h4>
                      <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-0.5 rounded-full">
                        {tasks.filter(t => t.status === status).length}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {tasks.filter(t => t.status === status).map(task => (
                        <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                          <h5 className="font-bold text-slate-900 mb-2">{task.title}</h5>
                          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                            <div className="flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              task.priority === 'high' ? 'bg-rose-50 text-rose-600' :
                              task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tasks List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Task Name</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Priority</th>
                        <th className="px-6 py-4">Due Date</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {tasks.map(task => (
                        <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-900 font-bold">{task.title}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest ${
                              task.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                              task.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-black uppercase tracking-widest ${
                              task.priority === 'high' ? 'text-rose-600' :
                              task.priority === 'medium' ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                              {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">
                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Project Team</h3>
              <button className="text-sm font-black text-blue-600 hover:underline flex items-center">
                <Plus className="w-4 h-4 mr-1" /> Assign Member
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">
                    JD
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-slate-900">John Doe</div>
                    <div className="text-xs text-slate-400 font-medium">Project Manager</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Files & Documents</h3>
              <button className="text-sm font-black text-blue-600 hover:underline flex items-center">
                <Paperclip className="w-4 h-4 mr-1" /> Upload File
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-20 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Paperclip className="w-10 h-10 text-slate-300 mb-4" />
                <h4 className="text-sm font-black text-slate-900">No files uploaded</h4>
                <p className="text-xs text-slate-400 font-medium mt-1">Share documents, assets, or specifications.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsTaskModalOpen(false)} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">New Project Task</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assign actionable item</p>
              </div>
              <button onClick={() => setIsTaskModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Task Title *</label>
                <input required type="text" value={taskFormData.title} onChange={e => setTaskFormData({...taskFormData, title: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" placeholder="e.g. Design wireframes" />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                  <select value={taskFormData.priority} onChange={e => setTaskFormData({...taskFormData, priority: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Due Date</label>
                  <input type="date" value={taskFormData.due_date} onChange={e => setTaskFormData({...taskFormData, due_date: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" />
                </div>
              </div>

              <div className="pt-8 mt-4 border-t border-slate-50 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
