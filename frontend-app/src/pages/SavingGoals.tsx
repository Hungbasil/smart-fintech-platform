import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components';
import { addSavingGoalFunds, createSavingGoal, deleteSavingGoal, getSavingGoals, type SavingGoal, updateSavingGoal } from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

type ModalMode = 'create' | 'edit' | 'funds' | null;

const emptyForm = { name: '', targetAmount: '', deadline: '' };

const GoalCard: React.FC<{ goal: SavingGoal; onEdit: (goal: SavingGoal) => void; onFunds: (goal: SavingGoal) => void; onDelete: (id: string) => void }> = ({ goal, onEdit, onFunds, onDelete }) => {
  const percentage = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const complete = percentage >= 100;
  const width = Math.min(100, Math.max(0, percentage));

  return <Card className={complete ? 'border-[#a9ddd4] shadow-sm' : ''}><CardHeader><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${complete ? 'bg-[#dcefeb] text-[#087f74]' : 'bg-[#edf4f2] text-[#4c8d9a]'}`}>{complete ? <Check size={20} /> : <Target size={19} />}</span><div className="min-w-0"><h2 className="section-title truncate">{goal.name}</h2><p className="section-caption mt-1">{goal.deadline ? `Due ${new Date(`${goal.deadline}T00:00:00`).toLocaleDateString('vi-VN')}` : 'No deadline set'}</p></div></div><div className="flex shrink-0 gap-1"><button aria-label={`Edit ${goal.name}`} title="Edit goal" onClick={() => onEdit(goal)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={15} /></button><button aria-label={`Delete ${goal.name}`} title="Delete goal" onClick={() => onDelete(goal.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={15} /></button></div></div></CardHeader><CardBody><div className="mb-2 flex items-end justify-between gap-3"><div><span className="text-xl font-extrabold text-[#17212b]">{currency.format(goal.currentAmount)}</span><span className="ml-1 text-xs font-semibold text-[#9aa7af]">of {currency.format(goal.targetAmount)}</span></div><span className={`text-sm font-extrabold ${complete ? 'text-[#087f74]' : 'text-[#4c8d9a]'}`}>{percentage.toFixed(0)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[#edf2f0]"><div className={`h-3 rounded-full transition-all duration-500 ${complete ? 'bg-[#087f74]' : 'bg-[#4c8d9a]'}`} style={{ width: `${width}%` }} /></div><button onClick={() => onFunds(goal)} disabled={complete} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#17212b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2d3d48] disabled:cursor-not-allowed disabled:bg-[#dcefeb] disabled:text-[#087f74]"><Plus size={16} />{complete ? 'Goal reached' : 'Add funds'}</button></CardBody></Card>;
};

export const SavingGoals: React.FC = () => {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<ModalMode>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingGoal | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fundAmount, setFundAmount] = useState('');

  const loadGoals = async () => {
    try { setLoading(true); setGoals((await getSavingGoals()).data); setError(null); }
    catch (err) { setError(getApiErrorMessage(err, 'Unable to load saving goals')); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGoals(); }, []);

  const closeModal = () => { setModal(null); setSelectedGoal(null); setForm(emptyForm); setFundAmount(''); };
  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (goal: SavingGoal) => { setSelectedGoal(goal); setForm({ name: goal.name, targetAmount: String(goal.targetAmount), deadline: goal.deadline || '' }); setModal('edit'); };
  const openFunds = (goal: SavingGoal) => { setSelectedGoal(goal); setFundAmount(''); setModal('funds'); };

  const submitGoal = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetAmount = Number(form.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) { toast.error('Target amount must be greater than zero'); return; }
    setSaving(true);
    try {
      const request = { name: form.name, targetAmount, deadline: form.deadline || undefined };
      if (modal === 'edit' && selectedGoal) await updateSavingGoal(selectedGoal.id, request); else await createSavingGoal(request);
      closeModal(); await loadGoals(); toast.success(modal === 'edit' ? 'Saving goal updated' : 'Saving goal created');
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to save saving goal')); }
    finally { setSaving(false); }
  };

  const submitFunds = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(fundAmount);
    if (!selectedGoal || !Number.isFinite(amount) || amount <= 0) { toast.error('Amount must be greater than zero'); return; }
    setSaving(true);
    try { await addSavingGoalFunds(selectedGoal.id, { amount }); closeModal(); await loadGoals(); toast.success('Funds added to saving goal'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to add funds')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this saving goal?')) return;
    try { await deleteSavingGoal(id); setGoals((current) => current.filter((goal) => goal.id !== id)); toast.success('Saving goal deleted'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to delete saving goal')); }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="rounded-xl bg-[#fff1ef] p-4 text-sm font-semibold text-[#c25344]">{error}</div>;
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);

  return <div><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Build toward what matters</div><h1 className="page-title">Saving goals</h1><p className="page-subtitle">Turn your plans into progress, one contribution at a time.</p></div><button onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><Plus size={17} />New goal</button></div><div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3"><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Active goals</p><p className="mt-2 text-2xl font-extrabold text-[#17212b]">{goals.length}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Saved so far</p><p className="mt-2 text-2xl font-extrabold text-[#087f74]">{currency.format(totalCurrent)}</p></div><div className="surface surface-pad"><p className="text-xs font-bold text-[#71808c]">Total targets</p><p className="mt-2 text-2xl font-extrabold text-[#4c8d9a]">{currency.format(totalTarget)}</p></div></div>{goals.length ? <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{goals.map((goal) => <GoalCard key={goal.id} goal={goal} onEdit={openEdit} onFunds={openFunds} onDelete={remove} />)}</div> : <div className="surface flex min-h-[260px] items-center justify-center p-8 text-center"><div><Target size={28} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No saving goals yet</p><p className="mt-1 text-sm text-[#9aa7af]">Create your first goal and start building momentum.</p><button onClick={openCreate} className="mt-5 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white">Create a goal</button></div></div>}
    {modal && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="goal-modal-title" className="w-full max-w-[480px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">{modal === 'funds' ? 'Add momentum' : 'Savings plan'}</div><h2 id="goal-modal-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">{modal === 'funds' ? `Add funds to ${selectedGoal?.name}` : modal === 'edit' ? 'Edit saving goal' : 'Create saving goal'}</h2></div><button aria-label="Close" onClick={closeModal} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6] hover:text-[#17212b]"><X size={18} /></button></div>{modal === 'funds' ? <form onSubmit={submitFunds} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Amount to add</label><input autoFocus required min="0.01" step="0.01" type="number" value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={closeModal} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Adding...' : 'Add funds'}</button></div></form> : <form onSubmit={submitGoal} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Goal name</label><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Buy a laptop" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Target amount</label><input required min="0.01" step="0.01" type="number" value={form.targetAmount} onChange={(event) => setForm({ ...form, targetAmount: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Deadline <span className="font-normal text-[#9aa7af]">(optional)</span></label><input type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={closeModal} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c]">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : modal === 'edit' ? 'Update goal' : 'Create goal'}</button></div></form>}</div></div>}
  </div>;
};

export default SavingGoals;
