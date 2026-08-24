export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatSignedAmount(amount: number, type: string): string {
  const normalizedType = type.toUpperCase();
  const sign = normalizedType === 'INCOME' ? '+' : normalizedType === 'EXPENSE' ? '-' : '';
  return `${sign}${currency.format(Math.abs(amount))}`;
}