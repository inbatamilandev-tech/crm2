import React from 'react';
import { Users as UsersIcon, UserPlus, MoreVertical, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';

const dummyUsers = [
  { id: 1, name: 'Admin User', email: 'admin@crm.com', role: 'Admin', status: 'Active', avatar: 'A' },
  { id: 2, name: 'Sales Manager', email: 'manager@crm.com', role: 'Manager', status: 'Active', avatar: 'M' },
  { id: 3, name: 'Sales Rep 1', email: 'rep1@crm.com', role: 'User', status: 'Active', avatar: 'R' },
  { id: 4, name: 'Sales Rep 2', email: 'rep2@crm.com', role: 'User', status: 'Inactive', avatar: 'R' },
];

export default function Users() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage team members and their access permissions.</p>
        </div>
        <button className="flex items-center px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 self-start sm:self-auto">
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Users</div>
          <div className="text-2xl font-black text-slate-900">4</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active</div>
          <div className="text-2xl font-black text-emerald-500">3</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Inactive</div>
          <div className="text-2xl font-black text-slate-400">1</div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dummyUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-black">
                        {user.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{user.name}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      {user.role === 'Admin' && <ShieldAlert className="w-4 h-4 mr-1.5 text-rose-500" />}
                      {user.role === 'Manager' && <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-500" />}
                      {user.role === 'User' && <Shield className="w-4 h-4 mr-1.5 text-slate-400" />}
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                      user.status === 'Active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
