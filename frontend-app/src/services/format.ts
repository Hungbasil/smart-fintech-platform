export type TransactionType = 'INCOME' | 'EXPENSE';

export const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function formatSignedAmount(amount: number, type: string): string {
  const sign = type.toUpperCase() === 'INCOME' ? '+' : '-';
  return `${sign}${currency.format(Math.abs(amount))}`;
}