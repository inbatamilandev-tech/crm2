import React, { useState, useEffect } from 'react';
import { Building2, Globe, MapPin, CreditCard, Loader2 } from 'lucide-react';
import { companyProfileApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function AccountSettings() {
  const [profile, setProfile] = useState({
    name: '',
    website: '',
    phone: '',
    street_address: '',
    city: '',
    country: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await companyProfileApi.get();
        setProfile(data);
      } catch (error) {
        console.error("Failed to fetch profile", error);
        addToast('Failed to load company profile', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await companyProfileApi.update(profile);
      addToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error("Failed to update profile", error);
      addToast('Failed to update profile', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Account Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your company profile and billing information.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Company Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Profile */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <Building2 className="w-5 h-5 text-slate-400 mr-2" />
              <h3 className="text-base font-bold text-slate-900">Company Profile</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Company Name</label>
                <input 
                  type="text" 
                  name="name"
                  value={profile.name || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Website</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    name="website"
                    value={profile.website || ''}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Phone</label>
                <input 
                  type="text" 
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                />
              </div>
            </div>
            <div className="mt-6">
              <button 
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Save Profile
              </button>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-slate-400 mr-2" />
              <h3 className="text-base font-bold text-slate-900">Address</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Street Address</label>
                <input 
                  type="text" 
                  name="street_address"
                  value={profile.street_address || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">City</label>
                <input 
                  type="text" 
                  name="city"
                  value={profile.city || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Country</label>
                <input 
                  type="text" 
                  name="country"
                  value={profile.country || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all text-sm outline-none"
                />
              </div>
            </div>
            <div className="mt-6">
              <button 
                onClick={handleSave}
                className="px-6 py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
              >
                Save Address
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Billing Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <CreditCard className="w-5 h-5 text-slate-400 mr-2" />
              <h3 className="text-base font-bold text-slate-900">Billing Plan</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Current Plan</span>
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Pro</span>
              </div>
              <div className="text-2xl font-black text-slate-900">$49<span className="text-sm font-normal text-slate-500">/mo</span></div>
            </div>
            <ul className="text-sm text-slate-600 space-y-2 mb-6">
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Up to 10 users
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Unlimited deals
              </li>
              <li className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2" />
                Custom reporting
              </li>
            </ul>
            <button className="w-full px-6 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
