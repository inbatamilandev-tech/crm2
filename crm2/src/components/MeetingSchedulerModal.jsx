import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Users, MessageSquare, Loader2, Zap } from 'lucide-react';
import dayjs from 'dayjs';

export default function MeetingSchedulerModal({ 
  isOpen, 
  onClose, 
  onSchedule, 
  leadName, 
  leadId,
  isSubmitting 
}) {
  const [formData, setFormData] = useState({
    title: `Discovery Meeting: ${leadName}`,
    meeting_type: 'discovery',
    date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    startTime: '10:00',
    duration: '30',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Combine date and time for backend (ISO string)
    const startDateTime = dayjs(`${formData.date} ${formData.startTime}`).toISOString();
    const endDateTime = dayjs(startDateTime).add(parseInt(formData.duration), 'minute').toISOString();

    onSchedule({
      title: formData.title,
      task_type: 'meeting',
      meeting_start: startDateTime,
      meeting_end: endDateTime,
      notes: formData.notes,
      lead: leadId,
      priority: 'high',
      status: 'not_started', // We'll mark it as scheduled via status or metadata if needed
      metadata: {
        meeting_type: formData.meeting_type,
        duration_minutes: formData.duration
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Schedule Meeting</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Select a confirmed time for <span className="text-blue-600">{leadName}</span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all border border-slate-100 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Meeting Title */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
              <Zap className="w-3 h-3 mr-1.5 text-blue-500" /> Meeting Subject
            </label>
            <input 
              required 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" 
              placeholder="e.g. Discovery Meeting"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Calendar className="w-3 h-3 mr-1.5 text-indigo-500" /> Date
              </label>
              <input 
                required 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1.5 text-emerald-500" /> Start Time
              </label>
              <input 
                required 
                type="time" 
                value={formData.startTime} 
                onChange={e => setFormData({...formData, startTime: e.target.value})} 
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Duration */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Clock className="w-3 h-3 mr-1.5 text-amber-500" /> Duration
              </label>
              <select 
                value={formData.duration} 
                onChange={e => setFormData({...formData, duration: e.target.value})} 
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="15">15 Minutes</option>
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">1 Hour</option>
                <option value="90">1.5 Hours</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
                <Video className="w-3 h-3 mr-1.5 text-rose-500" /> Meeting Type
              </label>
              <select 
                value={formData.meeting_type} 
                onChange={e => setFormData({...formData, meeting_type: e.target.value})} 
                className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="intro">Introductory Call</option>
                <option value="discovery">Discovery Meeting</option>
                <option value="demo">Product Demo</option>
                <option value="proposal">Proposal Review</option>
                <option value="closing">Closing Meeting</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center">
              <MessageSquare className="w-3 h-3 mr-1.5 text-violet-500" /> Agenda / Notes
            </label>
            <textarea 
              rows={3}
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 min-h-[100px]" 
              placeholder="What should be discussed?"
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule & Create Task
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="w-full py-4 text-slate-400 text-xs font-bold hover:text-slate-600 transition-colors uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
