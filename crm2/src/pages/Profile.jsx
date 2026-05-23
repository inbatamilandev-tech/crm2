import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Key, Camera, Loader2, Globe, Bell, Smartphone, Lock, Eye, CreditCard, LogOut, Check, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    bio: '',
    avatar: '',
    language: 'English',
    timezone: 'UTC-8',
    theme: 'dark',
    notifications: {
      email: true,
      sms: false,
      push: true,
      privacy: {
        profile_visibility: true,
        activity_status: true,
        data_sharing: false,
        two_factor_prompt: true
      }
    }
  });
  
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  const [activeTab, setActiveTab] = useState('personal');
  const [loginHistory, setLoginHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  // Mock data for fallback (Activity Section)
  const [mockActivity, setMockActivity] = useState([
    { id: 1, title: 'Security Alert', message: 'New login detected from Chrome on Linux.', time: '10m ago', unread: true },
    { id: 2, title: 'Profile Updated', message: 'Your profile information was successfully updated.', time: '1h ago', unread: false },
  ]);

  useEffect(() => {
    fetchProfileData();
    fetchHistory();
    fetchSessions();
    fetchAuditLogs();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await authService.getSessions();
      setSessions(data.results || data);
    } catch (error) {
      console.error("Failed to fetch sessions", error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await authService.getAuditLogs();
      setAuditLogs(data.results || data);
    } catch (error) {
      console.error("Failed to fetch audit logs", error);
    }
  };

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const data = await authService.getCurrentUser();
      setProfile(prev => ({
        ...prev,
        ...data,
        notifications: {
          ...prev.notifications,
          ...data.notifications
        }
      }));
    } catch (error) {
      console.error("Failed to fetch profile", error);
      addToast('Failed to load profile data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await authService.getLoginHistory();
      // Handle paginated response
      const historyArray = data.results || data;
      setLoginHistory(Array.isArray(historyArray) ? historyArray.slice(0, 5) : []);
    } catch (error) {
      console.error("Failed to fetch login history", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePrivacyToggle = async (key) => {
    const currentPrivacy = profile.notifications?.privacy || {};
    const updatedPrivacy = {
      ...currentPrivacy,
      [key]: !currentPrivacy[key]
    };
    
    const updatedNotifications = {
      ...profile.notifications,
      privacy: updatedPrivacy
    };
    
    setProfile(prev => ({
      ...prev,
      notifications: updatedNotifications
    }));
    
    try {
      await authService.updateProfile({ notifications: updatedNotifications });
      addToast('Privacy setting updated!', 'success');
    } catch (error) {
      console.error("Failed to update privacy setting", error);
      addToast('Failed to update privacy setting', 'error');
      // Revert state on failure
      setProfile(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          privacy: currentPrivacy
        }
      }));
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { avatar, ...updateData } = profile;
      const updatedUser = await authService.updateProfile(updateData);
      setUser(updatedUser);
      addToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error("Failed to update profile", error);
      addToast('Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    setProfile(prev => ({ ...prev, theme: newTheme }));
    try {
      await authService.updateProfile({ theme: newTheme });
      addToast(`Theme switched to ${newTheme}!`, 'success');
    } catch (error) {
      console.error("Failed to update theme", error);
      setProfile(prev => ({ ...prev, theme: profile.theme }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-black text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { id: 'personal', icon: User, label: 'Personal Information' },
    { id: 'privacy', icon: Lock, label: 'Privacy Settings' },
    { id: 'security', icon: Key, label: 'Security Settings' },
    { id: 'devices', icon: Smartphone, label: 'Connected Devices' },
    { id: 'activity', icon: Bell, label: 'Recent Activity' },
  ];

  return (
    <div className={`space-y-6 p-6 ${profile.theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'} min-h-screen transition-colors duration-300`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter">Profile Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal information, security, and privacy.</p>
        </div>
        <button 
          onClick={handleThemeToggle}
          className="p-3 rounded-full border border-slate-800 hover:bg-slate-900 transition-colors"
        >
          {profile.theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-slate-950 rounded-3xl border border-slate-800 p-4 shadow-xl space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-2xl transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <item.icon className={`w-4 h-4 mr-3 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Main Content Panel */}
        <div className="lg:col-span-3">
          {/* Personal Information Section */}
          {activeTab === 'personal' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-black uppercase tracking-wider mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">First Name</label>
                  <input 
                    type="text" 
                    name="first_name"
                    value={profile.first_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-black transition-all text-sm outline-none text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Last Name</label>
                  <input 
                    type="text" 
                    name="last_name"
                    value={profile.last_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-black transition-all text-sm outline-none text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email Address (Read Only)</label>
                  <input 
                    type="email" 
                    name="email"
                    value={profile.email}
                    readOnly
                    className="w-full px-4 py-3 bg-slate-800 border border-transparent rounded-xl text-sm outline-none text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Phone Number</label>
                  <input 
                    type="text" 
                    name="phone"
                    value={profile.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-black transition-all text-sm outline-none text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Language</label>
                  <select 
                    name="language"
                    value={profile.language}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-black transition-all text-sm outline-none text-white"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Bio</label>
                  <textarea 
                    name="bio"
                    value={profile.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-blue-500 focus:bg-black transition-all text-sm outline-none resize-none text-white"
                    placeholder="Tell us a little about yourself..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 flex items-center"
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Privacy Settings Section */}
          {activeTab === 'privacy' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-black uppercase tracking-wider mb-4">Privacy Settings</h3>
              
              <div className="space-y-4">
                {[
                  { id: 'profile_visibility', label: 'Public Profile', description: 'Make your profile visible to other team members.' },
                  { id: 'activity_status', label: 'Activity Status', description: 'Show when you are active in the system.' },
                  { id: 'data_sharing', label: 'Anonymized Data Sharing', description: 'Share anonymized usage data to help improve the CRM.' },
                  { id: 'two_factor_prompt', label: 'Always Prompt 2FA', description: 'Require 2FA on every login attempt.' },
                ].map(item => {
                  const val = profile.notifications?.privacy?.[item.id] ?? false;
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-bold text-white">{item.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                      <button 
                        onClick={() => handlePrivacyToggle(item.id)}
                        className={`w-12 h-6 rounded-full relative p-0.5 transition-colors focus:outline-none ${val ? 'bg-blue-600' : 'bg-slate-700'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform ${val ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeTab === 'security' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-black uppercase tracking-wider mb-4">Security Settings</h3>
              
              <div className="space-y-6">
                {/* Active Sessions */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider">Active Sessions</h4>
                    <button 
                      onClick={async () => {
                        await authService.logoutAllSessions();
                        fetchSessions();
                        addToast('All other sessions terminated.', 'success');
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
                    >
                      Logout All Other Devices
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {sessions.length > 0 ? (
                      sessions.map(session => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-slate-800 rounded-lg">
                              <Smartphone className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">
                                {session.browser} on {session.os}
                                {session.is_active && session.session_key === localStorage.getItem('session_id') && (
                                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Current</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{session.ip_address} • {session.location}</p>
                              <p className="text-[10px] text-slate-600">Last active: {new Date(session.last_seen).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {session.is_active ? (
                            <button 
                              onClick={async () => {
                                await authService.logoutSession(session.id);
                                fetchSessions();
                                addToast('Session terminated.', 'success');
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                            >
                              Terminate
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-slate-600">Inactive</span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No active sessions found.</p>
                    )}
                  </div>
                </div>
                
                <hr className="border-slate-800" />
                
                {/* Audit Timeline */}
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">Audit Timeline</h4>
                  <div className="space-y-4">
                    {auditLogs.length > 0 ? (
                      auditLogs.map(log => (
                        <div key={log.id} className="flex items-start space-x-3">
                          <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
                          <div>
                            <p className="text-sm font-bold text-white">{log.action_type}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{log.module} • {log.ip_address}</p>
                            <p className="text-[10px] text-slate-600 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No audit logs found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connected Devices Section */}
          {activeTab === 'devices' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <h3 className="text-xl font-black uppercase tracking-wider mb-4">Connected Devices</h3>
              
              <div className="space-y-4">
                {loginHistory.length > 0 ? (
                  loginHistory.map((device, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                      <div className="flex items-center">
                        <Smartphone className="w-5 h-5 text-slate-500 mr-3" />
                        <div>
                          <p className="text-sm font-bold text-white">{device.user_agent || 'Unknown Device'}</p>
                          <p className="text-xs text-slate-500">{device.ip_address} • {device.location || 'Unknown Location'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400">{new Date(device.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No recent login history found.</p>
                )}
              </div>
            </div>
          )}

          {/* Recent Activity Section (Fallback Mock) */}
          {activeTab === 'activity' && (
            <div className="bg-slate-950 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black uppercase tracking-wider">Recent Activity</h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full">Mock Fallback</span>
              </div>
              
              <div className="space-y-4">
                {mockActivity.map(activity => (
                  <div key={activity.id} className={`flex items-start justify-between p-4 rounded-2xl ${activity.unread ? 'bg-blue-600/10 border border-blue-600/20' : 'bg-slate-900'}`}>
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${activity.unread ? 'bg-blue-500' : 'bg-slate-500'}`} />
                      <div>
                        <p className="text-sm font-bold text-white">{activity.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{activity.message}</p>
                        <p className="text-[10px] text-slate-600 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
