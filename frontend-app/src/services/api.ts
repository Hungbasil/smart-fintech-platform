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
