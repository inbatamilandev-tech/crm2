import React, { useState, useEffect } from 'react';
import { activityFeedApi } from '../services/api';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  Activity, MessageSquare, User, 
  Clock, Filter, RefreshCcw, 
  ChevronRight, Users, Zap 
} from 'lucide-react';

export default function ActivityHub() {
  const { lastMessage } = useWebSocket();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Handle incoming realtime events
  useEffect(() => {
    if (lastMessage && (lastMessage.event === 'activity.created' || lastMessage.event === 'comment.created')) {
      const newItem = lastMessage.payload;
      // Add feed_type and timestamp if missing (standardize for UI)
      if (lastMessage.event === 'comment.created') {
        newItem.feed_type = 'comment';
        newItem.timestamp = newItem.created_at;
      } else {
        newItem.feed_type = 'activity';
        newItem.timestamp = newItem.created_at;
      }
      
      setFeed(prev => {
        if (prev.some(item => item.id === newItem.id && item.feed_type === newItem.feed_type)) return prev;
        return [newItem, ...prev].slice(0, 50);
      });
    }
  }, [lastMessage]);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const data = await activityFeedApi.getFeed();
      setFeed(data);
    } catch (error) {
      console.error("Failed to fetch activity feed", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeed = feed.filter(item => {
    if (filter === 'all') return true;
    return item.feed_type === filter;
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <div className="flex items-center space-x-4 mb-2">
            <div className="w-12 h-12 bg-[#DF7F09] rounded-2xl flex items-center justify-center shadow-xl shadow-[#DF7F09]/20">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[#095D95] dark:text-[#50B1B9]">Activity Hub</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">Real-time operational stream across all CRM modules and teams.</p>
        </div>

        <div className="flex items-center space-x-4 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'activity', label: 'Updates' },
            { id: 'comment', label: 'Discussion' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                filter === f.id 
                  ? 'bg-white dark:bg-slate-800 text-[#095D95] dark:text-[#50B1B9] shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button 
            onClick={fetchFeed}
            className="p-3 text-slate-400 hover:text-[#095D95] transition-colors"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {loading && feed.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center opacity-50">
              <div className="w-12 h-12 border-4 border-[#095D95] border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-xs font-black uppercase tracking-widest">Aggregating operational data...</p>
            </div>
          ) : filteredFeed.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 p-20 rounded-3xl border border-slate-200 dark:border-white/5 text-center">
              <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">No activity found</h3>
              <p className="text-sm text-slate-500 mt-2">Try changing your filter or check back later.</p>
            </div>
          ) : (
            filteredFeed.map((item, index) => (
              <div 
                key={`${item.feed_type}-${item.id}`} 
                className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6 md:p-8 flex items-start space-x-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    item.feed_type === 'comment' ? 'bg-[#50B1B9]/10 text-[#50B1B9]' : 'bg-[#095D95]/10 text-[#095D95]'
                  }`}>
                    {item.feed_type === 'comment' ? <MessageSquare className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                          {item.user_details?.avatar ? <img src={item.user_details.avatar} /> : <User className="w-3 h-3 text-slate-500" />}
                        </div>
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                          {item.user_details?.first_name || item.created_by_name || 'System'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">• {new Date(item.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        item.feed_type === 'comment' ? 'bg-[#50B1B9]/10 text-[#50B1B9]' : 'bg-[#095D95]/10 text-[#095D95]'
                      }`}>
                        {item.feed_type}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed mb-4">
                      {item.text || item.notes}
                    </p>

                    <div className="flex items-center justify-between border-t border-slate-50 dark:border-white/5 pt-4">
                      <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Users className="w-3 h-3 mr-1.5" />
                        Related to: <span className="text-slate-600 dark:text-slate-200 ml-1.5">{item.related_to_name || 'Global'}</span>
                      </div>
                      <button className="flex items-center text-[10px] font-black uppercase tracking-widest text-[#095D95] dark:text-[#50B1B9] hover:underline">
                        View Details <ChevronRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-8">
          {/* Active Collaborators */}
          <div className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl border border-slate-200 dark:border-white/5">
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight mb-6 flex items-center">
              <Users className="w-4 h-4 mr-2 text-[#50B1B9]" /> Active Collaborators
            </h3>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center relative">
                      <User className="w-5 h-5 text-slate-400" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">Team Member {i}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active 2m ago</p>
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-[#095D95] p-8 rounded-3xl text-white shadow-xl shadow-[#095D95]/20">
            <h3 className="text-sm font-black uppercase tracking-tight mb-6">Operations Summary</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">New Comments</p>
                <p className="text-2xl font-black">12</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Updates Today</p>
                <p className="text-2xl font-black">48</p>
              </div>
            </div>
            <button className="w-full mt-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              Download Activity Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
