import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Bell,
  BarChart3,
  Wallet as WalletIcon,
  TrendingUp,
  Activity,
  PieChart as PieChartIcon,
  ShieldCheck,
  Search,
  ArrowUpRight,
  Users,
  LogOut,
  Gauge,
  CreditCard,
  ReceiptText,
  Landmark,
  Settings2,
  Download,
  X,
  Trash2,
} from 'lucide-react';
import { UserTable } from '../components/UserTable';
import { Button } from '../components/Button';
import auth from '../services/auth';
import { toast } from '../services/notifications';
import {
  getAdminOverview,
  getAdminTransactionAnalytics,
  getAdminUserAnalytics,
  getAdminFinancialHealth,
  getAdminUsers,
  getWallets,
  getTransactions,
  createWallet,
  deleteTransaction,
  transferFunds,
  freezeAdminWallet,
  unfreezeAdminWallet,
  deleteAdminWallet,
} from '../services/api';
import type {
  AdminOverviewDTO,
  AdminTransactionAnalyticsDTO,
  AdminUserAnalyticsDTO,
  AdminFinancialHealthDTO,
  UserDTO,
  Wallet as WalletType,
} from '../services/api';

const formatMoney = (value: number | undefined | null) => `₫${(value ?? 0).toLocaleString('en-US')}`;

