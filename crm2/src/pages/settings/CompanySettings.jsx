import React, { useState, useEffect } from 'react';
import { companyProfileApi } from '../../services/api';
import { INPUT_STYLE } from '../../utils/themeUtils';
import { Save, Loader2 } from 'lucide-react';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function CompanySettings() {
  const [formData, setFormData] = useState({
    name: '', website: '', phone: '', street_address: '', city: '', country: '', gst_number: '', timezone: 'UTC'
  });
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      const data = await companyProfileApi.get();
      setFormData({
        name: data.name || '', website: data.website || '', phone: data.phone || '',
        street_address: data.street_address || '', city: data.city || '', country: data.country || '',
        gst_number: data.gst_number || '', timezone: data.timezone || 'UTC'
      });
    } catch (error) {
      console.error("Failed to fetch company", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      await companyProfileApi.update(formData);
      setDialogConfig({
        isOpen: true,
        title: "Success",
        description: "Company settings updated successfully!",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    } catch (error) {
      setDialogConfig({
        isOpen: true,
        title: "Error",
        description: "Failed to update company settings.",
        onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
      });
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#095D95]" /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl font-black mb-6 uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Company Settings</h2>
      <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company Name</label>
            <input name="name" value={formData.name} onChange={handleChange} className={INPUT_STYLE} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GST / Tax ID</label>
            <input name="gst_number" value={formData.gst_number} onChange={handleChange} className={INPUT_STYLE} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Website</label>
            <input name="website" value={formData.website} onChange={handleChange} className={INPUT_STYLE} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
            <input name="phone" value={formData.phone} onChange={handleChange} className={INPUT_STYLE} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</label>
            <input name="street_address" value={formData.street_address} onChange={handleChange} className={INPUT_STYLE} />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-white/5">
          <button onClick={handleSave} className="flex items-center px-6 py-3 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
            <Save className="w-4 h-4 mr-2" />
            Save Company Info
          </button>
        </div>
      </div>

      <ConfirmationDialog 
        isOpen={dialogConfig.isOpen}
        title={dialogConfig.title}
        description={dialogConfig.description}
        confirmText="OK"
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
}
