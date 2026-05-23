import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FiMail, FiSend, FiInbox, FiArchive, FiTrash2, FiSearch, 
  FiPlus, FiCheck, FiEye, FiMousePointer, FiAlertCircle, FiClock 
} from 'react-icons/fi';

const Emails = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await api.get('/emails/');
      setEmails(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
    }
  };

  const handleSend = async () => {
    try {
      // First create a draft
      const response = await api.post('/emails/', {
        to_email: composeData.to,
        from_email: "onboarding@resend.dev", // Default or user email
        subject: composeData.subject,
        body: composeData.body.replace(/<[^>]*>/g, ''), // Strip HTML for plain body
        html_body: composeData.body, // Full HTML from Quill
        status: 'draft'
      });
      
      const emailId = response.data.id;
      
      // Then send it
      await api.post(`/emails/${emailId}/send_email/`);
      
      setShowCompose(false);
      setComposeData({ to: '', subject: '', body: '' });
      fetchEmails();
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Check console for details.");
    }
  };

  const insertTag = (tag) => {
    const textarea = document.getElementById('email-body-textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = composeData.body;
    const selectedText = text.substring(start, end);
    
    const newText = text.substring(0, start) + `<${tag}>${selectedText}</${tag}>` + text.substring(end);
    
    setComposeData({ ...composeData, body: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2 + selectedText.length);
    }, 0);
  };

  const insertLink = () => {
    const url = prompt("Enter URL:", "https://");
    if (!url) return;
    insertTag(`a href="${url}" target="_blank"`);
  };

  const handleRetry = async (emailId) => {
    try {
      await api.post(`/emails/${emailId}/retry/`);
      alert("Resend initiated!");
      fetchEmails();
      // Refresh selected email
      const response = await api.get(`/emails/${emailId}/`);
      setSelectedEmail(response.data);
    } catch (error) {
      console.error("Failed to retry email:", error);
      alert("Failed to retry email.");
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(search.toLowerCase()) || 
                          email.to_email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'All' || email.status === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <FiSend className="text-blue-400" title="Sent" />;
      case 'delivered': return <FiCheck className="text-green-400" title="Delivered" />;
      case 'opened': return <FiEye className="text-purple-400" title="Opened" />;
      case 'clicked': return <FiMousePointer className="text-yellow-400" title="Clicked" />;
      case 'failed': return <FiAlertCircle className="text-red-400" title="Failed" />;
      case 'bounced': return <FiArchive className="text-orange-400" title="Bounced" />;
      default: return <FiClock className="text-gray-400" title="Pending/Draft" />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar for Email Folders */}
      <div className="w-64 bg-slate-800 p-4 border-r border-slate-700">
        <button 
          onClick={() => setShowCompose(true)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mb-6 shadow-lg shadow-indigo-900/30"
        >
          <FiPlus /> Compose
        </button>
        
        <nav className="space-y-1">
          {['All', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Failed'].map((folder) => (
            <button
              key={folder}
              onClick={() => setFilter(folder)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                filter === folder ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <FiInbox className={filter === folder ? 'text-indigo-400' : 'text-slate-500'} />
              {folder}
              <span className="ml-auto bg-slate-800 text-xs text-slate-400 px-2 py-0.5 rounded-full">
                {emails.filter(e => folder === 'All' || e.status === folder.toLowerCase()).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Email List */}
      <div className="w-1/3 border-r border-slate-700 flex flex-col bg-slate-850">
        <div className="p-4 border-bottom border-slate-700">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredEmails.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">No emails found</div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-slate-700 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id ? 'bg-slate-700' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-sm text-slate-200">{email.to_email}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(email.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium mb-1 truncate">{email.subject}</div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500 truncate w-3/4">{email.body}</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(email.status)}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      email.status === 'opened' ? 'bg-purple-900/30 text-purple-400' :
                      email.status === 'clicked' ? 'bg-yellow-900/30 text-yellow-400' :
                      email.status === 'delivered' ? 'bg-green-900/30 text-green-400' :
                      email.status === 'failed' ? 'bg-red-900/30 text-red-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {email.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-slate-900">
        {selectedEmail ? (
          <>
            <div className="p-6 border-b border-slate-700 bg-slate-850">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-xl font-semibold text-white mb-1">{selectedEmail.subject}</h1>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="font-medium text-slate-200">From:</span> {selectedEmail.from_email}
                    <span className="font-medium text-slate-200 ml-4">To:</span> {selectedEmail.to_email}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-300 flex items-center justify-end gap-1">
                      {getStatusIcon(selectedEmail.status)}
                      {selectedEmail.status.toUpperCase()}
                    </div>
                    {selectedEmail.status === 'failed' && (
                      <button
                        onClick={() => handleRetry(selectedEmail.id)}
                        className="mt-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1 px-3 rounded transition-colors flex items-center gap-1 float-right"
                      >
                        <FiSend size={12} /> Resend
                      </button>
                    )}
                    <div className="text-xs text-slate-500 clear-both">
                      ID: {selectedEmail.provider_message_id || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 text-xs text-slate-500">
                {selectedEmail.sent_at && <span>Sent: {new Date(selectedEmail.sent_at).toLocaleString()}</span>}
                {selectedEmail.delivered_at && <span>Delivered: {new Date(selectedEmail.delivered_at).toLocaleString()}</span>}
                {selectedEmail.opened_at && <span>Opened: {new Date(selectedEmail.opened_at).toLocaleString()}</span>}
                {selectedEmail.clicked_at && <span>Clicked: {new Date(selectedEmail.clicked_at).toLocaleString()}</span>}
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 text-slate-200 leading-relaxed min-h-[300px]">
                {selectedEmail.body}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <FiMail size={48} className="mb-4 text-slate-700" />
            <p className="text-lg">Select an email to view details</p>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-850 rounded-t-xl">
              <h2 className="text-lg font-semibold text-white">New Message</h2>
              <button 
                onClick={() => setShowCompose(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">To</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Enter subject"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200"
                />
              </div>
              
              <div className="text-slate-200">
                <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider mb-2">Message</label>
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-800 p-2 border-b border-slate-700 flex gap-2">
                    <button 
                      type="button"
                      onClick={() => insertTag('b')}
                      className="px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >
                      B
                    </button>
                    <button 
                      type="button"
                      onClick={() => insertTag('i')}
                      className="px-3 py-1 text-xs italic text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >
                      I
                    </button>
                    <button 
                      type="button"
                      onClick={() => insertLink()}
                      className="px-3 py-1 text-xs text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                    >
                      Link
                    </button>
                  </div>
                  <textarea
                    id="email-body-textarea"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Write your message here... You can use HTML tags like <b> or <i>"
                    rows={8}
                    className="w-full bg-slate-900 px-4 py-2.5 text-sm focus:outline-none transition-colors text-slate-200 resize-none min-h-[200px]"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-top border-slate-700 flex justify-end gap-3 bg-slate-850 rounded-b-xl">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/30"
              >
                <FiSend className="text-sm" /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Emails;
