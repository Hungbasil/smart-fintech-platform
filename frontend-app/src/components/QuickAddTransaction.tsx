import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';
import api from '../services/api';
import { getApiErrorMessage, toast } from '../services/notifications';

interface WalletOption {
  id: string;
  name: string;
  balance: number;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

const localDateTimeValue = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const RECENT_WALLET_KEY = 'smartfin.quick-add.wallet';
const RECENT_CATEGORY_KEY = 'smartfin.quick-add.category';

type QuickAddTransactionProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
};

export const QuickAddTransaction: React.FC<QuickAddTransactionProps> = ({ open, onClose, onSaved, triggerRef }) => {
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    transactionDate: localDateTimeValue(),
    walletId: '',
    categoryId: '',
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm((current) => ({ ...current, transactionDate: localDateTimeValue() }));
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [walletResponse, categoryResponse] = await Promise.all([
          api.get<WalletOption[]>('/wallets'),
          api.get<CategoryOption[]>('/categories'),
        ]);
        const loadedWallets = walletResponse.data;
        const loadedCategories = categoryResponse.data;
        const recentWallet = localStorage.getItem(RECENT_WALLET_KEY);
        const recentCategory = localStorage.getItem(RECENT_CATEGORY_KEY);
        setWallets(loadedWallets);
        setCategories(loadedCategories);
        setForm((current) => ({
          ...current,
          walletId: loadedWallets.some((wallet) => wallet.id === recentWallet) ? recentWallet || '' : loadedWallets[0]?.id || '',
          categoryId: loadedCategories.some((category) => category.id === recentCategory) ? recentCategory || '' : loadedCategories[0]?.id || '',
        }));
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Unable to load wallets and categories'));
      } finally {
        setLoadingOptions(false);
      }
    };
    void loadOptions();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      triggerRef?.current?.focus();
    };
  }, [open, triggerRef]);

  if (!open) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    try {
      setSaving(true);
      await api.post('/transactions', { ...form, amount });
      localStorage.setItem(RECENT_WALLET_KEY, form.walletId);
      localStorage.setItem(RECENT_CATEGORY_KEY, form.categoryId);
      toast.success('Transaction added');
      onSaved?.();
      onClose();
      setForm({ description: '', amount: '', transactionDate: localDateTimeValue(), walletId: form.walletId, categoryId: form.categoryId });
    } catch (saveError) {
      const message = getApiErrorMessage(saveError, 'Unable to save transaction');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17212b]/35 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="quick-add-title" className="max-h-[calc(100svh-2rem-env(safe-area-inset-bottom))] w-full max-w-[460px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><div className="eyebrow">Quick capture</div><h2 id="quick-add-title" className="mt-1 text-xl font-extrabold tracking-[-.04em] text-[#17212b]">Add transaction</h2><p className="mt-1 text-xs text-[#71808c]">Record a movement without leaving your current page.</p></div>
          <button type="button" aria-label="Close quick add" title="Close" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6] hover:text-[#17212b]"><X size={18} /></button>
        </div>
        <form onSubmit={save} className="space-y-4">
          {error && <div className="rounded-xl bg-[#fff1ef] px-3 py-2.5 text-sm font-semibold text-[#c25344]">{error}</div>}
          <div><label htmlFor="quick-description" className="mb-1.5 block text-xs font-bold text-[#71808c]">Description</label><input id="quick-description" required autoFocus value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="e.g. Groceries" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label htmlFor="quick-amount" className="mb-1.5 block text-xs font-bold text-[#71808c]">Amount</label><input id="quick-amount" required min="0.01" step="0.01" type="number" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div>
            <div><label htmlFor="quick-date" className="mb-1.5 block text-xs font-bold text-[#71808c]">Date and time</label><input id="quick-date" required type="datetime-local" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]" /></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label htmlFor="quick-wallet" className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet</label><select id="quick-wallet" required disabled={loadingOptions} value={form.walletId} onChange={(event) => setForm({ ...form, walletId: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"><option value="">Select wallet</option>{wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></div>
            <div><label htmlFor="quick-category" className="mb-1.5 block text-xs font-bold text-[#71808c]">Category</label><select id="quick-category" required disabled={loadingOptions} value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74]"><option value="">Select category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name} ({category.type.toLowerCase()})</option>)}</select></div>
          </div>
          <div className="flex items-center justify-end gap-3 border-t border-[#edf2f0] pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] hover:bg-[#f4f7f6]">Cancel</button><button type="submit" disabled={saving || loadingOptions || !wallets.length || !categories.length} className="inline-flex items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{saving ? 'Saving...' : 'Save transaction'}</button></div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddTransaction;