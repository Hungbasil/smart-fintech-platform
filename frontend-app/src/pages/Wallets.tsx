import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Card as TremorCard, Title, Metric, Text, Button } from '@tremor/react';

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
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallets</h1>

      <TremorCard className="mb-8">
        <Title>Total Balance</Title>
        <Metric>${totalBalance.toLocaleString()}</Metric>
      </TremorCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <TremorCard>
          <Title>Create Wallet</Title>
          <form onSubmit={addWallet} className="space-y-3 mt-3">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full border px-3 py-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium">Balance</label>
              <input type="number" value={balance} onChange={(e) => setBalance(Number(e.target.value))} className="mt-1 block w-full border px-3 py-2 rounded" />
            </div>
            <div>
              <Button type="submit">Add Wallet</Button>
            </div>
          </form>
        </TremorCard>

        {wallets.map((wallet) => (
          <TremorCard key={wallet.id}>
            <Metric>{wallet.name}</Metric>
            <Text className="mt-2">${wallet.balance.toLocaleString()}</Text>
            <div className="mt-4">
              <Button onClick={() => deleteWallet(wallet.id)} style={{ backgroundColor: '#ef4444' }}>Delete</Button>
            </div>
          </TremorCard>
        ))}
      </div>
    </div>
  );
};

export default Wallets;
