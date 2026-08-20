import api from './api';
import type { AxiosResponse } from 'axios';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
}

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
  if (res.data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
  }
  return res;
}

export async function register(payload: RegisterRequest): Promise<AxiosResponse<any>> {
  const res = await api.post('/auth/register', payload);
  return res;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function getUser(): AuthUser | null {
  const storedUser = localStorage.getItem(USER_KEY);
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    return null;
  }
}

export default { login, register, logout, getToken, getUser, isAuthenticated };
