import React, { useState } from 'react';
import { Save, Percent, FileText, Plus, Trash2 } from 'lucide-react';
import { INPUT_STYLE } from '../../utils/themeUtils';
import ConfirmationDialog from '../../components/ConfirmationDialog';

export default function FinancePreferences() {
  const [activeTab, setActiveTab] = useState('taxes');
  const [taxes, setTaxes] = useState(() => {
    const saved = localStorage.getItem('finance_taxes');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'State Tax', rate: 5 },
      { id: 2, name: 'VAT', rate: 20 },
    ];
  });
  const [invoice, setInvoice] = useState(() => {
    const saved = localStorage.getItem('finance_invoice');
    return saved ? JSON.parse(saved) : { prefix: 'INV-', defaultTerms: 'Net 30', currency: 'USD' };
  });
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  const addTax = () => {
    const newId = Math.max(0, ...taxes.map(t => t.id)) + 1;
    setTaxes([...taxes, { id: newId, name: 'New Tax', rate: 0 }]);
  };

  const removeTax = (id) => setTaxes(taxes.filter(t => t.id !== id));
  
  const updateTax = (id, field, value) => {
    setTaxes(taxes.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleSave = () => {
    localStorage.setItem('finance_taxes', JSON.stringify(taxes));
    localStorage.setItem('finance_invoice', JSON.stringify(invoice));
    setDialogConfig({
      isOpen: true,
      title: "Success",
      description: "Finance preferences saved successfully!",
      onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black uppercase tracking-wider text-[#095D95] dark:text-[#50B1B9]">Finance Preferences</h2>
        <button onClick={handleSave} className="flex items-center px-4 py-2 bg-[#095D95] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#074773] transition-colors shadow-lg shadow-[#095D95]/20">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-white/5">
          {[
            { id: 'taxes', label: 'Tax Rates', icon: Percent },
            { id: 'invoice', label: 'Invoice Defaults', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 flex items-center justify-center text-xs font-black uppercase tracking-widest transition-colors ${
                activeTab === tab.id 
                  ? 'border-b-2 border-[#095D95] text-[#095D95] dark:border-[#50B1B9] dark:text-[#50B1B9] bg-slate-50 dark:bg-white/5' 
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          
          {/* Tax Rates Tab */}
          {activeTab === 'taxes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">Default Tax Rates</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure tax rates that can be applied to quotes and invoices.</p>
                </div>
                <button onClick={addTax} className="px-3 py-1.5 bg-[#50B1B9] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#3d8c93] transition-colors flex items-center">
                  <Plus className="w-3 h-3 mr-1" /> Add Tax Rate
                </button>
              </div>

              <div className="space-y-3">
                {taxes.map((tax) => (
                  <div key={tax.id} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-white/5 group hover:border-[#50B1B9]/50 transition-colors">
                    <input 
                      type="text" 
                      value={tax.name} 
                      onChange={(e) => updateTax(tax.id, 'name', e.target.value)}
                      className={`${INPUT_STYLE} !py-1.5 !text-sm flex-1`}
                      placeholder="Tax Name (e.g. VAT)"
                    />
                    <div className="flex items-center w-32 relative">
                      <input 
                        type="number" 
                        value={tax.rate} 
                        onChange={(e) => updateTax(tax.id, 'rate', e.target.value)}
                        className={`${INPUT_STYLE} !py-1.5 !text-sm !pr-8`}
                        min="0" step="0.1"
                      />
                      <span className="absolute right-3 text-xs text-slate-400">%</span>
                    </div>
                    <button onClick={() => removeTax(tax.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Defaults Tab */}
          {activeTab === 'invoice' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Prefix</label>
                  <input 
                    type="text" 
                    value={invoice.prefix} 
                    onChange={(e) => setInvoice({...invoice, prefix: e.target.value})}
                    className={INPUT_STYLE} 
                    placeholder="e.g. INV-"
                  />
                  <p className="text-[10px] text-slate-500">Next invoice will be: <span className="font-bold">{invoice.prefix}1001</span></p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Currency</label>
                  <select 
                    value={invoice.currency} 
                    onChange={(e) => setInvoice({...invoice, currency: e.target.value})}
                    className={INPUT_STYLE}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Default Payment Terms</label>
                  <select 
                    value={invoice.defaultTerms} 
                    onChange={(e) => setInvoice({...invoice, defaultTerms: e.target.value})}
                    className={INPUT_STYLE}
                  >
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
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
