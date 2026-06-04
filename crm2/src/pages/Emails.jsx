import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import {
  FiMail, FiSend, FiInbox, FiArchive, FiTrash2, FiSearch,
  FiPlus, FiCheck, FiEye, FiMousePointer, FiAlertCircle, FiClock,
  FiX, FiRefreshCw, FiDownload, FiWifi
} from 'react-icons/fi';
import ConfirmationDialog from '../components/ConfirmationDialog';

const HEADER_HEIGHT = 80; // px — matches h-20 in Header.jsx
const INBOX_POLL_INTERVAL = 2 * 60 * 1000; // auto-check every 2 minutes

const Emails = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [fetchStatus, setFetchStatus] = useState(null); // null | 'fetching' | 'success' | 'error'
  const [fetchMessage, setFetchMessage] = useState('');
  const [lastFetched, setLastFetched] = useState(null);
  const pollTimer = useRef(null);
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, title: '', description: '', onConfirm: null, showCancel: true, confirmText: 'Confirm' });

  const showAlert = (title, description) => {
    setDialogConfig({
      isOpen: true,
      title,
      description,
      showCancel: false,
      confirmText: 'OK',
      onConfirm: () => setDialogConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  useEffect(() => {
    fetchEmails();
    // Auto-poll inbox every 2 minutes
    pollTimer.current = setInterval(() => {
      checkInbox(true); // silent: don't show status banner for auto-polls
    }, INBOX_POLL_INTERVAL);
    return () => clearInterval(pollTimer.current);
  }, []);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/emails/');
      const data = response.data.results || response.data;
      setEmails(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Trigger IMAP inbox fetch from the Gmail server */
  const checkInbox = useCallback(async (silent = false) => {
    if (!silent) setFetchStatus('fetching');
    try {
      const response = await api.post('/emails/fetch_inbox/', { limit: 50 });
      const { fetched, message } = response.data;
      if (!silent) {
        setFetchStatus('success');
        setFetchMessage(message || `${fetched} new email(s) fetched.`);
        setTimeout(() => { setFetchStatus(null); setFetchMessage(''); }, 4000);
      }
      if (fetched > 0) {
        setLastFetched(new Date());
        await fetchEmails(); // Refresh list if new emails came in
      }
    } catch (err) {
      console.error("IMAP fetch failed:", err);
      const errMsg =
        err?.response?.data?.error ||
        "Could not connect to Gmail. Check IMAP settings in .env";
      if (!silent) {
        setFetchStatus('error');
        setFetchMessage(errMsg);
        setTimeout(() => { setFetchStatus(null); setFetchMessage(''); }, 6000);
      }
    }
  }, [fetchEmails]);

  const handleSend = async () => {
    if (!composeData.to || !composeData.subject) {
      showAlert("Validation Error", "Please fill in recipient and subject.");
      return;
    }
    setSendStatus('sending');
    try {
      // Create draft first
      const response = await api.post('/emails/', {
        to_email: composeData.to,
        from_email: "onboarding@resend.dev",
        subject: composeData.subject,
        body: composeData.body.replace(/<[^>]*>/g, ''),
        html_body: composeData.body,
        status: 'draft'
      });

      const emailId = response.data.id;

      // Then send
      await api.post(`/emails/${emailId}/send_email/`);

      setSendStatus('success');
      setTimeout(() => {
        setShowCompose(false);
        setComposeData({ to: '', subject: '', body: '' });
        setSendStatus(null);
        fetchEmails();
      }, 1000);
    } catch (error) {
      console.error("Failed to send email:", error);
      setSendStatus('error');
      setTimeout(() => setSendStatus(null), 3000);
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
      showAlert("Success", "Resend initiated!");
      fetchEmails();
      const response = await api.get(`/emails/${emailId}/`);
      setSelectedEmail(response.data);
    } catch (error) {
      console.error("Failed to retry email:", error);
      showAlert("Error", "Failed to retry email.");
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch =
      (email.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      (email.to_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (email.from_email || '').toLowerCase().includes(search.toLowerCase());

    let matchesFilter = false;
    if (filter === 'All') {
      matchesFilter = true;
    } else if (filter === 'Inbox') {
      matchesFilter = ['inbox', 'received'].includes((email.status || '').toLowerCase());
    } else {
      matchesFilter = (email.status || '').toLowerCase() === filter.toLowerCase();
    }

    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':      return <FiSend className="text-blue-400" title="Sent" />;
      case 'delivered': return <FiCheck className="text-green-400" title="Delivered" />;
      case 'opened':    return <FiEye className="text-purple-400" title="Opened" />;
      case 'clicked':   return <FiMousePointer className="text-yellow-400" title="Clicked" />;
      case 'failed':    return <FiAlertCircle className="text-red-400" title="Failed" />;
      case 'bounced':   return <FiArchive className="text-orange-400" title="Bounced" />;
      case 'inbox':
      case 'received':  return <FiInbox className="text-indigo-400" title="Received" />;
      default:          return <FiClock className="text-gray-400" title="Pending/Draft" />;
    }
  };

  const getStatusBadge = (status) => {
    const base = 'text-xs px-2 py-0.5 rounded-full font-medium';
    switch (status) {
      case 'opened':    return `${base} bg-purple-900/30 text-purple-400`;
      case 'clicked':   return `${base} bg-yellow-900/30 text-yellow-400`;
      case 'delivered': return `${base} bg-green-900/30 text-green-400`;
      case 'failed':    return `${base} bg-red-900/30 text-red-400`;
      case 'sent':      return `${base} bg-blue-900/30 text-blue-400`;
      case 'inbox':
      case 'received':  return `${base} bg-indigo-900/30 text-indigo-400`;
      default:          return `${base} bg-slate-700 text-slate-400`;
    }
  };

  const folderCount = (folder) => {
    if (folder === 'All') return emails.length;
    if (folder === 'Inbox') return emails.filter(e => ['inbox', 'received'].includes((e.status || '').toLowerCase())).length;
    return emails.filter(e => (e.status || '').toLowerCase() === folder.toLowerCase()).length;
  };

  return (
    /* ── Outer shell: fills the main content area below the fixed Header ── */
    <div className="flex h-full bg-slate-900 text-slate-100 font-sans overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col flex-shrink-0 overflow-hidden">
        {/* Sidebar header – static */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0 space-y-2">
          <button
            onClick={() => { setShowCompose(true); setComposeData({ to: '', subject: '', body: '' }); setSendStatus(null); }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/40"
          >
            <FiPlus /> Compose
          </button>

          {/* Check Inbox button */}
          <button
            onClick={() => checkInbox(false)}
            disabled={fetchStatus === 'fetching'}
            className="w-full bg-slate-700 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-600"
          >
            {fetchStatus === 'fetching' ? (
              <><FiRefreshCw className="animate-spin" size={14} /> Checking…</>
            ) : (
              <><FiDownload size={14} /> Check Inbox</>
            )}
          </button>

          {/* Status banner */}
          {fetchStatus === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-700/30 rounded-lg px-3 py-2">
              <FiCheck size={12} /> {fetchMessage}
            </div>
          )}
          {fetchStatus === 'error' && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg px-3 py-2">
              <FiAlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {fetchMessage}
            </div>
          )}
        </div>

        {/* Scrollable folder list */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {['All', 'Inbox', 'Sent', 'Delivered', 'Opened', 'Clicked', 'Failed'].map((folder) => (
            <button
              key={folder}
              onClick={() => setFilter(folder)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                filter === folder
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                  : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
              }`}
            >
              <FiInbox className={filter === folder ? 'text-indigo-400' : 'text-slate-500'} />
              <span className="flex-1 text-left">{folder}</span>
              <span className="bg-slate-700 text-xs text-slate-300 px-2 py-0.5 rounded-full min-w-[24px] text-center">
                {folderCount(folder)}
              </span>
            </button>
          ))}
        </nav>

        {/* Bottom status */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 space-y-2">
          {/* Auto-poll indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <FiWifi size={11} className="text-emerald-500" />
            <span>Auto-checks every 2 min</span>
          </div>
          {lastFetched && (
            <div className="text-xs text-slate-600">
              Last synced: {lastFetched.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-2"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing…' : 'Refresh list'}
          </button>
        </div>
      </aside>

      {/* ── EMAIL LIST ── */}
      <div className="w-80 border-r border-slate-700 flex flex-col flex-shrink-0 overflow-hidden bg-slate-900">
        {/* List header – static */}
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search emails…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200 placeholder-slate-500"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">{filteredEmails.length} email{filteredEmails.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Scrollable email list */}
        <div className="flex-1 overflow-y-auto">
          {loading && emails.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
              <FiRefreshCw className="animate-spin mr-2" /> Loading…
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <FiInbox size={32} className="mb-3 text-slate-700" />
              <p className="text-sm">No emails found</p>
              {filter === 'Inbox' && (
                <div className="text-center mt-3 px-4">
                  <p className="text-xs text-slate-600 mb-3">
                    Click <span className="text-indigo-400 font-medium">Check Inbox</span> in the sidebar to fetch emails from Gmail.
                  </p>
                  <button
                    onClick={() => checkInbox(false)}
                    disabled={fetchStatus === 'fetching'}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                  >
                    <FiDownload size={12} />
                    {fetchStatus === 'fetching' ? 'Checking…' : 'Check Inbox Now'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-slate-800 cursor-pointer transition-colors ${
                  selectedEmail?.id === email.id
                    ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500'
                    : 'hover:bg-slate-800/60 border-l-2 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-slate-200 truncate max-w-[160px]">
                    {['inbox', 'received'].includes(email.status) ? email.from_email : email.to_email}
                  </span>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {new Date(email.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-medium mb-1 truncate">{email.subject}</div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 truncate flex-1">{email.body}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {getStatusIcon(email.status)}
                    <span className={getStatusBadge(email.status)}>{email.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── EMAIL DETAIL ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        {selectedEmail ? (
          <>
            {/* Detail header – static */}
            <div className="p-6 border-b border-slate-700 bg-slate-850 flex-shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 mr-4">
                  <h2 className="text-xl font-semibold text-white mb-1 truncate">{selectedEmail.subject}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                    <span><span className="font-medium text-slate-300">From:</span> {selectedEmail.from_email}</span>
                    <span><span className="font-medium text-slate-300">To:</span> {selectedEmail.to_email}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    {getStatusIcon(selectedEmail.status)}
                    <span className="uppercase text-xs">{selectedEmail.status}</span>
                  </div>
                  {selectedEmail.status === 'failed' && (
                    <button
                      onClick={() => handleRetry(selectedEmail.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FiSend size={11} /> Resend
                    </button>
                  )}
                  <span className="text-xs text-slate-600">ID: {selectedEmail.provider_message_id || 'N/A'}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-500 border-t border-slate-700 pt-3">
                {selectedEmail.sent_at      && <span>Sent: {new Date(selectedEmail.sent_at).toLocaleString()}</span>}
                {selectedEmail.delivered_at && <span>Delivered: {new Date(selectedEmail.delivered_at).toLocaleString()}</span>}
                {selectedEmail.opened_at    && <span>Opened: {new Date(selectedEmail.opened_at).toLocaleString()}</span>}
                {selectedEmail.clicked_at   && <span>Clicked: {new Date(selectedEmail.clicked_at).toLocaleString()}</span>}
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-slate-200 leading-relaxed min-h-[200px] whitespace-pre-wrap">
                {selectedEmail.html_body ? (
                  <div dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} />
                ) : (
                  selectedEmail.body || <span className="text-slate-500 italic">No content</span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600 select-none">
            <FiMail size={52} className="mb-4 text-slate-700" />
            <p className="text-lg font-medium">Select an email to read</p>
            <p className="text-sm text-slate-700 mt-1">Choose from the list on the left</p>
            <button
              onClick={() => checkInbox(false)}
              disabled={fetchStatus === 'fetching'}
              className="mt-6 flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl transition-colors"
            >
              <FiDownload size={15} />
              {fetchStatus === 'fetching' ? 'Checking Gmail…' : 'Check Gmail Inbox'}
            </button>
          </div>
        )}
      </div>

      {/* ── COMPOSE MODAL ── */}
      {showCompose && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/60 backdrop-blur-sm"
          style={{ paddingTop: `${HEADER_HEIGHT + 16}px`, paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowCompose(false); }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-full">

            {/* Modal header – fixed inside modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800 flex-shrink-0 rounded-t-2xl">
              <h2 className="text-base font-semibold text-white">New Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Modal scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* To */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">To</label>
                <input
                  type="email"
                  value={composeData.to}
                  onChange={(e) => setComposeData({ ...composeData, to: e.target.value })}
                  placeholder="recipient@example.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200 placeholder-slate-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  value={composeData.subject}
                  onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                  placeholder="Enter subject"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-slate-200 placeholder-slate-500"
                />
              </div>

              {/* Message body */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Message</label>
                <div className="border border-slate-700 rounded-lg overflow-hidden">
                  {/* Toolbar */}
                  <div className="bg-slate-750 px-3 py-2 border-b border-slate-700 flex gap-1 bg-slate-900">
                    <button
                      type="button"
                      onClick={() => insertTag('b')}
                      className="px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >B</button>
                    <button
                      type="button"
                      onClick={() => insertTag('i')}
                      className="px-3 py-1 text-xs italic text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >I</button>
                    <button
                      type="button"
                      onClick={() => insertTag('u')}
                      className="px-3 py-1 text-xs underline text-slate-300 hover:bg-slate-700 rounded transition-colors"
                    >U</button>
                    <button
                      type="button"
                      onClick={insertLink}
                      className="px-3 py-1 text-xs text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                    >Link</button>
                  </div>
                  <textarea
                    id="email-body-textarea"
                    value={composeData.body}
                    onChange={(e) => setComposeData({ ...composeData, body: e.target.value })}
                    placeholder="Write your message here…"
                    rows={8}
                    className="w-full bg-slate-900 px-4 py-3 text-sm focus:outline-none text-slate-200 resize-none min-h-[180px] placeholder-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Modal footer – fixed inside modal */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800 flex-shrink-0 rounded-b-2xl">
              {sendStatus === 'error' && (
                <p className="text-xs text-red-400">Failed to send. Please try again.</p>
              )}
              {sendStatus === 'success' && (
                <p className="text-xs text-green-400 flex items-center gap-1"><FiCheck /> Email sent!</p>
              )}
              {!sendStatus && <span />}

              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendStatus === 'sending'}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-indigo-900/30"
                >
                  {sendStatus === 'sending' ? (
                    <><FiRefreshCw className="animate-spin" size={14} /> Sending…</>
                  ) : (
                    <><FiSend size={14} /> Send</>
                  )}
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
        confirmText={dialogConfig.confirmText}
        showCancel={dialogConfig.showCancel}
        onConfirm={dialogConfig.onConfirm}
        onCancel={() => setDialogConfig({ ...dialogConfig, isOpen: false })}
      />
    </div>
  );
};

export default Emails;
