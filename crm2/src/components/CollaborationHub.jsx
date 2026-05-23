import React, { useState, useEffect, useRef } from 'react';
import { commentsApi, usersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  MessageSquare, AtSign, Send, Reply, 
  User, Clock, Shield, MoreHorizontal, 
  CheckCircle, Hash, Paperclip 
} from 'lucide-react';

export default function CollaborationHub({ contentType, objectId }) {
  const { user: currentUser } = useAuth();
  const { 
    subscribeToRecord, lastMessage, setTyping, 
    activeViewers, typingUsers, presence 
  } = useWebSocket();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Handle incoming realtime comments
  useEffect(() => {
    if (lastMessage && lastMessage.event === 'comment.created') {
      const newComment = lastMessage.payload;
      if (newComment.content_type === contentType || newComment.content_type_name === contentType) {
        if (String(newComment.object_id) === String(objectId)) {
          setComments(prev => {
            if (prev.some(c => c.id === newComment.id)) return prev;
            return [...prev, newComment].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        }
      }
    }
  }, [lastMessage, contentType, objectId]);

  useEffect(() => {
    fetchComments();
    fetchUsers();
    subscribeToRecord(contentType, objectId);
  }, [contentType, objectId, subscribeToRecord]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await commentsApi.getByRecord(contentType, objectId);
      setComments(data.results || data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      setUsers(data.results || data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const handleSendComment = async (e, parentId = null) => {
    if (e) e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSending(true);
      const data = await commentsApi.create({
        text: newComment,
        content_type_name: contentType,
        object_id: objectId,
        parent: parentId,
        is_internal: isInternal
      });
      
      setNewComment('');
      setTyping(false); // Immediate stop typing
      fetchComments();
    } catch (error) {
      console.error("Failed to send comment", error);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    // Typing logic
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 3000);

    const lastChar = value[value.length - 1];
    const mentionMatch = value.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      const filtered = users.filter(u => 
        u.username.toLowerCase().includes(query) || 
        (u.first_name && u.first_name.toLowerCase().includes(query))
      );
      setFilteredUsers(filtered);
      setShowMentionSuggestions(true);
    } else {
      setShowMentionSuggestions(false);
    }
  };

  const insertMention = (username) => {
    const parts = newComment.split(/@\w*$/);
    setNewComment(parts[0] + '@' + username + ' ');
    setShowMentionSuggestions(false);
    inputRef.current?.focus();
  };

  const formatComment = (text) => {
    return text.split(/(@\w+)/).map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-[#095D95] font-black cursor-pointer hover:underline">{part}</span>;
      }
      return part;
    });
  };

  // Filter typing users (exclude self)
  const otherTypingUsers = Object.entries(typingUsers)
    .filter(([id]) => String(id) !== String(currentUser?.id))
    .map(([_, username]) => username);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-2xl">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#095D95]/10 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#095D95]" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight text-slate-800 dark:text-white">Collaboration Hub</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Record-level operational notes</p>
          </div>
        </div>
        
        {/* Active Viewers Stack */}
        <div className="flex items-center space-x-4">
          <div className="flex -space-x-2 overflow-hidden">
            {activeViewers.map(vId => {
              const u = users.find(user => String(user.id) === String(vId));
              return (
                <div key={vId} className="inline-block h-8 w-8 rounded-full ring-2 ring-white dark:ring-slate-800 bg-slate-200 flex items-center justify-center text-[10px] font-black" title={u?.username || 'Viewer'}>
                  {u?.username?.[0].toUpperCase() || 'V'}
                </div>
              );
            })}
            {activeViewers.length > 0 && (
              <div className="h-8 px-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center ml-2">
                <span className="text-[9px] font-black uppercase tracking-widest">{activeViewers.length} Active Now</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setIsInternal(true)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${isInternal ? 'bg-white dark:bg-slate-800 text-[#095D95] shadow-sm' : 'text-slate-400'}`}
            >
              Internal
            </button>
            <button 
              onClick={() => setIsInternal(false)}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${!isInternal ? 'bg-white dark:bg-slate-800 text-[#095D95] shadow-sm' : 'text-slate-400'}`}
            >
              Shared
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <div className="w-8 h-8 border-2 border-[#095D95] border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-[10px] font-black uppercase tracking-widest">Syncing discussion...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <AtSign className="w-8 h-8 text-slate-300" />
            </div>
            <h4 className="text-sm font-black text-slate-700 dark:text-white uppercase tracking-tight">No collaboration yet</h4>
            <p className="text-[11px] text-slate-500 mt-2">Start the conversation by @mentioning a teammate or leaving a note.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="group">
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr from-[#095D95] to-[#50B1B9] flex items-center justify-center text-white text-xs font-black shadow-lg shadow-[#095D95]/10 overflow-hidden flex-shrink-0 relative ring-2 ${
                  presence[comment.user_details?.id]?.status === 'online' ? 'ring-emerald-500' : 
                  presence[comment.user_details?.id]?.status === 'dnd' ? 'ring-rose-500' :
                  presence[comment.user_details?.id]?.status === 'away' ? 'ring-amber-500' : 'ring-transparent'
                }`}>
                  {comment.user_details?.avatar ? (
                    <img src={comment.user_details.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    comment.user_details?.username?.[0].toUpperCase()
                  )}
                  {presence[comment.user_details?.id]?.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">
                        {comment.user_details?.first_name} {comment.user_details?.last_name}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">@{comment.user_details?.username}</span>
                      {comment.is_internal && (
                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded">Internal</span>
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                      {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {formatComment(comment.text)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-[9px] font-black text-[#095D95] uppercase tracking-widest flex items-center hover:underline">
                      <Reply className="w-3 h-3 mr-1" /> Reply
                    </button>
                    <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center hover:text-slate-600">
                      <Shield className="w-3 h-3 mr-1" /> Resolve
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Replies */}
              {comment.replies?.length > 0 && (
                <div className="ml-14 mt-4 space-y-4 border-l-2 border-slate-100 dark:border-white/5 pl-6">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-black overflow-hidden flex-shrink-0">
                        {reply.user_details?.avatar ? <img src={reply.user_details.avatar} className="w-full h-full object-cover" /> : reply.user_details?.username?.[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="bg-slate-100/50 dark:bg-white/5 p-3 rounded-xl">
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">{formatComment(reply.text)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-white/5 relative">
        {showMentionSuggestions && filteredUsers.length > 0 && (
          <div className="absolute bottom-full left-6 right-6 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4 py-3 border-b border-slate-50 dark:border-white/5">Mention Teammate</p>
            <div className="max-h-48 overflow-y-auto">
              {filteredUsers.map(u => (
                <button 
                  key={u.id}
                  onClick={() => insertMention(u.username)}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#095D95] to-[#50B1B9] flex items-center justify-center text-white text-[10px] font-black">
                    {u.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight">{u.first_name} {u.last_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {otherTypingUsers.length > 0 && (
          <div className="absolute bottom-[calc(100%+8px)] left-6 flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-[#095D95] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1 h-1 bg-[#095D95] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1 h-1 bg-[#095D95] rounded-full animate-bounce"></div>
            </div>
            <p className="text-[10px] font-bold text-[#095D95] uppercase tracking-widest">
              {otherTypingUsers.length === 1 
                ? `${otherTypingUsers[0]} is typing...` 
                : `${otherTypingUsers.length} people are typing...`}
            </p>
          </div>
        )}

        <form onSubmit={handleSendComment} className="relative">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={handleInputChange}
            placeholder={`Type @ to mention teammates...`}
            className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl p-4 pr-14 text-xs font-medium focus:ring-2 focus:ring-[#095D95]/20 min-h-[100px] resize-none"
          />
          <div className="absolute right-3 bottom-3 flex items-center space-x-2">
            <button type="button" className="p-2 text-slate-400 hover:text-[#095D95] transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button 
              type="submit"
              disabled={sending || !newComment.trim()}
              className="w-10 h-10 bg-[#095D95] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#095D95]/20 hover:scale-105 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <div className="flex items-center space-x-4 mt-3">
          <div className="flex items-center space-x-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isInternal ? 'bg-amber-500' : 'bg-[#50B1B9]'}`}></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {isInternal ? 'Internal Visibility' : 'Shared with Stakeholders'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
