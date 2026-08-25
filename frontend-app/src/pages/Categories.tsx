import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { Card, CardBody, CardHeader } from '../components';
import api from '../services/api';
import { getApiErrorMessage, toast } from '../services/notifications';

interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | string;
  userId?: string | null;
}

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get<Category[]>('/categories');
      setCategories(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', type: 'EXPENSE' });
    setFormError(null);
    setIsOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, type: category.type.toUpperCase() });
    setFormError(null);
    setIsOpen(true);
  };

  const saveCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, form);
      } else {
        await api.post('/categories', form);
      }
      setIsOpen(false);
      await loadCategories();
      toast.success(editingId ? 'Category updated' : 'Category created');
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Unable to save category');
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Delete this category? Existing transactions may prevent deletion.')) return;
    try {
      await api.delete(`/categories/${id}`);
      setCategories((current) => current.filter((category) => category.id !== id));
      toast.success('Category deleted');
    } catch (err: any) {
      const message = getApiErrorMessage(err, 'Unable to delete category');
      toast.error(message);
    }
  };

  if (loading) return <div className="py-10 text-sm text-[#71808c]">Loading categories...</div>;
  if (error) return <div className="rounded-xl bg-[#fff1ef] p-4 text-sm font-semibold text-[#c25344]">{error}</div>;

  const incomeCategories = categories.filter((category) => category.type.toUpperCase() === 'INCOME');
  const expenseCategories = categories.filter((category) => category.type.toUpperCase() === 'EXPENSE');

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">Your taxonomy</div><h1 className="page-title">Categories</h1><p className="page-subtitle">Organize income and expenses so your analytics stay meaningful.</p></div>
        <button onClick={openCreate} className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><Plus size={17} />New category</button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardBody><p className="text-xs font-bold text-[#71808c]">Total categories</p><p className="mt-2 text-2xl font-extrabold text-[#17212b]">{categories.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs font-bold text-[#71808c]">Income categories</p><p className="mt-2 text-2xl font-extrabold text-[#087f74]">{incomeCategories.length}</p></CardBody></Card>
        <Card><CardBody><p className="text-xs font-bold text-[#71808c]">Expense categories</p><p className="mt-2 text-2xl font-extrabold text-[#d76756]">{expenseCategories.length}</p></CardBody></Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {[{ title: 'Income', items: incomeCategories, color: 'text-[#087f74]', iconBg: 'bg-[#e4f4f0]' }, { title: 'Expenses', items: expenseCategories, color: 'text-[#d76756]', iconBg: 'bg-[#fff1ef]' }].map(({ title, items, color, iconBg }) => (
          <Card key={title}>
            <CardHeader><h2 className="section-title">{title}</h2><p className="section-caption mt-1">Used when recording {title.toLowerCase()}.</p></CardHeader>
            <CardBody>{items.length === 0 ? <div className="py-8 text-center"><Tag size={22} className="mx-auto text-[#b7c3bf]" /><p className="mt-2 text-sm font-bold text-[#71808c]">No {title.toLowerCase()} categories</p></div> : <div className="space-y-2">{items.map((category) => <div key={category.id} className="flex items-center justify-between rounded-xl border border-[#edf2f0] px-3 py-3"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg} ${color}`}><Tag size={16} /></span><div><div className="flex items-center gap-2"><span className="text-sm font-bold text-[#17212b]">{category.name}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${category.userId ? 'bg-[#e4f4f0] text-[#087f74]' : 'bg-[#f1f3f2] text-[#71808c]'}`}>{category.userId ? 'Cá nhân' : 'Mặc định'}</span></div></div></div>{category.userId && <div className="flex gap-1"><button aria-label={`Edit ${category.name}`} title="Edit category" onClick={() => openEdit(category)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={15} /></button><button aria-label={`Delete ${category.name}`} title="Delete category" onClick={() => deleteCategory(category.id)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={15} /></button></div>}</div>)}</div>}</CardBody>
          </Card>
        ))}
      </div>

      {isOpen && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#17212b]/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"><div role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="w-full max-w-[440px] rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">{editingId ? 'Update taxonomy' : 'New taxonomy'}</div><h2 id="category-dialog-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">{editingId ? 'Edit category' : 'Create category'}</h2></div><button aria-label="Close" onClick={() => setIsOpen(false)} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6] hover:text-[#17212b]"><X size={18} /></button></div><form onSubmit={saveCategory} className="space-y-4">{formError && <div className="rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">{formError}</div>}<div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Category name</label><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Groceries" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Category type</label><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm font-semibold outline-none focus:border-[#087f74]"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={() => setIsOpen(false)} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57] disabled:opacity-50">{saving ? 'Saving...' : editingId ? 'Update category' : 'Save category'}</button></div></form></div></div>}
    </div>
  );
};

export default Categories;
