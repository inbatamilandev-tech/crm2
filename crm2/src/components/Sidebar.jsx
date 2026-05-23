import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { tasksApi } from '../services/api';
import { 
  Search, ChevronDown, ChevronRight, Inbox, Briefcase, 
  CalendarDays, Package, LifeBuoy, Puzzle, Wrench, 
  FolderKanban, MessageSquare, Menu, PanelLeftClose, PanelLeftOpen,
  PieChart, Users, Building2, BarChart3, Settings, Zap,
  LayoutGrid, Activity, ShieldCheck, Database, RefreshCw, Cloud
} from 'lucide-react';
import logoImg from '../assets/logo.png';

const navigationConfig = [
  { name: 'Dashboard', icon: PieChart, href: '/' },
  { name: 'Workqueue', icon: Inbox, badge: '5', highlighted: true, href: '/workqueue' },
  { 
    name: 'Sales', icon: Briefcase,
    children: [
      { name: 'Leads', href: '/leads' },
      { name: 'Contacts', href: '/contacts' },
      { name: 'Accounts', href: '/accounts' },
      { name: 'Deals', href: '/deals' },
    ]
  },
  {
    name: 'Activities', icon: CalendarDays,
    children: [
      { name: 'Tasks', href: '/tasks' },
      { name: 'Calls', href: '/calls' },
      { name: 'Emails', href: '/emails' },
      { name: 'Meetings', href: '/meetings' },
    ]
  },
  {
    name: 'Marketing', icon: Zap,
    children: [
      { name: 'Overview', href: '/marketing' },
      { name: 'Campaigns', href: '/marketing#campaigns' },
      { name: 'Lead Capture', href: '/marketing#capture' },
      { name: 'Ads Analytics', href: '/analytics' },
    ]
  },
  {
    name: 'Inventory', icon: Package,
    children: [
      { name: 'Products', href: '/products' },
      { name: 'Quotes', href: '/quotes' },
      { name: 'Invoices', href: '/invoices' },
    ]
  },
  {
    name: 'Support', icon: LifeBuoy,
    children: [
      { name: 'Support Dashboard', href: '/support' },
      { name: 'Cases', href: '/cases' },
      { name: 'Solutions', href: '/solutions' },
      { name: 'Services', href: '/services' },
      { name: 'Feedback', href: '/feedback' },
    ]
  },
  { name: 'Projects', icon: FolderKanban, href: '/projects' },
  { name: 'Analytics', icon: BarChart3, href: '/analytics' },
  { name: 'Settings', icon: Wrench, href: '/settings' },
];

