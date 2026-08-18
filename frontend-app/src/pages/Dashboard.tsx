import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card as UiCard, CardHeader, CardBody } from '../components';
import api from '../services/api';
import { Card as TremorCard, Title, Metric, Text } from '@tremor/react';

interface Wallet {
  id: string;
  name: string;
  balance: number;
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  walletId: string;
  categoryId: string;
}

interface DashboardData {
  totalBalance: number;
  monthlyTransactions: number;
  savingsGoal: number;
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [walletsResponse, transactionsResponse] = await Promise.all([
        api.get<Wallet[]>('/wallets'),
        api.get<Transaction[]>('/transactions'),
      ]);

      const wallets = walletsResponse.data;
      const transactions = transactionsResponse.data;
      const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      setData({
        totalBalance,
        monthlyTransactions: transactions.length,
        savingsGoal: 50000,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { month: 'Jan', income: 4000, expenses: 2400 },
    { month: 'Feb', income: 3000, expenses: 1398 },
    { month: 'Mar', income: 2000, expenses: 9800 },
    { month: 'Apr', income: 2780, expenses: 3908 },
    { month: 'May', income: 1890, expenses: 4800 },
    { month: 'Jun', income: 2390, expenses: 3800 },
  ];

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <TremorCard>
          <Title>Total Balance</Title>
          <Metric>${data?.totalBalance.toLocaleString()}</Metric>
          <Text className="mt-2">Combined balance across wallets</Text>
        </TremorCard>

        <TremorCard>
          <Title>Monthly Transactions</Title>
          <Metric>{data?.monthlyTransactions}</Metric>
          <Text className="mt-2">Transactions this month</Text>
        </TremorCard>

        <TremorCard>
          <Title>Savings Goal</Title>
          <Metric>${data?.savingsGoal.toLocaleString()}</Metric>
          <Text className="mt-2">Progress towards goal</Text>
        </TremorCard>
      </div>

      <UiCard>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Income vs Expenses</h3>
        </CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="income" fill="#8884d8" />
              <Bar dataKey="expenses" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </UiCard>
    </div>
  );
};
