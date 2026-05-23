import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, Tag, Hash, 
  FileBox, ChevronRight, Activity, DollarSign, 
  Archive, MoreHorizontal, Zap, X, Grid, List,
  Clock, CheckCircle, XCircle
} from 'lucide-react';
import Table from '../components/Table';
import { productsApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'web_dev',
    service_type: 'service',
    price: '',
    description: '',
    estimated_timeline: '',
    is_active: true
  });

  const { addToast } = useToast();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await productsApi.getAll();
      setProducts(data.results || data);
    } catch (err) {
      addToast('Failed to fetch products', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        price: parseFloat(formData.price)
      };
      await productsApi.create(payload);
      addToast('Product created successfully!', 'success');
      setIsModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        category: 'web_dev',
        service_type: 'service',
        price: '',
        description: '',
        estimated_timeline: '',
        is_active: true
      });
      fetchProducts();
    } catch (err) {
      addToast('Failed to create product', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory ? p.category === filterCategory : true;
    const matchesStatus = filterStatus ? (filterStatus === 'active' ? p.is_active : !p.is_active) : true;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const columns = [
    { 
      header: 'Product / Service', 
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 mr-4">
             <Package className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">{row.name}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">SKU: {row.sku || 'N/A'}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Category', 
      accessor: 'category',
      render: (row) => (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-100">
           {row.category}
        </span>
      )
    },
    { 
      header: 'Price', 
      accessor: 'price',
      render: (row) => (
        <div className="text-sm font-semibold text-slate-900">${parseFloat(row.price).toLocaleString()}</div>
      )
    },
    { 
      header: 'Timeline', 
      accessor: 'estimated_timeline',
      render: (row) => (
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Clock className="w-4 h-4" />
          <span>{row.estimated_timeline || 'N/A'}</span>
        </div>
      )
    },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (row) => (
        <div className="flex items-center space-x-2">
           <div className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
           <span className="text-sm font-medium text-slate-700">{row.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: () => (
        <div className="flex justify-end">
          <button className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <Archive className="w-5 h-5 text-blue-600" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Catalog</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Products & Services</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setViewMode('card')}
              className={`p-2.5 ${viewMode === 'card' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2.5 ${viewMode === 'table' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none w-64 transition-all shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select 
          value={filterCategory} 
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">All Categories</option>
          <option value="web_dev">Website Development</option>
          <option value="software">Software Services</option>
          <option value="seo">SEO Services</option>
          <option value="hosting">Hosting & Maintenance</option>
        </select>

        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${product.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mt-4">{product.name}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description || 'No description available.'}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                    {product.category}
                  </span>
                  {product.service_type && (
                    <span className="px-2 py-1 bg-blue-50 rounded text-xs font-medium text-blue-600">
                      {product.service_type}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Price</span>
                  <p className="text-xl font-bold text-slate-900">${parseFloat(product.price).toLocaleString()}</p>
                </div>
                
                {product.estimated_timeline && (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end">
                      <Clock className="w-3 h-3 mr-1" /> Timeline
                    </span>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{product.estimated_timeline}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <Table columns={columns} data={filteredProducts} />
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden relative z-10">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add New Service</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define a reusable service template</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Service Name *</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="e.g. E-commerce Website Development" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">SKU / Code</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="WEB-DEV-001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Base Price ($) *</label>
                  <input required type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10">
                    <option value="web_dev">Website Development</option>
                    <option value="software">Software Services</option>
                    <option value="seo">SEO Services</option>
                    <option value="hosting">Hosting & Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Service Type</label>
                  <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10">
                    <option value="service">Service</option>
                    <option value="software_package">Software Package</option>
                    <option value="website_package">Website Package</option>
                    <option value="subscription">Subscription</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Estimated Timeline</label>
                <input type="text" value={formData.estimated_timeline} onChange={e => setFormData({...formData, estimated_timeline: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" placeholder="e.g. 4-6 weeks" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 h-24" placeholder="Describe the service inclusions..."></textarea>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors">Create Service</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
