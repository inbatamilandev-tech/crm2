import React, { useState, useEffect } from 'react';
import {
  Plus, Users, Calendar, Clock, Video, FileText, X,
  MapPin, Phone, MoreHorizontal, Search, Filter,
  ChevronRight, CalendarDays, ExternalLink, Edit3
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { meetingsApi } from '../services/api';

import { useWebSocket } from '../context/WebSocketContext';
import dayjs from 'dayjs';

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToast } = useToast();
  const { lastMessage } = useWebSocket();
  const [formData, setFormData] = useState({ title: '', date: '', time: '', participants: '', type: 'Video Call', notes: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const fetchMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await meetingsApi.getAll();
      setMeetings(data.results || data);
    } catch (err) {
      addToast("Failed to fetch meetings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    if (lastMessage && lastMessage.model === 'Meeting') {
      fetchMeetings();
    }
  }, [lastMessage]);

  const filteredMeetings = meetings.filter(m =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    try {
      let start_time = null;
      let end_time = null;
      if (formData.date) {
        const timeStr = formData.time || '00:00';
        start_time = dayjs(`${formData.date}T${timeStr}`).toISOString();
        end_time = dayjs(start_time).add(1, 'hour').toISOString();
      }

      const payload = {
        title: formData.title,
        date: formData.date,
        time: formData.time,
        start_time: start_time,
        end_time: end_time,
        type: formData.type,
        meeting_type: formData.type,
        notes: formData.notes,
        participants: Array.isArray(formData.participants) 
          ? formData.participants 
          : (formData.participants ? formData.participants.split(',').map(p => p.trim()).filter(Boolean) : [])
      };

      if (isEditing) {
        await meetingsApi.patch(editingId, payload);
        addToast("Meeting updated successfully");
      } else {
        await meetingsApi.create(payload);
        addToast("Meeting scheduled successfully");
      }

      closeModal();
      fetchMeetings();
    } catch (err) {
      const errorMsg = typeof err.response?.data === 'object' ? JSON.stringify(err.response?.data) : (err.response?.data?.detail || err.message || "Unknown error");
      addToast(isEditing ? `Failed to update: ${errorMsg}` : `Failed to schedule: ${errorMsg}`, "error");
    }
  };

  const openEditModal = (meeting) => {
    setIsEditing(true);
    setEditingId(meeting.id);
    setFormData({
      title: meeting.title,
      date: meeting.date || '',
      time: meeting.time || '',
      participants: meeting.participants.join(', '),
      type: meeting.type || 'Video Call',
      notes: meeting.notes || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({ title: '', date: '', time: '', participants: '', type: 'Video Call', notes: '' });
  };

  return (
    /*
     * Outer container fills the space given by MainLayout's scrollable <main>.
     * We re-implement a two-part layout here:
     *   1. Static header strip (title, search, button) — never scrolls
     *   2. Scrollable meetings grid
     */
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-4 md:-mt-8 -mx-4 md:-mx-8 overflow-hidden bg-slate-50/50">

      {/* ── Static Header ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 md:px-10 py-5 shadow-sm z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-[1600px] mx-auto">
          {/* Title */}
          <div>
            <div className="flex items-center space-x-2 mb-0.5">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activities</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Meetings</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Live Sync</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search meetings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-100 transition-all flex-shrink-0">
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-5 py-2.5 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex-shrink-0"
            >
              <Plus className="mr-2 w-4 h-4" />
              Add Meeting
            </button>
          </div>
        </div>
      </div>

      {/* ── Scrollable Meetings Grid ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth custom-scrollbar">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Protocols...</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <CalendarDays className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-lg font-black text-slate-700">No meetings found</p>
              <p className="text-sm mt-1">Click "Add Meeting" to schedule one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredMeetings.map(meeting => (
                <div key={meeting.id} className="bg-white rounded-[32px] border border-slate-200 shadow-xl shadow-slate-200/40 p-8 hover:shadow-2xl hover:shadow-slate-200/60 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 pr-10">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${meeting.type === 'Video Call' ? 'bg-blue-500/10 text-blue-600 border border-blue-200' : 'bg-purple-500/10 text-purple-600 border border-purple-200'
                          }`}>
                          {meeting.type || 'Protocol'}
                        </span>
                        {dayjs().isAfter(dayjs(`${meeting.date} ${meeting.time}`)) ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 border border-slate-200">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 animate-pulse">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-tight tracking-tight">{meeting.title}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl ${meeting.type === 'Video Call' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-900 text-white shadow-lg shadow-slate-200'} group-hover:scale-110 transition-transform duration-500`}>
                      {meeting.type === 'Video Call' ? <Video className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-6 text-[12px] font-bold text-slate-500">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-slate-300" />
                        {meeting.date}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-slate-300" />
                        {meeting.time}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 backdrop-blur-sm">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                        <Users className="w-3 h-3 mr-1.5" /> Personnel Sync
                      </h4>
                      <div className="flex -space-x-2.5">
                        {meeting.participants && meeting.participants.length > 0 ? (
                          meeting.participants.map((p, i) => (
                            <div
                              key={p + i}
                              className="w-10 h-10 rounded-xl bg-white border-2 border-slate-50 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm hover:z-20 hover:-translate-y-1 transition-all cursor-help group/p"
                              title={p}
                            >
                              <span className="group-hover/p:text-blue-600 transition-colors">{p.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                              <Plus className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">Initialize identity sync...</span>
                          </div>
                        )}
                        {meeting.participants && meeting.participants.length > 0 && (
                          <button className="w-10 h-10 rounded-xl bg-white border-2 border-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:bg-blue-50 transition-all shadow-sm">
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {meeting.notes && (
                      <div
                        onClick={() => openEditModal(meeting)}
                        className="bg-slate-50 rounded-2xl p-5 border border-slate-100 relative overflow-hidden cursor-pointer hover:bg-white hover:border-blue-100 hover:shadow-md transition-all group/notes"
                      >
                        <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover/notes:text-blue-500 transition-colors">
                          <FileText className="w-3.5 h-3.5 mr-2" /> Agenda Log
                        </div>
                        <p className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">{meeting.notes}</p>
                        <div className="absolute top-4 right-4 opacity-0 group-hover/notes:opacity-100 transition-all translate-x-2 group-hover/notes:translate-x-0">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditModal(meeting)}
                        className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 hover:shadow-blue-200 flex items-center group/btn"
                      >
                        Full Details
                        <ChevronRight className="w-3.5 h-3.5 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                      <button
                        onClick={() => openEditModal(meeting)}
                        className="p-2.5 bg-white text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm border border-slate-100 group/edit"
                        title="Edit Protocol"
                      >
                        <Edit3 className="w-4 h-4 group-hover/edit:rotate-12 transition-transform" />
                      </button>
                    </div>

                    {/* <div className="flex items-center gap-2">
                      <button className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div> */}
                  </div>

                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-0 group-hover:opacity-40 transition-opacity blur-2xl" />
                </div>
              ))}

              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-slate-50 border-4 border-dashed border-slate-200 rounded-[32px] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all min-h-[300px] group"
              >
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-8 h-8" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest">Initialize Sync</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Schedule Modal ─────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-10 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={closeModal} />
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative z-10 animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{isEditing ? 'Edit Protocol' : 'Schedule Protocol'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Calendar Integration Sync</p>
              </div>
              <button onClick={closeModal} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeeting} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol Title *</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="input-field" placeholder="Strategic Objective Sync" />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Sync Date *</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time Slot *</label>
                  <input required type="time" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Protocol Channel</label>
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="input-field appearance-none bg-white">
                  <option>Video Call</option><option>In Person</option><option>Phone</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Personnel Sync (comma separated)</label>
                <input type="text" value={formData.participants} onChange={e => setFormData({ ...formData, participants: e.target.value })} className="input-field" placeholder="Identity names..." />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Agenda Specification</label>
                <textarea rows="3" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="input-field py-4 resize-none" placeholder="Topics for analysis..."></textarea>
              </div>

              <div className="pt-8 mt-4 border-t border-slate-50 flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center">
                  {isEditing ? 'Update Protocol' : 'Schedule Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
