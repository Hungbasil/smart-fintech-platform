import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { X } from 'lucide-react';
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

  if (loading) return <div className="p-8">Loading calendar...</div>;
  return <div>
    <div className="mb-8"><div className="eyebrow">Never miss a promise</div><h1 className="page-title">Debt calendar</h1><p className="page-subtitle">See upcoming repayments, collections and recurring bills.</p></div>
    <Card><CardBody><FullCalendar plugins={[dayGridPlugin as never]} initialView="dayGridMonth" height="auto" events={calendarEvents} eventClick={(info) => setSelected(info.event.extendedProps as CalendarEvent)} /></CardBody></Card>
    {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#17212b]/35 p-4 backdrop-blur-[2px]"><div role="dialog" aria-modal="true" className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><div className="eyebrow">Calendar event</div><h2 className="mt-1 text-xl font-extrabold text-[#17212b]">{selected.title}</h2></div><button aria-label="Close" onClick={() => setSelected(null)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6]"><X size={18} /></button></div><div className="space-y-3 text-sm"><p><span className="font-bold text-[#71808c]">Date:</span> {new Date(`${selected.date}T00:00:00`).toLocaleDateString('vi-VN')}</p><p><span className="font-bold text-[#71808c]">Amount:</span> {currency.format(selected.amount)}</p><p><span className="font-bold text-[#71808c]">Type:</span> {selected.type === 'DEBT_PAYABLE' ? 'Khoản phải trả' : selected.type === 'DEBT_RECEIVABLE' ? 'Khoản cho vay sắp thu' : 'Khoản định kỳ'}</p></div>{selected.type !== 'SUBSCRIPTION' && <div className="mt-5"><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet for settlement</label><select value={settleWalletId} onChange={(event) => setSettleWalletId(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm"><option value="">Choose wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><button disabled={saving || !settleWalletId} onClick={settle} className="mt-4 w-full rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Thanh toán'}</button></div>}</div></div>}
  </div>;
};

export default DebtCalendar;