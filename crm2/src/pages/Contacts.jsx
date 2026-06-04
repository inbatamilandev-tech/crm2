import React, { useState, useEffect, useCallback } from 'react';
import Table from '../components/Table';
import { contactsApi } from '../services/api';
import { 
  Plus, Filter, X, Zap, Loader2, AlertCircle, Trash2, Edit2,
  Search, Mail, Phone, Building2, UserCircle, MoreVertical,
  Download, Globe, MessageSquare, ArrowDown
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import ConfirmationDialog from '../components/ConfirmationDialog';

export default function Contacts() {
  const { 
    currentPage, 
    rowsPerPage, 
    totalRecords, 
    totalPages, 
    isLoading, 
    error, 
    setPage, 
    changeRowsPerPage, 
    loadData, 
    setCurrentPage 
  } = usePagination(contactsApi.getAll);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const { addToast } = useToast();
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  // Debounce search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsSearching(true);
    }
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, debouncedSearchTerm, setCurrentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', company: ''
  });

  const resetForm = () => {
    setEditingContact(null);
    setFormData({ name: '', email: '', phone: '', company: '' });
    setIsModalOpen(false);
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || ''
    });
    setIsModalOpen(true);
  };

  const fetchContacts = useCallback(async () => {
    const params = {};
    if (debouncedSearchTerm) {
      params.search = debouncedSearchTerm;
    }
    const data = await loadData(params);
    setContacts(data);
  }, [loadData, debouncedSearchTerm]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleDelete = async (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Record",
      description: "Archiving this contact will remove it from active pipelines. Proceed?",
      onConfirm: async () => {
        setDialogConfig({ ...dialogConfig, isOpen: false });
        try {
          await contactsApi.delete(id);
          addToast("Contact successfully archived");
          fetchContacts();
        } catch (err) {
          addToast("Failed to archive contact", "error");
        }
      }
    });
  };

  const columns = [
    { 
      header: 'Contact Identity',
      accessor: 'name',
      render: (row) => {
        const initials = row.name.split(' ').map(n => n[0]).join('');
        return (
          <div className="flex items-center group">
            <div className="h-10 w-10 rounded-xl bg-[#0F172A]/20 flex items-center justify-center text-[#0F172A]/70 font-black mr-4 shadow-sm border border-white group-hover:scale-110 transition-transform">
              {initials.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-[#0F172A] block group-hover:text-[#0F172A] transition-colors">{row.name}</span>
              <div className="flex items-center text-[11px] text-[#0F172A]/70 font-medium mt-0.5">
                <Mail className="w-3 h-3 mr-1.5 opacity-40" /> {row.email}
              </div>
            </div>
          </div>
        );
      }
    },
    { 
      header: 'Organisation', 
      accessor: 'company', 
      render: (row) => (
        <div className="flex items-center text-[#0F172A]/70 font-bold text-sm">
          <Building2 className="w-3.5 h-3.5 mr-2 opacity-30" />
          {row.company || 'Private Entity'}
        </div>
      )
    },
    { 
      header: 'Direct Line', 
      accessor: 'phone', 
      render: (row) => (
        <div className="flex items-center text-[#0F172A]/70 font-medium text-sm">
          <Phone className="w-3.5 h-3.5 mr-2 opacity-30" />
          {row.phone || 'Not Registered'}
        </div>
      )
    },
    { 
      header: '', 
      accessor: 'actions',
      render: (row) => (
        <div className="flex justify-end space-x-1">
          <button className="p-2 text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-blue-50 rounded-xl transition-all" title="Message">
            <MessageSquare className="w-4 h-4" />
          </button>
          <button onClick={() => handleEdit(row)} className="p-2 text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-blue-50 rounded-xl transition-all" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row.id)} className="p-2 text-[#0F172A]/50 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // Server-side filtering and pagination are used
  const filteredData = contacts;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingContact) {
        await contactsApi.update(editingContact.id, formData);
        addToast("Contact updated successfully");
      } else {
        await contactsApi.create(formData);
        addToast("Contact created successfully");
      }
      resetForm();
      fetchContacts();
    } catch (err) {
      addToast("Operation failed", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <UserCircle className="w-5 h-5 text-[#0F172A]" />
             <span className="text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest">Contacts</span>
          </div>
          <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Contacts</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/50 group-focus-within:text-[#0F172A] transition-colors" />
            <input 
              type="text" 
              placeholder="Find a contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-10 py-2.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-72 transition-all shadow-sm"
            />
            {(isSearching || isLoading) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/50 animate-spin" />
            )}
          </div>
          <button 
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8,name,email,phone,company\n" + 
                contacts.map(c => `"${c.name || ''}","${c.email || ''}","${c.phone || ''}","${c.company || ''}"`).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", "contacts.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="p-2.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-2xl text-[#0F172A]/70 hover:bg-[#0F172A]/10 transition-all shadow-sm"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-6 py-2.5 bg-[#0F172A] text-[#F8FAFC] rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Register Record
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-[#F8FAFC] rounded-[32px] border border-[#0F172A]/20 shadow-xl shadow-slate-200/40 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F8FAFC]/80 z-20 backdrop-blur-[1px]">
            <div className="w-12 h-12 border-4 border-[#0F172A]/10 border-t-blue-600 rounded-full animate-spin" />
            <p className="mt-4 text-xs font-black text-[#0F172A]/50 uppercase tracking-widest">Syncing Identity Data...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#F8FAFC] z-20">
             <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mb-6">
                <AlertCircle className="w-10 h-10 text-rose-500" />
             </div>
             <h3 className="text-xl font-black text-[#0F172A]">Database Connection Error</h3>
             <p className="text-[#0F172A]/70 mt-2 max-w-xs font-medium">{error}</p>
             <button onClick={fetchContacts} className="mt-8 px-8 py-3 bg-[#0F172A] text-[#F8FAFC] rounded-2xl font-black text-sm shadow-lg shadow-slate-900/20 hover:-translate-y-0.5 transition-all">
                Attempt Reconnect
             </button>
          </div>
        ) : null}

        <div className="overflow-auto max-h-[500px] relative">
          <table className="min-w-full divide-y divide-[#0F172A]/20">
            <thead className="bg-[#0F172A] sticky top-0 z-20">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-black text-[#F8FAFC] uppercase tracking-wider"
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-[#F8FAFC] divide-y divide-[#0F172A]/20">
              {contacts.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-[#0F172A]/20 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A] font-medium">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={totalRecords}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={changeRowsPerPage}
        /> */}
{/*         
        {filteredData.length === 0 && !isLoading && (
          //  <div className="p-20 flex flex-col items-center justify-center text-center">
          //     <div className="w-24 h-24 bg-[#0F172A]/10 rounded-full flex items-center justify-center mb-6 border border-[#0F172A]/10">
          //        <Globe className="w-10 h-10 text-slate-300" />
          //     </div>
          //     <h3 className="text-xl font-black text-[#0F172A]">No Records Found</h3>
          //     <p className="text-[#0F172A]/70 mt-2 font-medium">Your search criteria didn't return any active contacts.</p>
          //  </div>
        )} */}
      </div>

      {/* Register Record Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-10 p-4">
          <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-sm animate-fade-in" onClick={resetForm} />
          <div className="bg-[#F8FAFC] rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-[#0F172A]/5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-[#0F172A]">
                  {editingContact ? "Edit Contact" : "Add Contact"}
                </h3>
                <p className="text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest mt-1">Contact Establishment</p>
              </div>
              <button onClick={resetForm} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0F172A]/10 text-[#0F172A]/50 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest mb-2">Legal Identity Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Full legal name" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest mb-2">Electronic Mail Point *</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="identity@domain.com" />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest mb-2">Contact Protocol</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="+0 000-0000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#0F172A]/50 uppercase tracking-widest mb-2">Corporate Entity</label>
                    <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="input-field" placeholder="Organisation name" />
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-4 border-t border-[#0F172A]/5 flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="px-6 py-3 text-sm font-bold text-[#0F172A]/50 hover:text-[#0F172A] transition-colors">Discard</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-[#0F172A] text-[#F8FAFC] rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center">
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingContact ? "Save Changes" : "Register Entry"}
                </button>
              </div>
            </form>
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
