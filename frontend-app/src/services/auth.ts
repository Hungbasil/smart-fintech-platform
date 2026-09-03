import api from './api';
import type { AxiosResponse } from 'axios';

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'authUser';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role?: string;
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

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.length % 4 === 0 ? normalized : normalized + '='.repeat(4 - (normalized.length % 4));
    const decoded = atob(padded);
    return JSON.parse(decodeURIComponent(
      decoded.split('').map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`).join(''),
    )) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getUserRole(): string | null {
  const token = getToken();
  if (token) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role ?? payload?.roles;
    if (typeof role === 'string') {
      return role.toUpperCase();
    }
    if (Array.isArray(role) && role.length > 0 && typeof role[0] === 'string') {
      return role[0].toUpperCase();
    }
  }

  const user = getUser();
  const storedRole = user?.role;
  if (storedRole) {
    return storedRole.toUpperCase();
  }

  return null;
}

export function isAdmin(): boolean {
  const role = getUserRole();
  return role === 'ADMIN' || role === 'ROLE_ADMIN';
}

export async function login(payload: LoginRequest): Promise<AxiosResponse<any>> {
  const res = await api.post('/auth/login', payload);
  const token = res.data?.token || res.data?.accessToken || res.data?.access_token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (res.data?.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
  if (res.data?.user) {
    const decodedRole = token ? decodeJwtPayload(token)?.role : null;
    const user = {
      ...res.data.user,
      role: typeof decodedRole === 'string' ? decodedRole.toUpperCase() : res.data.user.role,
    } as AuthUser;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
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
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (refreshToken) void api.post('/auth/logout', { refreshToken }).catch(() => undefined);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function completeOAuthLogin(token: string, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

  const claims = decodeJwtPayload(token) as {
    userId?: string;
    fullName?: string;
    sub?: string;
    role?: string;
  } | null;

  if (claims?.userId && claims?.sub) {
    localStorage.setItem(USER_KEY, JSON.stringify({
      id: claims.userId,
      fullName: claims.fullName || claims.sub,
      email: claims.sub,
      role: claims.role,
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
    const user = JSON.parse(storedUser) as AuthUser;
    const role = user.role || getUserRole();
    return role ? { ...user, role } : user;
  } catch {
    return null;
  }
}

export default { login, register, logout, completeOAuthLogin, getToken, getUser, isAuthenticated, isAdmin, getUserRole };
