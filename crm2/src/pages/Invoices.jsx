import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Download, CreditCard, 
  Clock, AlertCircle, Loader2, Filter, ChevronRight,
  DollarSign, ArrowUpRight, ArrowDownRight, Printer,
  User, Briefcase, Trash2, Eye, XCircle, Send, CheckCircle
} from 'lucide-react';
import { invoicesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import Table from '../components/Table';
import dayjs from 'dayjs';
import { useAuth } from '../context/AuthContext';
import { CARD_CONTAINER, TEXT_PRIMARY, TEXT_SECONDARY, BORDER_DEFAULT, INPUT_STYLE, BUTTON_PRIMARY } from '../utils/themeUtils';

export default function Invoices() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [generatingPDFId, setGeneratingPDFId] = useState(null);
  const { addToast } = useToast();

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const data = await invoicesApi.getAll();
      setInvoices(data.results || data);
    } catch (err) {
      addToast('Fiscal sync failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSendInvoice = async (invoice) => {
    try {
      await invoicesApi.sendInvoice(invoice.id);
      addToast('Invoice marked as sent!', 'success');
      fetchInvoices();
    } catch (err) {
      addToast('Failed to send invoice', 'error');
    }
  };

  const handleMarkPaid = async (invoice) => {
    try {
      await invoicesApi.markPaid(invoice.id);
      addToast('Invoice marked as paid!', 'success');
      fetchInvoices();
    } catch (err) {
      addToast('Failed to mark invoice as paid', 'error');
    }
  };

  const handleDownloadPDF = (invoice) => {
    setSelectedInvoice(invoice);
    setGeneratingPDFId(invoice.id);
    
    setTimeout(() => {
      const element = document.getElementById(`printable-invoice-${invoice.id}`);
      if (!element) {
        addToast('Invoice element not found', 'error');
        setGeneratingPDFId(null);
        return;
      }
      
      const opt = {
        margin:       0.5,
        filename:     `Invoice-${invoice.invoice_number}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      if (window.html2pdf) {
        window.html2pdf().from(element).set(opt).save().then(() => {
          setGeneratingPDFId(null);
          addToast('Invoice PDF downloaded successfully', 'success');
        }).catch(err => {
          console.error(err);
          setGeneratingPDFId(null);
          addToast('Failed to generate PDF', 'error');
        });
      } else {
        setGeneratingPDFId(null);
        addToast('PDF library not loaded. Please refresh.', 'error');
      }
    }, 500);
  };

  const filteredInvoices = invoices.filter(inv => 
    (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inv.deal_title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Dynamic KPI Calculations
  const totalOutstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

  const fiscalYield = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

  const overdueProtocol = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

  const unpaidInvoices = invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue');
  const averageAging = unpaidInvoices.length > 0 
    ? Math.round(unpaidInvoices.reduce((sum, inv) => sum + dayjs().diff(dayjs(inv.created_at), 'day'), 0) / unpaidInvoices.length)
    : 0;

  const getLedgerStatus = (status) => {
    const s = status?.toLowerCase();
    if (s === 'draft') return 'Draft';
    if (s === 'sent') return 'Posted';
    if (s === 'paid') return 'Completed';
    if (s === 'overdue') return 'Posted';
    if (s === 'cancelled') return 'Cancelled';
    return 'Pending';
  };

  const getPaymentStatus = (status) => {
    const s = status?.toLowerCase();
    if (s === 'draft' || s === 'sent') return 'Unpaid';
    if (s === 'paid') return 'Paid';
    if (s === 'overdue') return 'Overdue';
    if (s === 'cancelled') return 'N/A';
    return 'Unpaid';
  };

  const getStatusColors = (status) => {
    const s = status?.toLowerCase();
    if (s === 'paid' || s === 'completed') return 'bg-[#0F172A]/10 text-[#0F172A] border-[#0F172A]/20';
    if (s === 'overdue' || s === 'cancelled') return 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20';
    if (s === 'sent' || s === 'posted') return 'bg-[#0F172A]/10 text-[#0F172A] border-[#0F172A]/20';
    if (s === 'draft') return 'bg-[#0F172A]/5 text-[#0F172A]/50 border-[#0F172A]/10';
    return 'bg-[#0F172A]/10 text-[#0F172A] border-[#0F172A]/20';
  };

  const columns = [
    { 
      header: 'Fiscal Registry', 
      accessor: 'invoice_number',
      render: (row) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 mr-3">
             <FileText className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-tihvo-dark">#{row.invoice_number}</span>
        </div>
      )
    },
    { 
      header: 'Customer', 
      accessor: 'customer_name',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">{row.customer_name || 'N/A'}</span>
        </div>
      )
    },
    { 
      header: 'Deal Reference', 
      accessor: 'deal_title',
      render: (row) => (
        <div className="flex items-center space-x-2">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-sm text-slate-600">{row.deal_title || 'N/A'}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quote: {row.quote_number || 'N/A'}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Timeline Protocol', 
      accessor: 'created_at',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-600">Issued: {dayjs(row.created_at).format('DD/MM/YYYY')}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Updated: {dayjs(row.updated_at).format('DD/MM/YYYY')}</span>
        </div>
      )
    },
    { 
      header: 'Ledger Status', 
      accessor: 'status',
      render: (row) => {
        const ledgerStatus = getLedgerStatus(row.status);
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColors(ledgerStatus)}`}>
            {ledgerStatus}
          </span>
        );
      }
    },
    { 
      header: 'Net Yield', 
      accessor: 'amount',
      render: (row) => (
        <div className="text-right">
          <div className="text-sm font-bold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(row.amount))}</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Sync</div>
        </div>
      )
    },
    { 
      header: 'Payment Status', 
      accessor: 'status',
      render: (row) => {
        const paymentStatus = getPaymentStatus(row.status);
        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColors(paymentStatus)}`}>
            {paymentStatus}
          </span>
        );
      }
    },
    { 
      header: 'Due Date', 
      accessor: 'due_date',
      render: (row) => (
        <span className="text-sm text-slate-500">{row.due_date ? dayjs(row.due_date).format('DD/MM/YYYY') : 'N/A'}</span>
      )
    },
    {
      header: '',
      accessor: 'actions',
      render: (row) => (
        <div className="flex justify-end space-x-1">
          <button 
            onClick={() => { setSelectedInvoice(row); setIsDetailsOpen(true); }}
            className="p-1.5 text-slate-400 hover:text-tihvo-dark hover:bg-blue-50 rounded-lg transition-all" 
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          
          {row.status === 'draft' && can('invoice.send') && (
            <button 
              onClick={() => handleSendInvoice(row)}
              className="p-1.5 text-slate-400 hover:text-tihvo-dark hover:bg-blue-50 rounded-lg transition-all" 
              title="Send Invoice"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          
          {(row.status === 'sent' || row.status === 'overdue') && can('invoice.mark_paid') && (
            <button 
              onClick={() => handleMarkPaid(row)}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
              title="Mark as Paid"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => handleDownloadPDF(row)}
            className="p-1.5 text-slate-400 hover:text-tihvo-dark hover:bg-blue-50 rounded-lg transition-all" 
            title="Download PDF"
            disabled={generatingPDFId !== null}
          >
            {generatingPDFId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
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
             <DollarSign className="w-5 h-5 text-tihvo-dark" />
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inventory</span>
          </div>
          <h2 className={`text-3xl font-bold tracking-tight ${TEXT_PRIMARY}`}>Invoices</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-tihvo-dark transition-colors" />
            <input 
              type="text" 
              placeholder="Search fiscal records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-[#F59E0B] w-64 transition-all shadow-sm text-slate-900 dark:text-white"
            />
          </div>
          <button className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm">
            <Filter className="w-4 h-4" />
          </button>
          <button className={BUTTON_PRIMARY}>
            <Plus className="mr-2 w-4 h-4" />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Fiscal KPI Row (Dynamic) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {[
           { label: 'Total Outstanding', value: `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalOutstanding)} (${invoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').length})`, trend: 'Live', color: 'blue' },
           { label: 'Fiscal Yield', value: `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(fiscalYield)} (${invoices.filter(inv => inv.status === 'paid').length})`, trend: 'Live', color: 'emerald' },
           { label: 'Average Aging', value: `${averageAging} Days`, trend: 'Live', color: 'emerald' },
           { label: 'Overdue Protocol', value: `${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(overdueProtocol)} (${invoices.filter(inv => inv.status === 'overdue').length})`, trend: 'Live', color: 'rose' }
         ].map((kpi, i) => (
           <div key={i} className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
              <p className={`text-[10px] font-bold uppercase tracking-widest ${TEXT_SECONDARY}`}>{kpi.label}</p>
              <div className="flex items-end justify-between mt-1">
                 <h4 className={`text-2xl font-bold ${TEXT_PRIMARY}`}>{kpi.value}</h4>
                 <span className={`text-[10px] font-bold uppercase tracking-widest ${TEXT_SECONDARY}`}>
                    {kpi.trend}
                 </span>
              </div>
           </div>
         ))}
      </div>

      {/* Main Registry Container */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px] transition-colors duration-200">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F172A]/50 flex items-center justify-between">
           <h3 className={`text-xs font-bold uppercase tracking-widest ${TEXT_SECONDARY}`}>Fiscal Records</h3>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
             <div className="w-8 h-8 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
             <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Compiling Fiscal Records...</p>
          </div>
        ) : (
          <Table columns={columns} data={filteredInvoices} />
        )}
      </div>

      {/* Details Drawer */}
      {isDetailsOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDetailsOpen(false)} />
          <div className="bg-[#F8FAFC] w-full max-w-2xl h-full shadow-2xl relative z-10 overflow-y-auto animate-fade-in">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#0F172A]/10 flex items-center justify-between sticky top-0 bg-[#F8FAFC] z-20">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-slate-900">Invoice #{selectedInvoice.invoice_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getStatusColors(getLedgerStatus(selectedInvoice.status))}`}>
                    {getLedgerStatus(selectedInvoice.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Issued on {dayjs(selectedInvoice.created_at).format('MMM D, YYYY')}</p>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors">
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer & Deal Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Customer Info</h4>
                  <p className="text-sm font-semibold text-slate-900">{selectedInvoice.customer_name || 'N/A'}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                    <Briefcase className="w-3 h-3 mr-1" /> Deal: {selectedInvoice.deal_title || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Quote Ref: {selectedInvoice.quote_number || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Financials</h4>
                  <p className="text-xl font-bold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount))}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Due Date: {selectedInvoice.due_date ? dayjs(selectedInvoice.due_date).format('MMM D, YYYY') : 'N/A'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border ${getStatusColors(getPaymentStatus(selectedInvoice.status))}`}>
                      {getPaymentStatus(selectedInvoice.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Line Items Table (Live Synced from Quote) */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Invoice Items</h4>
                  <span className="text-[10px] font-bold text-tihvo-dark uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Live Synced from Quote</span>
                </div>
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-widest">Item</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase tracking-widest">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedInvoice.line_items?.length > 0 ? (
                        selectedInvoice.line_items.map((item, idx) => (
                           <tr key={idx}>
                             <td className="px-4 py-2 text-sm text-slate-900">{item.product_name || `Item #${item.product}`}</td>
                             <td className="px-4 py-2 text-sm text-slate-600 text-right">{item.quantity}</td>
                             <td className="px-4 py-2 text-sm text-slate-600 text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.unit_price))}</td>
                             <td className="px-4 py-2 text-sm text-slate-900 text-right font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(item.line_total))}</td>
                           </tr>
                        ))
                      ) : (
                         <tr>
                           <td className="px-4 py-2 text-sm text-slate-900">Custom Project Service</td>
                           <td className="px-4 py-2 text-sm text-slate-600 text-right">1</td>
                           <td className="px-4 py-2 text-sm text-slate-600 text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount))}</td>
                           <td className="px-4 py-2 text-sm text-slate-900 text-right font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount))}</td>
                         </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="border-t border-slate-100 pt-5 flex justify-end">
                <div className="w-64 space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Subtotal:</span>
                     <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount))}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-slate-500">Tax (GST 18%):</span>
                     <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount) * 0.18)}</span>
                   </div>
                   <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                     <span className="text-slate-900">Grand Total:</span>
                     <span className="text-tihvo-dark">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(parseFloat(selectedInvoice.amount) * 1.18)}</span>
                   </div>
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-5 flex justify-end space-x-3">
                <button 
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center"
                  disabled={generatingPDFId !== null}
                >
                  {generatingPDFId === selectedInvoice.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />} Download PDF
                </button>
                {(selectedInvoice.status === 'sent' || selectedInvoice.status === 'overdue') && can('invoice.mark_paid') && (
                  <button 
                    onClick={() => handleMarkPaid(selectedInvoice)}
                    className="px-4 py-2 bg-tihvo-orange text-white rounded-lg text-sm font-semibold hover:bg-tihvo-orange/90 flex items-center"
                  >
                    <CreditCard className="w-4 h-4 mr-2" /> Record Payment
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {/* Hidden Printable/PDF Area */}
      {selectedInvoice && (
        <div id={`printable-invoice-${selectedInvoice.id}`} className="absolute -left-[9999px] top-0 p-10 bg-[#F8FAFC] text-[#0F172A] w-[800px]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">INVOICE</h1>
              <p className="text-sm text-slate-500 mt-1"># {selectedInvoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-900">CRM Suite</h2>
              <p className="text-xs text-slate-500">Enterprise Edition</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8 border-t border-b border-slate-100 py-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</h4>
              <p className="text-sm font-semibold text-slate-900">{selectedInvoice.customer_name || 'N/A'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Deal: {selectedInvoice.deal_title || 'N/A'}</p>
            </div>
            <div className="text-right">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Details</h4>
              <p className="text-sm text-slate-900">Date: {dayjs(selectedInvoice.created_at).format('DD/MM/YYYY')}</p>
              <p className="text-sm text-slate-900">Due Date: {selectedInvoice.due_date ? dayjs(selectedInvoice.due_date).format('DD/MM/YYYY') : 'N/A'}</p>
              <p className="text-sm font-bold text-tihvo-dark mt-1">Status: {getPaymentStatus(selectedInvoice.status)}</p>
            </div>
          </div>

          <table className="min-w-full divide-y divide-slate-200 mb-8">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase">Item</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Price</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {selectedInvoice.line_items?.length > 0 ? (
                selectedInvoice.line_items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm text-slate-900">{item.product_name || `Item #${item.product}`}</td>
                    <td className="px-4 py-2 text-sm text-slate-600 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-slate-600 text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(item.unit_price))}</td>
                    <td className="px-4 py-2 text-sm text-slate-900 text-right font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(item.line_total))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-2 text-sm text-slate-900">Custom Project Service</td>
                  <td className="px-4 py-2 text-sm text-slate-600 text-right">1</td>
                  <td className="px-4 py-2 text-sm text-slate-600 text-right">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(selectedInvoice.amount))}</td>
                  <td className="px-4 py-2 text-sm text-slate-900 text-right font-semibold">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(selectedInvoice.amount))}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(selectedInvoice.amount))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Tax (GST 18%):</span>
                <span className="font-semibold text-slate-900">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(selectedInvoice.amount) * 0.18)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span className="text-slate-900">Grand Total:</span>
                <span className="text-tihvo-dark">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(selectedInvoice.amount) * 1.18)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
            Thank you for your business!
          </div>
        </div>
      )}
    </div>
  );
}
