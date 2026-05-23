import React, { useState, useEffect } from 'react';
import { Upload, Save } from 'lucide-react';
import { authService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { INPUT_STYLE } from '../../utils/themeUtils';

export default function ProfileSettings() {
  const { user, setUser: setGlobalUser } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const updatedUser = await authService.updateProfile(formData);
      setGlobalUser(updatedUser);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Failed to update profile.");
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const response = await authService.uploadAvatar(file);
      const updatedUser = response.data || response;
      setGlobalUser(updatedUser);
      alert("Avatar updated successfully!");
    } catch (error) {
      console.error("Failed to upload avatar", error);
      alert("Failed to upload avatar.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Profile Settings</h2>
        <button onClick={handleSave} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        
        {/* Avatar Section */}
        <div className="p-8 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center space-x-6">
          <div className="relative w-24 h-24 group cursor-pointer" onClick={() => document.getElementById('avatarInput').click()}>
            <div className="w-full h-full bg-gradient-to-tr from-[#095D95] to-[#50B1B9] rounded-full flex items-center justify-center text-3xl font-black overflow-hidden text-white shadow-lg">
              {user?.avatar ? (
                <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user?.username?.[0]?.toUpperCase() || 'U'
              )}
            </div>
            <div className="absolute inset-0 bg-[#095D95]/80 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Upload className="w-6 h-6 text-white mb-1" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Update</span>
            </div>
          </div>
          <input 
            type="file" 
            id="avatarInput" 
            className="hidden" 
            accept="image/*"
            onChange={handleAvatarChange}
          />
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">{user?.first_name} {user?.last_name}</h3>
            <p className="text-sm text-slate-500 mb-3">{user?.email}</p>
            <button 
              onClick={() => document.getElementById('avatarInput').click()}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-sm"
            >
              Upload New Photo
            </button>
          </div>
        </div>
        
        {/* Form Section */}
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} className={INPUT_STYLE} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Name</label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} className={INPUT_STYLE} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
              <input name="email" value={formData.email} onChange={handleChange} className={INPUT_STYLE} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className={INPUT_STYLE} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Professional Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} className={INPUT_STYLE} rows="4" placeholder="Tell us a little bit about yourself..." />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
