import React, { useState, useEffect } from 'react';
import { 
  Star, Search, User, Trash, Plus, X, MessageSquare,
  TrendingUp, Award, BarChart2, ChevronDown
} from 'lucide-react';
import { feedbackApi, casesApi } from '../services/api';
import { useToast } from '../context/ToastContext';
import ConfirmationDialog from '../components/ConfirmationDialog';

const StarRating = ({ value, onChange, readonly = false }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={readonly}
        onClick={() => onChange && onChange(star)}
        className={`transition-transform ${readonly ? '' : 'hover:scale-125 cursor-pointer'}`}
      >
        <Star
          className={`w-6 h-6 transition-colors ${
            star <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
          }`}
        />
      </button>
    ))}
  </div>
);

const ratingLabel = (r) => {
  if (r === 5) return { text: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' };
  if (r === 4) return { text: 'Good', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' };
  if (r === 3) return { text: 'Average', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' };
  if (r === 2) return { text: 'Poor', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' };
  return { text: 'Terrible', color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' };
};

export default function Feedback() {
  const { addToast } = useToast();
  const [feedback, setFeedback] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, csat: 0, dist: [0,0,0,0,0] });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null });

  // Form state
  const [selectedCase, setSelectedCase] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const round = (value, decimals) =>
    Number(Math.round(value + 'e' + decimals) + 'e-' + decimals) || 0;

  const computeStats = (data) => {
    if (!data || data.length === 0) {
      setStats({ avgRating: 0, totalReviews: 0, csat: 0, dist: [0,0,0,0,0] });
      return;
    }
    const total = data.length;
    const sum = data.reduce((acc, f) => acc + (f.rating || 0), 0);
    const avg = sum / total;
    const positive = data.filter(f => f.rating >= 4).length;
    const csat = (positive / total) * 100;
    const dist = [1,2,3,4,5].map(r => data.filter(f => f.rating === r).length);
    setStats({ avgRating: round(avg, 1), totalReviews: total, csat: round(csat, 0), dist });
  };

  const fetchFeedback = () => {
    setLoading(true);
    feedbackApi.getAll()
      .then(data => {
        const list = data.results || data.data || data;
        const arr = Array.isArray(list) ? list : [];
        setFeedback(arr);
        computeStats(arr);
        setLoading(false);
      })
      .catch(err => {
        console.error('[Feedback] Error fetching feedback:', err);
        setFeedback([]);
        setLoading(false);
        addToast('Failed to load feedback', 'error');
      });
  };

  const fetchCases = () => {
    casesApi.getAll()
      .then(data => {
        const list = data.results || data.data || data;
        setCases(Array.isArray(list) ? list : []);
      })
      .catch(err => console.error('[Feedback] Error fetching cases:', err));
  };

  useEffect(() => {
    fetchFeedback();
    fetchCases();
  }, []);

  const handleSubmit = () => {
    if (!selectedCase) { addToast('Please select a case', 'error'); return; }
    if (!rating) { addToast('Please select a rating', 'error'); return; }
    setSubmitting(true);
    feedbackApi.create({
      case: selectedCase,
      customer_name: customerName,
      rating,
      comment
    })
    .then(() => {
      setIsModalOpen(false);
      setSelectedCase(''); setCustomerName(''); setRating(0); setComment('');
      fetchFeedback();
      addToast('Feedback submitted successfully!', 'success');
    })
    .catch(err => {
      console.error('[Feedback] Error submitting feedback:', err);
      addToast('Failed to submit feedback', 'error');
    })
    .finally(() => setSubmitting(false));
  };

  const handleDelete = (id) => {
    setDialogConfig({
      isOpen: true,
      title: "Delete Feedback",
      description: "Are you sure you want to delete this feedback entry? This action cannot be undone.",
      onConfirm: () => {
        setDialogConfig({ ...dialogConfig, isOpen: false });
        feedbackApi.delete(id)
          .then(() => { fetchFeedback(); addToast('Feedback deleted', 'success'); })
          .catch(() => addToast('Failed to delete feedback', 'error'));
      }
    });
  };

  const filtered = feedback.filter(fb => {
    const matchSearch = !searchQuery ||
      (fb.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.comment || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchRating = filterRating === 'all' || fb.rating === Number(filterRating);
    return matchSearch && matchRating;
  });

  return (
    <div className="space-y-8 p-6 bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="relative bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-8 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl -z-10 -translate-x-1/2 translate-y-1/2" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent uppercase tracking-tighter">Customer Feedback</h1>
            <p className="text-sm font-bold text-slate-400 mt-1">Monitor satisfaction, collect reviews, and track CSAT scores.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-white/90 border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all text-sm outline-none w-full sm:w-60 shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Avg Rating */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Rating</div>
            <div className="text-2xl font-black text-slate-900">{stats.avgRating}<span className="text-sm text-slate-400 font-bold"> / 5</span></div>
          </div>
        </div>
        {/* Total Reviews */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Reviews</div>
            <div className="text-2xl font-black text-slate-900">{stats.totalReviews}</div>
          </div>
        </div>
        {/* CSAT */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CSAT Score</div>
            <div className="text-2xl font-black text-slate-900">{stats.csat}<span className="text-sm text-slate-400 font-bold">%</span></div>
          </div>
        </div>
      </div>

      {/* Rating Distribution + Feedback List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribution bar */}
        <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-amber-500" />
            Rating Breakdown
          </h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = stats.dist[r - 1] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <button
                  key={r}
                  onClick={() => setFilterRating(filterRating === String(r) ? 'all' : String(r))}
                  className={`w-full flex items-center gap-3 group rounded-xl px-2 py-1 transition-all ${filterRating === String(r) ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}
                >
                  <span className="text-xs font-black text-slate-500 w-4">{r}</span>
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-500 w-6 text-right">{count}</span>
                </button>
              );
            })}
          </div>
          {filterRating !== 'all' && (
            <button
              onClick={() => setFilterRating('all')}
              className="mt-4 w-full text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Feedback cards */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 shadow-sm h-[calc(100vh-150px)] flex flex-col">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-5 flex items-center gap-2 shrink-0">
            <Award className="w-4 h-4 text-blue-500" />
            Customer Reviews
            <span className="ml-auto text-xs font-bold text-slate-400">{filtered.length} entries</span>
          </h3>

          {loading ? (
            <div className="flex flex-col gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="animate-pulse flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-amber-300" />
              </div>
              <p className="text-sm font-bold text-slate-400">No feedback found.</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Feedback" to record the first review.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto flex-1 pr-1">
              {filtered.map((fb) => {
                const label = ratingLabel(fb.rating);
                return (
                  <div key={fb.id} className="py-4 first:pt-0 group hover:bg-slate-50/50 rounded-2xl px-3 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-900">{fb.customer_name || 'Anonymous'}</span>
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full border ${label.bg} ${label.color}`}>
                              {label.text}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                            Case #{fb.case} · {new Date(fb.created_at).toLocaleString()}
                          </div>
                          <StarRating value={fb.rating} readonly />
                          {fb.comment && (
                            <p className="text-sm text-slate-600 mt-2 italic">"{fb.comment}"</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(fb.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Submit Feedback Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500">
              <div>
                <h2 className="text-lg font-black text-white">Submit Feedback</h2>
                <p className="text-xs text-amber-100 mt-0.5">Record customer satisfaction for a resolved case</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Case Selection */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Select Case <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all text-sm outline-none appearance-none cursor-pointer"
                  >
                    <option value="">— Select a case —</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.case_id} · {c.subject}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Smith (optional)"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all text-sm outline-none"
                />
              </div>

              {/* Star Rating */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Rating <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${ratingLabel(rating).bg} ${ratingLabel(rating).color}`}>
                      {ratingLabel(rating).text}
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did the customer say about their experience?"
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all text-sm outline-none resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
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
