import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: number | Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getMonthlyFee(monthStr: string, statusHuni: string) {
  const baseAmount = statusHuni === 'Menghuni' ? 200000 : 175000;
  // Diskon 20.000 untuk Januari dan Februari 2026
  if (monthStr === '2026-01' || monthStr === '2026-02') {
    return baseAmount - 20000;
  }
  return baseAmount;
}
