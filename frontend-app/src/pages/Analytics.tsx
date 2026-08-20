import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardBody } from '../components';
import api from '../services/api';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  transactionDate: string;
  walletId: string;
  categoryId: string;
}

interface TransactionPage {
  content: Transaction[];
}

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get<TransactionPage | Transaction[]>('/transactions', { params: { size: 100 } });
      setTransactions(Array.isArray(response.data) ? response.data : response.data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const categoryData = [
    { name: 'Expenses', value: transactions.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0), color: '#FF6B6B' },
    { name: 'Income', value: transactions.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0), color: '#4ECDC4' },
  ];

  const trendData = transactions.slice(0, 6).map((item, index) => ({
    month: `T${index + 1}`,
    spending: Math.abs(item.amount),
    budget: 4000,
  }));

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const totalSpending = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <div className="mb-8"><div className="eyebrow">Patterns and insights</div><h1 className="page-title">Analytics</h1><p className="page-subtitle">See where your money is going and how your habits change over time.</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <h3 className="section-title">Spending by Category</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Total Spending: <span className="font-bold text-gray-900">${totalSpending}</span></p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="section-title">Spending Trend</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="spending" stroke="#FF6B6B" name="Actual Spending" strokeWidth={2} />
                <Line type="monotone" dataKey="budget" stroke="#4ECDC4" name="Budget" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader>
          <h3 className="section-title">Category Breakdown</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {categoryData.map((item) => {
              const percentage = totalSpending > 0 ? (item.value / totalSpending) * 100 : 0;
              return (
                <div key={item.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900">${item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
