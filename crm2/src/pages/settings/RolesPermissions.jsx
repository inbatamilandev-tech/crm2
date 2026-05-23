import React, { useState, useEffect } from 'react';
import api, { rolesApi } from '../../services/api';
import { Plus, Check, Loader2, X, Shield, ToggleLeft, ToggleRight, Settings2, Save } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';

export default function RolesPermissions() {
  const [roles, setRoles] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  
  // Draft state for editing permissions
  const [draftPermissions, setDraftPermissions] = useState([]);
  
  // New role form state
  const [newRole, setNewRole] = useState({ name: '', scope: 'own', cloneFrom: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rolesRes = await rolesApi.getAll();
      const permsRes = await api.get('/roles/permissions/');
      setRoles(rolesRes.results || rolesRes);
      setAvailablePermissions(permsRes.data || []);
    } catch (error) {
      console.error("Failed to fetch roles/permissions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name) {
      alert("Role name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      let permsList = [];
      if (newRole.cloneFrom) {
        const sourceRole = roles.find(r => r.id.toString() === newRole.cloneFrom.toString());
        if (sourceRole) {
          permsList = sourceRole.permissions || [];
        }
      }
      
      await rolesApi.create({
        name: newRole.name,
        scope: newRole.scope,
        permissions_list: permsList
      });
      alert("Role created successfully!");
      setIsAddModalOpen(false);
      setNewRole({ name: '', scope: 'own', cloneFrom: '' });
      fetchData();
    } catch (error) {
      console.error("Failed to create role", error);
      alert("Failed to create role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditing = (role) => {
    setEditingRole(role.id);
    setDraftPermissions([...(role.permissions || [])]);
  };

  const saveEditing = async (roleId) => {
    try {
      await rolesApi.patch(roleId, { permissions_list: draftPermissions });
      alert("Permissions updated!");
      setEditingRole(null);
      fetchData(); // Refresh UI
    } catch (error) {
      console.error("Failed to update permissions", error);
      alert("Failed to update permissions.");
    }
  };

  const cancelEditing = () => {
    setEditingRole(null);
    setDraftPermissions([]);
  };

  const toggleDraftPermission = (perm) => {
    if (draftPermissions.includes(perm)) {
      setDraftPermissions(draftPermissions.filter(p => p !== perm));
    } else {
      setDraftPermissions([...draftPermissions, perm]);
    }
  };

  if (loading && roles.length === 0) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#095D95]" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Roles & Permissions</h2>
          <p className="text-xs text-slate-500 mt-1">Manage access control and operational scopes across the CRM.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </button>
      </div>

      <div className="space-y-6">
        {loading && roles.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#095D95]" />
          </div>
        )}
        {roles.map(role => {
          const isEditing = editingRole === role.id;
          const displayPerms = isEditing ? draftPermissions : (role.permissions || []);
          
          return (
            <div key={role.id} className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-[#50B1B9]/50 transition-colors overflow-hidden shadow-sm relative">
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50/50 dark:bg-transparent gap-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-[#DF7F09]/10 rounded-xl flex items-center justify-center mr-4">
                    <Shield className="w-5 h-5 text-[#DF7F09]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white">
                      {role.name}
                    </h3>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      Scope: <span className="text-[#50B1B9]">{role.scope}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={cancelEditing} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 transition-colors">
                        Cancel
                      </button>
                      <button onClick={() => saveEditing(role.id)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center transition-colors bg-[#095D95] text-white hover:bg-[#074773]">
                        <Save className="w-3 h-3 mr-1.5" />
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => startEditing(role)}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center transition-colors bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10"
                    >
                      <Settings2 className="w-3 h-3 mr-1.5" />
                      Edit Permissions
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {isEditing ? (
                    // In edit mode, show all available permissions as toggles
                    availablePermissions.map(perm => {
                      const isActive = draftPermissions.includes(perm);
                      return (
                        <div key={perm} className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                          isActive ? 'border-[#50B1B9] bg-[#50B1B9]/5 dark:bg-[#50B1B9]/10' : 'border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800'
                        }`} onClick={() => toggleDraftPermission(perm)}>
                          <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">{perm}</span>
                          <button className={`transition-colors ${isActive ? 'text-[#50B1B9]' : 'text-slate-300 dark:text-slate-600'}`}>
                            {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    // Read-only mode
                    displayPerms.map(perm => (
                      <div key={perm} className="flex items-center space-x-3 p-3 rounded-xl border border-transparent bg-slate-50 dark:bg-white/5">
                        <Check className="w-4 h-4 text-[#50B1B9]" />
                        <span className="text-xs font-bold tracking-wide text-slate-700 dark:text-slate-300">{perm}</span>
                      </div>
                    ))
                  )}
                  {!isEditing && displayPerms.length === 0 && (
                    <div className="text-xs text-slate-500 font-bold col-span-full">No permissions assigned.</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Role Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h3 className="font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9]">Create New Role</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role Name</label>
                <input 
                  type="text" 
                  value={newRole.name} 
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})} 
                  placeholder="e.g. Regional Manager" 
                  className={INPUT_STYLE} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Scope</label>
                <select 
                  value={newRole.scope} 
                  onChange={(e) => setNewRole({...newRole, scope: e.target.value})} 
                  className={INPUT_STYLE}
                >
                  <option value="own">Own Records Only</option>
                  <option value="team">Team Records</option>
                  <option value="global">Global Access</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Determines which records this role can view and modify.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clone Permissions From</label>
                <select 
                  value={newRole.cloneFrom} 
                  onChange={(e) => setNewRole({...newRole, cloneFrom: e.target.value})} 
                  className={INPUT_STYLE}
                >
                  <option value="">Start Empty</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end space-x-3">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleCreateRole} 
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
