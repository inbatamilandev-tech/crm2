export const dashboardData = {
  totalLeads: 1245,
  dealsThisMonth: 38,
  revenue: 145000,
  conversionRate: 14.5,
  chartData: [
    { name: 'Jan', revenue: 4000 },
    { name: 'Feb', revenue: 3000 },
    { name: 'Mar', revenue: 5000 },
    { name: 'Apr', revenue: 7000 },
    { name: 'May', revenue: 6000 },
    { name: 'Jun', revenue: 8000 },
  ]
};

export const leadsData = [
  { id: 1, name: 'Sarah Miller', jobTitle: 'Chief Marketing Officer', email: 's.miller@globaltech.com', company: 'Global Tech Inc.', status: 'Qualified', rep: 'Alex T.', created: 'Oct 12, 2023', score: 85 },
  { id: 2, name: 'Jason Bourne', jobTitle: 'Procurement Director', email: 'j.bourne@secfirst.io', company: 'Security First Co.', status: 'New', rep: 'Emma R.', created: 'Oct 14, 2023', score: 10 },
  { id: 3, name: 'Linda Chen', jobTitle: 'VP of Sales', email: 'linda.c@pacific.com', company: 'Pacific Retail', status: 'Connected', rep: 'Alex T.', created: 'Oct 15, 2023', score: 35 },
  { id: 4, name: 'Robert White', jobTitle: 'General Manager', email: 'robert@wholesaledirect.net', company: 'Wholesale Direct', status: 'Lost', rep: 'Sarah P.', created: 'Oct 16, 2023', score: 5 },
  { id: 5, name: 'Kevin Malone', jobTitle: 'Logistics Manager', email: 'k.malone@scranton.biz', company: 'Scranton Paper', status: 'New', rep: 'Alex T.', created: 'Oct 17, 2023', score: 15 },
];

export const contactsData = [
  { id: 1, name: 'Eve Adams', email: 'eve@example.com', phone: '555-0201', company: 'Umbrella Corp', tags: ['Hot Lead', 'Enterprise'], lastContacted: '2023-10-01', score: 95 },
  { id: 2, name: 'Frank Castle', email: 'frank@example.com', phone: '555-0202', company: 'Vandelay Ind', tags: ['Interested'], lastContacted: '2023-10-25', score: 45 },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', phone: '555-0203', company: 'Wayne Ent', tags: ['Partner'], lastContacted: '2023-09-15', score: 80 },
];

export const dealsData = {
  columns: {
    'new-lead': {
      id: 'new-lead',
      title: 'New Lead',
      dealIds: ['deal-1', 'deal-2'],
    },
    'connected': {
      id: 'connected',
      title: 'Connected',
      dealIds: ['deal-3'],
    },
    'proposal-sent': {
      id: 'proposal-sent',
      title: 'Proposal Sent',
      dealIds: ['deal-4'],
    },
    'deal-won': {
      id: 'deal-won',
      title: 'Deal Won',
      dealIds: ['deal-5'],
    },
  },
  deals: {
    'deal-1': { id: 'deal-1', name: 'Website Redesign', company: 'Acme Corp', amount: 5000, owner: 'John Doe' },
    'deal-2': { id: 'deal-2', name: 'Cloud Migration', company: 'TechNova', amount: 12000, owner: 'Jane Smith' },
    'deal-3': { id: 'deal-3', name: 'Security Audit', company: 'Globex', amount: 8000, owner: 'John Doe' },
    'deal-4': { id: 'deal-4', name: 'App Development', company: 'Stark Ind', amount: 25000, owner: 'Jane Smith' },
    'deal-5': { id: 'deal-5', name: 'SEO Retainer', company: 'Umbrella Corp', amount: 3000, owner: 'John Doe' },
  },
  columnOrder: ['new-lead', 'connected', 'proposal-sent', 'deal-won'],
};

export const emailsData = [
  { id: 1, to: 'eve@example.com', subject: 'Following up on our meeting', date: '2023-10-26', status: 'Sent' },
  { id: 2, to: 'frank@example.com', subject: 'Proposal Details', date: '2023-10-25', status: 'Opened' },
  { id: 3, to: 'grace@example.com', subject: 'Partnership Opportunity', date: '2023-10-20', status: 'Clicked' },
];

export const quotesData = [
  { id: 1, quoteNumber: 'QT-001', client: 'Acme Corp', date: '2023-10-26', total: 5000, status: 'Draft' },
  { id: 2, quoteNumber: 'QT-002', client: 'TechNova', date: '2023-10-25', total: 12000, status: 'Sent' },
];

export const ticketsData = [
  { id: 1, ticketNumber: 'TK-101', subject: 'Login Issue', contact: 'Alice Smith', status: 'Open', assignedTo: 'Support Team' },
  { id: 2, ticketNumber: 'TK-102', subject: 'Billing Enquiry', contact: 'Bob Jones', status: 'Closed', assignedTo: 'Finance' },
];

export const campaignsData = [
  { id: 1, name: 'Winter Promo', targetAudience: 'Hot Leads', sent: 1500, opened: 450, clicked: 120, status: 'Active' },
  { id: 2, name: 'Newsletter Q3', targetAudience: 'All Contacts', sent: 5000, opened: 1200, clicked: 300, status: 'Completed' },
];
