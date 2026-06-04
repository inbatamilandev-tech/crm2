import { 
  leadsApi, 
  dealsApi, 
  tasksApi, 
  invoicesApi, 
  callsApi, 
  meetingsApi, 
  quotesApi, 
  usersApi,
  analyticsApi,
  contactsApi,
  projectsApi,
  casesApi,
  productsApi,
  activitiesApi
} from '../../services/api';

const handleApiError = (error, moduleName) => {
  if (error.response && error.response.status === 403) {
    return `You do not have permission to access ${moduleName} information.`;
  }
  return `Failed to fetch ${moduleName} data. Please check your connection or permissions.`;
};

const extractDataArray = (data) => data.results || data || [];

const isToday = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

const isThisWeek = (dateString) => {
  if (!dateString) return false;
  const curr = new Date();
  const first = curr.getDate() - curr.getDay();
  const last = first + 6;
  const firstDay = new Date(curr.setDate(first));
  const lastDay = new Date(curr.setDate(last));
  const date = new Date(dateString);
  return date >= firstDay && date <= lastDay;
};

const isThisMonth = (dateString) => {
  if (!dateString) return false;
  const today = new Date();
  const date = new Date(dateString);
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};

export const AssistantService = {
  processMessage: async (message) => {
    const text = message.toLowerCase();
    
    try {

      // ---------------------------------------------------------
      // DASHBOARD OVERVIEW LOGIC
      // ---------------------------------------------------------
      if (text.includes('dashboard') || text.includes('overview') || text === 'summary') {
        try {
          const [leadsData, dealsData, tasksData, invoicesData, supportData] = await Promise.all([
            leadsApi.getAll().catch(() => ({ results: [] })),
            dealsApi.getAll().catch(() => ({ results: [] })),
            tasksApi.getAll().catch(() => ({ results: [] })),
            invoicesApi.getAll().catch(() => ({ results: [] })),
            casesApi.getAll().catch(() => ({ results: [] }))
          ]);

          const leads = extractDataArray(leadsData);
          const deals = extractDataArray(dealsData);
          const tasks = extractDataArray(tasksData);
          const invoices = extractDataArray(invoicesData);
          const tickets = extractDataArray(supportData);

          const openDeals = deals.filter(d => d.stage?.toLowerCase() !== 'won' && d.stage?.toLowerCase() !== 'lost');
          const pipelineValue = openDeals.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
          const pendingTasks = tasks.filter(t => t.status !== 'completed');
          const pendingInvoices = invoices.filter(i => i.status?.toLowerCase() !== 'paid');
          const outstandingRev = pendingInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount || i.amount || 0), 0);
          const openTickets = tickets.filter(t => t.status?.toLowerCase() !== 'closed' && t.status?.toLowerCase() !== 'resolved');

          let res = `📊 **CRM Comprehensive Dashboard**\n\n`;
          res += `• Total Leads: ${leads.length}\n`;
          res += `• Active Pipeline: Rs. ${pipelineValue.toLocaleString()} (${openDeals.length} Deals)\n`;
          res += `• Pending Tasks: ${pendingTasks.length}\n`;
          res += `• Outstanding Invoices: Rs. ${outstandingRev.toLocaleString()} (${pendingInvoices.length} Invoices)\n`;
          res += `• Open Support Tickets: ${openTickets.length}\n`;
          return res;
        } catch (error) { return "Unable to generate dashboard summary."; }
      }

      // ---------------------------------------------------------
      // LEADS LOGIC
      // ---------------------------------------------------------
      if (text.includes('lead')) {
        try {
          const data = await leadsApi.getAll();
          const leads = extractDataArray(data);
          
          const total = leads.length;
          const newLeads = leads.filter(l => l.status?.toLowerCase() === 'new');
          const contacted = leads.filter(l => l.status?.toLowerCase() === 'contacted');
          const qualified = leads.filter(l => l.status?.toLowerCase() === 'qualified');
          const converted = leads.filter(l => l.status?.toLowerCase() === 'converted' || l.converted);
          const lost = leads.filter(l => l.status?.toLowerCase() === 'lost' || l.status?.toLowerCase() === 'junk');
          
          const hot = leads.filter(l => l.rating?.toLowerCase() === 'hot' || l.lead_score > 80);
          const cold = leads.filter(l => l.rating?.toLowerCase() === 'cold' || l.lead_score < 30);
          
          const addedToday = leads.filter(l => isToday(l.created_at || l.date_entered));
          const addedWeek = leads.filter(l => isThisWeek(l.created_at || l.date_entered));
          const addedMonth = leads.filter(l => isThisMonth(l.created_at || l.date_entered));
          
          const sources = {};
          leads.forEach(l => {
            const src = l.source || l.lead_source || 'Unknown';
            sources[src] = (sources[src] || 0) + 1;
          });
          const topSource = Object.keys(sources).sort((a,b) => sources[b] - sources[a])[0];

          let res = `🎯 **Lead Insights**\n\n`;
          res += `• Total Leads: ${total}\n`;
          res += `• New: ${newLeads.length} | Contacted: ${contacted.length} | Qualified: ${qualified.length}\n`;
          res += `• Converted: ${converted.length} | Lost: ${lost.length}\n`;
          res += `• Hot Leads: ${hot.length} | Cold Leads: ${cold.length}\n\n`;
          res += `📈 **Trends**\n`;
          res += `• Added Today: ${addedToday.length}\n`;
          res += `• Added This Week: ${addedWeek.length}\n`;
          res += `• Added This Month: ${addedMonth.length}\n`;
          if (topSource) res += `• Top Lead Source: ${topSource} (${sources[topSource]})\n`;
          
          if (total > 0) {
            const cvRate = ((converted.length / total) * 100).toFixed(1);
            res += `• Conversion Rate: ${cvRate}%\n`;
          }

          res += `\n👤 **Recent Leads**\n`;
          const recent = [...leads].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
          recent.forEach(l => res += `• ${l.first_name || ''} ${l.last_name || l.name || 'Unknown'} (${l.status || 'New'})\n`);

          return res;
        } catch (error) { return handleApiError(error, "lead"); }
      }

      // ---------------------------------------------------------
      // DEALS / SALES / PIPELINE LOGIC
      // ---------------------------------------------------------
      if (text.includes('deal') || text.includes('sales') || text.includes('pipeline')) {
        try {
          const data = await dealsApi.getAll();
          const deals = extractDataArray(data);
          
          const total = deals.length;
          const successfullyClosed = deals.filter(d => d.stage?.toLowerCase() === 'successfully closed' || d.status?.toLowerCase() === 'won');
          const lost = deals.filter(d => d.stage?.toLowerCase() === 'lost' || d.status?.toLowerCase() === 'lost');
          const open = deals.filter(d => d.stage?.toLowerCase() !== 'successfully closed' && d.stage?.toLowerCase() !== 'lost');
          const negotiation = open.filter(d => d.stage?.toLowerCase().includes('negotiation'));
          
          const pipelineValue = open.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
          const successfullyClosedRevenue = successfullyClosed.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
          const lostRevenue = lost.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
          const avgDealSize = successfullyClosed.length > 0 ? (successfullyClosedRevenue / successfullyClosed.length) : 0;
          
          const thisMonthSuccessfullyClosed = successfullyClosed.filter(d => isThisMonth(d.closed_date || d.closing_date || d.updated_at));

          let res = `💼 **Pipeline & Sales Analytics**\n\n`;
          res += `• Total Deals: ${total}\n`;
          res += `• Open Deals: ${open.length} | Successfully Closed: ${successfullyClosed.length} | Lost: ${lost.length}\n`;
          res += `• In Negotiation: ${negotiation.length}\n\n`;
          res += `💰 **Revenue Metrics**\n`;
          res += `• Open Pipeline Value: Rs. ${pipelineValue.toLocaleString()}\n`;
          res += `• Successfully Closed Revenue: Rs. ${successfullyClosedRevenue.toLocaleString()}\n`;
          res += `• Lost Revenue: Rs. ${lostRevenue.toLocaleString()}\n`;
          res += `• Average Successfully Closed Deal Size: Rs. ${avgDealSize.toLocaleString(undefined, {maximumFractionDigits:2})}\n`;
          res += `• Successfully Closed This Month: ${thisMonthSuccessfullyClosed.length}\n\n`;

          const sorted = [...deals].sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
          if (sorted.length > 0) {
            res += `🏆 **Largest Deal:** ${sorted[0].name} (Rs. ${parseFloat(sorted[0].amount || 0).toLocaleString()})\n`;
          }

          if (open.length > 0) {
            res += `\n📌 **Recent Open Deals**\n`;
            const recentOpen = [...open].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3);
            recentOpen.forEach(d => res += `• ${d.name} (Rs. ${parseFloat(d.amount || 0).toLocaleString()})\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "deal / pipeline"); }
      }

      // ---------------------------------------------------------
      // TASKS / WORK QUEUE LOGIC
      // ---------------------------------------------------------
      if (text.includes('task') || text.includes('work queue')) {
        try {
          const data = await tasksApi.getAll();
          const tasks = extractDataArray(data);

          const total = tasks.length;
          const completed = tasks.filter(t => t.status?.toLowerCase() === 'completed');
          const pending = tasks.filter(t => t.status?.toLowerCase() !== 'completed');
          
          const todayDate = new Date();
          const overdue = pending.filter(t => t.due_date && new Date(t.due_date) < todayDate);
          const dueToday = pending.filter(t => isToday(t.due_date));
          const dueWeek = pending.filter(t => isThisWeek(t.due_date));

          let res = `📋 **Task & Work Queue Insights**\n\n`;
          res += `• Total Tasks: ${total}\n`;
          res += `• Pending: ${pending.length}\n`;
          res += `• Completed: ${completed.length}\n\n`;
          res += `⏳ **Timeline**\n`;
          res += `• Overdue Tasks: ${overdue.length} ⚠️\n`;
          res += `• Due Today: ${dueToday.length}\n`;
          res += `• Due This Week: ${dueWeek.length}\n\n`;

          if (pending.length > 0) {
            res += `📌 **Recent Pending Tasks**\n`;
            const recent = [...pending].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 3);
            recent.forEach(t => res += `• ${t.title || t.name || t.subject} (Due: ${t.due_date || 'None'})\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "task"); }
      }

      // ---------------------------------------------------------
      // INVOICES LOGIC
      // ---------------------------------------------------------
      if (text.includes('invoice')) {
        try {
          const data = await invoicesApi.getAll();
          const invoices = extractDataArray(data);
          
          const total = invoices.length;
          const paid = invoices.filter(i => i.status?.toLowerCase() === 'paid');
          const pending = invoices.filter(i => i.status?.toLowerCase() !== 'paid');
          
          const paidAmount = paid.reduce((sum, inv) => sum + parseFloat(inv.total_amount || inv.amount || 0), 0);
          const pendingAmount = pending.reduce((sum, inv) => sum + parseFloat(inv.total_amount || inv.amount || 0), 0);

          let res = `🧾 **Invoice Analytics**\n\n`;
          res += `• Total Invoices: ${total}\n`;
          res += `• Paid: ${paid.length} (Rs. ${paidAmount.toLocaleString()})\n`;
          res += `• Pending / Outstanding: ${pending.length} (Rs. ${pendingAmount.toLocaleString()})\n\n`;
          
          if (pending.length > 0) {
            res += `⚠️ **Recent Pending Invoices**\n`;
            const recent = [...pending].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 3);
            recent.forEach(i => res += `• INV-${i.id || i.number} : Rs. ${parseFloat(i.total_amount || i.amount || 0).toLocaleString()}\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "invoice"); }
      }

      // ---------------------------------------------------------
      // MEETINGS LOGIC
      // ---------------------------------------------------------
      if (text.includes('meeting')) {
        try {
          const data = await meetingsApi.getAll();
          const meetings = extractDataArray(data);
          
          const today = meetings.filter(m => isToday(m.start_time || m.date));
          const completed = meetings.filter(m => m.status?.toLowerCase() === 'completed' || (m.start_time && new Date(m.start_time) < new Date()));
          const upcoming = meetings.filter(m => m.status?.toLowerCase() === 'scheduled' || (m.start_time && new Date(m.start_time) >= new Date()));
          const cancelled = meetings.filter(m => m.status?.toLowerCase() === 'cancelled');

          let res = `📅 **Meeting Insights**\n\n`;
          res += `• Total Meetings: ${meetings.length}\n`;
          res += `• Today's Meetings: ${today.length}\n`;
          res += `• Upcoming: ${upcoming.length}\n`;
          res += `• Completed: ${completed.length}\n`;
          res += `• Cancelled: ${cancelled.length}\n`;
          
          if (upcoming.length > 0) {
            res += `\n🔜 **Next Upcoming Meetings**\n`;
            upcoming.slice(0, 3).forEach(m => res += `• ${m.subject || m.title} (${new Date(m.start_time || m.date).toLocaleString()})\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "meeting"); }
      }

      // ---------------------------------------------------------
      // CALLS LOGIC
      // ---------------------------------------------------------
      if (text.includes('call')) {
        try {
          const data = await callsApi.getAll();
          const calls = extractDataArray(data);
          
          const today = calls.filter(c => isToday(c.start_time || c.call_time || c.created_at));
          const completed = calls.filter(c => c.status?.toLowerCase() === 'completed');
          const missed = calls.filter(c => c.status?.toLowerCase() === 'missed' || c.outcome?.toLowerCase() === 'no answer');
          
          let res = `📞 **Call Analytics**\n\n`;
          res += `• Total Calls: ${calls.length}\n`;
          res += `• Today's Calls: ${today.length}\n`;
          res += `• Completed: ${completed.length}\n`;
          res += `• Missed / No Answer: ${missed.length}\n`;
          return res;
        } catch (error) { return handleApiError(error, "call"); }
      }

      // ---------------------------------------------------------
      // QUOTES LOGIC
      // ---------------------------------------------------------
      if (text.includes('quote')) {
        try {
          const data = await quotesApi.getAll();
          const quotes = extractDataArray(data);
          const pending = quotes.filter(q => q.status?.toLowerCase() === 'draft' || q.status?.toLowerCase() === 'sent');
          const approved = quotes.filter(q => q.status?.toLowerCase() === 'approved' || q.status?.toLowerCase() === 'accepted');

          let res = `📄 **Quote Analytics**\n\n`;
          res += `• Total Quotes: ${quotes.length}\n`;
          res += `• Pending/Sent: ${pending.length}\n`;
          res += `• Approved/Accepted: ${approved.length}\n`;
          return res;
        } catch (error) { return handleApiError(error, "quote"); }
      }

      // ---------------------------------------------------------
      // SUPPORT / TICKETS LOGIC
      // ---------------------------------------------------------
      if (text.includes('support') || text.includes('ticket')) {
        try {
          const data = await casesApi.getAll();
          const tickets = extractDataArray(data);
          
          const open = tickets.filter(t => t.status?.toLowerCase() !== 'closed' && t.status?.toLowerCase() !== 'resolved');
          const closed = tickets.filter(t => t.status?.toLowerCase() === 'closed' || t.status?.toLowerCase() === 'resolved');
          const highPriority = open.filter(t => t.priority?.toLowerCase() === 'high' || t.priority?.toLowerCase() === 'urgent');

          let res = `🎫 **Support & Ticket Insights**\n\n`;
          res += `• Total Tickets: ${tickets.length}\n`;
          res += `• Open Tickets: ${open.length}\n`;
          res += `• Closed/Resolved: ${closed.length}\n`;
          res += `• High Priority (Action Required): ${highPriority.length} 🚨\n\n`;

          if (highPriority.length > 0) {
            res += `⚠️ **Urgent Open Tickets**\n`;
            highPriority.slice(0, 3).forEach(t => res += `• [${t.ticket_number || t.id}] ${t.subject || t.title}\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "support / ticket"); }
      }

      // ---------------------------------------------------------
      // PROJECTS LOGIC
      // ---------------------------------------------------------
      if (text.includes('project')) {
        try {
          const data = await projectsApi.getAll();
          const projects = extractDataArray(data);
          
          const active = projects.filter(p => p.status?.toLowerCase() === 'active' || p.status?.toLowerCase() === 'in progress');
          const completed = projects.filter(p => p.status?.toLowerCase() === 'completed');
          
          let res = `🏗️ **Project Insights**\n\n`;
          res += `• Total Projects: ${projects.length}\n`;
          res += `• Active Projects: ${active.length}\n`;
          res += `• Completed Projects: ${completed.length}\n\n`;

          if (active.length > 0) {
            res += `📌 **Current Active Projects**\n`;
            active.slice(0, 3).forEach(p => res += `• ${p.name || p.title} (Progress: ${p.progress || 0}%)\n`);
          }

          return res;
        } catch (error) { return handleApiError(error, "project"); }
      }

      // ---------------------------------------------------------
      // PRODUCTS LOGIC
      // ---------------------------------------------------------
      if (text.includes('product')) {
        try {
          const data = await productsApi.getAll();
          const products = extractDataArray(data);
          const active = products.filter(p => p.is_active !== false);

          let res = `📦 **Product Insights**\n\n`;
          res += `• Total Products: ${products.length}\n`;
          res += `• Active Products: ${active.length}\n`;
          return res;
        } catch (error) { return handleApiError(error, "product"); }
      }

      // ---------------------------------------------------------
      // CONTACTS LOGIC
      // ---------------------------------------------------------
      if (text.includes('contact')) {
        try {
          const data = await contactsApi.getAll();
          const contacts = extractDataArray(data);
          let res = `👥 **Contact Insights**\n\n`;
          res += `• Total Contacts: ${contacts.length}\n`;
          res += `• Added This Month: ${contacts.filter(c => isThisMonth(c.created_at)).length}\n`;
          return res;
        } catch (error) { return handleApiError(error, "contact"); }
      }

      // ---------------------------------------------------------
      // USERS LOGIC
      // ---------------------------------------------------------
      if (text.includes('user')) {
        try {
          const data = await usersApi.getAll();
          const users = extractDataArray(data);
          const active = users.filter(u => u.is_active !== false);
          let res = `🧑‍💻 **User & Team Insights**\n\n`;
          res += `• Total Users: ${users.length}\n`;
          res += `• Active Users: ${active.length}\n`;
          return res;
        } catch (error) { return handleApiError(error, "user"); }
      }

      // ---------------------------------------------------------
      // FALLBACK
      // ---------------------------------------------------------
      return "I am your comprehensive CRM Business Intelligence Assistant. I can analyze and summarize live data across all modules: Dashboard, Leads, Deals, Sales, Projects, Tasks, Support Tickets, Invoices, Meetings, and more! What would you like to know?";
      
    } catch (error) {
      console.error("Assistant Error:", error);
      return "I encountered an issue generating your CRM intelligence report. Please try again later or check your module permissions.";
    }
  }
};
