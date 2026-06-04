import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderKanban, Plus, CheckSquare, Clock, Users, Search, X, 
  Loader2, AlertCircle, Trash2, Calendar, Target,
  ChevronRight, BarChart3, Layers, Filter, List, Grid, Edit2
} from 'lucide-react';
import { projectsApi, accountsApi, dealsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ name: '', description: '', status: 'planned', start_date: '', end_date: '', account: '', deal: '', budget: '' });
  const [viewMode, setViewMode] = useState('list');
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setFormData({ name: '', description: '', status: 'planned', start_date: '', end_date: '', account: '', deal: '', budget: '' });
    setCurrentProjectId(null);
  };

  const handleEditClick = (project) => {
    setFormData({
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'planned',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      account: project.account || '',
      deal: project.deal || '',
      budget: project.budget || ''
    });
    setCurrentProjectId(project.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectsApi.getAll();
      setProjects(data.results || data);
    } catch (err) {
      setError("Failed to sync project database");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    
    // Fetch accounts and deals for dropdowns
    const fetchDropdownData = async () => {
      try {
        const accountsData = await accountsApi.getAll();
        setAccounts(accountsData.results || accountsData);
        
        const dealsData = await dealsApi.getAll();
        setDeals(dealsData.results || dealsData);
      } catch (err) {
        console.error("Failed to fetch dropdown data:", err);
      }
    };
    fetchDropdownData();
  }, []);

  const handleSaveProject = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSubmit = { ...formData };
      if (dataToSubmit.start_date === '') dataToSubmit.start_date = null;
      if (dataToSubmit.end_date === '') dataToSubmit.end_date = null;
      if (dataToSubmit.account === '') dataToSubmit.account = null;
      if (dataToSubmit.deal === '') dataToSubmit.deal = null;
      if (dataToSubmit.budget === '') dataToSubmit.budget = null;

      if (isEditMode) {
        await projectsApi.update(currentProjectId, dataToSubmit);
        addToast("Project updated");
      } else {
        await projectsApi.create(dataToSubmit);
        addToast("Project initialized");
      }
      closeModal();
      fetchProjects();
    } catch (err) {
      console.error("Project save failed:", err.response?.data || err);
      addToast("Save failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Archive Project",
      description: "Archive and purge this project lifecycle? This action cannot be undone.",
      onConfirm: async () => {
        setDialogConfig(prev => ({ ...prev, isOpen: false }));
        try {
          await projectsApi.delete(id);
          addToast("Lifecycle purged");
          fetchProjects();
        } catch (err) {
          addToast("Purge failed", "error");
        }
      }
    });
  };

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <Layers className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Portfolio</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Projects</h2>
        </div>
        
        <div className="flex items-center space-x-3">
           <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search project scope..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
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
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-6 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="relative min-h-[400px]">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20 backdrop-blur-[1px]">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Loading Projects...</p>
          </div>
        ) : error ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white z-20">
             <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-rose-500" />
             </div>
             <h3 className="text-xl font-black text-slate-900">Database Error</h3>
             <p className="text-slate-500 mt-2 font-medium">{error}</p>
          </div>
        ) : null}

        {projects.length === 0 && !isLoading && !error ? (
           <div className="p-20 flex flex-col items-center justify-center text-center bg-white rounded-[32px] border border-slate-200">
              <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                 <Target className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900">No Active Objectives</h3>
              <p className="text-slate-500 mt-2 font-medium">Initialize your first project to begin tracking milestones.</p>
           </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 hover:shadow-2xl hover:shadow-slate-200/60 transition-all group relative overflow-hidden flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center">
                    <div className={`p-4 rounded-2xl mr-4 group-hover:scale-110 transition-transform ${
                      project.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      <FolderKanban className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{project.name}</h3>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">{project.status} Phase</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button onClick={() => handleEditClick(project)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(project.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm font-medium text-slate-500 mb-8 line-clamp-3 leading-relaxed flex-grow">
                  {project.description || "No project specification provided. Milestone tracking active for general objective alignment."}
                </p>

                <div className="mt-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                            SD
                         </div>
                       ))}
                       <div className="w-8 h-8 rounded-lg bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400">
                          +2
                       </div>
                    </div>
                    <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       <Clock className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                       {project.start_date || 'Ongoing'}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                    <button 
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="text-[11px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center"
                    >
                       Launch Project Space <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                    <BarChart3 className="w-5 h-5 text-slate-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden [&>div.overflow-x-auto]:max-h-[calc(100vh-150px)] [&>div.overflow-x-auto]:overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 relative">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-6 py-4">Project Name</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Start Date</th>
                    <th className="px-6 py-4">End Date</th>
                    <th className="px-6 py-4">Account</th>
                    <th className="px-6 py-4">Deal</th>
                    <th className="px-6 py-4">Budget</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredProjects.map(project => (
                    <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-900 font-bold">
                        <button onClick={() => navigate(`/projects/${project.id}`)} className="hover:text-blue-600 transition-colors">
                          {project.name}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-widest ${
                          project.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                          project.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {project.start_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {project.end_date || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {project.account_display || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {project.deal_display || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-400">
                        {project.budget ? `₹${project.budget}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEditClick(project)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1.5 rounded-lg transition-colors mr-2">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors">
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

      {/* Establishment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={closeModal} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{isEditMode ? 'Edit Project' : 'New Project Registry'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Lifecycle Strategy Initialization</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveProject} className="flex flex-col flex-grow overflow-hidden">
              {/* Scrollable Content */}
              <div className="p-8 space-y-6 overflow-y-auto flex-grow">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Project Designation *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="e.g. Q4 Growth Initiative" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Strategic Scope</label>
                  <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field py-4 resize-none" placeholder="Comprehensive project description..." />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lifecycle Phase</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-field appearance-none bg-white">
                      <option value="planned">Planned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="review">Review</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                    <input type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="input-field" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                    <input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Budget</label>
                    <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="input-field" placeholder="e.g. 5000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Account</label>
                    <select value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} className="input-field appearance-none bg-white">
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Deal</label>
                    <select value={formData.deal} onChange={e => setFormData({...formData, deal: e.target.value})} className="input-field appearance-none bg-white">
                      <option value="">Select Deal</option>
                      {deals.map(deal => (
                        <option key={deal.id} value={deal.id}>{deal.title || deal.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-8 py-6 border-t border-slate-50 flex justify-end space-x-3 bg-white flex-shrink-0">
                <button type="button" onClick={closeModal} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-3"/>}
                  {isEditMode ? 'Save Changes' : 'Confirm & Initialize'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="Archive"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
