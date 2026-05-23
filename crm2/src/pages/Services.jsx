import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Shield, 
  Check, MoreVertical, X, Pencil, Trash
} from 'lucide-react';
import { servicesApi } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Services() {
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [billingType, setBillingType] = useState('Monthly');
  const [slaPolicy, setSlaPolicy] = useState('');
  const [description, setDescription] = useState('');

  const fetchServices = () => {
    setLoading(true);
    servicesApi.getAll()
      .then(data => {
        setServices(data.results || data);
        setLoading(false);
      })
      .catch(err => {
        console.error("[Services] Error fetching services:", err);
        setServices([]);
        setLoading(false);
        addToast('Failed to load services', 'error');
      });
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreateService = () => {
    servicesApi.create({ 
      name, 
      category, 
      price: parseFloat(price) || 0, 
      billing_type: billingType, 
      sla_policy: slaPolicy, 
      description 
    })
    .then(data => {
      setIsModalOpen(false);
      setName('');
      setCategory('');
      setPrice('');
      setBillingType('Monthly');
      setSlaPolicy('');
      setDescription('');
      fetchServices();
      addToast('Service created successfully', 'success');
    })
    .catch(err => {
      console.error("[Services] Error in handleCreateService:", err);
      addToast('Failed to create service', 'error');
    });
  };

  const handleEditClick = (service) => {
    setSelectedService(service);
    setName(service.name || '');
    setCategory(service.category || '');
    setPrice(service.price?.toString() || '');
    setBillingType(service.billing_type || 'Monthly');
    setSlaPolicy(service.sla_policy || '');
    setDescription(service.description || '');
    setIsEditModalOpen(true);
  };

  const handleUpdateService = () => {
    if (!selectedService) return;
    servicesApi.update(selectedService.id, { 
      name, 
      category, 
      price: parseFloat(price) || 0, 
      billing_type: billingType, 
      sla_policy: slaPolicy, 
      description 
    })
    .then(data => {
      setIsEditModalOpen(false);
      setSelectedService(null);
      setName('');
      setCategory('');
      setPrice('');
      setBillingType('Monthly');
      setSlaPolicy('');
      setDescription('');
      fetchServices();
      addToast('Service updated successfully', 'success');
    })
    .catch(err => {
      console.error("[Services] Error in handleUpdateService:", err);
      addToast('Failed to update service', 'error');
    });
  };

  const handleDeleteService = (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    servicesApi.delete(id)
    .then(() => {
      fetchServices();
      addToast('Service deleted successfully', 'success');
    })
    .catch(err => {
      console.error("[Services] Error in handleDeleteService:", err);
      addToast('Failed to delete service', 'error');
    });
  };

  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (service.category && service.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Services</h1>
          <p className="text-sm text-slate-500 mt-1">Manage service offerings and SLA policies.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none w-64"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Service
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-sm text-slate-500 font-bold col-span-full py-4">Loading services...</div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center col-span-full">
            <div className="text-slate-400 mb-4">
              <Shield className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">No services found</h2>
            <p className="text-sm text-slate-500 mb-6">Create your first service offering.</p>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Service
            </button>
          </div>
        ) : (
          filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:border-blue-200 transition-colors group relative">
              <div className="absolute top-6 right-6 flex items-center gap-1">
                <button 
                  onClick={() => handleEditClick(service)}
                  className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => handleDeleteService(service.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{service.category}</div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{service.name}</h3>
              
              <div className="flex items-baseline mb-4">
                <span className="text-2xl font-black text-slate-900">${service.price}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">/ {service.billing_type}</span>
              </div>

              <div className="space-y-2 border-t border-slate-50 pt-4 text-xs font-bold text-slate-600">
                <div className="flex items-center">
                  <Shield className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  SLA: {service.sla_policy || 'N/A'}
                </div>
                <div className="flex items-center">
                  <Check className={`w-3.5 h-3.5 mr-2 ${service.is_active ? 'text-emerald-500' : 'text-slate-300'}`} />
                  {service.is_active ? 'Active' : 'Inactive'} Status
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Create New Service</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter service name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Hosting, Consulting"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Price</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Billing Type</label>
                  <select 
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="One-time">One-time</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">SLA Policy</label>
                <input 
                  type="text" 
                  value={slaPolicy}
                  onChange={(e) => setSlaPolicy(e.target.value)}
                  placeholder="e.g. 24h Response"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter service description"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateService}
                  className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Create Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Service</h2>
              <button onClick={() => { setIsEditModalOpen(false); setSelectedService(null); }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Service Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter service name"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Category</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Infrastructure"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Price</label>
                  <input 
                    type="number" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Billing Type</label>
                  <select 
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                  >
                    <option value="One-time">One-time</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">SLA Policy</label>
                <input 
                  type="text" 
                  value={slaPolicy}
                  onChange={(e) => setSlaPolicy(e.target.value)}
                  placeholder="e.g. 24h Response"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter service description"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-blue-500 transition-all text-sm outline-none"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => { setIsEditModalOpen(false); setSelectedService(null); }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateService}
                  className="px-4 py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Update Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
