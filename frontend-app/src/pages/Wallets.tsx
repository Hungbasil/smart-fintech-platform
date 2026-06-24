import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Button } from '../components';
import api from '../services/api';

interface Wallet {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type: 'savings' | 'checking' | 'investment';
}

export const Wallets: React.FC = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      // const response = await api.get('/wallets');
      // setWallets(response.data);

      // Mock data for now
      setWallets([
        { id: '1', name: 'Main Checking', balance: 10000, currency: 'USD', type: 'checking' },
        { id: '2', name: 'Savings Account', balance: 25000, currency: 'USD', type: 'savings' },
        { id: '3', name: 'Investment Portfolio', balance: 50000, currency: 'USD', type: 'investment' },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch wallets');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'savings':
        return '💰';
      case 'checking':
        return '🏦';
      case 'investment':
        return '📈';
      default:
        return '💳';
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Wallets</h1>

      {/* Total Balance Card */}
      <Card className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800">
        <CardBody>
          <p className="text-white text-sm font-medium mb-2">Total Balance</p>
          <p className="text-white text-4xl font-bold">${totalBalance.toLocaleString()}</p>
        </CardBody>
      </Card>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => (
          <Card key={wallet.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getTypeIcon(wallet.type)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{wallet.type}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-2xl font-bold text-gray-900 mb-4">
                ${wallet.balance.toLocaleString()} {wallet.currency}
              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm">Transfer</Button>
                <Button variant="secondary" size="sm">Details</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};
