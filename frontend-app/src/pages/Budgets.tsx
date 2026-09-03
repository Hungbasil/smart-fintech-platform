import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader, PageState } from '../components';
import api, { deleteBudget, getBudgets, saveBudget } from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

interface Category { id: string; name: string; type: string; }
interface Budget { id: string; categoryId: string; categoryName: string; budgetAmount: number; totalSpent: number; percentage: number; month: number; year: number; }

const BudgetProgress: React.FC<{ budget: Budget; onDelete: (id: string) => void }> = ({ budget, onDelete }) => {
  const percentage = Math.max(0, budget.percentage);
  const barWidth = Math.min(100, percentage);
  const tone = percentage > 100 ? 'bg-[#d76756]' : percentage >= 80 ? 'bg-[#bd7a22]' : 'bg-[#087f74]';
  const label = percentage > 100 ? 'Over budget' : percentage >= 80 ? 'Near limit' : 'On track';

  return <Card><CardHeader><div className="flex items-start justify-between"><div><h2 className="section-title">{budget.categoryName}</h2><p className="section-caption mt-1">{currency.format(budget.totalSpent)} of {currency.format(budget.budgetAmount)} used</p></div><button aria-label={`Delete ${budget.categoryName} budget`} title="Delete budget" onClick={() => onDelete(budget.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={16} /></button></div></CardHeader><CardBody><div className="mb-2 flex items-center justify-between text-xs font-bold text-[#71808c]"><span>{label}</span><span>{percentage.toFixed(0)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[#edf2f0]"><div className={`h-3 rounded-full ${tone}`} style={{ width: `${barWidth}%` }} /></div></CardBody></Card>;
};

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
    const [categoryId, setCategoryId] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [budgetResponse, categoryResponse] = await Promise.all([getBudgets(), api.get<Category[]>('/categories')]);
      setBudgets(budgetResponse.data);
      setCategories(categoryResponse.data.filter((category) => category.type.toUpperCase() === 'EXPENSE'));
      setError(null);
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to load budgets')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Budget amount must be greater than zero');
      return;
    }
    setSaving(true);
    try {
      await saveBudget({ categoryId, amount: parsedAmount });
        setCategoryId(''); setAmount(''); setIsModalOpen(false); await load(); toast.success('Budget saved');
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to save budget')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await deleteBudget(id); setBudgets((current) => current.filter((budget) => budget.id !== id)); toast.success('Budget removed'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to remove budget')); }
  };

  if (loading || error) return <PageState loading={loading} error={error} loadingLabel="Loading budgets" />;

  return <div>
    {budgets.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{budgets.map((budget) => <button key={`edit-${budget.id}`} type="button" onClick={() => { setCategoryId(budget.categoryId); setAmount(String(budget.budgetAmount)); setIsModalOpen(true); }} className="inline-flex items-center gap-2 rounded-lg border border-[#e3ebe8] bg-white px-3 py-2 text-xs font-bold text-[#71808c] hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={14} />Edit</button>)}</div>}
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Monthly guardrails</div><h1 className="page-title">Budgets</h1><p className="page-subtitle">Set category limits and see how much room is left this month.</p></div><button onClick={() => setIsModalOpen(true)} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><Plus size={17} />Set budget</button></div>
      <div className="space-y-4">{budgets.map((budget) => <BudgetProgress key={budget.id} budget={budget} onDelete={remove} />)}{budgets.length === 0 && <div className="surface flex min-h-[220px] items-center justify-center p-8 text-center"><div><Target size={25} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No budgets yet</p><p className="mt-1 text-sm text-[#9aa7af]">Set a category limit to start watching your spending.</p></div></div>}</div>
    {isModalOpen && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="budget-modal-title" className="w-full max-w-[480px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">Monthly guardrail</div><h2 id="budget-modal-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">Set a budget</h2><p className="mt-1 text-xs text-[#71808c]">Choose an expense category for this month.</p></div><button aria-label="Close" onClick={() => setIsModalOpen(false)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6] hover:text-[#17212b]"><X size={18} /></button></div><form onSubmit={save} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Expense category</label><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Budget amount</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9aa7af]">₫</span><input required min="0.01" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-7 pr-3 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div></div><div className="mt-6 flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Cancel</button><button type="submit" disabled={saving || !categories.length} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving...' : 'Save budget'}</button></div></form></div></div>}
  </div>;
};

export default Budgets;