import React, { useState, useEffect } from 'react';
import api, { rolesApi } from '../../services/api';
import { Plus, Check, Loader2, X, Shield, ToggleLeft, ToggleRight, Settings2, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';
import { useToast } from '../../context/ToastContext';

export default function RolesPermissions() {
  const { addToast } = useToast();
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  // Draft state for editing permissions
  const [draftPermissions, setDraftPermissions] = useState([]);

  // Module expansion state for read view (roleId -> expanded module name)
  const [expandedModules, setExpandedModules] = useState({});

  // New role form state
  const [newRole, setNewRole] = useState({ name: '', scope: 'own' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rolesRes = await rolesApi.getAll();
      const permsRes = await api.get('/permissions/');
      setRoles(rolesRes.results || rolesRes);

      let permsData = permsRes.data.results || permsRes.data || [];
      if (permsData.length > 0 && typeof permsData[0] === 'object') {
        permsData = permsData.map(p => p.name);
      }
      setAvailablePermissions(permsData);
    } catch (error) {
      console.error("Failed to fetch roles/permissions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name) {
      addToast("Role name is required", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      await rolesApi.create({
        name: newRole.name,
        scope: newRole.scope,
        permissions_list: draftPermissions
      });
      addToast("Role created successfully!", "success");
      setIsAddModalOpen(false);
      setNewRole({ name: '', scope: 'own' });
      fetchData();
    } catch (error) {
      console.error("Failed to create role", error);
      addToast("Failed to create role.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (role) => {
    setEditingRole(role.id);
    setDraftPermissions([...(role.permissions || [])]);
    setIsEditModalOpen(true);
  };

  const saveEditing = async () => {
    try {
      await rolesApi.patch(editingRole, { permissions_list: draftPermissions });
      addToast("Permissions updated successfully", "success");
      setIsEditModalOpen(false);
      setEditingRole(null);
      fetchData();
    } catch (error) {
      console.error("Failed to update permissions", error);
      addToast("Failed to update permissions.", "error");
    }
  };

  const cancelEditing = () => {
    setIsEditModalOpen(false);
    setEditingRole(null);
    setDraftPermissions([]);
  };

  const executeDeleteRole = async (role) => {
    if (!role) return;
    if (role.name.toLowerCase() === 'admin') {
      addToast("The Admin role cannot be deleted.", "error");
      return;
    }
    try {
      await rolesApi.delete(role.id);
      addToast("Role deleted successfully", "success");
      fetchData();
    } catch (error) {
      console.error("Failed to delete role", error);
      addToast("Failed to delete role. It might be assigned to users.", "error");
    }
  };

  const toggleDraftPermission = (perm) => {
    if (draftPermissions.includes(perm)) {
      setDraftPermissions(draftPermissions.filter(p => p !== perm));
    } else {
      setDraftPermissions([...draftPermissions, perm]);
    }
  };

  const toggleModule = (roleId, moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [roleId]: prev[roleId] === moduleName ? null : moduleName
    }));
  };

  const groupedPermissions = availablePermissions.reduce((acc, perm) => {
    const parts = perm.split('.');
    const module = parts.length > 1 ? parts[0] : 'other';
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  const MODULE_LAYOUT = [
    ['admin', 'profile', 'users', 'roles'],
    ['security', 'support', 'finance', 'sales'],
    ['system', 'auditlogs', 'integrations', 'workflow'],
    ['lead', 'contact', 'deal', 'ticket'],
    ['task', 'call', 'meeting', 'report'],
    ['quote', 'invoice']
  ];

  const formatModuleName = (name) => {
    if (name.toLowerCase() === 'auditlogs') return 'Audit Logs';
    return name.replace(/_/g, ' ');
  };

  const formatPermName = (perm) => {
    const parts = perm.split('.');
    return parts.length > 1 ? parts[1] : perm;
  };

  if (loading && roles.length === 0) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#095D95]" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Roles & Permissions</h2>
          <p className="text-xs text-slate-500 mt-1">Manage access control and operational scopes across the CRM.</p>
        </div>
        <button onClick={() => { setDraftPermissions([]); setIsAddModalOpen(true); }} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] pr-2 pb-4">
        {loading && roles.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#095D95]" />
          </div>
        )}
        {roles.map(role => {
          const displayPerms = role.permissions || [];

          return (
            <div key={role.id} className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/5 hover:border-[#50B1B9]/50 transition-colors shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 dark:bg-transparent gap-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#DF7F09]/10 rounded-lg flex items-center justify-center mr-3">
                    <Shield className="w-4 h-4 text-[#DF7F09]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      {role.name}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Scope: <span className="text-[#50B1B9]">{role.scope}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => executeDeleteRole(role)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center transition-colors bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Delete
                  </button>
                  <button
                    onClick={() => startEditing(role)}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center transition-colors bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                  >
                    <Settings2 className="w-3 h-3 mr-1.5" />
                    Edit Permissions
                  </button>
                </div>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.keys(groupedPermissions).map(module => {
                    const activePermsInModule = groupedPermissions[module].filter(perm => displayPerms.includes(perm));
                    if (activePermsInModule.length === 0) return null;
                    
                    const isExpanded = expandedModules[role.id] === module;

                    return (
                      <div key={module} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/5 h-fit overflow-hidden">
                        <button 
                          onClick={() => toggleModule(role.id, module)}
                          className="w-full p-2.5 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        >
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9]">
                            {formatModuleName(module)}
                          </h4>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                        </button>
                        
                        {isExpanded && (
                          <div className="px-2.5 pb-2.5 space-y-0.5 mt-0.5">
                            {activePermsInModule.map(perm => (
                              <div key={perm} className="flex items-center gap-1.5 py-0.5">
                                <Check className="w-3 h-3 text-[#50B1B9] shrink-0" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 capitalize">{formatPermName(perm)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {displayPerms.length === 0 && (
                    <div className="text-[11px] text-slate-500 font-bold col-span-full">No permissions assigned.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Role Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-10 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-7xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5 shrink-0 rounded-t-2xl">
              <h3 className="font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] text-sm">Create New Role</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 border-b border-slate-200 dark:border-white/5 shrink-0 bg-white dark:bg-slate-800 flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Name</label>
                <input type="text" value={newRole.name} onChange={(e) => setNewRole({ ...newRole, name: e.target.value })} placeholder="e.g. Regional Manager" className={`${INPUT_STYLE} !py-1.5 text-xs`} />
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Scope</label>
                <select value={newRole.scope} onChange={(e) => setNewRole({ ...newRole, scope: e.target.value })} className={`${INPUT_STYLE} !py-1.5 text-xs`}>
                  <option value="own">Own Records Only</option>
                  <option value="team">Team Records</option>
                  <option value="global">Global Access</option>
                </select>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
              <div className="flex flex-col gap-4">
                {MODULE_LAYOUT.map((row, rowIndex) => {
                  const validModules = row.filter(m => groupedPermissions[m]);
                  if (validModules.length === 0) return null;
                  
                  return (
                    <div key={rowIndex} className="border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="grid grid-cols-4 gap-2">
                        {validModules.map(module => (
                          <div key={module} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-200 dark:border-white/5 h-fit shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] mb-1.5 border-b border-slate-200 dark:border-white/10 pb-1">
                              {formatModuleName(module)}
                            </h4>
                            <div className="flex flex-col gap-1">
                              {groupedPermissions[module].map(perm => {
                                const isActive = draftPermissions.includes(perm);
                                return (
                                  <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-0.5 rounded">
                                    <input 
                                      type="checkbox" 
                                      checked={isActive} 
                                      onChange={() => toggleDraftPermission(perm)}
                                      className="w-3 h-3 text-[#50B1B9] border-slate-300 rounded focus:ring-[#50B1B9]" 
                                    />
                                    <span className="text-[10px] font-bold tracking-wide capitalize text-slate-700 dark:text-slate-300">
                                      {formatPermName(perm)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(groupedPermissions).filter(m => !MODULE_LAYOUT.flat().includes(m)).length > 0 && (
                  <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Other Permissions</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.keys(groupedPermissions).filter(m => !MODULE_LAYOUT.flat().includes(m)).map(module => (
                        <div key={module} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-200 dark:border-white/5 h-fit shadow-sm">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] mb-1.5 border-b border-slate-200 dark:border-white/10 pb-1">
                            {formatModuleName(module)}
                          </h4>
                          <div className="flex flex-col gap-1">
                            {groupedPermissions[module].map(perm => {
                              const isActive = draftPermissions.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-0.5 rounded">
                                  <input 
                                    type="checkbox" 
                                    checked={isActive} 
                                    onChange={() => toggleDraftPermission(perm)}
                                    className="w-3 h-3 text-[#50B1B9] border-slate-300 rounded focus:ring-[#50B1B9]" 
                                  />
                                  <span className="text-[10px] font-bold tracking-wide capitalize text-slate-700 dark:text-slate-300">
                                    {formatPermName(perm)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end space-x-3 shrink-0 rounded-b-2xl">
              <button onClick={() => setIsAddModalOpen(false)} className="px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
              <button onClick={handleCreateRole} disabled={isSubmitting} className="flex items-center px-4 py-1.5 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20 disabled:opacity-50">
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal / Side Drawer */}
      {isEditModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 pt-10 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-7xl shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5 shrink-0 rounded-t-2xl">
              <div>
                <h3 className="font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] text-sm">Edit Permissions</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {roles.find(r => r.id === editingRole)?.name} Role
                </p>
              </div>
              <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
              <div className="flex flex-col gap-4">
                {MODULE_LAYOUT.map((row, rowIndex) => {
                  const validModules = row.filter(m => groupedPermissions[m]);
                  if (validModules.length === 0) return null;
                  
                  return (
                    <div key={rowIndex} className="border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                      <div className="grid grid-cols-4 gap-2">
                        {validModules.map(module => (
                          <div key={module} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-200 dark:border-white/5 h-fit shadow-sm">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] mb-1.5 border-b border-slate-200 dark:border-white/10 pb-1">
                              {formatModuleName(module)}
                            </h4>
                            <div className="flex flex-col gap-1">
                              {groupedPermissions[module].map(perm => {
                                const isActive = draftPermissions.includes(perm);
                                return (
                                  <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-0.5 rounded">
                                    <input 
                                      type="checkbox" 
                                      checked={isActive} 
                                      onChange={() => toggleDraftPermission(perm)}
                                      className="w-3 h-3 text-[#50B1B9] border-slate-300 rounded focus:ring-[#50B1B9]" 
                                    />
                                    <span className="text-[10px] font-bold tracking-wide capitalize text-slate-700 dark:text-slate-300">
                                      {formatPermName(perm)}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {Object.keys(groupedPermissions).filter(m => !MODULE_LAYOUT.flat().includes(m)).length > 0 && (
                  <div className="border-t border-slate-100 dark:border-white/5 pt-4 mt-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Other Permissions</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.keys(groupedPermissions).filter(m => !MODULE_LAYOUT.flat().includes(m)).map(module => (
                        <div key={module} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-200 dark:border-white/5 h-fit shadow-sm">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] mb-1.5 border-b border-slate-200 dark:border-white/10 pb-1">
                            {formatModuleName(module)}
                          </h4>
                          <div className="flex flex-col gap-1">
                            {groupedPermissions[module].map(perm => {
                              const isActive = draftPermissions.includes(perm);
                              return (
                                <label key={perm} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 p-0.5 rounded">
                                  <input 
                                    type="checkbox" 
                                    checked={isActive} 
                                    onChange={() => toggleDraftPermission(perm)}
                                    className="w-3 h-3 text-[#50B1B9] border-slate-300 rounded focus:ring-[#50B1B9]" 
                                  />
                                  <span className="text-[10px] font-bold tracking-wide capitalize text-slate-700 dark:text-slate-300">
                                    {formatPermName(perm)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end space-x-3 shrink-0 rounded-b-2xl">
              <button onClick={cancelEditing} className="px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={saveEditing}
                className="flex items-center px-4 py-1.5 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
