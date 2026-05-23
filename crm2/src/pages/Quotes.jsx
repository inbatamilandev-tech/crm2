import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Table from '../components/Table';
import { quotesApi, dealsApi, invoicesApi, productsApi } from '../services/api';
import { 
  Plus, FileText, Download, Loader2, AlertCircle,
  ClipboardCheck, TrendingUp, DollarSign, Calendar,
  ChevronRight, Filter, Search, MoreHorizontal, Zap,
  User, Clock, CheckCircle, XCircle, Eye, Edit, Copy, Send, FileOutput, Trash,
  Printer, Share2, Package, Trash2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';

export default function Quotes() {
  const { can } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // Tracks open actions menu
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [search, setSearch] = useState('');
  
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({ 
    deal: '', 
    amount: 0, 
    status: 'draft', 
    valid_until: '',
    requirement_summary: '',
    tech_stack: '',
    timeline: '',
    notes: '',
    payment_terms: '50% advance, 50% on completion',
    delivery_terms: 'Digital delivery',
    revision_policy: 'Up to 3 revisions included',
    line_items: []
  });

  const [editFormData, setEditFormData] = useState({
    id: null,
    deal: '',
    amount: 0,
    status: 'draft',
    valid_until: '',
    requirement_summary: '',
    tech_stack: '',
    timeline: '',
    notes: '',
    payment_terms: '',
    delivery_terms: '',
    revision_policy: '',
    line_items: []
  });

  const fetchQuotes = async () => {
    try {
      setIsLoading(true);
      const data = await quotesApi.getAll();
      setQuotes(data.results || data);
    } catch (err) {
      setError('Failed to synchronize proposal registry');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeals = async () => {
    try {
      const data = await dealsApi.getAll();
      setDeals(data.results || data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data.results || data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchDeals();
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown && !e.target.closest('.actions-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const getStatusStyles = (status) => {
    const s = status?.toLowerCase();
    if (s === 'draft') return 'bg-[#0F172A]/20 text-[#0F172A]/70 border-[#0F172A]/20';
    if (s === 'sent') return 'bg-[#0F172A]/10 text-[#0F172A] border-[#0F172A]/20';
    if (s === 'viewed') return 'bg-[#0F172A]/10 text-[#0F172A] border-[#0F172A]/20';
    if (s === 'negotiating') return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
    if (s === 'accepted' || s === 'approved') return 'bg-[#0F172A]/20 text-[#0F172A] font-bold border-[#0F172A]/30';
    if (s === 'rejected') return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
    if (s === 'expired') return 'bg-[#0F172A]/5 text-[#0F172A]/50 border-[#0F172A]/10';
    return 'bg-[#0F172A]/10 text-[#0F172A]/50 border-[#0F172A]/10';
  };

  const handleStatusChange = async (quote, newStatus) => {
    try {
      await quotesApi.patch(quote.id, { status: newStatus });
      addToast(`Quote marked as ${newStatus}`, 'success');
      fetchQuotes();
      if (selectedQuote?.id === quote.id) {
        setSelectedQuote({ ...selectedQuote, status: newStatus });
      }
      
      // Business Logic: Update Deal stage if accepted/rejected
      if (newStatus === 'accepted') {
        const deal = deals.find(d => d.id === quote.deal);
        if (deal) {
          await dealsApi.update(deal.id, { stage: 'won' });
          addToast('Linked Deal updated to Closed Won!', 'success');
        }
      } else if (newStatus === 'rejected') {
        const deal = deals.find(d => d.id === quote.deal);
        if (deal) {
          await dealsApi.update(deal.id, { stage: 'lost' });
          addToast('Linked Deal updated to Closed Lost', 'info');
        }
      }
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
    setActiveDropdown(null);
  };

  const handleDuplicate = async (quote) => {
    try {
      const payload = {
        ...quote,
        quote_number: `QT-${Math.floor(Math.random() * 10000)}`,
        status: 'draft',
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.customer_name;
      delete payload.deal_title;
      delete payload.owner_full_name;
      
      await quotesApi.create(payload);
      addToast('Quote duplicated successfully!', 'success');
      fetchQuotes();
    } catch (err) {
      addToast('Failed to duplicate quote', 'error');
    }
    setActiveDropdown(null);
  };

  const handleConvertToInvoice = async (quote) => {
    try {
      await quotesApi.generateInvoice(quote.id);
      addToast('Invoice generated successfully!', 'success');
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate invoice';
      addToast(errorMsg, 'error');
    }
    setActiveDropdown(null);
  };

  const handleApprove = async (quote) => {
    try {
      await quotesApi.approve(quote.id);
      addToast('Quote approved successfully!', 'success');
      fetchQuotes();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to approve quote';
      addToast(errorMsg, 'error');
    }
    setActiveDropdown(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) return;
    try {
      await quotesApi.delete(id);
      addToast('Quote deleted successfully', 'success');
      fetchQuotes();
    } catch (err) {
      addToast('Failed to delete quote', 'error');
    }
    setActiveDropdown(null);
  };

  const handleDownloadPDF = (quote) => {
    setSelectedQuote(quote);
    setIsGeneratingPDF(true);
    
    setTimeout(() => {
      const element = document.getElementById(`printable-quote-${quote.id}`);
      if (!element) {
        addToast('Quote element not found', 'error');
        setIsGeneratingPDF(false);
        return;
      }
      
      const opt = {
        margin:       0.5,
        filename:     `Quotation-${quote.quote_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      if (window.html2pdf) {
        window.html2pdf().from(element).set(opt).save().then(() => {
          setIsGeneratingPDF(false);
          addToast('Quotation PDF downloaded successfully', 'success');
        }).catch(err => {
          console.error(err);
          setIsGeneratingPDF(false);
          addToast('Failed to generate PDF', 'error');
        });
      } else {
        setIsGeneratingPDF(false);
        addToast('PDF library not loaded. Please refresh.', 'error');
      }
    }, 500);
    
    setActiveDropdown(null);
  };

  const handleEditClick = (quote) => {
    setEditFormData({
      id: quote.id,
      deal: quote.deal,
      amount: quote.amount,
      status: quote.status,
      valid_until: quote.valid_until || '',
      requirement_summary: quote.requirement_summary || '',
      tech_stack: quote.tech_stack || '',
      timeline: quote.timeline || '',
      notes: quote.notes || '',
      payment_terms: quote.payment_terms || '',
      delivery_terms: quote.delivery_terms || '',
      revision_policy: quote.revision_policy || '',
      line_items: quote.line_items || []
    });
    setIsEditing(true);
    setActiveDropdown(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // Calculate total amount from line items
      const totalAmount = editFormData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      const payload = { 
        ...editFormData,
        amount: totalAmount > 0 ? totalAmount : editFormData.amount
      };
      
      // Fix: DRF fails with empty string for date
      if (!payload.valid_until) payload.valid_until = null;
      
      await quotesApi.patch(editFormData.id, payload);
      addToast('Quote updated successfully', 'success');
      setIsEditing(false);
      fetchQuotes();
    } catch (err) {
      addToast('Failed to update quote', 'error');
    }
  };

  const handleAddLineItem = () => {
    setEditFormData({
      ...editFormData,
      line_items: [
        ...editFormData.line_items,
        { product: '', quantity: 1, unit_price: 0, discount: 0, tax_percent: 0 }
      ]
    });
  };

  const handleRemoveLineItem = (index) => {
    const newList = [...editFormData.line_items];
    newList.splice(index, 1);
    setEditFormData({ ...editFormData, line_items: newList });
  };

  const handleLineItemChange = (index, field, value) => {
    const newList = [...editFormData.line_items];
    newList[index][field] = value;
    
    // Auto-fill price if product changes
    if (field === 'product') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        newList[index]['unit_price'] = parseFloat(prod.price);
      }
    }
    
    setEditFormData({ ...editFormData, line_items: newList });
  };

  const handleAddCreateLineItem = () => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        { product: '', quantity: 1, unit_price: 0, discount: 0, tax_percent: 0 }
      ]
    });
  };

  const handleRemoveCreateLineItem = (index) => {
    const newList = [...formData.line_items];
    newList.splice(index, 1);
    setFormData({ ...formData, line_items: newList });
  };

  const handleCreateLineItemChange = (index, field, value) => {
    const newList = [...formData.line_items];
    newList[index][field] = value;
    
    // Auto-fill price if product changes
    if (field === 'product') {
      const prod = products.find(p => p.id === parseInt(value));
      if (prod) {
        newList[index]['unit_price'] = parseFloat(prod.price);
      }
    }
    
    setFormData({ ...formData, line_items: newList });
  };

  const columns = [
    { 
      header: 'Quote Number', 
      accessor: 'quote_number', 
      render: (row) => (
        <div className="flex items-center">
          <div className="w-8 h-8 bg-[#0F172A]/20 rounded-lg flex items-center justify-center text-[#0F172A]/50 mr-3">
             <ClipboardCheck className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-[#0F172A]">#{row.quote_number}</span>
        </div>
      )
    },
    { 
      header: 'Customer', 
      accessor: 'customer_name',
      render: (row) => (
        <span className="text-sm font-semibold text-[#0F172A]">{row.customer_name || 'N/A'}</span>
      )
    },
    { 
      header: 'Deal', 
      accessor: 'deal_title', 
      render: (row) => (
        <span className="text-sm text-[#0F172A]/70">{row.deal_title || 'N/A'}</span>
      )
    },
    { 
      header: 'Amount', 
      accessor: 'amount', 
      render: (row) => (
        <span className="text-sm font-semibold text-[#0F172A]">${parseFloat(row.amount).toLocaleString()}</span>
      )
    },
    { 
      header: 'Status', 
      accessor: 'status',
      render: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyles(row.status)}`}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Valid Until', 
      accessor: 'valid_until',
      render: (row) => (
        <span className="text-sm text-[#0F172A]/70">{row.valid_until ? dayjs(row.valid_until).format('MMM D, YYYY') : 'N/A'}</span>
      )
    },
    { 
      header: 'Owner', 
      accessor: 'owner_full_name',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <User className="w-3.5 h-3.5 text-[#0F172A]/50" />
          <span className="text-sm text-[#0F172A]/70">{row.owner_full_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex justify-end space-x-1">
          <button 
            onClick={() => { setSelectedQuote(row); setIsDetailsOpen(true); }}
            className="p-1.5 text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-blue-50 rounded-lg transition-all"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          <button 
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
              setActiveDropdown(activeDropdown === row.id ? null : row.id);
            }}
            className="p-1.5 text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-[#0F172A]/10 rounded-lg transition-all" 
            title="More Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const handleCreateQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!formData.deal) {
      addToast('Please select a target opportunity', 'error');
      return;
    }
    
    try {
      // Validate line items
      if (!formData.line_items || formData.line_items.length === 0) {
        addToast('Please add at least one product to the quote', 'error');
        return;
      }

      const payload = { ...formData };
      if (!payload.valid_until) delete payload.valid_until;
      
      await quotesApi.create({
        ...payload,
        quote_number: `QT-${Math.floor(Math.random() * 10000)}`
      });
      addToast('Quote created successfully!', 'success');
      setIsCreating(false);
      setFormData({ 
        deal: '', 
        amount: 0, 
        status: 'draft', 
        valid_until: '',
        requirement_summary: '',
        tech_stack: '',
        timeline: '',
        notes: '',
        payment_terms: '50% advance, 50% on completion',
        delivery_terms: 'Digital delivery',
        revision_policy: 'Up to 3 revisions included',
        line_items: []
      });
      fetchQuotes();
    } catch (err) {
      addToast('Failed to create quote', 'error');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const searchLower = search.toLowerCase();
    return (quote.quote_number?.toLowerCase().includes(searchLower) ||
            quote.customer_name?.toLowerCase().includes(searchLower) ||
            quote.deal_title?.toLowerCase().includes(searchLower));
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-[1400px] mx-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center space-x-2 mb-1">
             <ClipboardCheck className="w-5 h-5 text-[#0F172A]" />
             <span className="text-[10px] font-bold text-[#0F172A]/50 uppercase tracking-widest">Sales</span>
          </div>
          <h2 className="text-3xl font-bold text-[#0F172A] tracking-tight">Quotations</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsCreating(!isCreating)}
            className={`inline-flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all ${
              isCreating 
                ? 'bg-[#0F172A]/20 text-[#0F172A]/70 hover:bg-slate-200' 
                : 'bg-[#F59E0B] text-[#F8FAFC] shadow-blue-600/20 hover:bg-blue-700'
            }`}
          >
            {isCreating ? 'Cancel' : <><Plus className="mr-2 w-4 h-4" /> Create Quote</>}
          </button>
        </div>
      </div>

      {isCreating ? (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#0F172A]/20 shadow-sm p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
             <div>
                <h3 className="text-xl font-bold text-[#0F172A]">New Quotation</h3>
                <p className="text-xs text-[#0F172A]/70 mt-0.5">Define project requirements and terms</p>
             </div>
          </div>

          <form onSubmit={handleCreateQuoteSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Target Opportunity *</label>
                <select className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.deal} onChange={e => setFormData({...formData, deal: e.target.value})}>
                  <option value="">Select Deal</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Quote Amount ($) *</label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0F172A]/50" />
                   <input type="number" className="w-full pl-9 pr-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Valid Until</label>
                <input type="date" className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.valid_until} onChange={e => setFormData({...formData, valid_until: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Tech Stack</label>
                <input type="text" className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={formData.tech_stack} onChange={e => setFormData({...formData, tech_stack: e.target.value})} placeholder="e.g. React, Node.js, PostgreSQL" />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Requirement Summary</label>
              <textarea className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 h-24" value={formData.requirement_summary} onChange={e => setFormData({...formData, requirement_summary: e.target.value})} placeholder="Briefly describe what the client needs..."></textarea>
            </div>

            {/* Line Items Grid for Creation */}
            <div className="border-t border-[#0F172A]/10 pt-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest">Quote Items</h4>
                <button type="button" onClick={handleAddCreateLineItem} className="text-xs font-semibold text-[#0F172A] hover:text-blue-700 flex items-center">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </button>
              </div>
              
              <div className="space-y-3">
                {(formData.line_items || []).map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-center bg-[#0F172A]/10 p-3 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Product/Service</label>
                      <select 
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                        value={item.product}
                        onChange={e => handleCreateLineItemChange(index, 'product', e.target.value)}
                      >
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Qty</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                        value={item.quantity}
                        onChange={e => handleCreateLineItemChange(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Price</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                        value={item.unit_price}
                        onChange={e => handleCreateLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Discount</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                        value={item.discount}
                        onChange={e => handleCreateLineItemChange(index, 'discount', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Tax %</label>
                      <input 
                        type="number" 
                        className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                        value={item.tax_percent}
                        onChange={e => handleCreateLineItemChange(index, 'tax_percent', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveCreateLineItem(index)}
                        className="p-1.5 text-[#0F172A]/50 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all mt-4"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary in Create Form */}
              {(formData.line_items || []).length > 0 && (
                <div className="mt-4 border-t border-[#0F172A]/10 pt-3 flex justify-end">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#0F172A]/70">Subtotal:</span>
                      <span className="font-semibold text-[#0F172A]">
                        ${formData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#0F172A]/70">Total Discount:</span>
                      <span className="font-semibold text-[#0F172A]">
                        ${formData.line_items.reduce((sum, item) => sum + (parseFloat(item.discount) || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#0F172A]/20 pt-1 font-bold">
                      <span className="text-[#0F172A]">Estimated Total:</span>
                      <span className="text-[#0F172A]">
                        ${formData.line_items.reduce((sum, item) => {
                          const base = item.quantity * item.unit_price;
                          const after_discount = base - (parseFloat(item.discount) || 0);
                          const tax = after_discount * ((parseFloat(item.tax_percent) || 0) / 100);
                          return sum + after_discount + tax;
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-[#0F172A]/10 flex justify-end items-center space-x-3">
              <button type="button" onClick={() => setIsCreating(false)} className="text-sm font-semibold text-[#0F172A]/70 hover:text-slate-700 transition-colors">Discard</button>
              <button type="submit" className="px-5 py-2 bg-[#F59E0B] text-[#F8FAFC] rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center">
                 <FileText className="w-4 h-4 mr-2" /> Save Draft
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-[#F8FAFC] rounded-2xl border border-[#0F172A]/20 shadow-sm overflow-hidden min-h-[500px]">
          <div className="px-6 py-4 border-b border-[#0F172A]/5 bg-[#0F172A]/10/30 flex items-center justify-between">
             <h3 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest">Active Proposals</h3>
             <div className="flex items-center space-x-3">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                   <input 
                     type="text" 
                     placeholder="Filter registry..." 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     className="pl-9 pr-4 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs outline-none focus:border-blue-500 transition-all" 
                   />
                </div>
             </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
               <div className="w-8 h-8 border-2 border-[#0F172A]/10 border-t-blue-600 rounded-full animate-spin" />
               <p className="mt-4 text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest">Loading...</p>
            </div>
          ) : (
            <Table columns={columns} data={filteredQuotes} />
          )}
        </div>
      )}

      {/* Details Drawer */}
      {isDetailsOpen && selectedQuote && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)} />
          <div className="bg-[#F8FAFC] w-full max-w-2xl h-full shadow-2xl relative z-10 overflow-y-auto animate-fade-in">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#0F172A]/10 flex items-center justify-between sticky top-0 bg-[#F8FAFC] z-20">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-[#0F172A]">Quote #{selectedQuote.quote_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusStyles(selectedQuote.status)}`}>
                    {selectedQuote.status}
                  </span>
                </div>
                <p className="text-xs text-[#0F172A]/70 mt-0.5">Created on {dayjs(selectedQuote.created_at).format('MMM D, YYYY')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleDownloadPDF(selectedQuote)} 
                  className="p-2 text-[#0F172A]/50 hover:text-[#0F172A] hover:bg-[#0F172A]/10 rounded-lg" 
                  title="Download PDF"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
                <button onClick={() => setIsDetailsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0F172A]/10 text-[#0F172A]/50 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-3 border-b border-[#0F172A]/5 bg-[#0F172A]/10/50 flex flex-wrap gap-2">
              <button 
                onClick={() => handleStatusChange(selectedQuote, 'sent')}
                className="inline-flex items-center px-3 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#0F172A]/10"
              >
                <Send className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Send Quote
              </button>
              <button 
                onClick={() => handleStatusChange(selectedQuote, 'accepted')}
                className="inline-flex items-center px-3 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Accept
              </button>
              <button 
                onClick={() => handleStatusChange(selectedQuote, 'rejected')}
                className="inline-flex items-center px-3 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
              </button>
              <button 
                onClick={() => handleConvertToInvoice(selectedQuote)}
                className="inline-flex items-center px-3 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
              >
                <FileOutput className="w-3.5 h-3.5 mr-1.5" /> Convert to Invoice
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer & Deal Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-2">Customer Info</h4>
                  <p className="text-sm font-semibold text-[#0F172A]">{selectedQuote.customer_name || 'N/A'}</p>
                  <p className="text-xs text-[#0F172A]/70 mt-0.5">Linked to Deal: {selectedQuote.deal_title || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-2">Financials</h4>
                  <p className="text-xl font-bold text-[#0F172A]">${parseFloat(selectedQuote.amount).toLocaleString()}</p>
                  <p className="text-xs text-[#0F172A]/70 mt-0.5 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Valid Until: {selectedQuote.valid_until ? dayjs(selectedQuote.valid_until).format('MMM D, YYYY') : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Project Requirements */}
              <div className="border-t border-[#0F172A]/10 pt-5">
                <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-3">Project Requirements</h4>
                <div className="bg-[#0F172A]/10 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#0F172A]/70">Requirement Summary:</span>
                    <p className="text-sm text-slate-700 mt-0.5">{selectedQuote.requirement_summary || 'No summary provided.'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#0F172A]/70">Tech Stack:</span>
                      <p className="text-sm text-slate-700 mt-0.5">{selectedQuote.tech_stack || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0F172A]/70">Timeline:</span>
                      <p className="text-sm text-slate-700 mt-0.5">{selectedQuote.timeline || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quote Items Table */}
              <div className="border-t border-[#0F172A]/10 pt-5">
                <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-3">Quote Items</h4>
                <div className="overflow-hidden border border-[#0F172A]/20 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-[#0F172A]/10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest">Item</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedQuote.line_items?.length > 0 ? (
                        selectedQuote.line_items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-sm text-[#0F172A]">{item.product_name || `Item #${item.product}`}</td>
                            <td className="px-4 py-2 text-sm text-[#0F172A]/70 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-[#0F172A]/70 text-right">${parseFloat(item.unit_price).toLocaleString()}</td>
                            <td className="px-4 py-2 text-sm text-[#0F172A] text-right font-semibold">${parseFloat(item.line_total).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-2 text-sm text-[#0F172A]">Custom Project Service</td>
                          <td className="px-4 py-2 text-sm text-[#0F172A]/70 text-right">1</td>
                          <td className="px-4 py-2 text-sm text-[#0F172A]/70 text-right">${parseFloat(selectedQuote.amount).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-[#0F172A] text-right font-semibold">${parseFloat(selectedQuote.amount).toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="border-t border-[#0F172A]/10 pt-5 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#0F172A]/70">Subtotal:</span>
                    <span className="font-semibold text-[#0F172A]">${parseFloat(selectedQuote.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#0F172A]/70">Tax (GST 18%):</span>
                    <span className="font-semibold text-[#0F172A]">${(parseFloat(selectedQuote.amount) * 0.18).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-[#0F172A]/20 pt-2 text-base font-bold">
                    <span className="text-[#0F172A]">Grand Total:</span>
                    <span className="text-[#0F172A]">${(parseFloat(selectedQuote.amount) * 1.18).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="border-t border-[#0F172A]/10 pt-5">
                <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-3">Terms & Conditions</h4>
                <div className="space-y-2 text-xs text-[#0F172A]/70">
                  <p><span className="font-bold">Payment:</span> {selectedQuote.payment_terms || '50% advance, 50% on completion'}</p>
                  <p><span className="font-bold">Delivery:</span> {selectedQuote.delivery_terms || 'Digital delivery'}</p>
                  <p><span className="font-bold">Revision:</span> {selectedQuote.revision_policy || 'Up to 3 revisions included'}</p>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="border-t border-[#0F172A]/10 pt-5">
                <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest mb-3">Activity Timeline</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-xs font-bold text-slate-700">Quote Created</span>
                    <span className="text-xs text-[#0F172A]/70">{dayjs(selectedQuote.created_at).format('MMM D, YYYY HH:mm')}</span>
                  </div>
                  {selectedQuote.status !== 'draft' && (
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-xs font-bold text-slate-700">Quote Marked as {selectedQuote.status}</span>
                      <span className="text-xs text-[#0F172A]/70">{dayjs(selectedQuote.updated_at).format('MMM D, YYYY HH:mm')}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditing(false)} />
          <div className="bg-[#F8FAFC] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl relative z-10 overflow-y-auto animate-fade-in p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A]">Edit Quotation</h3>
                <p className="text-xs text-[#0F172A]/70 mt-0.5">Update project details and items</p>
              </div>
              <button onClick={() => setIsEditing(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#0F172A]/10 text-[#0F172A]/50 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Target Opportunity *</label>
                  <select className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={editFormData.deal} onChange={e => setEditFormData({...editFormData, deal: e.target.value})}>
                    <option value="">Select Deal</option>
                    {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Status</label>
                  <select className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="negotiating">Negotiating</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Valid Until</label>
                  <input type="date" className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={editFormData.valid_until} onChange={e => setEditFormData({...editFormData, valid_until: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Tech Stack</label>
                  <input type="text" className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10" value={editFormData.tech_stack} onChange={e => setEditFormData({...editFormData, tech_stack: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A]/70 uppercase tracking-widest mb-1">Requirement Summary</label>
                <textarea className="w-full px-3 py-2 bg-[#0F172A]/10 border border-[#0F172A]/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 h-20" value={editFormData.requirement_summary} onChange={e => setEditFormData({...editFormData, requirement_summary: e.target.value})} />
              </div>

              {/* Line Items Editor */}
              <div className="border-t border-[#0F172A]/10 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#0F172A]/50 uppercase tracking-widest">Quote Items</h4>
                  <button type="button" onClick={handleAddLineItem} className="text-xs font-semibold text-[#0F172A] hover:text-blue-700 flex items-center">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editFormData.line_items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-[#0F172A]/10 p-3 rounded-lg">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Product/Service</label>
                        <select 
                          className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                          value={item.product}
                          onChange={e => handleLineItemChange(index, 'product', e.target.value)}
                        >
                          <option value="">Select Product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Qty</label>
                        <input 
                          type="number" 
                          className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                          value={item.quantity}
                          onChange={e => handleLineItemChange(index, 'quantity', parseInt(e.target.value))}
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-[#0F172A]/50 uppercase mb-1">Price</label>
                        <input 
                          type="number" 
                          className="w-full px-2 py-1.5 bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg text-xs"
                          value={item.unit_price}
                          onChange={e => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end pt-5">
                        <button type="button" onClick={() => handleRemoveLineItem(index)} className="text-rose-500 hover:text-rose-700 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {editFormData.line_items.length === 0 && (
                    <div className="text-center py-4 bg-[#0F172A]/10 rounded-lg text-xs text-[#0F172A]/50">
                      No items added. Click "Add Item" to build the quote.
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="border-t border-[#0F172A]/10 pt-5 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#0F172A]/70">Subtotal:</span>
                    <span className="font-semibold text-[#0F172A]">
                      ${editFormData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#0F172A]/20 pt-2 text-base font-bold">
                    <span className="text-[#0F172A]">Estimated Total:</span>
                    <span className="text-[#0F172A]">
                      ${(editFormData.line_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) * 1.18).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-[#0F172A]/10 flex justify-end items-center space-x-3">
                <button type="button" onClick={() => setIsEditing(false)} className="text-sm font-semibold text-[#0F172A]/70 hover:text-slate-700 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-[#F8FAFC] rounded-lg font-semibold text-sm hover:bg-emerald-700 transition-colors flex items-center">
                   <CheckCircle className="w-4 h-4 mr-2" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Printable/PDF Area (Positioned off-screen) */}
      {selectedQuote && (
        <div id={`printable-quote-${selectedQuote.id}`} className="absolute -left-[9999px] top-0 p-10 bg-[#F8FAFC] text-[#0F172A] w-[800px]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="flex justify-between items-start border-b-2 border-[#0F172A]/20 pb-5">
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">QUOTATION</h1>
              <p className="text-sm text-[#0F172A]/70 mt-1"># {selectedQuote.quote_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold">Your Company Name</h2>
              <p className="text-xs text-[#0F172A]/70">support@yourcompany.com</p>
              <p className="text-xs text-[#0F172A]/70">+1 234 567 890</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 mt-6">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]/50 uppercase mb-1">Prepared For</h3>
              <p className="text-base font-bold">{selectedQuote.customer_name || 'N/A'}</p>
              <p className="text-sm text-[#0F172A]/70">Deal: {selectedQuote.deal_title || 'N/A'}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-bold text-[#0F172A]/50 uppercase mb-1">Quote Details</h3>
              <p className="text-sm"><span className="font-semibold">Date:</span> {dayjs(selectedQuote.created_at).format('MMM D, YYYY')}</p>
              <p className="text-sm"><span className="font-semibold">Valid Until:</span> {selectedQuote.valid_until ? dayjs(selectedQuote.valid_until).format('MMM D, YYYY') : 'N/A'}</p>
              <p className="text-sm"><span className="font-semibold">Sales Owner:</span> {selectedQuote.owner_full_name || 'N/A'}</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xs font-bold text-[#0F172A]/50 uppercase mb-2">Project Requirements</h3>
            <p className="text-sm text-slate-700 bg-[#0F172A]/10 p-3 rounded">{selectedQuote.requirement_summary || 'No summary provided.'}</p>
          </div>

          <div className="mt-8">
            <table className="min-w-full divide-y divide-slate-200 border border-[#0F172A]/20">
              <thead className="bg-[#0F172A]/10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-[#0F172A]/70 uppercase">Item</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase">Qty</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-[#0F172A]/70 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedQuote.line_items?.length > 0 ? (
                  selectedQuote.line_items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm">{item.product_name || `Item #${item.product}`}</td>
                      <td className="px-4 py-2 text-sm text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-right">${parseFloat(item.unit_price).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm text-right font-semibold">${parseFloat(item.line_total).toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-2 text-sm">Custom Project Service</td>
                    <td className="px-4 py-2 text-sm text-right">1</td>
                    <td className="px-4 py-2 text-sm text-right">${parseFloat(selectedQuote.amount).toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-right font-semibold">${parseFloat(selectedQuote.amount).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <div className="w-64 space-y-2 border-t border-[#0F172A]/20 pt-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-semibold">${parseFloat(selectedQuote.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (18%):</span>
                <span className="font-semibold">${(parseFloat(selectedQuote.amount) * 0.18).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-[#0F172A]/20 pt-2">
                <span>Grand Total:</span>
                <span className="text-[#0F172A]">${(parseFloat(selectedQuote.amount) * 1.18).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-10">
            <div>
              <h3 className="text-xs font-bold text-[#0F172A]/50 uppercase mb-1">Terms & Conditions</h3>
              <p className="text-xs text-[#0F172A]/70">Payment: {selectedQuote.payment_terms || '50% advance'}</p>
              <p className="text-xs text-[#0F172A]/70">Delivery: {selectedQuote.delivery_terms || 'Digital'}</p>
              <p className="text-xs text-[#0F172A]/70">Revision: {selectedQuote.revision_policy || '3 revisions'}</p>
            </div>
            <div className="flex flex-col items-end justify-end">
              <div className="border-t border-slate-300 w-48 text-center pt-2 mt-10">
                <p className="text-xs font-bold">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal for Actions Dropdown */}
      {activeDropdown && (
        createPortal(
          <div 
            className="absolute bg-[#F8FAFC] border border-[#0F172A]/20 rounded-lg shadow-lg z-[200] py-1 w-48 animate-fade-in actions-dropdown"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left - 150 }}
          >
            {(() => {
              const row = quotes.find(q => q.id === activeDropdown);
              if (!row) return null;
              return (
                <>
                  <button onClick={() => { setSelectedQuote(row); setIsDetailsOpen(true); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <Eye className="w-3.5 h-3.5 mr-2 text-[#0F172A]/50" /> View Details
                  </button>
                  <button onClick={() => handleEditClick(row)} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <Edit className="w-3.5 h-3.5 mr-2 text-[#0F172A]/50" /> Edit Quote
                  </button>
                  <button onClick={() => handleDuplicate(row)} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <Copy className="w-3.5 h-3.5 mr-2 text-[#0F172A]/50" /> Duplicate
                  </button>
                  <button onClick={() => handleDownloadPDF(row)} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <Download className="w-3.5 h-3.5 mr-2 text-[#0F172A]/50" /> Download PDF
                  </button>
                  <div className="border-t border-[#0F172A]/10 my-1"></div>
                  <button onClick={() => handleStatusChange(row, 'sent')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <Send className="w-3.5 h-3.5 mr-2 text-blue-500" /> Mark as Sent
                  </button>
                  <button onClick={() => handleStatusChange(row, 'negotiating')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-2 text-amber-500" /> Mark as Negotiating
                  </button>
                  {row.status === 'sent' && can('quote.approve') && (
                    <button onClick={() => handleApprove(row)} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                      <CheckCircle className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Approve Quote
                    </button>
                  )}
                  <button onClick={() => handleStatusChange(row, 'rejected')} className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-[#0F172A]/10 flex items-center">
                    <XCircle className="w-3.5 h-3.5 mr-2 text-rose-500" /> Mark as Rejected
                  </button>
                  <div className="border-t border-[#0F172A]/10 my-1"></div>
                  {can('invoice.generate') && (
                    <button 
                      onClick={() => handleConvertToInvoice(row)} 
                      disabled={row.status !== 'accepted'}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center font-semibold ${row.status === 'accepted' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-[#0F172A]/50 cursor-not-allowed'}`}
                    >
                      <FileOutput className="w-3.5 h-3.5 mr-2" /> Convert to Invoice
                    </button>
                  )}
                  <button onClick={() => handleDelete(row.id)} className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center font-semibold">
                    <Trash className="w-3.5 h-3.5 mr-2" /> Delete Quote
                  </button>
                </>
              );
            })()}
          </div>,
          document.body
        )
      )}
    </div>
  );
}
