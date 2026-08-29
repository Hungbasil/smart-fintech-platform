import axios, { type AxiosInstance } from 'axios';
import { toast } from './notifications';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  description: string;
  transactionDate: string;
}

export const transferFunds = (request: TransferRequest) =>
  api.post('/transactions/transfer', request);

export interface WalletRequest {
  name: string;
  balance: number;
}

export const updateWallet = (id: string, request: WalletRequest) => api.put(`/wallets/${id}`, request);

export const updateRecurringTransaction = (id: string, request: object) => api.put(`/recurring-transactions/${id}`, request);

export interface OcrResult {
  amount: number;
  date: string;
}

export const scanReceipt = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<OcrResult>('/transactions/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });
};

export interface VoiceTransactionRequest {
  text: string;
  walletId: string;
  categoryId: string;
  transactionDate: string;
}

export const createVoiceTransaction = (request: VoiceTransactionRequest) =>
  api.post('/ai/voice-to-transaction', request);

export interface BudgetRequest {
  categoryId: string;
  amount: number;
  month?: number;
  year?: number;
}

export const getBudgets = () => api.get('/budgets');
export const saveBudget = (request: BudgetRequest) => api.post('/budgets', request);
export const deleteBudget = (id: string) => api.delete(`/budgets/${id}`);

export interface SavingGoalRequest {
  name: string;
  targetAmount: number;
  deadline?: string;
}

export interface AddSavingGoalFundsRequest {
  amount: number;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

export const getSavingGoals = () => api.get<SavingGoal[]>('/saving-goals');
export const createSavingGoal = (request: SavingGoalRequest) => api.post<SavingGoal>('/saving-goals', request);
export const updateSavingGoal = (id: string, request: SavingGoalRequest) => api.put<SavingGoal>(`/saving-goals/${id}`, request);
export const deleteSavingGoal = (id: string) => api.delete(`/saving-goals/${id}`);
export const addSavingGoalFunds = (id: string, request: AddSavingGoalFundsRequest) => api.post<SavingGoal>(`/saving-goals/${id}/add-funds`, request);

export type DebtType = 'LEND' | 'BORROW';
export type DebtStatus = 'PENDING' | 'SETTLED';

export interface Debt {
  id: string;
  counterpartyName: string;
  amount: number;
  type: DebtType;
  status: DebtStatus;
  dueDate: string | null;
  description: string | null;
}

export interface DebtRequest {
  counterpartyName: string;
  amount: number;
  type: DebtType;
  dueDate?: string;
  description?: string;
}

export const getDebts = () => api.get<Debt[]>('/debts');
export const createDebt = (request: DebtRequest) => api.post<Debt>('/debts', request);
export const updateDebt = (id: string, request: DebtRequest) => api.put<Debt>(`/debts/${id}`, request);
export const deleteDebt = (id: string) => api.delete(`/debts/${id}`);
export const settleDebt = (id: string, walletId: string) => api.post<Debt>(`/debts/${id}/settle`, { walletId });

export interface Wallet { id: string; name: string; balance: number; }
export interface CalendarEvent { id: string; title: string; date: string; amount: number; type: 'DEBT_PAYABLE' | 'DEBT_RECEIVABLE' | 'SUBSCRIPTION'; }
export const getWallets = () => api.get<Wallet[]>('/wallets');
export const getDebtCalendar = () => api.get<CalendarEvent[]>('/calendar/debts');

export interface AnalyticsQuery {
  walletId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface AnalyticsSummary {
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
}

export const getAnalyticsSummary = (query?: AnalyticsQuery) =>
  api.get<AnalyticsSummary>('/analytics/summary', { params: query });

export const getAnalyticsCategories = (query?: AnalyticsQuery) =>
  api.get<CategorySpending[]>('/analytics/categories', { params: query });

export const getAnalyticsMonthly = (query?: AnalyticsQuery) =>
  api.get<MonthlyTrend[]>('/analytics/monthly', { params: query });

export interface PredictiveHistoricalExpense {
  month: string;
  amount: number;
}

export interface PredictiveAnalytics {
  predictedAmount: number;
  historicalData: PredictiveHistoricalExpense[];
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

export const getPredictiveAnalytics = () => api.get<PredictiveAnalytics>('/analytics/predict');

export interface Investment {
  id: string;
  coinSymbol: string;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface InvestmentRequest {
  coinSymbol: string;
  quantity: number;
  buyPrice: number;
}

export const getInvestments = () => api.get<Investment[]>('/investments');
export const createInvestment = (request: InvestmentRequest) => api.post<Investment>('/investments', request);
export const updateInvestment = (id: string, request: InvestmentRequest) => api.put<Investment>(`/investments/${id}`, request);
export const deleteInvestment = (id: string) => api.delete(`/investments/${id}`);

export interface MarketPrice {
  coinSymbol: string;
  price: number;
}

export const getMarketPrices = (symbols: string[]) =>
  api.get<MarketPrice[]>('/investments/market', { params: { symbols: symbols.join(',') } });

export interface MarketCandle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const getMarketCandles = (symbol: string, interval = '1h', limit = 48) =>
  api.get<MarketCandle[]>('/investments/market/klines', { params: { symbol, interval, limit } });

export interface AiChatRequest {
  message: string;
  image?: string;
}

export const askAi = (request: AiChatRequest) => api.post<string>('/ai/chat', request);

// ==================== ADMIN ENDPOINTS ====================

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: string | null;
  lastLogin: string | null;
}

export interface AdminOverviewDTO {
  totalUsers: number;
  totalWallets: number;
  totalTransactions: number;
  totalBalance: number;
  monthlySpent: number;
  monthlyIncome: number;
  newUsersThisMonth: number;
  activeUsersToday: number;
}

export interface AdminTransactionAnalyticsDTO {
  categorySpending: { [key: string]: number };
  walletSpending: { [key: string]: number };
  largestTransactions: Array<{
    id: string;
    amount: number;
    description: string;
    transactionDate: string;
    walletId: string;
    categoryId: string;
    type: string;
  }>;
  dailyTransactionCount: { [key: string]: number };
  totalTransactionCount: number;
}

export interface AdminUserAnalyticsDTO {
  totalUsers: number;
  activeUsersThisMonth: number;
  newUsersThisMonth: number;
  dailyUserRegistration: { [key: string]: number };
  avgWalletsPerUser: number;
  avgTransactionsPerUser: number;
}

export interface AdminFinancialHealthDTO {
  totalBorrowed: number;
  totalLent: number;
  pendingDebtsCount: number;
  activeRecurringTransactions: number;
  activeSavingGoals: number;
  savingGoalsProgress: number;
  usersBalanceRange0To1M: number;
  usersBalanceRange1MTo10M: number;
  usersBalanceRangeAbove10M: number;
}

export interface RoleChangeRequest {
  role: string;
}

// Admin User Management
export const getAdminUsers = (page = 0, size = 10, search?: string) =>
  api.get<{ content: UserDTO[]; totalElements: number; totalPages: number }>('/admin/users', {
    params: { page, size, ...(search && { search }) },
  });

export const getAdminUserDetail = (id: string) => api.get<UserDTO>(`/admin/users/${id}`);

export const lockAdminUser = (id: string) => api.post(`/admin/users/${id}/lock`, {});

export const unlockAdminUser = (id: string) => api.post(`/admin/users/${id}/unlock`, {});

export const changeAdminUserRole = (id: string, request: RoleChangeRequest) =>
  api.post(`/admin/users/${id}/role`, request);

// Admin Analytics
export const getAdminOverview = () => api.get<AdminOverviewDTO>('/admin/analytics/overview');

export interface AdminAnalyticsQuery {
  from?: string;
  to?: string;
}

export const getAdminTransactionAnalytics = (query?: AdminAnalyticsQuery) =>
  api.get<AdminTransactionAnalyticsDTO>('/admin/analytics/transactions', { params: query });

export const getAdminUserAnalytics = () => api.get<AdminUserAnalyticsDTO>('/admin/analytics/users');

export const getAdminFinancialHealth = () => api.get<AdminFinancialHealthDTO>('/admin/analytics/financial-health');

// Admin System Health
export interface DatabaseHealthDTO {
  status: string;
  timestamp: string;
}

export interface SystemHealthDTO {
  status: string;
  timestamp: string;
  databaseHealth: DatabaseHealthDTO;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export const getSystemHealth = () => api.get<SystemHealthDTO>('/admin/health');

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const isAuthRequest = config.url?.startsWith('/auth/');
    if (token && !isAuthRequest) {
      config.headers.set('Authorization', `Bearer ${token}`);
      config.headers.set('X-Auth-Token', `Bearer ${token}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    const serverMessage = error.response?.data?.message;
    const hasInvalidToken = serverMessage === 'Invalid or expired token';
    const hasStoredToken = Boolean(localStorage.getItem('authToken'));
    if (error.response?.status === 401 && !isAuthRequest && (hasInvalidToken || !hasStoredToken)) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      toast.error('Your session has expired. Please sign in again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
