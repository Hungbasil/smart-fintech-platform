import React, { useEffect, useState } from 'react';
import { CalendarClock, Pencil, Plus, Trash2, X } from 'lucide-react';
import api, { updateRecurringTransaction } from '../services/api';
import { Card, CardBody, CardHeader } from '../components';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

interface Option { id: string; name: string; type?: string; }
interface Recurring { id: string; walletId: string; categoryId: string; description: string; amount: number; dayOfMonth: number; active: boolean; lastProcessed?: string; }
type FormState = { description: string; amount: string; dayOfMonth: string; walletId: string; categoryId: string };
const emptyForm: FormState = { description: '', amount: '', dayOfMonth: '1', walletId: '', categoryId: '' };

export const Recurring: React.FC = () => {
  const [items, setItems] = useState<Recurring[]>([]);
  const [wallets, setWallets] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [recurring, walletResponse, categoryResponse] = await Promise.all([
        api.get<Recurring[]>('/recurring-transactions'),
        api.get<Option[]>('/wallets'),
        api.get<Option[]>('/categories'),
      ]);
      setItems(recurring.data);
      setWallets(walletResponse.data);
      setCategories(categoryResponse.data);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to load recurring transactions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), dayOfMonth: Number(form.dayOfMonth), active: true };
      if (editingId) await updateRecurringTransaction(editingId, payload);
      else await api.post('/recurring-transactions', payload);
      setForm(emptyForm);
      setEditingId(null);
      await load();
      toast.success(editingId ? 'Recurring transaction updated' : 'Recurring transaction created');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to save recurring transaction'));
    } finally {
      setSaving(false);
    }
  };

  const edit = (item: Recurring) => {
    setEditingId(item.id);
    setForm({ description: item.description, amount: String(item.amount), dayOfMonth: String(item.dayOfMonth), walletId: item.walletId, categoryId: item.categoryId });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const remove = async (id: string) => {
    try {
      await api.delete(`/recurring-transactions/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success('Recurring transaction removed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Unable to remove recurring transaction'));
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return <div>
    <div className="mb-8"><div className="eyebrow">Automated money movement</div><h1 className="page-title">Recurring transactions</h1><p className="page-subtitle">Automatically record salary, rent and subscriptions each month.</p></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_1fr]">
      <Card><CardBody><div className="mb-5"><h2 className="section-title">{editingId ? 'Edit schedule' : 'New schedule'}</h2><p className="section-caption mt-1">The scheduler creates one transaction per month.</p></div><form onSubmit={save} className="space-y-4"><input required placeholder="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] px-3 py-2.5 text-sm" /><input required min="0.01" step="0.01" type="number" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] px-3 py-2.5 text-sm" /><input required min="1" max="31" type="number" placeholder="Day of month" value={form.dayOfMonth} onChange={(event) => setForm({ ...form, dayOfMonth: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] px-3 py-2.5 text-sm" /><select required value={form.walletId} onChange={(event) => setForm({ ...form, walletId: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] px-3 py-2.5 text-sm"><option value="">Select wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select><select required value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] px-3 py-2.5 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create schedule'}</button>{editingId && <button type="button" onClick={cancelEdit} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]"><X size={16} />Cancel edit</button>}</form></CardBody></Card>
      <div className="space-y-4">{items.map((item) => <Card key={item.id}><CardHeader><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f4f0] text-[#087f74]"><CalendarClock size={18} /></span><div><h2 className="section-title">{item.description}</h2><p className="section-caption mt-1">Day {item.dayOfMonth} each month</p></div></div><div className="flex gap-1"><button aria-label={`Edit ${item.description}`} title="Edit schedule" onClick={() => edit(item)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={16} /></button><button aria-label={`Delete ${item.description}`} title="Delete schedule" onClick={() => remove(item.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={16} /></button></div></div></CardHeader><CardBody><p className="text-lg font-extrabold text-[#17212b]">{currency.format(item.amount)}</p><p className="mt-1 text-xs text-[#71808c]">{wallets.find((wallet) => wallet.id === item.walletId)?.name || 'Wallet'} · {categories.find((category) => category.id === item.categoryId)?.name || 'Category'}</p></CardBody></Card>)}{items.length === 0 && <div className="surface flex min-h-[220px] items-center justify-center p-8 text-center"><div><CalendarClock size={25} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No schedules yet</p></div></div>}</div>
    </div>
  </div>;
};

export default Recurring;