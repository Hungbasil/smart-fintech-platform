import axios, { type AxiosInstance } from 'axios';
import { toast } from './notifications';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

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

export interface BudgetRequest {
  categoryId: string;
  amount: number;
  month?: number;
  year?: number;
}

export const getBudgets = () => api.get('/budgets');
export const saveBudget = (request: BudgetRequest) => api.post('/budgets', request);
export const deleteBudget = (id: string) => api.delete(`/budgets/${id}`);

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

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const isAuthRequest = config.url?.startsWith('/auth/');
    if (token && !isAuthRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('authToken');
      toast.error('Your session has expired. Please sign in again.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
