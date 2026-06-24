import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardBody } from '../components';
import api from '../services/api';

export const Analytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categoryData = [
    { name: 'Food', value: 400, color: '#FF6B6B' },
    { name: 'Transport', value: 300, color: '#4ECDC4' },
    { name: 'Entertainment', value: 200, color: '#45B7D1' },
    { name: 'Utilities', value: 150, color: '#FFA07A' },
    { name: 'Other', value: 100, color: '#98D8C8' },
  ];

  const trendData = [
    { month: 'Jan', spending: 3500, budget: 4000 },
    { month: 'Feb', spending: 3200, budget: 4000 },
    { month: 'Mar', spending: 3800, budget: 4000 },
    { month: 'Apr', spending: 3100, budget: 4000 },
    { month: 'May', spending: 3600, budget: 4000 },
    { month: 'Jun', spending: 3400, budget: 4000 },
  ];

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Replace with your actual API endpoint
      // const response = await api.get('/analytics');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  const totalSpending = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Spending by Category */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Spending by Category</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

        {/* Spending Trend */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Spending Trend</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="spending"
                  stroke="#FF6B6B"
                  name="Actual Spending"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="budget"
                  stroke="#4ECDC4"
                  name="Budget"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="mt-8">
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">Category Breakdown</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {categoryData.map((item) => {
              const percentage = (item.value / totalSpending) * 100;
              return (
                <div key={item.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900">${item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${percentage}%`, backgroundColor: item.color }}
                    />
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
