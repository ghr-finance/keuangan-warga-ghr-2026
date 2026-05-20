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

export function resolveWargaForDate(warga: any, timestamp: number | Date | string | undefined) {
  if (!warga) return warga;
  
  const isNo14 = warga.noRumah === '14' || warga.noRumah === 14 || warga.id === 'iwGZETLlW9DTKLjgckoK' || warga.nama === 'Faradila' || warga.nama === 'Fuad';
  if (!isNo14) return warga;

  let ts = Date.now();
  if (timestamp) {
    if (typeof timestamp === 'number') {
      ts = timestamp;
    } else if (timestamp instanceof Date) {
      ts = timestamp.getTime();
    } else {
      ts = new Date(timestamp).getTime();
    }
  } else {
    // If no timestamp is provided, checking if we want current date representation
    ts = Date.now();
  }

  // Batas 11 Mei 2026 00:00:00 UTC atau waktu WIB setempat
  // Di local time/WIB: 11 Mei 2026
  const TRANSITION_DATE = new Date('2026-05-11T00:00:00').getTime();

  if (ts < TRANSITION_DATE) {
    return {
      ...warga,
      id: warga.id || 'iwGZETLlW9DTKLjgckoK',
      noRumah: '14',
      nama: 'Fuad',
      statusHuni: 'Menghuni',
      status: 'Aktif',
      isIuranWajib: true,
      isIuranRT: false,
      phone: warga.phone || ''
    };
  } else {
    return {
      ...warga,
      id: warga.id || 'iwGZETLlW9DTKLjgckoK',
      noRumah: '14',
      nama: 'Faradila',
      statusHuni: 'Tidak Menghuni',
      status: 'Non-Aktif',
      isIuranWajib: true,
      isIuranRT: false,
      phone: warga.phone || ''
    };
  }
}

export function getMonthlyFee(monthStr: string, statusHuni: string) {
  const baseAmount = statusHuni === 'Menghuni' ? 200000 : 175000;
  // Diskon 20.000 untuk Januari dan Februari 2026
  if (monthStr === '2026-01' || monthStr === '2026-02') {
    return baseAmount - 20000;
  }
  return baseAmount;
}
