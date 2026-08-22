import { toast } from 'sonner';
import type { AxiosError } from 'axios';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message || (error instanceof Error ? error.message : fallback);
}

export { toast };