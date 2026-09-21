import React, { useEffect, useState } from 'react';
import { HandCoins, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components';
import { createDebt, deleteDebt, getDebts, settleDebt, updateDebt, type Debt, type DebtRequest, type DebtType } from '../services/api';
import api from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

type Wallet = { id: string; name: string; balance: number };
type ModalMode = 'create' | 'edit' | 'settle' | null;

const emptyForm: DebtRequest = { counterpartyName: '', amount: 0, type: 'BORROW', dueDate: '', description: '' };

const typeCopy: Record<DebtType, { label: string; tone: string; badge: string }> = {
  BORROW: { label: 'Payable', tone: 'border-[#f3c5b8] bg-[#fff7f4]', badge: 'bg-[#ffe5dd] text-[#b64d3c]' },
  LEND: { label: 'Receivable', tone: 'border-[#b9dfd7] bg-[#f3fbf8]', badge: 'bg-[#dcefeb] text-[#087f74]' },
};

export const Debts: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Debt | null>(null);
  const [form, setForm] = useState<DebtRequest>(emptyForm);
  const [walletId, setWalletId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [debtResponse, walletResponse] = await Promise.all([getDebts(), api.get<Wallet[]>('/wallets')]);
      setDebts(debtResponse.data);
      setWallets(walletResponse.data);
      setError(null);
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to load debts')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const closeModal = () => { setModal(null); setSelected(null); setForm(emptyForm); setWalletId(''); };
  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (debt: Debt) => {
    setSelected(debt);
    setForm({ counterpartyName: debt.counterpartyName, amount: debt.amount, type: debt.type, dueDate: debt.dueDate || '', description: debt.description || '' });
    setModal('edit');
  };
  const openSettle = (debt: Debt) => { setSelected(debt); setWalletId(wallets[0]?.id || ''); setModal('settle'); };

  const submitDebt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.counterpartyName.trim() || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) { toast.error('Enter a valid name and amount'); return; }
    setSaving(true);
    try {
      const request = { ...form, amount: Number(form.amount), dueDate: form.dueDate || undefined, description: form.description || undefined };
      if (modal === 'edit' && selected) await updateDebt(selected.id, request); else await createDebt(request);
      closeModal(); await load(); toast.success(modal === 'edit' ? 'Debt updated' : 'Debt recorded');
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to save debt')); }
    finally { setSaving(false); }
  };

  const submitSettle = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !walletId) { toast.error('Choose a wallet'); return; }
    setSaving(true);
    try { await settleDebt(selected.id, walletId); closeModal(); await load(); toast.success('Debt settled and transaction recorded'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to settle debt')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this debt record?')) return;
    try { await deleteDebt(id); setDebts((current) => current.filter((debt) => debt.id !== id)); toast.success('Debt deleted'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to delete debt')); }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="rounded-xl bg-[#fff1ef] p-4 text-sm font-semibold text-[#c25344]">{error}</div>;
  const pending = debts.filter((debt) => debt.status === 'PENDING');
  const totalBorrowed = pending.filter((debt) => debt.type === 'BORROW').reduce((sum, debt) => sum + debt.amount, 0);
  const totalLent = pending.filter((debt) => debt.type === 'LEND').reduce((sum, debt) => sum + debt.amount, 0);

  return <div>
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Keep every promise visible</div><h1 className="page-title">Debts & loans</h1><p className="page-subtitle">Track what you owe and what is owed to you.</p></div><button onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#075c57]"><Plus size={17} />Record debt</button></div>
    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Payable</p><p className="mt-2 text-2xl font-extrabold text-[#b64d3c]">{currency.format(totalBorrowed)}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Receivable</p><p className="mt-2 text-2xl font-extrabold text-[#087f74]">{currency.format(totalLent)}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Open records</p><p className="mt-2 text-2xl font-extrabold text-[#17212b]">{pending.length}</p></div></div>
    {debts.length ? <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{debts.map((debt) => { const copy = typeCopy[debt.type]; return <Card key={debt.id} className={copy.tone}><CardHeader><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${copy.badge}`}><HandCoins size={19} /></span><div className="min-w-0"><h2 className="section-title truncate">{debt.counterpartyName}</h2><p className="section-caption mt-1">{copy.label}{debt.dueDate ? ` · Due ${new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString('vi-VN')}` : ''}</p></div></div><div className="flex shrink-0 gap-1"><span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${debt.status === 'PENDING' ? 'bg-white/80 text-[#71808c]' : 'bg-[#e7eee9] text-[#5c7467]'}`}>{debt.status}</span>{debt.status === 'PENDING' && <><button aria-label={`Edit ${debt.counterpartyName}`} title="Edit debt" onClick={() => openEdit(debt)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-white hover:text-[#087f74]"><Pencil size={15} /></button><button aria-label={`Delete ${debt.counterpartyName}`} title="Delete debt" onClick={() => remove(debt.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-white hover:text-[#d76756]"><Trash2 size={15} /></button></>}</div></div></CardHeader><CardBody><p className="text-2xl font-extrabold text-[#17212b]">{currency.format(debt.amount)}</p>{debt.description && <p className="mt-2 text-sm text-[#71808c]">{debt.description}</p>}{debt.status === 'PENDING' && <button onClick={() => openSettle(debt)} className="mt-5 w-full rounded-xl bg-[#17212b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#2d3d48]">Settle debt</button>}</CardBody></Card>; })}</div> : <div className="surface flex min-h-[260px] items-center justify-center p-8 text-center"><div><HandCoins size={28} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No debt records yet</p><button onClick={openCreate} className="mt-5 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white">Record a debt</button></div></div>}
    {modal && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div role="dialog" aria-modal="true" className="w-full max-w-[480px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">Debt & loan</div><h2 className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">{modal === 'settle' ? 'Settle this record' : modal === 'edit' ? 'Edit debt' : 'Record a debt'}</h2></div><button aria-label="Close" onClick={closeModal} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6]"><X size={18} /></button></div>{modal === 'settle' ? <form onSubmit={submitSettle} className="space-y-4"><p className="text-sm text-[#71808c]">Choose the wallet where money will be received or deducted.</p><select required value={walletId} onChange={(event) => setWalletId(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"><option value="">Choose wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name} · {currency.format(wallet.balance)}</option>)}</select><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={closeModal} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]">Cancel</button><button disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Confirm settlement'}</button></div></form> : <form onSubmit={submitDebt} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Person or organization</label><input autoFocus required value={form.counterpartyName} onChange={(event) => setForm({ ...form, counterpartyName: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div className="grid grid-cols-2 gap-3"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Amount</label><input required min="0.01" step="0.01" type="number" value={form.amount || ''} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Type</label><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DebtType })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"><option value="BORROW">Payable</option><option value="LEND">Receivable</option></select></div></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Due date</label><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Description</label><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="w-full resize-none rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={closeModal} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]">Cancel</button><button disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : modal === 'edit' ? 'Save changes' : 'Record debt'}</button></div></form>}</div></div>}
  </div>;
};

export default Debts;
