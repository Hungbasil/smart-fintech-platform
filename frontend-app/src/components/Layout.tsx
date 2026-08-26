import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import auth from '../services/auth';
import { BarChart3, CalendarClock, ChevronDown, ChevronRight, Goal, HandCoins, LayoutDashboard, LogOut, ReceiptText, Tag, Target, WalletCards, Bitcoin } from 'lucide-react';

const navigation = [
  { label: 'Transactions', to: '/transactions', icon: ReceiptText },
  { label: 'Wallets', to: '/wallets', icon: WalletCards },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Budgets', to: '/budgets', icon: Target },
  { label: 'Recurring', to: '/recurring', icon: CalendarClock },
  { label: 'Saving goals', to: '/saving-goals', icon: Goal },
  { label: 'Debts & loans', to: '/debts', icon: HandCoins },
];

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [analyticsOpen, setAnalyticsOpen] = useState(location.pathname.startsWith('/analytics'));
  const [overviewOpen, setOverviewOpen] = useState(location.pathname === '/' || location.pathname.startsWith('/overview') || location.pathname.startsWith('/investments'));

  if (!auth.isAuthenticated()) {
    return <>{children}</>;
  }

  const user = auth.getUser();
  const displayName = user?.fullName || user?.email || 'Account';
  const initials = displayName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell flex">
      <aside className="hidden w-[248px] shrink-0 border-r border-[#e3ebe8] bg-[#fbfdfc] px-5 py-6 lg:flex lg:flex-col">
        <Link to="/" className="mb-12 flex items-center gap-3 no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#087f74] text-sm font-extrabold text-white">SF</span>
          <span className="text-[17px] font-extrabold tracking-[-.04em] text-[#17212b]">SmartFin</span>
        </Link>
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#9aa7af]">Workspace</p>
        <nav className="flex flex-col gap-1">
          <button onClick={() => { setOverviewOpen((open) => !open); setAnalyticsOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${overviewOpen ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}><LayoutDashboard size={17} strokeWidth={overviewOpen ? 2.5 : 2} />Overview<ChevronRight size={15} className={`ml-auto transition-transform ${overviewOpen ? 'rotate-90' : ''}`} /></button>
          {overviewOpen && <div className="ml-7 flex flex-col gap-1 border-l border-[#dce9e5] pl-3"><NavLink to="/overview" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Overview</NavLink><NavLink to="/investments" className={({ isActive }) => `flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}><Bitcoin size={14} />Investments</NavLink></div>}
          <button onClick={() => { setAnalyticsOpen((open) => !open); setOverviewOpen(false); }} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${location.pathname.startsWith('/analytics') ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}><BarChart3 size={17} strokeWidth={location.pathname.startsWith('/analytics') ? 2.5 : 2} />Analytics<ChevronRight size={15} className={`ml-auto transition-transform ${analyticsOpen ? 'rotate-90' : ''}`} /></button>
          {analyticsOpen && <div className="ml-7 flex flex-col gap-1 border-l border-[#dce9e5] pl-3"><NavLink to="/analytics/overview" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Overview</NavLink><NavLink to="/analytics/predictive" className={({ isActive }) => `rounded-lg px-3 py-2 text-[12px] font-semibold no-underline ${isActive ? 'text-[#075c57]' : 'text-[#71808c] hover:text-[#17212b]'}`}>Forecast</NavLink></div>}
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold no-underline transition-colors ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4] hover:text-[#17212b]'}`}>
              {({ isActive }) => <><Icon size={17} strokeWidth={isActive ? 2.5 : 2} />{label}</>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-[#e3ebe8] pt-5">
          <button onClick={() => { auth.logout(); window.location.href = '/login'; }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#71808c] transition-colors hover:bg-[#fff1ef] hover:text-[#d76756]"><LogOut size={17} />Sign out</button>
        </div>
      </aside>

      <div className="app-main flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[#e3ebe8] bg-[#fbfdfc] px-4 sm:px-8">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#087f74] text-[11px] font-extrabold text-white">SF</span>
            <span className="text-[15px] font-extrabold text-[#17212b]">SmartFin</span>
          </div>
          <div className="hidden text-[13px] font-semibold text-[#71808c] lg:block">Personal finance workspace</div>
          <button className="flex items-center gap-2 rounded-full border border-[#e3ebe8] bg-white py-1.5 pl-1.5 pr-3 text-xs font-bold text-[#17212b] shadow-sm"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dcefeb] text-[11px] text-[#075c57]">{initials}</span>{displayName}<ChevronDown size={14} className="text-[#9aa7af]" /></button>
        </header>
        <main className="app-content page-enter">{children}</main>
        <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
          {(analyticsOpen || overviewOpen) && <div className="absolute bottom-full left-2 mb-2 w-44 rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] p-2 shadow-lg">{overviewOpen && <><NavLink onClick={() => setOverviewOpen(false)} to="/overview" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Overview</NavLink><NavLink onClick={() => setOverviewOpen(false)} to="/investments" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Investments</NavLink></>}{analyticsOpen && <><NavLink onClick={() => setAnalyticsOpen(false)} to="/analytics/overview" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Analytics overview</NavLink><NavLink onClick={() => setAnalyticsOpen(false)} to="/analytics/predictive" className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-xs font-bold no-underline ${isActive ? 'bg-[#e4f4f0] text-[#075c57]' : 'text-[#71808c] hover:bg-[#f1f6f4]'}`}>Forecast</NavLink></>}</div>}
          <nav className="flex overflow-x-auto border-t border-[#e3ebe8] bg-[#fbfdfc]/95 px-2 py-2 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => { setOverviewOpen((open) => !open); setAnalyticsOpen(false); }} className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${location.pathname.startsWith('/overview') || location.pathname.startsWith('/investments') ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><LayoutDashboard size={18} />Overview</button>
            <button type="button" onClick={() => { setAnalyticsOpen((open) => !open); setOverviewOpen(false); }} className={`flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold ${location.pathname.startsWith('/analytics') ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><BarChart3 size={18} />Analytics</button>
            {navigation.map(({ label, to, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex w-[72px] shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-1 text-[10px] font-bold no-underline ${isActive ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><Icon size={18} />{label}</NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Layout;