const tabs = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'transactions', label: 'Transactions', icon: ReceiptText },
  { key: 'wallets', label: 'Wallets', icon: Landmark },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'reports', label: 'Reports', icon: TrendingUp },
  { key: 'activity', label: 'Activity', icon: Activity },
  { key: 'health', label: 'Health', icon: ShieldCheck },
] as const;

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewDTO | null>(null);
  const [transactionAnalytics, setTransactionAnalytics] = useState<AdminTransactionAnalyticsDTO | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<AdminUserAnalyticsDTO | null>(null);
  const [financialHealth, setFinancialHealth] = useState<AdminFinancialHealthDTO | null>(null);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [wallets, setWallets] = useState<Array<WalletType & { frozen?: boolean }>>([]);
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    transactionDate?: string;
    walletId?: string;
    categoryId?: string;
    userName?: string | null;
    userEmail?: string | null;
  }>>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [transactionsPage, setTransactionsPage] = useState(0);
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showWalletForm, setShowWalletForm] = useState(false);
  const [walletForm, setWalletForm] = useState({ name: '', balance: '0' });
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferForm, setTransferForm] = useState({
    fromWalletId: '',
    toWalletId: '',
    amount: '100000',
    description: 'Admin transfer',
  });
  const [walletsPage, setWalletsPage] = useState(0);
  const [walletsPerPage] = useState(10);
  const [walletToFreeze, setWalletToFreeze] = useState<{ id: string; name: string; frozen: boolean } | null>(null);
  const [walletToDelete, setWalletToDelete] = useState<{ id: string; name: string } | null>(null);
  const [actioningWalletId, setActioningWalletId] = useState<string | null>(null);

  const handleLogout = () => {
    auth.logout();
    toast.success('Logged out successfully');
    navigate('/admin/login', { replace: true });
  };

  const handleQuickCreateWallet = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!walletForm.name.trim()) {
      toast.error('Wallet name is required');
      return;
    }

    try {
      await createWallet({
        name: walletForm.name.trim(),
        balance: Number(walletForm.balance || 0),
      });
      toast.success('Wallet created successfully');
      setWalletForm({ name: '', balance: '0' });
      setShowWalletForm(false);
      await loadData();
    } catch (error) {
      toast.error('Failed to create wallet');
      console.error(error);
    }
  };

  const handleQuickTransfer = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (wallets.length < 2) {
      toast.error('Need at least 2 wallets to transfer funds');
      return;
    }

    if (!transferForm.fromWalletId || !transferForm.toWalletId || !transferForm.amount || !transferForm.description.trim()) {
      toast.error('Please complete all transfer fields');
      return;
    }

    try {
      await transferFunds({
        fromWalletId: transferForm.fromWalletId,
        toWalletId: transferForm.toWalletId,
        amount: Number(transferForm.amount),
        description: transferForm.description.trim(),
        transactionDate: new Date().toISOString(),
      });
      toast.success('Transfer executed successfully');
      setTransferForm({
        fromWalletId: wallets[0]?.id ?? '',
        toWalletId: wallets[1]?.id ?? wallets[0]?.id ?? '',
        amount: '100000',
        description: 'Admin transfer',
      });
      setShowTransferForm(false);
      await loadData();
    } catch (error) {
      toast.error('Failed to execute transfer');
      console.error(error);
    }
  };

  const handleFreezeWallet = async (walletId: string, walletName: string, isFrozen: boolean) => {
    setWalletToFreeze({ id: walletId, name: walletName, frozen: isFrozen });
  };

  const confirmFreezeWallet = async () => {
    if (!walletToFreeze) return;

    try {
      setActioningWalletId(walletToFreeze.id);
      if (walletToFreeze.frozen) {
        await unfreezeAdminWallet(walletToFreeze.id);
        toast.success(`${walletToFreeze.name} unfrozen successfully`);
      } else {
        await freezeAdminWallet(walletToFreeze.id);
        toast.success(`${walletToFreeze.name} frozen successfully`);
      }
      setWalletToFreeze(null);
      await loadData();
    } catch (error) {
      toast.error('Failed to update wallet status');
      console.error(error);
    } finally {
      setActioningWalletId(null);
    }
  };

  const handleDeleteWalletClick = (walletId: string, walletName: string) => {
    setWalletToDelete({ id: walletId, name: walletName });
  };

  const confirmDeleteWallet = async () => {
    if (!walletToDelete) return;

    try {
      setActioningWalletId(walletToDelete.id);
      await deleteAdminWallet(walletToDelete.id);
      toast.success('Wallet deleted successfully');
      setWalletToDelete(null);
      await loadData();
    } catch (error) {
      toast.error('Failed to delete wallet');
      console.error(error);
    } finally {
      setActioningWalletId(null);
    }
  };

  const handleExportCsv = () => {
    const rows = [
      ['Type', 'Description', 'Amount', 'Date'],
      ...transactions.map((item) => [
        item.type,
        item.description,
        String(item.amount ?? 0),
        item.transactionDate ?? new Date().toISOString(),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'admin-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleDeleteTransaction = async (transactionId: string, title: string) => {
    if (!window.confirm(`Delete transaction "${title}"?`)) return;

    try {
      await deleteTransaction(transactionId);
      toast.success('Transaction deleted');
      await loadData();
    } catch (error) {
      toast.error('Failed to delete transaction');
      console.error(error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [overviewData, transData, userData, healthData, usersData, walletsData, transactionsData] = await Promise.all([
        getAdminOverview(),
        getAdminTransactionAnalytics({ from: dateFrom || undefined, to: dateTo || undefined }),
        getAdminUserAnalytics(),
        getAdminFinancialHealth(),
        getAdminUsers(usersPage, 10, usersSearch || undefined),
        getWallets(),
        getTransactions(transactionsPage, 10),
      ]);

      setOverview(overviewData.data);
      setTransactionAnalytics(transData.data);
      setUserAnalytics(userData.data);
      setFinancialHealth(healthData.data);
      setUsers(usersData.data.content);
      setWallets((walletsData.data ?? []).map((wallet) => ({ ...wallet, frozen: Boolean((wallet as any).frozen) })));
      setTransactions((transactionsData.data.content ?? []).map((item) => ({
        ...item,
      })));
      setTransactionsTotalPages(Math.max(1, transactionsData.data.totalPages ?? 1));
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [usersPage, usersSearch, transactionsPage, dateFrom, dateTo]);

  useEffect(() => {
    if (!wallets.length) return;

    setTransferForm((current) => ({
      ...current,
      fromWalletId: current.fromWalletId || wallets[0].id,
      toWalletId: current.toWalletId || wallets[1]?.id || wallets[0].id,
    }));
  }, [wallets]);

  const categoryChartData = transactionAnalytics
    ? Object.entries(transactionAnalytics.categorySpending || {}).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : [];

  const walletChartData = transactionAnalytics
    ? Object.entries(transactionAnalytics.walletSpending || {}).map(([name, value]) => ({
        name,
        value: Number(value),
      }))
    : [];

  const userRegistrationData = userAnalytics
    ? Object.entries(userAnalytics.dailyUserRegistration || {}).map(([date, count]) => ({
        date,
        users: Number(count),
      }))
    : [];

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#f87171'];

  const selectedPeriodTransactionCount = transactionAnalytics?.totalTransactionCount ?? overview?.totalTransactions ?? 0;
  const selectedPeriodSpend = transactionAnalytics
    ? Object.values(transactionAnalytics.categorySpending ?? {}).reduce(
        (sum, value) => sum + Number(value ?? 0),
        0
      )
    : overview?.monthlySpent ?? 0;

  const metricCards = overview
    ? [
        { label: 'Total Users', value: overview.totalUsers, icon: Users, tone: 'cyan' },
        { label: 'Wallets', value: overview.totalWallets, icon: WalletIcon, tone: 'indigo' },
        { label: 'Transactions', value: overview.totalTransactions, icon: Activity, tone: 'violet' },
        { label: 'Total Balance', value: formatMoney(overview.totalBalance), icon: TrendingUp, tone: 'emerald' },
      ]
    : [];

  const healthCards = financialHealth
    ? [
        { label: 'Total Borrowed', value: formatMoney(financialHealth.totalBorrowed), icon: CreditCard, tone: 'rose' },
        { label: 'Total Lent', value: formatMoney(financialHealth.totalLent), icon: TrendingUp, tone: 'emerald' },
        { label: 'Pending Debts', value: financialHealth.pendingDebtsCount, icon: Gauge, tone: 'amber' },
        { label: 'Saving Goals', value: financialHealth.activeSavingGoals, icon: PieChartIcon, tone: 'pink' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.08),_transparent_28%),linear-gradient(180deg,#f4f8fb_0%,#eef2f7_100%)] text-slate-800">
      <div className="mx-auto flex max-w-[1700px] gap-5 p-3">
        <aside className="hidden w-[360px] shrink-0 rounded-[24px] border border-slate-200/80 bg-[#edf5f9] p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] lg:flex lg:flex-col">
          <div className="flex items-center gap-3 rounded-[18px] border border-slate-200/80 bg-[#f9fcff] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[16px] border border-sky-200 bg-[#dff6ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <img src="/Logo.png" alt="SmartFin" className="h-10 w-10 object-cover" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-700">Admin</span>
            </div>
            <div className="text-[22px] font-black tracking-[-0.06em] text-slate-900">SmartFin</div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Online
            </span>
          </div>

          <h3 className="mt-3 text-[28px] font-bold leading-tight tracking-[-0.06em] text-slate-900">Operations healthy</h3>

          <nav className="mt-5 space-y-2">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => {
                  setActiveTab(key);
                  setUsersPage(0);
                }}
                className={`flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left text-[17px] font-medium transition-all duration-200 ${
                  activeTab === key
                    ? 'bg-[#0f172a] text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]'
                    : 'text-slate-600 hover:bg-sky-50 hover:text-slate-900'
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full ${
                    activeTab === key ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Icon size={16} />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 bg-transparent">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.04)] backdrop-blur-sm sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">Admin dashboard</p>
                <h2 className="mt-2 text-[2rem] font-black leading-[1.08] tracking-[-0.06em] text-slate-900 sm:text-[2.3rem]">Operations overview</h2>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 hover:shadow-[0_8px_18px_rgba(29,78,216,0.12)]">
                  <Bell size={18} />
                </button>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_8px_18px_rgba(29,78,216,0.12)]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0f172a] via-[#1d4ed8] to-[#4ade80] font-bold text-white">A</div>
                  Admin
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300 hover:text-rose-600"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 py-6">

            {activeTab === 'overview' && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {metricCards.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(15,23,42,0.06)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">{label}</p>
                          <p className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-900">{value}</p>
                        </div>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            tone === 'cyan'
                              ? 'bg-cyan-100 text-cyan-600'
                              : tone === 'indigo'
                                ? 'bg-indigo-100 text-indigo-600'
                                : tone === 'violet'
                                  ? 'bg-violet-100 text-violet-600'
                                  : 'bg-emerald-100 text-emerald-600'
                          }`}
                        >
                          <Icon size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
                  <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.04)]">
                    <div className="mb-5 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900">Monthly income trend</h3>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        <ArrowUpRight size={14} /> +12.4%
                      </span>
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={userRegistrationData.length ? userRegistrationData : [{ date: 'N/A', users: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip
                          contentStyle={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                          }}
                        />
                        <Bar dataKey="users" radius={[10, 10, 0, 0]} fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.04)]">
                    <h3 className="mb-4 text-lg font-bold text-slate-900">Balance snapshot</h3>
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="text-sm text-emerald-700">Monthly income</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{formatMoney(overview?.monthlyIncome)}</p>
                      </div>
                      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                        <p className="text-sm text-rose-700">Monthly spent</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{formatMoney(overview?.monthlySpent)}</p>
                      </div>
                      <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                        <p className="text-sm text-sky-700">Net flow</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                          {formatMoney((overview?.monthlyIncome ?? 0) - (overview?.monthlySpent ?? 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'users' && (
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.04)] sm:p-5">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.05em] text-slate-900 sm:text-[1.7rem]">User management</h3>
                    <p className="text-sm text-slate-500">Manage access, lock accounts, and change roles.</p>
                  </div>

                  <div className="flex flex-1 justify-end gap-3">
                    <div className="relative w-full max-w-md">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        value={usersSearch}
                        onChange={(e) => {
                          setUsersSearch(e.target.value);
                          setUsersPage(0);
                        }}
                        placeholder="Search users..."
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                    </div>

                    <Button onClick={loadData} variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700">
                      Refresh
                    </Button>
                  </div>
                </div>
                <UserTable users={users} isLoading={isLoading} onRefresh={loadData} />
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    onClick={() => setUsersPage(Math.max(0, usersPage - 1))}
                    disabled={usersPage === 0}
                    variant="secondary"
                    className="border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    Previous
                  </Button>
                  <span className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700">
                    Page {usersPage + 1}
                  </span>
                  <Button onClick={() => setUsersPage(usersPage + 1)} variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700">
                    Next
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-6">
                <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
                  <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">System overview</p>
                      <h3 className="mt-2 text-[2rem] font-black leading-none tracking-[-0.06em] text-slate-900 sm:text-[2.2rem]">All transactions</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Button variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700" onClick={loadData}>Refresh</Button>
                      <Button variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700" onClick={handleExportCsv}>
                        <Download size={14} className="mr-1.5" /> Export CSV
                      </Button>
                      <Button className="bg-slate-900 text-white" onClick={() => setShowTransferForm(true)}>Create transfer</Button>
                    </div>
                  </div>

                  {showTransferForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-2xl font-black tracking-[-0.05em] text-slate-900">Create transfer</h3>
                          <button type="button" onClick={() => setShowTransferForm(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                            <X size={18} />
                          </button>
                        </div>
                        <form onSubmit={handleQuickTransfer} className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">
                              From wallet
                              <select
                                value={transferForm.fromWalletId}
                                onChange={(e) => setTransferForm((prev) => ({ ...prev, fromWalletId: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              >
                                {wallets.map((wallet) => (
                                  <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                              To wallet
                              <select
                                value={transferForm.toWalletId}
                                onChange={(e) => setTransferForm((prev) => ({ ...prev, toWalletId: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              >
                                {wallets.map((wallet) => (
                                  <option key={wallet.id} value={wallet.id}>{wallet.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                              Amount
                              <input
                                type="number"
                                min="0"
                                value={transferForm.amount}
                                onChange={(e) => setTransferForm((prev) => ({ ...prev, amount: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              />
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                              Description
                              <input
                                value={transferForm.description}
                                onChange={(e) => setTransferForm((prev) => ({ ...prev, description: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              />
                            </label>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" className="border border-slate-200 bg-white text-slate-700" onClick={() => setShowTransferForm(false)}>Cancel</Button>
                            <Button type="submit" className="bg-slate-900 text-white">Execute transfer</Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-[#eff6ff] via-[#f0f9ff] to-[#dbeafe] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(29,78,216,0.08)] sm:p-5">
                      <p className="text-[13px] font-medium text-sky-700 sm:text-sm">System total</p>
                      <p className="mt-3 text-[2.1rem] font-black leading-[1.1] tracking-[-0.06em] text-slate-900 sm:text-[2.5rem] xl:text-[2.75rem]">
                        {overview?.totalTransactions ?? 0}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-[#ecfdf5] via-[#f0fdf4] to-[#dcfce7] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(16,185,129,0.1)] sm:p-5">
                      <p className="text-[13px] font-medium text-emerald-700 sm:text-sm">Selected period</p>
                      <p className="mt-3 text-[2.1rem] font-black leading-[1.1] tracking-[-0.06em] text-slate-900 sm:text-[2.5rem] xl:text-[2.75rem]">
                        {selectedPeriodTransactionCount}
                      </p>
                    </div>
                    <div className="rounded-[24px] border border-rose-100 bg-gradient-to-br from-[#fff1f2] via-[#fff7f8] to-[#ffe4e6] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(244,63,94,0.08)] sm:p-5">
                      <p className="text-[13px] font-medium text-rose-700 sm:text-sm">Spend</p>
                      <p className="mt-3 text-[1.85rem] font-black leading-[1.1] tracking-[-0.06em] text-slate-900 sm:text-[2.25rem] xl:text-[2.6rem]">
                        {formatMoney(selectedPeriodSpend)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">Recent high-value entries</h3>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                      <Settings2 size={14} />
                      Admin permissions
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-[20px] border border-slate-200 bg-white">
                    <table className="min-w-full border-separate border-spacing-0 text-left text-[12px] sm:text-sm">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600">
                          <th className="border-b border-slate-200 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px]">Owner</th>
                          <th className="border-b border-slate-200 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px]">Date</th>
                          <th className="border-b border-slate-200 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px]">Type</th>
                          <th className="border-b border-slate-200 px-3 py-3.5 text-left text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px]">Amount</th>
                          <th className="border-b border-slate-200 px-3 py-3.5 text-right text-[11px] font-bold uppercase tracking-[0.12em] sm:text-[12px]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.length ? (
                          transactions.map((item) => (
                            <tr
                              key={item.id}
                              className="align-middle transition-colors duration-200 hover:bg-slate-50 odd:bg-white even:bg-slate-50/70"
                            >
                              <td className="border-b border-slate-200 px-3 py-3.5 align-top">
                                <div className="font-semibold text-slate-900">{item.userName || 'Unknown user'}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">{item.userEmail || 'No email'}</div>
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3.5 align-top text-slate-600">
                                {item.transactionDate ? new Date(item.transactionDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3.5 align-top">
                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] sm:text-[11px] ${
                                    item.type === 'INCOME'
                                      ? 'border-emerald-200 bg-emerald-100 text-emerald-700'
                                      : 'border-rose-200 bg-rose-100 text-rose-700'
                                  }`}
                                >
                                  {item.type}
                                </span>
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3.5 align-top">
                                <span className={`font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {item.type === 'INCOME' ? '+' : '-'}
                                  {formatMoney(Math.abs(item.amount ?? 0))}
                                </span>
                              </td>
                              <td className="border-b border-slate-200 px-3 py-3.5 text-right align-top">
                                <button
                                  type="button"
                                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 sm:text-xs"
                                  onClick={() => handleDeleteTransaction(item.id, item.description)}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                              No transaction data available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setTransactionsPage((page) => Math.max(0, page - 1))}
                      disabled={transactionsPage === 0}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner shadow-slate-100">
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Page</span>
                      <span className="rounded-xl bg-[#0f172a] px-2.5 py-1 text-sm font-bold text-white shadow-sm">
                        {transactionsPage + 1}
                      </span>
                      <span className="text-sm text-slate-500">/ {transactionsTotalPages}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTransactionsPage((page) => Math.min(transactionsTotalPages - 1, page + 1))}
                      disabled={transactionsPage >= transactionsTotalPages - 1}
                      className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all duration-200 hover:bg-slate-800 hover:shadow-[0_10px_22px_rgba(15,23,42,0.2)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'wallets' && (
              <div className="space-y-6">
                <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-violet-600">Treasury</p>
                      <h3 className="mt-1 text-[1.8rem] font-black leading-tight tracking-[-0.05em] text-slate-900 sm:text-[2.1rem]">All wallets</h3>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700" onClick={() => setShowWalletForm(true)}>Add wallet</Button>
                      <Button className="bg-slate-900 text-white" onClick={() => setShowTransferForm(true)}>Manage funds</Button>
                    </div>
                  </div>

                  {showWalletForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                          <h3 className="text-2xl font-black tracking-[-0.05em] text-slate-900">Create wallet</h3>
                          <button type="button" onClick={() => setShowWalletForm(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                            <X size={18} />
                          </button>
                        </div>
                        <form onSubmit={handleQuickCreateWallet} className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700 md:col-span-2">
                              Wallet name
                              <input
                                value={walletForm.name}
                                onChange={(e) => setWalletForm((prev) => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Main wallet"
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              />
                            </label>
                            <label className="text-sm font-medium text-slate-700 md:col-span-2">
                              Opening balance (VND)
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={walletForm.balance}
                                onChange={(e) => setWalletForm((prev) => ({ ...prev, balance: e.target.value }))}
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400"
                              />
                            </label>
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="secondary" className="border border-slate-200 bg-white text-slate-700" onClick={() => setShowWalletForm(false)}>Cancel</Button>
                            <Button type="submit" className="bg-slate-900 text-white">Create wallet</Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                      <p className="text-sm text-violet-700">Wallet count</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{wallets.length}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-700">Total balance</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{formatMoney(wallets.reduce((sum, wallet) => sum + (wallet.balance ?? 0), 0))}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <p className="text-sm text-sky-700">Active wallets</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{wallets.filter((w) => w.balance > 0).length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                  <h3 className="mb-4 text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">Wallet portfolio</h3>
                  <div className="space-y-3">
                    {wallets.length > 0 ? (
                      wallets.slice(walletsPage * walletsPerPage, (walletsPage + 1) * walletsPerPage).map((wallet) => (
                        <div key={wallet.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div>
                            <p className="font-semibold text-slate-900">{wallet.name}</p>
                            <p className="text-xs text-slate-500">Wallet ID: {wallet.id.slice(0, 8)}</p>
                            {wallet.frozen && (
                              <span className="mt-1 inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">Frozen</span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-slate-900">{formatMoney(wallet.balance)}</p>
                            <div className="mt-1 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                disabled={actioningWalletId === wallet.id}
                                className="text-xs font-medium text-violet-600 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => handleFreezeWallet(wallet.id, wallet.name, !!wallet.frozen)}
                              >
                                {wallet.frozen ? 'Unfreeze' : 'Freeze'}
                              </button>
                              <button
                                type="button"
                                disabled={actioningWalletId === wallet.id}
                                className="text-xs font-medium text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => handleDeleteWalletClick(wallet.id, wallet.name)}
                              >
                                Delete wallet
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500">No wallets available.</p>
                    )}
                  </div>

                  {wallets.length > walletsPerPage && (
                    <div className="mt-5 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWalletsPage((p) => Math.max(0, p - 1))}
                        disabled={walletsPage === 0}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-inner shadow-slate-100">
                        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Page</span>
                        <span className="rounded-xl bg-[#0f172a] px-2.5 py-1 text-sm font-bold text-white shadow-sm">
                          {walletsPage + 1}
                        </span>
                        <span className="text-sm text-slate-500">/ {Math.ceil(wallets.length / walletsPerPage)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWalletsPage((p) => Math.min(Math.ceil(wallets.length / walletsPerPage) - 1, p + 1))}
                        disabled={walletsPage >= Math.ceil(wallets.length / walletsPerPage) - 1}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all duration-200 hover:bg-slate-800 hover:shadow-[0_10px_22px_rgba(15,23,42,0.2)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid gap-6">
                <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
                  <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="text-[1.55rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.8rem]">Transaction analytics</h3>
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                      />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none"
                      />
                      <Button onClick={() => loadData()} variant="secondary" className="border border-slate-200 bg-slate-50 text-slate-700">
                        Apply
                      </Button>
                    </div>
                  </div>

                  {categoryChartData.length > 0 && (
                    <div className="mb-8">
                      <h4 className="mb-4 text-lg font-semibold text-slate-900">Spending by category</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={categoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" angle={-25} textAnchor="end" stroke="#64748b" height={70} />
                          <YAxis stroke="#64748b" />
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                            }}
                          />
                          <Bar dataKey="value" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {walletChartData.length > 0 && (
                    <div>
                      <h4 className="mb-4 text-lg font-semibold text-slate-900">Wallet mix</h4>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie data={walletChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                            {walletChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '12px',
                              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="mb-4 text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">System report</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                      <p className="text-sm text-emerald-700">Income</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{formatMoney(overview?.monthlyIncome)}</p>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                      <p className="text-sm text-rose-700">Spent</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">{formatMoney(overview?.monthlySpent)}</p>
                    </div>
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <p className="text-sm text-sky-700">Net</p>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {formatMoney((overview?.monthlyIncome ?? 0) - (overview?.monthlySpent ?? 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="mb-4 text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">Top transactions</h3>
                  <div className="space-y-3">
                    {transactionAnalytics?.largestTransactions?.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-semibold text-slate-900">{item.description}</p>
                          <p className="text-xs text-slate-500">{new Date(item.transactionDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-bold ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.type === 'INCOME' ? '+' : '-'}{formatMoney(Math.abs(item.amount))}
                        </span>
                      </div>
                    )) || <p className="text-slate-500">No large transactions yet.</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="mb-4 text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">Recent activity</h3>
                  <div className="space-y-3">
                    {users.slice(0, 6).map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div>
                          <p className="font-semibold text-slate-900">{user.fullName || user.email}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-700">{user.role}</p>
                          <p className="text-xs text-slate-500">{user.active ? 'Active' : 'Locked'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="mb-4 text-[1.45rem] font-bold leading-tight tracking-[-0.04em] text-slate-900 sm:text-[1.6rem]">Daily flow</h3>
                  <div className="space-y-3">
                    {transactionAnalytics?.dailyTransactionCount ? (
                      Object.entries(transactionAnalytics.dailyTransactionCount)
                        .slice(-7)
                        .map(([date, count]) => (
                          <div key={date} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <span className="text-sm text-slate-700">{date}</span>
                            <span className="text-sm font-semibold text-sky-700">{count} txn</span>
                          </div>
                        ))
                    ) : (
                      <p className="text-slate-500">No activity data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'health' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {healthCards.map(({ label, value, icon: Icon, tone }) => (
                    <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-slate-500">{label}</p>
                          <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-900">{value}</p>
                        </div>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                            tone === 'rose'
                              ? 'bg-rose-100 text-rose-600'
                              : tone === 'emerald'
                                ? 'bg-emerald-100 text-emerald-600'
                                : tone === 'amber'
                                  ? 'bg-amber-100 text-amber-600'
                                  : 'bg-pink-100 text-pink-600'
                          }`}
                        >
                          <Icon size={20} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <h3 className="mb-4 text-xl font-bold text-slate-900">User balance distribution</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
                      <p className="text-sm text-sky-700">0 - 1M</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{financialHealth?.usersBalanceRange0To1M ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                      <p className="text-sm text-emerald-700">1M - 10M</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{financialHealth?.usersBalanceRange1MTo10M ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-center">
                      <p className="text-sm text-violet-700">10M+</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{financialHealth?.usersBalanceRangeAbove10M ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Freeze/Unfreeze Wallet Confirmation Modal */}
          {walletToFreeze && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <X size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {walletToFreeze.frozen ? 'Unfreeze wallet' : 'Freeze wallet'}
                    </h3>
                    <p className="text-sm text-slate-500">This action will be applied immediately.</p>
                  </div>
                </div>

                <p className="mb-2 text-sm text-slate-700">
                  {walletToFreeze.frozen ? 'Unfreeze' : 'Freeze'} <span className="font-semibold text-slate-900">"{walletToFreeze.name}"</span>?
                </p>
                <p className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700">
                  {walletToFreeze.frozen 
                    ? 'This wallet will be available for transactions again.'
                    : 'This wallet will be locked and unavailable for transactions.'}
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setWalletToFreeze(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmFreezeWallet}
                    disabled={actioningWalletId === walletToFreeze.id}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actioningWalletId === walletToFreeze.id 
                      ? 'Processing...' 
                      : walletToFreeze.frozen ? 'Unfreeze' : 'Freeze'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Wallet Confirmation Modal */}
          {walletToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Delete wallet</h3>
                    <p className="text-sm text-slate-500">This action cannot be undone.</p>
                  </div>
                </div>

                <p className="mb-2 text-sm text-slate-700">
                  Delete wallet <span className="font-semibold text-slate-900">"{walletToDelete.name}"</span>?
                </p>
                <p className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  All associated transactions and data will be permanently removed. This cannot be reversed.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setWalletToDelete(null)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDeleteWallet}
                    disabled={actioningWalletId === walletToDelete.id}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {actioningWalletId === walletToDelete.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
