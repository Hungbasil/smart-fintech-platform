import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import auth from '../services/auth';
import { BarChart3, CalendarClock, ChevronDown, HandCoins, LayoutDashboard, LogOut, ReceiptText, Tag, WalletCards, Target } from 'lucide-react';

const navigation = [
  { label: 'Overview', to: '/', icon: LayoutDashboard },
  { label: 'Transactions', to: '/transactions', icon: ReceiptText },
  { label: 'Wallets', to: '/wallets', icon: WalletCards },
  { label: 'Analytics', to: '/analytics', icon: BarChart3 },
  { label: 'Categories', to: '/categories', icon: Tag },
  { label: 'Budgets', to: '/budgets', icon: Target },
  { label: 'Recurring', to: '/recurring', icon: CalendarClock },
  { label: 'Saving goals', to: '/saving-goals', icon: Target },
  { label: 'Debts & loans', to: '/debts', icon: HandCoins },
];

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
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
        <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-[#e3ebe8] bg-[#fbfdfc]/95 px-2 py-2 backdrop-blur lg:hidden">
          {navigation.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex min-w-[68px] flex-col items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold no-underline ${isActive ? 'text-[#087f74]' : 'text-[#9aa7af]'}`}><Icon size={18} />{label}</NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Layout;