const MenuItem = ({ item, isCollapsed, setCollapsed }) => {
  const location = useLocation();
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children.some(child => location.pathname === child.href);
  const [isExpanded, setIsExpanded] = useState(isChildActive);

  const toggleExpand = (e) => {
    e.preventDefault();
    if (isCollapsed) {
      setCollapsed(false);
      setIsExpanded(true);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  if (!hasChildren) {
    return (
      <NavLink
        to={item.href}
        className={({ isActive }) => 
          `group flex items-center px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] rounded-2xl transition-all mb-1 relative overflow-hidden ${
            item.highlighted 
              ? 'bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20' 
              : isActive 
                ? 'bg-[#F59E0B] text-[#F8FAFC] shadow-xl scale-[1.02]' 
                : 'text-[#F8FAFC]/70 hover:bg-[#0F172A]/20 hover:text-[#F8FAFC]'
          }`
        }
        title={isCollapsed ? item.name : undefined}
      >
        {({ isActive }) => (
          <>
            <item.icon className={`flex-shrink-0 transition-transform group-hover:scale-110 ${isCollapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4 mr-4'}`} />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <span>{item.name}</span>
                {item.badge && (
                  <span className={`ml-2 px-2 py-0.5 rounded-lg text-[9px] font-black ${
                    isNaN(parseInt(item.badge)) ? (item.highlighted ? 'bg-[#F59E0B] text-[#F8FAFC]' : 'bg-[#F8FAFC]/10 text-[#F8FAFC]/50') :
                    parseInt(item.badge) === 0 ? 'hidden' :
                    parseInt(item.badge) <= 10 ? 'bg-[#F59E0B] text-[#F8FAFC]' :
                    parseInt(item.badge) <= 50 ? 'bg-[#F59E0B] text-[#F8FAFC]' :
                    'bg-[#F59E0B] text-[#F8FAFC]'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            )}
            {item.highlighted && !isActive && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#F59E0B] rounded-full animate-pulse" />
            )}
          </>
        )}
      </NavLink>
    );
  }

  return (
    <div className="flex flex-col">
      <button 
        onClick={toggleExpand}
        className={`group flex items-center justify-between px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] rounded-2xl transition-all mb-1 ${
          isChildActive ? 'text-[#F8FAFC] bg-[#0F172A]/20' : 'text-[#F8FAFC]/70 hover:bg-[#0F172A]/20 hover:text-[#F8FAFC]'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        <div className="flex items-center">
          <item.icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5 mx-auto' : 'w-4 h-4 mr-4'}`} />
          {!isCollapsed && <span>{item.name}</span>}
        </div>
        {!isCollapsed && (
          <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
        )}
      </button>

      {!isCollapsed && (
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
          <div className="pl-12 pr-2 space-y-1 mt-1">
            {item.children.map((child) => (
              <NavLink
                key={child.name}
                to={child.href}
                className={({ isActive }) => 
                  `block px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                    isActive 
                      ? 'text-[#F59E0B] bg-[#F59E0B]/5' 
                      : 'text-[#F8FAFC]/50 hover:text-[#F8FAFC] hover:bg-[#0F172A]/10'
                  }`
                }
              >
                {child.name}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchTaskCount = async () => {
      try {
        const response = await tasksApi.getAll();
        const tasks = response.results || response;
        const incompleteTasks = tasks.filter(task => task.status !== 'completed');
        setTaskCount(incompleteTasks.length);
      } catch (error) {
        console.error("Failed to fetch Workqueue count", error);
      }
    };
    fetchTaskCount();
  }, []);

  const updatedNavigationConfig = navigationConfig.map(item =>
    item.name === 'Workqueue' ? { ...item, badge: taskCount.toString() } : item
  );

  return (
    <div className={`flex flex-col bg-[#0F172A] h-screen transition-all duration-500 z-20 shrink-0 border-r border-[#F8FAFC]/10 relative ${isCollapsed ? 'w-24' : 'w-72'}`}>
      
      {/* Brand Section */}
      <div className={`flex items-center justify-center h-24 shrink-0 relative ${isCollapsed ? 'px-2' : 'px-8'}`}>
        <img 
          src={logoImg} 
          alt="Logo" 
          className={`transition-all duration-300 ${isCollapsed ? 'w-10 h-10 object-contain' : 'h-16 w-auto'}`} 
        />
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto py-2 px-6 custom-scrollbar scrollbar-hide">
        <nav className="space-y-1">
          {updatedNavigationConfig.map((item) => (
            <MenuItem key={item.name} item={item} isCollapsed={isCollapsed} setCollapsed={setIsCollapsed} />
          ))}
        </nav>
      </div>

      {/* Footer Info / Toggle */}
      <div className="p-6 border-t border-[#F8FAFC]/10 bg-[#0F172A]">
        {!isCollapsed && (
          <div className="mb-6 px-2">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-[#F8FAFC]/50 uppercase tracking-widest">Logic Health</span>
                <span className="text-[9px] font-black text-[#0F172A] uppercase tracking-widest">Optimal</span>
             </div>
             <div className="h-1 w-full bg-[#F8FAFC]/10 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-[#F59E0B] rounded-full" />
              </div>
          </div>
        )}
        
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center justify-center w-full py-3 text-[#F8FAFC]/70 hover:text-[#F8FAFC] hover:bg-[#0F172A]/20 rounded-2xl transition-all border border-transparent hover:border-[#F8FAFC]/10"
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
