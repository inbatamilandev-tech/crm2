import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Filter, MoreVertical, 
  X, Send, AlertTriangle, MessageSquare, Check, Trash
} from 'lucide-react';
import api, { casesApi, contactsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Cases() {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState('table'); // table or kanban
  const [selectedCase, setSelectedCase] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [contactId, setContactId] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]); // For dropdown
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  const fetchCases = () => {
    setLoading(true);
    casesApi.getAll()
      .then(res => {
        const data = res.results !== undefined ? res : res;
        const casesList = data.results || data.data || data;
        setCases(Array.isArray(casesList) ? casesList : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("[Cases] Error fetching cases:", err);
        setCases([]);
        setLoading(false);
        addToast('Failed to load cases', 'error');
      });
  };

  const fetchContacts = () => {
    contactsApi.getAll()
      .then(data => {
        const contactsList = data.results || data.data || data;
        setContacts(Array.isArray(contactsList) ? contactsList : []);
      })
      .catch(err => {
        console.error("[Cases] Error fetching contacts:", err);
        addToast('Failed to load contacts', 'error');
      });
  };

  useEffect(() => {
    fetchCases();
    fetchContacts();
  }, []);

  const handleCreateCase = () => {
    setError(null);
    casesApi.create({ 
      subject, 
      description, 
      contact: contactId || null,
      priority,
      category
    })
    .then(data => {
      if (data) {
        setIsModalOpen(false);
        resetForm();
        fetchCases();
        addToast('Case created successfully', 'success');
      }
    })
    .catch(err => {
      console.error("[Cases] Error in handleCreateCase:", err);
      const res = err.response;
      if (res) {
        console.log("[Cases] Response status:", res.status);
        console.log("[Cases] Response data:", res.data);
        
        if (res.status === 409 && res.data && res.data.duplicate) {
          setDuplicateWarning({
            detail: res.data.message,
            duplicate_case_id: `ID: ${res.data.existing_case_id}`,
            id: res.data.existing_case_id
          });
          return;
        }
        
        if (res.data && res.data.errors) {
          const messages = Object.entries(res.data.errors).map(([key, value]) => {
            return `${key}: ${Array.isArray(value) ? value.join(', ') : value}`;
          });
          setError(messages.join(' | ') || res.data.message || 'Validation failed');
          return;
        }
        
        setError(res.data?.message || `Request failed with status ${res.status}`);
      } else {
        setError(err.message || 'Failed to create case');
      }
      addToast('Failed to create case', 'error');
    });
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setContactId('');
    setError(null);
    setPriority('Medium');
    setCategory('General');
    setDuplicateWarning(null);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const caseId = e.dataTransfer.getData('text/plain');
    const caseToUpdate = cases.find(c => c.id.toString() === caseId);
    if (!caseToUpdate || caseToUpdate.status === newStatus) return;

    casesApi.update(caseId, { ...caseToUpdate, status: newStatus })
      .then(() => {
        fetchCases();
        addToast(`Case moved to ${newStatus}`, 'success');
      })
      .catch(err => {
        console.error(err);
        addToast('Failed to update case status', 'error');
      });
  };

  const filteredCases = cases.filter(c => 
    c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.contact_name && c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleMerge = (duplicateId) => {
    if (!selectedCase) return;
    api.post(`/cases/${selectedCase.id}/merge/`, { duplicate_id: duplicateId })
    .then(res => {
      setDuplicateWarning(null);
      setIsModalOpen(false);
      fetchCases();
      addToast('Cases merged successfully', 'success');
    })
    .catch(err => {
      console.error(err);
      addToast('Failed to merge cases', 'error');
    });
  };

  const handleAppend = (duplicateId) => {
    if (!selectedCase) return;
    api.post(`/cases/${selectedCase.id}/append/`, { message: description })
    .then(res => {
      setDuplicateWarning(null);
      setIsModalOpen(false);
      fetchCases();
      addToast('Conversation appended successfully', 'success');
    })
    .catch(err => {
      console.error(err);
      addToast('Failed to append conversation', 'error');
    });
  };

  const handleEdit = (c) => {
    setSelectedCase(c);
    setSubject(c.subject);
    setDescription(c.description || '');
    setContactId(c.contact || '');
    setPriority(c.priority);
    setCategory(c.category);
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleUpdateCase = () => {
    if (!selectedCase) return;
    casesApi.update(selectedCase.id, {
      subject,
      description,
      contact: contactId,
      priority,
      category
    })
    .then(res => {
      setIsEditModalOpen(false);
      resetForm();
      fetchCases();
      addToast('Case updated successfully', 'success');
    })
    .catch(err => {
      console.error(err);
      addToast('Failed to update case', 'error');
    });
  };

  const handleDeleteCase = (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Record",
      description: "Are you sure you want to delete this record? This action cannot be undone.",
      onConfirm: () => {
        setDialogConfig({ ...dialogConfig, isOpen: false });
        casesApi.delete(id)
        .then(res => {
          fetchCases();
          addToast('Case deleted successfully', 'success');
          setActiveDropdown(null);
        })
        .catch(err => {
          console.error(err);
          addToast('Failed to delete case', 'error');
        });
      }
    });
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen relative">
      {/* Header Section with Gradient and Glassmorphism */}
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent uppercase tracking-tighter">Cases</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">Manage customer tickets and support requests.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm outline-none w-full sm:w-64 shadow-sm"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Case
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <button className="flex items-center px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 transition-colors">
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </button>
          <span className="text-xs text-slate-400">|</span>
          <span className="text-xs text-slate-500 font-medium">Showing {filteredCases.length} cases</span>
        </div>
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5">
          <button 
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Table
          </button>
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Kanban
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm font-bold">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-12 text-center">
          <div className="text-slate-400 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">No support cases found</h2>
          <p className="text-sm text-slate-500 mb-6">Create your first support case to get started.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Case
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur-md shadow-sm border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Case ID</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCases.map((c) => c && (
                  <tr 
                    key={c.id} 
                    className="hover:bg-white transition-all duration-200 cursor-pointer group"
                    onClick={() => setSelectedCase(c)}
                  >
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 group-hover:text-blue-700">{c.case_id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{c.subject}</div>
                        <div className="text-xs text-slate-400 mt-0.5 font-medium">{c.category} • {new Date(c.created_at).toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">{c.contact_name || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                        c.priority === 'Critical' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        c.priority === 'High' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        c.priority === 'Medium' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                        c.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        c.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        c.status === 'Escalated' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === c.id ? null : c.id);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all duration-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {activeDropdown === c.id && (
                        <div className="absolute right-6 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                            className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteCase(c.id); }}
                            className="w-full flex items-center px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors border-t border-slate-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {['New', 'Open', 'In Progress', 'Resolved'].map((status) => (
            <div 
              key={status} 
              className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">{status}</span>
                <span className="text-xs text-slate-400 font-bold">{filteredCases.filter(c => c.status === status).length}</span>
              </div>
              <div className="space-y-3">
                {filteredCases.filter(c => c && c.status === status).map(c => (
                  <div 
                    key={c.id} 
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(c)}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('text/plain', c.id.toString())}
                  >
                    <div className="text-xs font-bold text-blue-600 mb-1">{c.case_id}</div>
                    <div className="text-sm font-bold text-slate-900 mb-2">{c.subject}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{c.contact_name || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Create New Case</h2>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {duplicateWarning ? (
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 p-4 rounded-xl flex items-start gap-3 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">Duplicate Case Detected</h4>
                    <p className="text-xs text-amber-700 mt-1">{duplicateWarning.detail}</p>
                    <p className="text-xs font-bold text-amber-800 mt-1">Existing Case: {duplicateWarning.duplicate_case_id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => {
                      // Navigate to existing case or just highlight it
                      setIsModalOpen(false);
                      setDuplicateWarning(null);
                      // Simulate finding it
                      const existing = cases.find(c => c.case_id === duplicateWarning.duplicate_case_id);
                      if (existing) setSelectedCase(existing);
                    }}
                    className="w-full flex items-center justify-between p-3 text-sm text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Open Existing Case</span>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </button>
                  <button 
                    onClick={() => handleMerge(duplicateWarning.id)}
                    className="w-full flex items-center justify-between p-3 text-sm text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Merge Case</span>
                    <MessageSquare className="w-4 h-4 text-blue-500" />
                  </button>
                  <button 
                    onClick={() => handleAppend(duplicateWarning.id)}
                    className="w-full flex items-center justify-between p-3 text-sm text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                  >
                    <span>Append Conversation</span>
                    <Send className="w-4 h-4 text-indigo-500" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-rose-50 p-4 rounded-xl flex items-start gap-3 border border-rose-200">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-800">Error</h4>
                      <p className="text-xs text-rose-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Subject</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter case subject"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue"
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Customer / Contact</label>
                  <select 
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  >
                    <option value="">Select Contact</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Priority</label>
                    <select 
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Category</label>
                    <input 
                      type="text" 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Technical"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => { setIsModalOpen(false); resetForm(); }}
                    className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateCase}
                    className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                  >
                    Create Case
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Case Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Case</h2>
              <button onClick={() => { setIsEditModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Subject</label>
                <input 
                  type="text" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Case subject"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Case description"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none h-32 resize-none"
                />
              </div>
              
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Customer</label>
                <select 
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                >
                  <option value="">Select Customer</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Priority</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Category</label>
                  <input 
                    type="text" 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Technical"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => { setIsEditModalOpen(false); resetForm(); }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateCase}
                  className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Update Case
                </button>
              </div>
            </div>
          </div>
        </div>
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
