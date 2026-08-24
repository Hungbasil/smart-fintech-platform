import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CircleDollarSign, ReceiptText, WalletCards } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card as UiCard, CardHeader, CardBody } from '../components';
import api, { getAnalyticsMonthly, getAnalyticsSummary } from '../services/api';
import auth from '../services/auth';
import { currency } from '../services/format';

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
}

interface DashboardData {
  totalBalance: number;
  monthlyTransactions: number;
  monthlyVolume: number;
}

interface TransactionPage {
  content: Transaction[];
  totalElements: number;
}

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const [walletsResponse, transactionsResponse, summaryResponse, monthlyResponse] = await Promise.all([
        api.get<Wallet[]>('/wallets'),
        api.get<TransactionPage | Transaction[]>('/transactions', { params: { size: 50 } }),
        getAnalyticsSummary({ fromDate: monthStart, toDate: nextMonthStart }),
        getAnalyticsMonthly(),
      ]);

      const wallets = walletsResponse.data;
      const transactionData = transactionsResponse.data;
      const loadedTransactions = Array.isArray(transactionData) ? transactionData : transactionData.content;
      const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      setTransactions(loadedTransactions);
      setMonthlyData(monthlyResponse.data);
      setData({
        totalBalance,
        monthlyTransactions: summaryResponse.data.transactionCount,
        monthlyVolume: summaryResponse.data.income + summaryResponse.data.expense,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartData = monthlyData.map((item) => ({ ...item, expenses: item.expense }));

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div><h1 className="page-title">Good morning, {auth.getUser()?.fullName?.split(' ')[0] || 'there'}</h1><p className="page-subtitle">Here is your financial snapshot for this month.</p></div>
        <Link to="/transactions" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-[#075c57]"><ArrowUpRight size={17} />Add transaction</Link>
      </div>

      <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total balance', value: currency.format(data?.totalBalance ?? 0), detail: 'Across all wallets', icon: WalletCards, tone: 'teal' },
          { label: 'Monthly activity', value: `${data?.monthlyTransactions ?? 0}`, detail: 'Transactions this month', icon: ReceiptText, tone: 'amber' },
          { label: 'Monthly volume', value: currency.format(data?.monthlyVolume ?? 0), detail: 'Tracked financial activity', icon: CircleDollarSign, tone: 'coral' },
        ].map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="surface surface-pad group transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-6 flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'teal' ? 'bg-[#e4f4f0] text-[#087f74]' : tone === 'amber' ? 'bg-[#fff4df] text-[#bd7a22]' : 'bg-[#fff1ef] text-[#d76756]'}`}><Icon size={19} /></span><ArrowUpRight size={16} className="text-[#c0cbc7] transition group-hover:text-[#087f74]" /></div>
            <div className="mb-1 text-[12px] font-bold text-[#71808c]">{label}</div><div className="metric-value">{value}</div><div className="mt-2 text-[12px] text-[#9aa7af]">{detail}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <UiCard>
          <CardHeader><div className="flex items-start justify-between"><div><h3 className="section-title">Activity overview</h3><p className="section-caption mt-1">Transaction volume across the last six months</p></div><span className="rounded-lg bg-[#e4f4f0] px-2.5 py-1 text-[11px] font-bold text-[#087f74]">Live data</span></div></CardHeader>
          <CardBody><ResponsiveContainer width="100%" height={285}><BarChart data={chartData} barSize={12} barGap={5}><CartesianGrid vertical={false} stroke="#e8efec" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9aa7af', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa7af', fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip cursor={{ fill: '#f4f7f6' }} formatter={(value, name) => [currency.format(Number(value)), name === 'income' ? 'Income' : 'Expenses']} contentStyle={{ border: '1px solid #e3ebe8', borderRadius: 10, boxShadow: '0 8px 20px rgba(23,33,43,.08)' }} /><Bar dataKey="income" fill="#087f74" radius={[6, 6, 2, 2]} /><Bar dataKey="expenses" fill="#d76756" radius={[6, 6, 2, 2]} /></BarChart></ResponsiveContainer></CardBody>
        </UiCard>
        <UiCard>
          <CardHeader><div><h3 className="section-title">Recent transactions</h3><p className="section-caption mt-1">Your latest financial activity</p></div></CardHeader>
          <CardBody><div className="divide-y divide-[#edf2f0]">{transactions.slice(0, 5).map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate text-[13px] font-bold text-[#17212b]">{transaction.description || 'Untitled transaction'}</p><p className="mt-0.5 text-[11px] text-[#9aa7af]">{new Date(transaction.transactionDate).toLocaleDateString()}</p></div><span className="shrink-0 text-[13px] font-extrabold text-[#71808c]">{currency.format(Math.abs(transaction.amount))}</span></div>)}{transactions.length === 0 && <div className="py-10 text-center text-sm text-[#9aa7af]">No transactions yet.</div>}</div></CardBody>
        </UiCard>
      </div>
    </div>
  );
};
