import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { KpiCard } from '../components/KpiCard';
import { UserTable } from '../components/UserTable';
import { Button } from '../components/Button';
import { toast } from '../services/notifications';
import {
  getAdminOverview,
  getAdminTransactionAnalytics,
  getAdminUserAnalytics,
  getAdminFinancialHealth,
  getAdminUsers,
} from '../services/api';
import type {
  AdminOverviewDTO,
  AdminTransactionAnalyticsDTO,
  AdminUserAnalyticsDTO,
  AdminFinancialHealthDTO,
  UserDTO,
} from '../services/api';
import {
  BarChart3 as BarChartIcon,
  Users as UsersIcon,
  Wallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  Activity as ActivityIcon,
  PieChart as PieChartIcon,
} from 'lucide-react';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'reports' | 'activity' | 'health'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<AdminOverviewDTO | null>(null);
  const [transactionAnalytics, setTransactionAnalytics] = useState<AdminTransactionAnalyticsDTO | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<AdminUserAnalyticsDTO | null>(null);
  const [financialHealth, setFinancialHealth] = useState<AdminFinancialHealthDTO | null>(null);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersSearch, setUsersSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [overviewData, transData, userData, healthData, usersData] = await Promise.all([
        getAdminOverview(),
        getAdminTransactionAnalytics({ from: dateFrom || undefined, to: dateTo || undefined }),
        getAdminUserAnalytics(),
        getAdminFinancialHealth(),
        getAdminUsers(usersPage, 10, usersSearch || undefined),
      ]);

      setOverview(overviewData.data);
      setTransactionAnalytics(transData.data);
      setUserAnalytics(userData.data);
      setFinancialHealth(healthData.data);
      setUsers(usersData.data.content);
    } catch (error) {
      toast.error('Failed to load admin data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [usersPage, usersSearch, dateFrom, dateTo]);

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

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">System overview and management</p>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              {(['overview', 'users', 'analytics', 'reports', 'activity', 'health'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setUsersPage(0);
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Total Users"
                  value={overview.totalUsers}
                  icon={<UsersIcon size={24} />}
                  color="blue"
                />
                <KpiCard
                  label="Total Wallets"
                  value={overview.totalWallets}
                  icon={<WalletIcon size={24} />}
                  color="green"
                />
                <KpiCard
                  label="Total Transactions"
                  value={overview.totalTransactions}
                  icon={<ActivityIcon size={24} />}
                  color="purple"
                />
                <KpiCard
                  label="Total Balance"
                  value={`₫${(overview.totalBalance || 0).toLocaleString()}`}
                  icon={<TrendingUpIcon size={24} />}
                  color="amber"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Financials</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly Spent</span>
                      <span className="text-2xl font-bold text-red-600">
                        ₫{(overview.monthlySpent || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly Income</span>
                      <span className="text-2xl font-bold text-green-600">
                        ₫{(overview.monthlyIncome || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity This Month</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">New Users</span>
                      <span className="text-2xl font-bold text-blue-600">{overview.newUsersThisMonth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Users Today</span>
                      <span className="text-2xl font-bold text-green-600">{overview.activeUsersToday}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                  <Button onClick={loadData} variant="secondary">
                    Refresh
                  </Button>
                </div>

                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(0);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <UserTable users={users} isLoading={isLoading} onRefresh={loadData} />

                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    onClick={() => setUsersPage(Math.max(0, usersPage - 1))}
                    disabled={usersPage === 0}
                    variant="secondary"
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-gray-600">Page {usersPage + 1}</span>
                  <Button
                    onClick={() => setUsersPage(usersPage + 1)}
                    variant="secondary"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction Analytics</h2>

                <div className="mb-6 flex gap-4">
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <Button onClick={() => loadData()} variant="secondary">
                    Filter
                  </Button>
                </div>

                {transactionAnalytics && categoryChartData.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category (Top 10)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {transactionAnalytics && walletChartData.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Wallet</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={walletChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ₫${value.toLocaleString()}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {walletChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {userAnalytics && userRegistrationData.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">User Registration Trend (Last 30 Days)</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={userRegistrationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="users" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {userAnalytics && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">User Statistics</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <KpiCard
                      label="Avg Wallets per User"
                      value={userAnalytics.avgWalletsPerUser.toFixed(2)}
                      icon={<WalletIcon size={20} />}
                      color="green"
                    />
                    <KpiCard
                      label="Avg Transactions per User"
                      value={userAnalytics.avgTransactionsPerUser.toFixed(2)}
                      icon={<ActivityIcon size={20} />}
                      color="blue"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Report</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Monthly income</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">
                      ₫{((overview?.monthlyIncome || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Monthly spent</p>
                    <p className="mt-2 text-2xl font-bold text-red-600">
                      ₫{((overview?.monthlySpent || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Net flow</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">
                      ₫{(((overview?.monthlyIncome || 0) - (overview?.monthlySpent || 0))).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Largest transactions</h2>
                {transactionAnalytics?.largestTransactions?.length ? (
                  <div className="space-y-3">
                    {transactionAnalytics.largestTransactions.slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-500">{new Date(item.transactionDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-bold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.type === 'INCOME' ? '+' : '-'}₫{Math.abs(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No transaction history to report yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent activity</h2>
                <div className="space-y-3">
                  {users.slice(0, 6).map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.fullName || user.email}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{user.role}</p>
                        <p className="text-xs text-gray-500">{user.active ? 'Active' : 'Locked'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {transactionAnalytics?.dailyTransactionCount && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily transaction flow</h2>
                  <div className="space-y-2">
                    {Object.entries(transactionAnalytics.dailyTransactionCount).slice(-7).map(([date, count]) => (
                      <div key={date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{date}</span>
                        <span className="text-sm font-bold text-gray-900">{count} txn</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reports Tab */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">System Report</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Monthly income</p>
                    <p className="mt-2 text-2xl font-bold text-green-600">
                      ₫{((overview?.monthlyIncome || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Monthly spent</p>
                    <p className="mt-2 text-2xl font-bold text-red-600">
                      ₫{((overview?.monthlySpent || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">Net flow</p>
                    <p className="mt-2 text-2xl font-bold text-blue-600">
                      ₫{(((overview?.monthlyIncome || 0) - (overview?.monthlySpent || 0))).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Largest transactions</h2>
                {transactionAnalytics?.largestTransactions?.length ? (
                  <div className="space-y-3">
                    {transactionAnalytics.largestTransactions.slice(0, 8).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.description}</p>
                          <p className="text-sm text-gray-500">{new Date(item.transactionDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`font-bold ${item.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                          {item.type === 'INCOME' ? '+' : '-'}₫{Math.abs(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No transaction history to report yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent activity</h2>
                <div className="space-y-3">
                  {users.slice(0, 6).map((user) => (
                    <div key={user.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="font-medium text-gray-900">{user.fullName || user.email}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">{user.role}</p>
                        <p className="text-xs text-gray-500">{user.active ? 'Active' : 'Locked'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {transactionAnalytics?.dailyTransactionCount && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily transaction flow</h2>
                  <div className="space-y-2">
                    {Object.entries(transactionAnalytics.dailyTransactionCount).slice(-7).map(([date, count]) => (
                      <div key={date} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{date}</span>
                        <span className="text-sm font-bold text-gray-900">{count} txn</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financial Health Tab */}
          {activeTab === 'health' && financialHealth && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Total Borrowed"
                  value={`₫${(financialHealth.totalBorrowed || 0).toLocaleString()}`}
                  icon={<TrendingUpIcon size={24} />}
                  color="red"
                />
                <KpiCard
                  label="Total Lent"
                  value={`₫${(financialHealth.totalLent || 0).toLocaleString()}`}
                  icon={<TrendingUpIcon size={24} />}
                  color="green"
                />
                <KpiCard
                  label="Pending Debts"
                  value={financialHealth.pendingDebtsCount}
                  icon={<BarChartIcon size={24} />}
                  color="amber"
                />
                <KpiCard
                  label="Active Recurring Transactions"
                  value={financialHealth.activeRecurringTransactions}
                  icon={<ActivityIcon size={24} />}
                  color="blue"
                />
                <KpiCard
                  label="Active Saving Goals"
                  value={financialHealth.activeSavingGoals}
                  icon={<PieChartIcon size={24} />}
                  color="purple"
                />
                <KpiCard
                  label="Saving Goals Progress"
                  value={`${(financialHealth.savingGoalsProgress * 100).toFixed(0)}%`}
                  icon={<TrendingUpIcon size={24} />}
                  color="green"
                />
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">User Balance Distribution</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 text-sm">0 - 1M ₫</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{financialHealth.usersBalanceRange0To1M}</p>
                    <p className="text-xs text-gray-500 mt-1">users</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 text-sm">1M - 10M ₫</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">{financialHealth.usersBalanceRange1MTo10M}</p>
                    <p className="text-xs text-gray-500 mt-1">users</p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <p className="text-gray-600 text-sm">10M+ ₫</p>
                    <p className="text-2xl font-bold text-purple-600 mt-2">{financialHealth.usersBalanceRangeAbove10M}</p>
                    <p className="text-xs text-gray-500 mt-1">users</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
