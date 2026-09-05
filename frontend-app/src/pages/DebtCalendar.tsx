import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarClock, CheckCircle2, HandCoins, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '../components';
import { getDebtCalendar, getWallets, settleDebt, type CalendarEvent, type Wallet } from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

export const DebtCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [settleWalletId, setSettleWalletId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date());

  const load = async () => {
    try {
      setLoading(true);
      const [calendarResponse, walletResponse] = await Promise.all([getDebtCalendar(), getWallets()]);
      setEvents(calendarResponse.data);
      setWallets(walletResponse.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to load debt calendar'));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const settle = async () => {
    if (!selected || selected.type === 'SUBSCRIPTION' || !settleWalletId) return;
    try {
      setSaving(true);
      await settleDebt(selected.id, settleWalletId);
      setSelected(null);
      await load();
      toast.success('Debt settled successfully');
    } catch (error) { toast.error(getApiErrorMessage(error, 'Unable to settle debt')); }
    finally { setSaving(false); }
  };

  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: `${event.title} · ${currency.format(event.amount)}`,
    date: event.date,
    backgroundColor: event.type === 'DEBT_RECEIVABLE' ? '#dcefeb' : event.type === 'DEBT_PAYABLE' ? '#ffe5dd' : '#fff3cf',
    borderColor: event.type === 'DEBT_RECEIVABLE' ? '#087f74' : event.type === 'DEBT_PAYABLE' ? '#d76756' : '#bd7a22',
    textColor: '#17212b',
    extendedProps: event,
  }));

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const upcomingDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
  const upcomingEvents = upcomingDays.flatMap((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    return events.filter((event) => event.date === dateKey).map((event) => ({ event, date }));
  });
  const eventLabel = (event: CalendarEvent) => event.type === 'DEBT_PAYABLE' ? 'Payment due' : event.type === 'DEBT_RECEIVABLE' ? 'Collection due' : 'Recurring payment';
  const eventLink = (event: CalendarEvent) => event.type === 'SUBSCRIPTION' ? '/recurring' : '/debts';
  const selectEvent = (event: CalendarEvent) => {
    setSelected(event);
    setSettleWalletId(event.type === 'SUBSCRIPTION' ? '' : wallets[0]?.id || '');
  };

  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstDay = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    const date = day > 0 && day <= daysInMonth ? new Date(month.getFullYear(), month.getMonth(), day) : null;
    const dateValue = date?.toISOString().slice(0, 10);
    return { date, events: dateValue ? calendarEvents.filter((event) => event.date === dateValue) : [] };
  });

  if (loading) return <div className="p-8">Loading calendar...</div>;
  return <div>
    <div className="mb-8"><div className="eyebrow">Never miss a promise</div><h1 className="page-title">Debt calendar</h1><p className="page-subtitle">See upcoming repayments, collections and recurring bills.</p></div>
    <section className="mb-6" aria-labelledby="upcoming-title"><div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="upcoming-title" className="text-lg font-extrabold text-[#17212b]">Next 7 days</h2><p className="mt-1 text-xs text-[#71808c]">Your nearest payments and collections, in one glance.</p></div><span className="rounded-lg bg-[#e4f4f0] px-2.5 py-1 text-[11px] font-bold text-[#087f74]">{upcomingEvents.length} event{upcomingEvents.length === 1 ? '' : 's'}</span></div>{upcomingEvents.length > 0 ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{upcomingEvents.map(({ event, date }) => <div key={`${event.type}-${event.id}-${event.date}`} className="surface flex items-start gap-3 p-4"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${event.type === 'DEBT_PAYABLE' ? 'bg-[#fff1ef] text-[#d76756]' : event.type === 'DEBT_RECEIVABLE' ? 'bg-[#e4f4f0] text-[#087f74]' : 'bg-[#fff4df] text-[#bd7a22]'}`}>{event.type === 'SUBSCRIPTION' ? <CalendarClock size={17} /> : <HandCoins size={17} />}</span><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-extrabold text-[#17212b]">{event.title}</p><p className="mt-1 text-[11px] font-bold text-[#71808c]">{date.toISOString().slice(0, 10) === todayKey ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {eventLabel(event)}</p><p className="mt-1 text-sm font-extrabold text-[#17212b]">{currency.format(event.amount)}</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => selectEvent(event)} className="rounded-lg bg-[#087f74] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#075c57]">Review</button><Link to={eventLink(event)} className="inline-flex items-center gap-1 rounded-lg border border-[#e3ebe8] px-2.5 py-1.5 text-[11px] font-bold text-[#71808c] no-underline hover:bg-[#f4f7f6]">Open <ArrowUpRight size={12} /></Link></div></div></div>)}</div> : <div className="surface flex items-center gap-3 p-4"><CheckCircle2 className="text-[#087f74]" size={19} /><div><p className="text-sm font-bold text-[#17212b]">Nothing due in the next 7 days</p><p className="text-xs text-[#9aa7af]">You are up to date on payments and collections.</p></div></div>}</section>
    <Card><CardBody><div className="mb-4 flex items-center justify-between"><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-lg border border-[#e3ebe8] px-3 py-2 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Previous</button><h2 className="text-lg font-extrabold text-[#17212b]">{month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2><button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-lg border border-[#e3ebe8] px-3 py-2 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Next</button></div><div className="grid grid-cols-7 border-l border-t border-[#e3ebe8] text-xs font-bold text-[#71808c]">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="border-b border-r border-[#e3ebe8] bg-[#f7faf9] p-2 text-center">{day}</div>)}{cells.map((cell, index) => <div key={index} className={`min-h-[100px] border-b border-r border-[#e3ebe8] p-2 ${cell.date ? 'bg-white' : 'bg-[#fbfdfc]'}`}>{cell.date && <><div className="mb-2 text-right text-xs font-extrabold text-[#71808c]">{cell.date.getDate()}</div><div className="space-y-1">{cell.events.map((event) => <button key={event.id} type="button" onClick={() => selectEvent(event.extendedProps)} className="block w-full truncate rounded border px-1.5 py-1 text-left text-[11px] font-bold" style={{ backgroundColor: event.backgroundColor, borderColor: event.borderColor, color: event.textColor }}>{event.title}</button>)}</div></>}</div>)}</div></CardBody></Card>
    {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#17212b]/35 p-4 backdrop-blur-[2px]"><div role="dialog" aria-modal="true" className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><div className="eyebrow">Calendar event</div><h2 className="mt-1 text-xl font-extrabold text-[#17212b]">{selected.title}</h2></div><button aria-label="Close" onClick={() => setSelected(null)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6]"><X size={18} /></button></div><div className="space-y-3 text-sm"><p><span className="font-bold text-[#71808c]">Date:</span> {new Date(`${selected.date}T00:00:00`).toLocaleDateString('vi-VN')}</p><p><span className="font-bold text-[#71808c]">Amount:</span> {currency.format(selected.amount)}</p><p><span className="font-bold text-[#71808c]">Type:</span> {selected.type === 'DEBT_PAYABLE' ? 'Khoản phải trả' : selected.type === 'DEBT_RECEIVABLE' ? 'Khoản cho vay sắp thu' : 'Khoản định kỳ'}</p></div>{selected.type !== 'SUBSCRIPTION' && <div className="mt-5"><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet for settlement</label><select value={settleWalletId} onChange={(event) => setSettleWalletId(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm"><option value="">Choose wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><button disabled={saving || !settleWalletId} onClick={settle} className="mt-4 w-full rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Thanh toán'}</button></div>}{selected.type === 'SUBSCRIPTION' && <Link to="/recurring" onClick={() => setSelected(null)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white no-underline hover:bg-[#075c57]">Open recurring schedule <ArrowUpRight size={16} /></Link>}</div></div>}
  </div>;
};

export default DebtCalendar;