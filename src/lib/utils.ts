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

export function formatDate(date: number | Date | string) {
  const d = typeof date === 'string'
    ? (isNaN(Number(date)) ? new Date(date) : new Date(Number(date)))
    : date;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}


export function getMonthlyFee(monthStr: string, statusHuni: string) {
  const baseAmount = statusHuni === 'Menghuni' ? 200000 : 175000;
  // Diskon 20.000 untuk Januari dan Februari 2026
  if (monthStr === '2026-01' || monthStr === '2026-02') {
    return baseAmount - 20000;
  }
  return baseAmount;
}

// Fallback untuk backward compatibility dengan komponen yang belum diperbarui
export function resolveWargaForDate(warga: any | undefined) {
  return warga;
}

// Helpers to find RT-related category ids in a tolerant way.
export function getRTMasukCatIds(categories: Array<any>) {
  return categories
    .filter((c) => {
      const name = (c?.nama || '').toLowerCase();
      // Accept categories that mention 'rt' but exclude obvious 'penyerahan' (these are expenses)
      return name.includes('rt') && !name.includes('penyerahan') && !name.includes('dkm') && !name.includes('masjid') && !name.includes('mushola');
    })
    .map((c) => c.id);
}

export function getRTKeluarCatIds(categories: Array<any>) {
  return categories
    .filter((c) => {
      const name = (c?.nama || '').toLowerCase();
      // Expenses are often labelled with 'penyerahan' + 'rt' or 'penyaluran' + 'rt'
      return (name.includes('penyerahan') || name.includes('penyaluran')) && name.includes('rt');
    })
    .map((c) => c.id);
}
