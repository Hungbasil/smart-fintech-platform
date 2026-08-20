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

interface Category {
  id: string;
  name: string;
  type: string;
}

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [transactionResponse, categoryResponse] = await Promise.all([
        api.get<TransactionPage | Transaction[]>('/transactions', { params: { size: 100 } }),
        api.get<Category[]>('/categories'),
      ]);
      setTransactions(Array.isArray(transactionResponse.data) ? transactionResponse.data : transactionResponse.data.content);
      setCategories(categoryResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = categories.filter((category) => category.type.toUpperCase() === 'EXPENSE');
  const palette = ['#087f74', '#d76756', '#bd7a22', '#4c8d9a', '#8c6f56', '#6b7c70'];
  const categoryData = expenseCategories.map((category, index) => ({
    name: category.name,
    value: transactions.filter((transaction) => transaction.categoryId === category.id).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0),
    color: palette[index % palette.length],
  })).filter((category) => category.value > 0);

  const trendData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const spending = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.transactionDate);
      const category = categories.find((item) => item.id === transaction.categoryId);
      return category?.type.toUpperCase() === 'EXPENSE' && transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear();
    }).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    return { month: date.toLocaleDateString('en-US', { month: 'short' }), spending };
  });

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
            <div className="mt-4 border-t border-[#e3ebe8] pt-4">
              <p className="text-sm text-[#71808c]">Total spending: <span className="font-extrabold text-[#17212b]">${totalSpending.toLocaleString()}</span></p>
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
                <Line type="monotone" dataKey="spending" stroke="#087f74" name="Spending" strokeWidth={2} />
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
                    <span className="text-sm font-bold text-[#71808c]">{item.name}</span>
                    <span className="text-sm font-extrabold text-[#17212b]">${item.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#edf2f0]">
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
