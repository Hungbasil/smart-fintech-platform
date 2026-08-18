import api from './api';
import type { AxiosResponse } from 'axios';

const TOKEN_KEY = 'authToken';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export async function login(payload: LoginRequest): Promise<AxiosResponse<any>> {
  const res = await api.post('/auth/login', payload);
  const token = res.data?.token || res.data?.accessToken || res.data?.access_token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  return res;
}

export async function register(payload: RegisterRequest): Promise<AxiosResponse<any>> {
  const res = await api.post('/auth/register', payload);
  return res;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export default { login, register, logout, getToken, isAuthenticated };
