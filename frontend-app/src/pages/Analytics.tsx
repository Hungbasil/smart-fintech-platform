import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardBody } from '../components';
import api from '../services/api';
import { currency } from '../services/format';

interface AnalyticsSummary {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  color?: string;
}

interface MonthlyAnalytics {
  month: string;
  income: number;
  expense: number;
}

const palette = ['#087f74', '#d76756', '#bd7a22', '#4c8d9a', '#8c6f56', '#6b7c70'];

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryBreakdown[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [summaryResponse, categoryResponse, monthlyResponse] = await Promise.all([
          api.get<AnalyticsSummary>('/analytics/summary'),
          api.get<CategoryBreakdown[]>('/analytics/categories'),
          api.get<MonthlyAnalytics[]>('/analytics/monthly'),
        ]);
        setSummary(summaryResponse.data);
        setCategoryData(categoryResponse.data.map((item, index) => ({ ...item, color: palette[index % palette.length] })));
        setMonthlyData(monthlyResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="mb-8"><div className="eyebrow">Patterns and insights</div><h1 className="page-title">Analytics</h1><p className="page-subtitle">Aggregated directly by PostgreSQL for the complete transaction history.</p></div>

      <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total income', value: summary?.income ?? 0, color: 'text-[#087f74]' },
          { label: 'Total spending', value: summary?.expense ?? 0, color: 'text-[#d76756]' },
          { label: 'Net cash flow', value: summary?.net ?? 0, color: 'text-[#bd7a22]' },
        ].map((metric) => (
          <div key={metric.label} className="surface surface-pad">
            <div className="mb-2 text-[12px] font-bold text-[#71808c]">{metric.label}</div>
            <div className={`metric-value ${metric.color}`}>{currency.format(metric.value)}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader><h3 className="section-title">Spending by Category</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} outerRadius={80} dataKey="amount" nameKey="category">
                  {categoryData.map((entry) => <Cell key={entry.category} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => currency.format(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 border-t border-[#e3ebe8] pt-4"><p className="text-sm text-[#71808c]">Total spending: <span className="font-extrabold text-[#17212b]">{currency.format(summary?.expense ?? 0)}</span></p></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="section-title">Income and Spending Trend</h3></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => currency.format(Number(value))} /><Legend />
                <Line type="monotone" dataKey="income" stroke="#087f74" name="Income" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" stroke="#d76756" name="Expenses" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader><h3 className="section-title">Category Breakdown</h3></CardHeader>
        <CardBody>
          <div className="space-y-3">{categoryData.map((item) => {
            const percentage = (summary?.expense ?? 0) > 0 ? (item.amount / (summary?.expense ?? 1)) * 100 : 0;
            return <div key={item.category}><div className="mb-1 flex justify-between"><span className="text-sm font-bold text-[#71808c]">{item.category}</span><span className="text-sm font-extrabold text-[#17212b]">{currency.format(item.amount)}</span></div><div className="h-2 w-full rounded-full bg-[#edf2f0]"><div className="h-2 rounded-full" style={{ width: `${percentage}%`, backgroundColor: item.color }} /></div></div>;
          })}</div>
        </CardBody>
      </Card>
    </div>
  );
};
