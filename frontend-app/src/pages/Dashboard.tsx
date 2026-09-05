import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarClock, CircleDollarSign, Flag, HandCoins, ReceiptText, Target, WalletCards } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card as UiCard, CardHeader, CardBody, SkeletonCard, Skeleton, AnimatedCounter } from '../components';
import api, { getAnalyticsMonthly, getAnalyticsSummary, getBudgets, getDebts, getSavingGoals } from '../services/api';
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
  type?: string;
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

interface DashboardBudget { id: string; categoryName: string; percentage: number; totalSpent: number; budgetAmount: number; }
interface DashboardDebt { id: string; counterpartyName: string; amount: number; type: 'LEND' | 'BORROW'; status: string; dueDate: string | null; }
interface DashboardGoal { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string | null; }
interface DashboardRecurring { id: string; description: string; dayOfMonth: number; amount: number; active: boolean; }

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ month: string; income: number; expense: number }[]>([]);
  const [budgets, setBudgets] = useState<DashboardBudget[]>([]);
  const [debts, setDebts] = useState<DashboardDebt[]>([]);
  const [savingGoals, setSavingGoals] = useState<DashboardGoal[]>([]);
  const [recurring, setRecurring] = useState<DashboardRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const toLocalDateTime = (date: Date) => {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      };
      const monthStart = toLocalDateTime(new Date(now.getFullYear(), now.getMonth(), 1));
      const nextMonthStart = toLocalDateTime(new Date(now.getFullYear(), now.getMonth() + 1, 1));
      const [walletsResponse, transactionsResponse, summaryResponse, monthlyResponse, budgetsResponse, debtsResponse, goalsResponse, recurringResponse] = await Promise.all([
        api.get<Wallet[]>('/wallets'),
        api.get<TransactionPage | Transaction[]>('/transactions', { params: { size: 50 } }),
        getAnalyticsSummary({ fromDate: monthStart, toDate: nextMonthStart }),
        getAnalyticsMonthly(),
        getBudgets(),
        getDebts(),
        getSavingGoals(),
        api.get<DashboardRecurring[]>('/recurring-transactions'),
      ]);

      const wallets = walletsResponse.data;
      const transactionData = transactionsResponse.data;
      const loadedTransactions = Array.isArray(transactionData) ? transactionData : transactionData.content;
      const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

      setTransactions(loadedTransactions);
      setMonthlyData(monthlyResponse.data);
      setBudgets(budgetsResponse.data as DashboardBudget[]);
      setDebts(debtsResponse.data);
      setSavingGoals(goalsResponse.data);
      setRecurring(recurringResponse.data);
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
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const upcomingDate = new Date(today);
  upcomingDate.setDate(today.getDate() + 7);
  const upcomingKey = upcomingDate.toISOString().slice(0, 10);
  const dueDebts = debts.filter((debt) => debt.status === 'PENDING' && debt.dueDate && debt.dueDate <= upcomingKey);
  const nearGoals = savingGoals.filter((goal) => goal.deadline && goal.deadline <= upcomingKey && goal.currentAmount < goal.targetAmount);
  const budgetWarnings = budgets.filter((budget) => budget.percentage >= 80);
  const recurringSoon = recurring.filter((item) => item.active && (item.dayOfMonth === today.getDate() || item.dayOfMonth === today.getDate() + 1));
  const focusItems = [
    ...budgetWarnings.slice(0, 2).map((budget) => ({ icon: Target, tone: budget.percentage > 100 ? 'coral' : 'amber', title: budget.percentage > 100 ? `${budget.categoryName} is over budget` : `${budget.categoryName} is near its limit`, detail: `${budget.percentage.toFixed(0)}% used`, to: '/budgets' })),
    ...dueDebts.slice(0, 2).map((debt) => ({ icon: HandCoins, tone: 'coral', title: `${debt.type === 'BORROW' ? 'Pay' : 'Collect'} ${debt.counterpartyName}`, detail: debt.dueDate === todayKey ? 'Due today' : `Due ${new Date(`${debt.dueDate}T00:00:00`).toLocaleDateString()}`, to: '/debts' })),
    ...nearGoals.slice(0, 1).map((goal) => ({ icon: Flag, tone: 'teal', title: `${goal.name} needs attention`, detail: `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% funded`, to: '/saving-goals' })),
    ...recurringSoon.slice(0, 1).map((item) => ({ icon: CalendarClock, tone: 'teal', title: `${item.description} is coming up`, detail: item.dayOfMonth === today.getDate() ? 'Scheduled today' : 'Scheduled tomorrow', to: '/recurring' })),
  ].slice(0, 4);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <Skeleton height={24} width="30%" className="mb-2" />
          <Skeleton height={32} width="40%" className="mb-2" />
          <Skeleton height={16} width="50%" />
        </div>
        <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="surface p-6 rounded-2xl">
              <Skeleton height={20} width="60%" className="mb-6" />
              <Skeleton height={32} width="100%" className="mb-3" />
              <Skeleton height={14} width="80%" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
          <SkeletonCard count={1} />
          <SkeletonCard count={1} />
        </div>
      </div>
    );
  }
  
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><div className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div><h1 className="page-title">Good morning, {auth.getUser()?.fullName?.split(' ')[0] || 'there'}</h1><p className="page-subtitle">Here is your financial snapshot for this month.</p></div>
        <Link to="/transactions" className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#087f74] px-4 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition hover:bg-[#075c57]"><ArrowUpRight size={17} />Add transaction</Link>
      </div>

      <div data-tour="dashboard-summary" className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Total balance', value: data?.totalBalance ?? 0, valueType: 'currency', detail: 'Across all wallets', icon: WalletCards, tone: 'teal' },
          { label: 'Monthly activity', value: data?.monthlyTransactions ?? 0, valueType: 'number', detail: 'Transactions this month', icon: ReceiptText, tone: 'amber' },
          { label: 'Monthly volume', value: data?.monthlyVolume ?? 0, valueType: 'currency', detail: 'Tracked financial activity', icon: CircleDollarSign, tone: 'coral' },
        ].map(({ label, value, valueType, detail, icon: Icon, tone }) => (
          <div key={label} className="surface surface-pad group transition hover:-translate-y-0.5 hover:shadow-md animate-fade-in">
            <div className="mb-6 flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'teal' ? 'bg-[#e4f4f0] text-[#087f74]' : tone === 'amber' ? 'bg-[#fff4df] text-[#bd7a22]' : 'bg-[#fff1ef] text-[#d76756]'}`}><Icon size={19} /></span><ArrowUpRight size={16} className="text-[#c0cbc7] transition group-hover:text-[#087f74]" /></div>
            <div className="mb-1 text-[12px] font-bold text-[#71808c]">{label}</div>
            <div className="metric-value">
              {valueType === 'currency' ? (
                <span>₫</span>
              ) : null}
              <AnimatedCounter 
                end={value} 
                duration={1800}
                decimals={0}
                className="metric-value"
              />
            </div>
            <div className="mt-2 text-[12px] text-[#9aa7af]">{detail}</div>
          </div>
        ))}
      </div>

      <section className="mb-7" aria-labelledby="today-focus-title">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="today-focus-title" className="section-title">Today&apos;s focus</h2><p className="section-caption mt-1">A short list of money tasks worth your attention.</p></div>{focusItems.length > 0 && <span className="rounded-lg bg-[#e4f4f0] px-2.5 py-1 text-[11px] font-bold text-[#087f74]">{focusItems.length} to review</span>}</div>
        {focusItems.length > 0 ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{focusItems.map(({ icon: Icon, tone, title, detail, to }) => <Link key={`${title}-${detail}`} to={to} className="group surface flex items-start gap-3 p-4 no-underline transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'coral' ? 'bg-[#fff1ef] text-[#d76756]' : tone === 'amber' ? 'bg-[#fff4df] text-[#bd7a22]' : 'bg-[#e4f4f0] text-[#087f74]'}`}><Icon size={17} /></span><span className="min-w-0"><strong className="block truncate text-[13px] font-extrabold text-[#17212b] group-hover:text-[#087f74]">{title}</strong><span className="mt-1 block text-[11px] text-[#9aa7af]">{detail}</span></span><ArrowUpRight size={15} className="ml-auto shrink-0 text-[#c0cbc7] group-hover:text-[#087f74]" /></Link>)}</div> : <div className="surface flex items-center gap-3 p-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e4f4f0] text-[#087f74]"><Flag size={17} /></span><div><p className="text-sm font-bold text-[#17212b]">You&apos;re all caught up</p><p className="text-xs text-[#9aa7af]">No urgent budget, debt, goal or recurring tasks in the next seven days.</p></div></div>}
      </section>

      <div data-tour="dashboard-activity" className="grid grid-cols-1 gap-5 xl:grid-cols-[1.35fr_1fr]">
        <UiCard>
          <CardHeader><div className="flex items-start justify-between"><div><h3 className="section-title">Activity overview</h3><p className="section-caption mt-1">Transaction volume across the last six months</p></div><span className="rounded-lg bg-[#e4f4f0] px-2.5 py-1 text-[11px] font-bold text-[#087f74]">Live data</span></div></CardHeader>
          <CardBody><div className="animate-fade-in"><ResponsiveContainer width="100%" height={285}><BarChart data={chartData} barSize={12} barGap={5}><CartesianGrid vertical={false} stroke="#e8efec" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9aa7af', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#9aa7af', fontSize: 11 }} tickFormatter={(value) => `${Number(value) / 1000}k`} /><Tooltip cursor={{ fill: '#f4f7f6' }} formatter={(value, name) => [currency.format(Number(value)), name === 'income' ? 'Income' : 'Expenses']} contentStyle={{ border: '1px solid #e3ebe8', borderRadius: 10, boxShadow: '0 8px 20px rgba(23,33,43,.08)' }} /><Bar dataKey="income" fill="#087f74" radius={[6, 6, 2, 2]} /><Bar dataKey="expenses" fill="#d76756" radius={[6, 6, 2, 2]} /></BarChart></ResponsiveContainer></div></CardBody>
        </UiCard>
        <UiCard>
          <CardHeader><div><h3 className="section-title">Recent transactions</h3><p className="section-caption mt-1">Your latest financial activity</p></div></CardHeader>
          <CardBody><div className="divide-y divide-[#edf2f0]">{transactions.slice(0, 5).map((transaction) => {
            const normalizedType = (transaction.type || 'EXPENSE').toUpperCase();
            const isIncome = normalizedType === 'INCOME';
            return (
              <div key={transaction.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#17212b]">{transaction.description || 'Untitled transaction'}</p>
                  <p className="mt-0.5 text-[11px] text-[#9aa7af]">{new Date(transaction.transactionDate).toLocaleDateString()}</p>
                </div>
                <span className={`shrink-0 text-[13px] font-extrabold ${isIncome ? 'text-[#087f74]' : 'text-[#d76756]'}`}>
                  {isIncome ? '+' : '-'}{currency.format(Math.abs(transaction.amount))}
                </span>
              </div>
            );
          })}{transactions.length === 0 && <div className="py-10 text-center text-sm text-[#9aa7af]">No transactions yet.</div>}</div></CardBody>
        </UiCard>
      </div>
    </div>
  );
};
