import React, { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import auth from '../services/auth';
import AiChatWidget from './AiChatWidget';
import { API_BASE_URL } from '../services/api';
import { toast } from '../services/notifications';
import { BarChart3, CalendarClock, ChevronDown, ChevronRight, Goal, HandCoins, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, ReceiptText, ShieldCheck, Tag, Target, WalletCards, Bitcoin } from 'lucide-react';

const navigation = [
  { label: 'Transactions', to: '/transactions', icon: ReceiptText },
  { label: 'Wallets', to: '/wallets', icon: WalletCards },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Budgets', to: '/budgets', icon: Target },
  { label: 'Recurring', to: '/recurring', icon: CalendarClock },
  { label: 'Saving goals', to: '/saving-goals', icon: Goal },
];

export const Layout: React.FC = () => {
  const location = useLocation();
  const [analyticsOpen, setAnalyticsOpen] = useState(location.pathname.startsWith('/analytics'));
  const [overviewOpen, setOverviewOpen] = useState(location.pathname === '/' || location.pathname.startsWith('/overview') || location.pathname.startsWith('/investments'));
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(location.pathname.startsWith('/debts'));

  useEffect(() => {
    const token = auth.getToken();
    if (!token) return;

    const eventSource = new EventSource(`${API_BASE_URL}/notifications/subscribe?token=${encodeURIComponent(token)}`);
    eventSource.addEventListener('notification', (event) => {
      toast.error((event as MessageEvent).data, { duration: 8000 });
    });
    return () => eventSource.close();
  }, []);

  if (!auth.isAuthenticated()) {
    return <Outlet />;
  }

  const user = auth.getUser();
  const isAdmin = auth.isAdmin();
  const displayName = user?.fullName || user?.email || 'Account';
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell flex">
      <aside className={`hidden shrink-0 border-r border-[#e3ebe8] bg-[#fbfdfc] py-6 transition-[width,padding] duration-200 lg:flex lg:flex-col ${sidebarCollapsed ? 'sidebar-collapsed w-[76px] px-3' : 'w-[248px] px-5'}`}>
        <div className="sidebar-brand mb-12 flex items-center justify-between gap-2">
          <Link to="/" className="flex min-w-0 items-center gap-3 no-underline">
            <img src="/Logo.png" alt="SmartFin" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            <span className="sidebar-text truncate text-[17px] font-extrabold tracking-[-.04em] text-[#17212b]">SmartFin</span>
          </Link>
          <button type="button" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)} className="sidebar-toggle shrink-0 rounded-lg p-2 text-[#9aa7af] hover:bg-[#e4f4f0] hover:text-[#087f74]">{sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#9aa7af]">Workspace</p>
        <nav className="flex flex-col gap-1">
          <button onClick={() => { setOverviewOpen((open) => !open); setAnalyticsOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${overviewOpen ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}><LayoutDashboard size={17} strokeWidth={overviewOpen ? 2.5 : 2} /><span className="sidebar-text">Overview</span><ChevronRight size={15} className={`sidebar-chevron ml-auto transition-transform ${overviewOpen ? 'rotate-90' : ''}`} /></button>
          {overviewOpen && <div className="sidebar-submenu ml-7 flex flex-col gap-1 border-l border-[#dce9e5] pl-3"><NavLink to="/overview" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Overview</NavLink><NavLink to="/investments" className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}><Bitcoin size={14} />Investments</NavLink></div>}
          <button onClick={() => { setAnalyticsOpen((open) => !open); setOverviewOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${location.pathname.startsWith('/analytics') ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}><BarChart3 size={17} strokeWidth={location.pathname.startsWith('/analytics') ? 2.5 : 2} /><span className="sidebar-text">Analytics</span><ChevronRight size={15} className={`sidebar-chevron ml-auto transition-transform ${analyticsOpen ? 'rotate-90' : ''}`} /></button>
          {analyticsOpen && <div className="sidebar-submenu ml-7 flex flex-col gap-1 border-l border-[#dce9e5] pl-3"><NavLink to="/analytics/overview" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Overview</NavLink><NavLink to="/analytics/predictive" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Forecast</NavLink></div>}
          <button onClick={() => setDebtsOpen((open) => !open)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${debtsOpen ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}><HandCoins size={17} strokeWidth={debtsOpen ? 2.5 : 2} /><span className="sidebar-text">Debts & loans</span><ChevronRight size={15} className={`sidebar-chevron ml-auto transition-transform ${debtsOpen ? 'rotate-90' : ''}`} /></button>
          {debtsOpen && <div className="sidebar-submenu ml-7 flex flex-col gap-1 border-l border-[#dce9e5] pl-3"><NavLink to="/debts" end className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Debts Overview</NavLink><NavLink to="/debts/calendar" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Calendar</NavLink></div>}
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold no-underline transition-colors ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}>
              {({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.5 : 2} /><span className="sidebar-text">{label}</span></>}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold no-underline transition-colors ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}>
              {({ isActive }) => <><ShieldCheck size={17} strokeWidth={isActive ? 2.5 : 2} /><span className="sidebar-text">Admin</span></>}
            </NavLink>
          )}
        </nav>
        <div className="mt-auto border-t border-[#e3ebe8] pt-5">
          <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#71808c] transition-colors hover:bg-[#fff1ef] hover:text-[#d76756]"><LogOut size={17} /><span className="sidebar-text">Sign out</span></button>
        </div>
      </aside>

      <div className="app-main flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e3ebe8] bg-[#fbfdfc] px-4 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <img src="/Logo.png" alt="SmartFin" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-[15px] font-extrabold text-[#17212b]">SmartFin</span>
          </div>
          <div className="hidden text-[13px] font-semibold text-[#71808c] lg:block">Personal finance workspace</div>
          <div className="relative"><button type="button" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-full border border-[#e3ebe8] bg-white py-1.5 pl-1.5 pr-3 text-xs font-bold text-[#17212b] shadow-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dcefeb] text-[11px] text-[#075c57]">{initials}</span>{displayName}<ChevronDown size={14} className={`text-[#9aa7af] transition-transform ${profileOpen ? 'rotate-180' : ''}`} /></button>{profileOpen && <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-[#e3ebe8] bg-white p-2 shadow-lg"><div className="border-b border-[#edf2f0] px-3 py-2"><p className="truncate text-xs font-extrabold text-[#17212b]">{displayName}</p><p className="truncate text-[11px] text-[#9aa7af]">{user?.email}</p></div><button type="button" onClick={() => { auth.logout(); window.location.href = '/login'; }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-bold text-[#71808c] hover:bg-[#fff1ef] hover:text-[#d76756]"><LogOut size={15} />Sign out</button></div>}</div>
        </header>
        <main className="app-content page-enter"><Outlet /></main>
        <AiChatWidget />
        <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
          {(analyticsOpen || overviewOpen || debtsOpen) && <div className={`absolute bottom-full mb-2 w-44 rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] p-2 shadow-lg [animation:rise-in_180ms_ease-out] ${debtsOpen ? 'left-[152px]' : analyticsOpen ? 'left-[80px]' : 'left-2'}`}>{overviewOpen && <><NavLink onClick={() => setOverviewOpen(false)} to="/overview" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Overview</NavLink><NavLink onClick={() => setOverviewOpen(false)} to="/investments" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Investments</NavLink></>}{analyticsOpen && <><NavLink onClick={() => setAnalyticsOpen(false)} to="/analytics/overview" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Analytics overview</NavLink><NavLink onClick={() => setAnalyticsOpen(false)} to="/analytics/predictive" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Forecast</NavLink></>}{debtsOpen && <><NavLink onClick={() => setDebtsOpen(false)} to="/debts" end className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Debts Overview</NavLink><NavLink onClick={() => setDebtsOpen(false)} to="/debts/calendar" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Calendar</NavLink></>}</div>}
          <nav className="flex overflow-x-auto border-t border-[#e3ebe8] bg-[#fbfdfc]/95 px-2 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => { setOverviewOpen((open) => !open); setAnalyticsOpen(false); setDebtsOpen(false); }} className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${location.pathname.startsWith('/overview') || location.pathname.startsWith('/investments') ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><LayoutDashboard size={18} />Overview</button>
            <button type="button" onClick={() => { setAnalyticsOpen((open) => !open); setOverviewOpen(false); setDebtsOpen(false); }} className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${location.pathname.startsWith('/analytics') ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><BarChart3 size={18} />Analytics</button>
            <button type="button" onClick={() => { setDebtsOpen((open) => !open); setOverviewOpen(false); setAnalyticsOpen(false); }} className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${location.pathname.startsWith('/debts') ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><HandCoins size={18} />Debts</button>
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold no-underline ${isActive ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><Icon size={18} />{label}</NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={({ isActive }) => `flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold no-underline ${isActive ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><ShieldCheck size={18} />Admin</NavLink>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Layout;
