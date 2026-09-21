import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, WalletCards, X } from 'lucide-react';
import api, { updateWallet } from '../services/api';
import { Card, CardBody, PageState, SkeletonCard } from '../components';
import { currency } from '../services/format';
import { getApiErrorMessage, toast } from '../services/notifications';

interface Wallet {
  id: string;
  name: string;
  balance: number;
}

export const Wallets: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await api.get<Wallet[]>('/wallets');
      setWallets(response.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  const addWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = editingId
        ? await updateWallet(editingId, { name, balance })
        : await api.post('/wallets', { name, balance });
      setWallets((prev) => editingId ? prev.map((wallet) => wallet.id === editingId ? res.data : wallet) : [res.data, ...prev]);
      setName('');
      setBalance(0);
      setEditingId(null);
      setIsEditModalOpen(false);
      toast.success(editingId ? 'Wallet updated successfully' : 'Wallet created successfully');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to create wallet');
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const editWallet = (wallet: Wallet) => {
    setEditingId(wallet.id);
    setName(wallet.name);
    setBalance(wallet.balance);
    setIsEditModalOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setBalance(0);
    setIsEditModalOpen(false);
  };

  const deleteWallet = async (id: string) => {
    try {
      await api.delete(`/wallets/${id}`);
      setWallets((prev) => prev.filter((w) => w.id !== id));
      toast.success('Wallet deleted');
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to delete wallet');
      toast.error(message);
    }
  };

  if (error) return <PageState error={error} onRetry={fetchWallets} />;

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <SkeletonCard count={1} />
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_1fr]">
          <SkeletonCard count={1} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SkeletonCard count={2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Your accounts</div><h1 className="page-title">Wallets</h1><p className="page-subtitle">Keep a clear view of where your money lives.</p></div><button className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><Plus size={17} />New wallet</button></div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]"><div className="surface bg-[#075c57] p-6 text-white shadow-md"><div className="mb-8 flex items-start justify-between"><div><p className="text-[12px] font-bold text-[#a9ddd4]">Total balance</p><p className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{currency.format(totalBalance)}</p></div><WalletCards size={22} className="text-[#8fd0c7]" /></div><p className="text-xs text-[#b8e2dc]">Combined balance across {wallets.length} wallet{wallets.length === 1 ? '' : 's'}</p></div><Card><CardBody><p className="text-[12px] font-bold text-[#71808c]">Quick insight</p><p className="mt-2 text-lg font-extrabold text-[#17212b]">{wallets.length ? 'Your accounts are ready.' : 'Add your first wallet.'}</p><p className="mt-2 text-xs leading-5 text-[#9aa7af]">{wallets.length ? 'Connect transactions to keep your overview accurate.' : 'Start with cash, bank or investment accounts.'}</p></CardBody></Card></div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_1fr]
      "><Card><CardBody><div className="mb-5"><h2 className="section-title">Create wallet</h2><p className="section-caption mt-1">Add an account to your overview.</p></div><form onSubmit={addWallet} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet name</label><input required value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} placeholder="e.g. Daily spending" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#a8b3b0] focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-50 disabled:cursor-not-allowed" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Opening balance</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9aa7af]">₫</span><input required type="number" min="0" step="1" value={balance} onChange={(e) => setBalance(Number(e.target.value))} disabled={isSaving} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-7 pr-3 text-sm outline-none transition focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-50 disabled:cursor-not-allowed" /></div></div><button type="submit" disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#075c57] disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? (<><span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>Saving...</> ) : (<><Plus size={16} />Add wallet</>)}</button></form></CardBody></Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{wallets.map((wallet) => <Card key={wallet.id}><CardBody><div className="mb-8 flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f4f0] text-[#087f74]"><WalletCards size={18} /></span><div className="flex gap-1"><button aria-label={`Edit ${wallet.name}`} title="Edit wallet" onClick={() => editWallet(wallet)} className="rounded-lg p-2 text-[#b3bfbb] transition hover:bg-[#e4f4f0] hover:text-[#087f74]"><Pencil size={16} /></button><button aria-label={`Delete ${wallet.name}`} title="Delete wallet" onClick={() => deleteWallet(wallet.id)} className="rounded-lg p-2 text-[#b3bfbb] transition hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={16} /></button></div></div><p className="text-sm font-bold text-[#71808c]">{wallet.name}</p><p className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#17212b]">{currency.format(wallet.balance)}</p><p className="mt-2 text-xs text-[#9aa7af]">Available balance</p></CardBody></Card>)}{wallets.length === 0 && <div className="surface flex min-h-[220px] items-center justify-center p-8 text-center sm:col-span-2"><div><WalletCards size={25} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No wallets yet</p><p className="mt-1 text-sm text-[#9aa7af]">Create one to start tracking your money.</p></div></div>}</div>
      </div>
      {isEditModalOpen && <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#17212b]/35 p-4 backdrop-blur-[2px] animate-fade-in"><div role="dialog" aria-modal="true" aria-labelledby="edit-wallet-title" className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl animate-scale-in"><div className="mb-6 flex items-start justify-between"><div><div className="eyebrow">Wallet settings</div><h2 id="edit-wallet-title" className="mt-1 text-xl font-extrabold text-[#17212b]">Edit wallet</h2><p className="mt-1 text-xs text-[#71808c]">Update the wallet name and current balance.</p></div><button type="button" aria-label="Close edit wallet" onClick={cancelEdit} className="rounded-lg p-2 text-[#9aa7af] hover:bg-[#f4f7f6]"><X size={18} /></button></div><form onSubmit={addWallet} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet name</label><input required value={name} onChange={(event) => setName(event.target.value)} disabled={isSaving} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-50 disabled:cursor-not-allowed" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Balance</label><input required min="0" step="0.01" type="number" value={balance} onChange={(event) => setBalance(Number(event.target.value))} disabled={isSaving} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-50 disabled:cursor-not-allowed" /></div><div className="flex justify-end gap-3 border-t border-[#edf2f0] pt-5"><button type="button" onClick={cancelEdit} disabled={isSaving} className="rounded-xl border border-[#e3ebe8] px-4 py-2.5 text-sm font-bold text-[#71808c] disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button><button type="submit" disabled={isSaving} className="rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save changes'}</button></div></form></div></div>}
    </div>
  );
};

export default Wallets;
