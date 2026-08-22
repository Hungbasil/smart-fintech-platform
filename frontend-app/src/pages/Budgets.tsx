import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Target } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components';
import api from '../services/api';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

interface Category { id: string; name: string; type: string; }
interface Budget { id: string; categoryId: string; categoryName: string; monthlyLimit: number; spent: number; percentage: number; }

export const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [budgetResponse, categoryResponse] = await Promise.all([api.get<Budget[]>('/budgets'), api.get<Category[]>('/categories')]);
      setBudgets(budgetResponse.data);
      setCategories(categoryResponse.data.filter((category) => category.type.toUpperCase() === 'EXPENSE'));
    } catch (err) { setError(getApiErrorMessage(err, 'Unable to load budgets')); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/budgets', { categoryId, monthlyLimit: Number(limit) });
      setCategoryId(''); setLimit(''); await load(); toast.success('Budget saved');
    } catch (err) { toast.error(getApiErrorMessage(err, 'Unable to save budget')); }
    finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    try { await api.delete(`/budgets/${id}`); setBudgets((current) => current.filter((budget) => budget.id !== id)); toast.success('Budget removed'); }
    catch (err) { toast.error(getApiErrorMessage(err, 'Unable to remove budget')); }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return <div>
    <div className="mb-8"><div className="eyebrow">Monthly guardrails</div><h1 className="page-title">Budgets</h1><p className="page-subtitle">Set category limits and see how much room is left this month.</p></div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_1fr]">
      <Card><CardBody><div className="mb-5"><h2 className="section-title">Set a budget</h2><p className="section-caption mt-1">One monthly limit per expense category.</p></div><form onSubmit={save} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Category</label><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Monthly limit</label><input required min="0.01" step="0.01" type="number" value={limit} onChange={(event) => setLimit(event.target.value)} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm" /></div><button disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus size={16} />{saving ? 'Saving...' : 'Save budget'}</button></form></CardBody></Card>
      <div className="space-y-4">{budgets.map((budget) => { const percentage = Math.min(100, budget.percentage); const tone = budget.percentage >= 100 ? 'bg-[#d76756]' : budget.percentage >= 80 ? 'bg-[#bd7a22]' : 'bg-[#087f74]'; return <Card key={budget.id}><CardHeader><div className="flex items-start justify-between"><div><h2 className="section-title">{budget.categoryName}</h2><p className="section-caption mt-1">{currency.format(budget.spent)} of {currency.format(budget.monthlyLimit)} used</p></div><button aria-label={`Delete ${budget.categoryName} budget`} title="Delete budget" onClick={() => remove(budget.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={16} /></button></div></CardHeader><CardBody><div className="mb-2 flex items-center justify-between text-xs font-bold text-[#71808c]"><span>{budget.percentage >= 100 ? 'Over limit' : budget.percentage >= 80 ? 'Near limit' : 'On track'}</span><span>{budget.percentage.toFixed(0)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-[#edf2f0]"><div className={`h-3 rounded-full ${tone}`} style={{ width: `${percentage}%` }} /></div></CardBody></Card>; })}{budgets.length === 0 && <div className="surface flex min-h-[220px] items-center justify-center p-8 text-center"><div><Target size={25} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No budgets yet</p><p className="mt-1 text-sm text-[#9aa7af]">Create one to start watching your spending.</p></div></div>}</div>
    </div>
  </div>;
};

export default Budgets;