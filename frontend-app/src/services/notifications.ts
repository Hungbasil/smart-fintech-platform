import { toast } from 'sonner';
import type { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const rawMessage = axiosError.response?.data?.message || (error instanceof Error ? error.message : fallback);

  const normalized = rawMessage?.toLowerCase() ?? '';

  if (normalized.includes('invalid credentials') || normalized.includes('bad credentials') || normalized.includes('unauthorized')) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
  }

  if (normalized.includes('user not found') || normalized.includes('account not found')) {
    return 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email.';
  }

  if (normalized.includes('verification code') || normalized.includes('invalid otp') || normalized.includes('otp')) {
    return 'Mã xác minh không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.';
  }

  if (normalized.includes('email already exists') || normalized.includes('already registered')) {
    return 'Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.';
  }

  return rawMessage || fallback;
}

export { toast };