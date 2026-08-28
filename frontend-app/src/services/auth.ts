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

export interface OtpRequest { email: string; otp: string }
export interface ResetPasswordRequest extends OtpRequest { newPassword: string }

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

export const verifyRegistration = (payload: OtpRequest) => api.post('/auth/verify-registration', payload);
export const resendRegistration = (email: string) => api.post('/auth/resend-registration', { email });
export const forgotPassword = (email: string) => api.post('/auth/forgot-password', { email });
export const resetPassword = (payload: ResetPasswordRequest) => api.post('/auth/reset-password', payload);

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function completeOAuthLogin(token: string) {
  localStorage.setItem(TOKEN_KEY, token);

  const payload = token.split('.')[1];
  const claims = JSON.parse(decodeURIComponent(
    atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join(''),
  )) as { userId?: string; fullName?: string; sub?: string };

  if (claims.userId && claims.sub) {
    localStorage.setItem(USER_KEY, JSON.stringify({
      id: claims.userId,
      fullName: claims.fullName || claims.sub,
      email: claims.sub,
    }));
  }
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

export default { login, register, logout, completeOAuthLogin, getToken, getUser, isAuthenticated };
