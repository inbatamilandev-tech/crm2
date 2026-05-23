import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, Plus, Search, MapPin, 
  Filter, Loader2, MoreHorizontal, X
} from 'lucide-react';
import { accountsApi, dealsApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';

export default function Accounts() {
  const fetchAccountsAndDeals = useCallback(async (params, config) => {
    const [accountsRes, dealsRes] = await Promise.all([
      accountsApi.getAll(params, config),
      dealsApi.getAll()
    ]);
    
    const fetchedAccounts = accountsRes.results || accountsRes;
    const fetchedDeals = dealsRes.results || dealsRes;
    
    const accountMap = {};
    
    fetchedAccounts.forEach(acc => {
       accountMap[acc.id] = {
          id: acc.id,
          name: acc.name,
          industry: acc.industry || 'General',
          size: acc.company_size || 'N/A',
          contacts: acc.contacts_count || 0,
          openDeals: acc.open_deals_count || 0,
          value: acc.pipeline_value || 0,
          location: acc.location || 'N/A',
          website: acc.website || '',
          phone: acc.phone || '',
          annual_revenue: acc.annual_revenue || ''
       };
    });
    
    return Object.values(accountMap);
  }, []);

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
  } = usePagination(fetchAccountsAndDeals);

  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editAccountId, setEditAccountId] = useState(null);
  const [formData, setFormData] = useState({ name: '', industry: '', website: '', location: '', phone: '', company_size: '', annual_revenue: '' });
  const { addToast } = useToast();

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

  const fetchAccounts = useCallback(async () => {
    const params = {};
    if (debouncedSearchTerm) {
      params.search = debouncedSearchTerm;
    }
    const data = await loadData(params);
    setAccounts(data);
  }, [loadData, debouncedSearchTerm]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDeleteAccount = async (id) => {
    if (!window.confirm("Are you sure you want to delete this account?")) return;
    try {
      await accountsApi.delete(id);
      addToast('Account deleted successfully');
      fetchAccounts();
    } catch (err) {
      addToast('Failed to delete account', 'error');
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        industry: formData.industry,
        website: formData.website,
        location: formData.location,
        phone: formData.phone,
        company_size: formData.company_size,
        annual_revenue: formData.annual_revenue,
      };

      if (isEditMode) {
        await accountsApi.update(editAccountId, payload);
        addToast('Account updated successfully');
      } else {
        await accountsApi.create(payload);
        addToast('Account created successfully');
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setFormData({ name: '', industry: '', website: '', location: '', phone: '', company_size: '', annual_revenue: '' });
      fetchAccounts();
    } catch (err) {
      const errorMsg = err.response?.data?.website?.[0] || 'Failed to save account';
      addToast(errorMsg, 'error');
    }
  };

  // Server-side filtering and pagination are used
  const filteredAccounts = accounts.sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Accounts</h2>
          <div className="flex items-center mt-1 space-x-2">
            <span className="text-sm font-medium text-slate-500">Sales</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-sm font-bold text-blue-600">{filteredAccounts.length} Total Accounts</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all"
            />
            {(isSearching || isLoading) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-5 py-2.5 bg-[#1a56d9] text-white rounded-[4px] font-medium text-[13px] hover:bg-blue-700 transition-all"
          >
            <Plus className="mr-2 w-4 h-4" />
            Create Account
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden min-h-[500px] relative">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-20">
            <div className="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('name')}>Account Name</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('location')}>Location</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('industry')}>Industry</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('contacts')}>Contacts</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('openDeals')}>Open Deals</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600 text-right cursor-pointer" onClick={() => handleSort('value')}>Value</th>
                  <th className="px-6 py-3 text-[13px] font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.map((acc, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-[13px] font-medium text-blue-600 hover:underline">{acc.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-gray-800">{acc.location}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] text-gray-800">{acc.industry}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-gray-800">{acc.contacts}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] text-gray-800">{acc.openDeals}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <span className="text-[13px] text-gray-800">${acc.value.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                       <button 
                         onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === acc.id ? null : acc.id); }}
                         className="text-gray-400 hover:text-gray-600 p-1"
                       >
                          <MoreHorizontal className="w-4 h-4" />
                       </button>
                       {openMenuId === acc.id && (
                         <div className="absolute right-6 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 text-left">
                           <button 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               setIsEditMode(true);
                               setEditAccountId(acc.id);
                               setFormData({
                                 name: acc.name,
                                 industry: acc.industry,
                                 website: acc.website,
                                 location: acc.location === 'N/A' ? '' : acc.location,
                                 phone: acc.phone,
                                 company_size: acc.size === 'N/A' ? '' : acc.size,
                                 annual_revenue: acc.annual_revenue
                               });
                               setIsModalOpen(true);
                               setOpenMenuId(null); 
                             }}
                             className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                           >
                             <span>Edit Account</span>
                           </button>
                           <button 
                             onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); setOpenMenuId(null); }}
                             className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center space-x-2"
                           >
                             <span>Delete Account</span>
                           </button>
                         </div>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAccounts.length === 0 && (
               <div className="p-20 flex flex-col items-center justify-center text-center border-t border-gray-100">
                  <div className="text-[14px] text-gray-500">No matching accounts found.</div>
               </div>
            )}
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={changeRowsPerPage}
      />

      {/* Account Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <h3 className="text-[16px] font-semibold text-gray-800">{isEditMode ? 'Edit Account' : 'Create Account'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddAccount} className="p-6">
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Account Name *</div>
                  <div className="flex-1">
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Industry</div>
                  <div className="flex-1">
                    <select value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                      <option value="">None</option>
                      <option>Technology</option>
                      <option>Manufacturing</option>
                      <option>Healthcare</option>
                      <option>Finance</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Website</div>
                  <div className="flex-1">
                    <input type="url" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="https://example.com" />
                    <p className="text-[11px] text-slate-400 mt-1">Please enter a valid URL (e.g., https://example.com)</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Location</div>
                  <div className="flex-1">
                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. New York, USA" />
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Phone</div>
                  <div className="flex-1">
                    <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. +1234567890" />
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Company Size</div>
                  <div className="flex-1">
                    <input type="text" value={formData.company_size} onChange={e => setFormData({...formData, company_size: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 11-50 employees" />
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="w-32 text-[13px] text-gray-600 text-right pr-4">Annual Revenue</div>
                  <div className="flex-1">
                    <input type="number" value={formData.annual_revenue} onChange={e => setFormData({...formData, annual_revenue: e.target.value})} className="w-full px-3 py-1.5 border border-gray-300 rounded-[4px] text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 50000" />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-[4px] text-[13px] hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 bg-[#1a56d9] font-medium text-white rounded-[4px] text-[13px] hover:bg-blue-700 transition-colors flex items-center">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
