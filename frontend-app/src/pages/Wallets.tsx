import React, { useEffect, useState } from 'react';
import { Plus, Trash2, WalletCards } from 'lucide-react';
import api from '../services/api';
import { Card, CardBody } from '../components';
import { currency } from '../services/format';

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
    try {
      const res = await api.post('/wallets', { name, balance });
      setWallets((prev) => [res.data, ...prev]);
      setName('');
      setBalance(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteWallet = async (id: string) => {
    try {
      await api.delete(`/wallets/${id}`);
      setWallets((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="eyebrow">Your accounts</div><h1 className="page-title">Wallets</h1><p className="page-subtitle">Keep a clear view of where your money lives.</p></div><button className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#075c57]"><Plus size={17} />New wallet</button></div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]"><div className="surface bg-[#075c57] p-6 text-white shadow-md"><div className="mb-8 flex items-start justify-between"><div><p className="text-[12px] font-bold text-[#a9ddd4]">Total balance</p><p className="mt-2 text-3xl font-extrabold tracking-[-.05em]">{currency.format(totalBalance)}</p></div><WalletCards size={22} className="text-[#8fd0c7]" /></div><p className="text-xs text-[#b8e2dc]">Combined balance across {wallets.length} wallet{wallets.length === 1 ? '' : 's'}</p></div><Card><CardBody><p className="text-[12px] font-bold text-[#71808c]">Quick insight</p><p className="mt-2 text-lg font-extrabold text-[#17212b]">{wallets.length ? 'Your accounts are ready.' : 'Add your first wallet.'}</p><p className="mt-2 text-xs leading-5 text-[#9aa7af]">{wallets.length ? 'Connect transactions to keep your overview accurate.' : 'Start with cash, bank or investment accounts.'}</p></CardBody></Card></div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[330px_1fr]
      "><Card><CardBody><div className="mb-5"><h2 className="section-title">Create wallet</h2><p className="section-caption mt-1">Add an account to your overview.</p></div><form onSubmit={addWallet} className="space-y-4"><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Wallet name</label><input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily spending" className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#a8b3b0] focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div><div><label className="mb-1.5 block text-xs font-bold text-[#71808c]">Opening balance</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9aa7af]">$</span><input required type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="w-full rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] py-2.5 pl-7 pr-3 text-sm outline-none transition focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0]" /></div></div><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#075c57]"><Plus size={16} />Add wallet</button></form></CardBody></Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{wallets.map((wallet) => <Card key={wallet.id}><CardBody><div className="mb-8 flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4f4f0] text-[#087f74]"><WalletCards size={18} /></span><button aria-label={`Delete ${wallet.name}`} title="Delete wallet" onClick={() => deleteWallet(wallet.id)} className="rounded-lg p-2 text-[#b3bfbb] transition hover:bg-[#fff1ef] hover:text-[#d76756]"><Trash2 size={16} /></button></div><p className="text-sm font-bold text-[#71808c]">{wallet.name}</p><p className="mt-2 text-2xl font-extrabold tracking-[-.04em] text-[#17212b]">{currency.format(wallet.balance)}</p><p className="mt-2 text-xs text-[#9aa7af]">Available balance</p></CardBody></Card>)}{wallets.length === 0 && <div className="surface flex min-h-[220px] items-center justify-center p-8 text-center sm:col-span-2"><div><WalletCards size={25} className="mx-auto text-[#9aa7af]" /><p className="mt-3 font-bold text-[#17212b]">No wallets yet</p><p className="mt-1 text-sm text-[#9aa7af]">Create one to start tracking your money.</p></div></div>}</div>
      </div>
    </div>
  );
};

export default Wallets;
