import React, { useState, useEffect } from 'react';
import { usersApi, authService } from '../../services/api';
import { Plus, Edit, Trash2, Loader2, Search, Filter, X, Save } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form States
  const [newUser, setNewUser] = useState({
    email: '', username: '', first_name: '', last_name: '', role: 'sales', password: 'Password123!'
  });
  const [editUser, setEditUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersApi.getAll();
      setUsers(data.results || data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.username || !newUser.first_name || !newUser.last_name) {
      alert("Please fill out all fields.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await authService.register(newUser);
      setIsAddModalOpen(false);
      setNewUser({ email: '', username: '', first_name: '', last_name: '', role: 'sales', password: 'Password123!' });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Failed to create user", error);
      alert("Failed to create user. Make sure the username/email is unique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser({
      id: user.id,
      email: user.email || '',
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'sales'
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser.email || !editUser.first_name || !editUser.last_name) {
      alert("Please fill out required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await usersApi.patch(editUser.id, {
        email: editUser.email,
        first_name: editUser.first_name,
        last_name: editUser.last_name,
        role: editUser.role
      });
      setIsEditModalOpen(false);
      setEditUser(null);
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error("Failed to update user", error);
      alert("Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await usersApi.delete(id);
        fetchUsers();
      } catch (error) {
        console.error("Failed to delete user", error);
        alert("Failed to delete user.");
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const searchString = [u.first_name, u.last_name, u.email, u.username].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#095D95]" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">User Management</h2>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#095D95] dark:group-focus-within:text-[#50B1B9] transition-colors" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT_STYLE} pl-10 !py-2 w-full md:w-64 border-slate-300 dark:border-slate-600 focus:border-[#095D95] dark:focus:border-[#50B1B9] transition-all`}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className={`${INPUT_STYLE} pl-10 !py-2 appearance-none border-slate-300 dark:border-slate-600`}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="sales">Sales Rep</option>
            </select>
          </div>

          <button onClick={() => setIsAddModalOpen(true)} className="flex-shrink-0 flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 relative shadow-sm hover:shadow-md transition-shadow">
        {loading && users.length > 0 && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center z-10 backdrop-blur-sm">
            <Loader2 className="w-6 h-6 animate-spin text-[#095D95]" />
          </div>
        )}
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
              <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">User</th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Role</th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status</th>
              <th className="px-6 py-4 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest">
                  No users found matching your search.
                </td>
              </tr>
            ) : filteredUsers.map(u => (
              <tr key={u.id} className="border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#095D95] to-[#50B1B9] rounded-full flex items-center justify-center font-black text-white shadow-inner">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover rounded-full" alt="avatar" /> : (u.username?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U')}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{u.first_name} {u.last_name}</div>
                    <div className="text-slate-500 mt-0.5">{u.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 capitalize font-bold text-slate-700 dark:text-slate-300">{u.role}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-full font-black text-[10px] uppercase tracking-widest shadow-sm">Active</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => openEditModal(u)} title="Edit User" className="p-2 text-slate-400 hover:text-[#095D95] hover:bg-[#095D95]/10 rounded-lg transition-all transform hover:scale-110 active:scale-95">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteUser(u.id)} title="Delete User" className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all transform hover:scale-110 active:scale-95">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h3 className="font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9]">Invite New User</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                <input 
                  type="text" 
                  value={newUser.username} 
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})} 
                  placeholder="e.g. jdoe" 
                  className={INPUT_STYLE} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})} 
                  placeholder="name@company.com" 
                  className={INPUT_STYLE} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                  <input 
                    type="text" 
                    value={newUser.first_name} 
                    onChange={(e) => setNewUser({...newUser, first_name: e.target.value})} 
                    className={INPUT_STYLE} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input 
                    type="text" 
                    value={newUser.last_name} 
                    onChange={(e) => setNewUser({...newUser, last_name: e.target.value})} 
                    className={INPUT_STYLE} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Role</label>
                <select 
                  value={newUser.role} 
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})} 
                  className={INPUT_STYLE}
                >
                  <option value="sales">Sales Representative</option>
                  <option value="manager">Sales Manager</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end space-x-3">
              <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleCreateUser} 
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h3 className="font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9]">Edit User Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Username (Read-only)</label>
                <input 
                  type="text" 
                  value={editUser.username} 
                  disabled
                  className={`${INPUT_STYLE} opacity-60 bg-slate-100 dark:bg-slate-900`} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email" 
                  value={editUser.email} 
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})} 
                  className={INPUT_STYLE} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
                  <input 
                    type="text" 
                    value={editUser.first_name} 
                    onChange={(e) => setEditUser({...editUser, first_name: e.target.value})} 
                    className={INPUT_STYLE} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input 
                    type="text" 
                    value={editUser.last_name} 
                    onChange={(e) => setEditUser({...editUser, last_name: e.target.value})} 
                    className={INPUT_STYLE} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                <select 
                  value={editUser.role} 
                  onChange={(e) => setEditUser({...editUser, role: e.target.value})} 
                  className={INPUT_STYLE}
                >
                  <option value="sales">Sales Representative</option>
                  <option value="manager">Sales Manager</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end space-x-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleUpdateUser} 
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
