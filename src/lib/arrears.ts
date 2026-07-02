import { format, startOfMonth, addMonths, isBefore } from 'date-fns';
import { id } from 'date-fns/locale';
import { Warga, Transaksi, Kategori, WargaHistory } from '../types';
import { getMonthlyFee } from './utils';

export interface ArrearItem {
  type: 'bulanan' | 'thr' | 'kegiatan';
  amount: number;
  label: string;
  month?: string;
  categoryId: string;
}

/**
 * Get the effective warga state for a given month using the warga_history table.
 * Returns the history entry that was active during that month,
 * or falls back to the current warga record if no history exists yet.
 */
export function getWargaStateForMonth(
  warga: Warga,
  monthStr: string, // 'yyyy-MM'
  wargaHistory: WargaHistory[]
): {
  status: string;
  statusHuni: string;
  isIuranWajib: boolean;
  isIuranRT: boolean;
  role: string;
} {
  // Convert month string to a timestamp (start of that month)
  const monthTs = new Date(`${monthStr}-01T00:00:00`).getTime();

  const myHistory = wargaHistory
    .filter(h => h.wargaId === warga.id)
    .sort((a, b) => a.effectiveFrom - b.effectiveFrom);

  if (myHistory.length === 0) {
    // No history at all — use current warga state
    // If Penyewa and month is before createdAt, set status to 'Pindah' to skip billing
    const isPenyewaBeforeStart = (warga.role || 'Pemilik') === 'Penyewa' && 
      monthTs < startOfMonth(new Date(Number(warga.createdAt))).getTime();

    return {
      status: isPenyewaBeforeStart ? 'Pindah' : warga.status,
      statusHuni: warga.statusHuni,
      isIuranWajib: warga.isIuranWajib,
      isIuranRT: warga.isIuranRT,
      role: warga.role || 'Pemilik',
    };
  }

  // Find which history entry was active at the start of this month
  const active = myHistory.find(h => {
    const from = h.effectiveFrom;
    const to = h.effectiveTo ?? Infinity;
    return monthTs >= from && monthTs < to;
  });

  if (active) {
    return {
      status: active.status,
      statusHuni: active.statusHuni,
      isIuranWajib: active.isIuranWajib,
      isIuranRT: active.isIuranRT,
      role: active.role || 'Pemilik',
    };
  }

  // Month is before earliest history — use the earliest entry
  const earliest = myHistory[0];
  if (monthTs < earliest.effectiveFrom) {
    // If Penyewa and month is before their earliest effective history, set status to 'Pindah' to skip billing
    const isPenyewaBeforeStart = (earliest.role || 'Pemilik') === 'Penyewa';

    return {
      status: isPenyewaBeforeStart ? 'Pindah' : earliest.status,
      statusHuni: earliest.statusHuni,
      isIuranWajib: earliest.isIuranWajib,
      isIuranRT: earliest.isIuranRT,
      role: earliest.role || 'Pemilik',
    };
  }

  // Month is after all history entries — use the latest entry
  const latest = myHistory[myHistory.length - 1];
  return {
    status: latest.status,
    statusHuni: latest.statusHuni,
    isIuranWajib: latest.isIuranWajib,
    isIuranRT: latest.isIuranRT,
    role: latest.role || 'Pemilik',
  };
}

export function calculateArrears(
  warga: Warga,
  transaksi: Transaksi[],
  kategori: Kategori[],
  wargaHistory: WargaHistory[] = [],
  allWarga: Warga[] = []
): ArrearItem[] {
  const arrearsItems: ArrearItem[] = [];

  const today = new Date();
  const startDate = new Date(2026, 0, 1); // Jan 2026
  const currentMonth = startOfMonth(today);

  // 1. Iuran Bulanan & Iuran RT
  const catIuranBulanan = kategori.find(k => (k.nama === 'Iuran Bulanan' || k.nama === 'IPL') && k.tipe === 'pemasukan');
  const catIuranRT = kategori.find(k => (k.nama === 'Iuran RT' || k.nama === 'RT') && k.tipe === 'pemasukan');

  const specialNamesIuranRT = ['wawan', 'ali', 'zulkarnaen', 'temi'];

  // Pre-filter other residents of the same house who are tenants to avoid checking all warga in the loop
  const familyPenyewas = allWarga.filter(otherWarga => 
    otherWarga.id !== warga.id && 
    otherWarga.noRumah === warga.noRumah && 
    (otherWarga.role === 'Penyewa')
  );

  let checkDate = startDate;
  while (isBefore(checkDate, addMonths(currentMonth, 1))) {
    const monthStr = format(checkDate, 'yyyy-MM');
    const monthLabel = format(checkDate, 'MMMM yyyy', { locale: id });

    // Get the historically accurate state of this warga for this month
    const state = getWargaStateForMonth(warga, monthStr, wargaHistory);

    // Skip billing only for Penyewa who has moved out ('Pindah').
    // Pemilik who moves abroad or relocates still owns the property
    // and remains obligated to pay iuran — ownership doesn't transfer
    // just because the owner is no longer residing.
    if (state.status === 'Pindah' && state.role === 'Penyewa') {
      checkDate = addMonths(checkDate, 1);
      continue;
    }

    // If warga is Pemilik, check if there's an active Penyewa for this house in this month
    if (state.role === 'Pemilik' && familyPenyewas.length > 0) {
      const activePenyewaExists = familyPenyewas.some(otherWarga => {
        const otherState = getWargaStateForMonth(otherWarga, monthStr, wargaHistory);
        return otherState.status !== 'Pindah';
      });
      if (activePenyewaExists) {
        checkDate = addMonths(checkDate, 1);
        continue;
      }
    }

    // --- Iuran Bulanan ---
    if (catIuranBulanan) {
      const hasPaid = transaksi.some(t =>
        t.wargaId === warga.id &&
        t.bulanIuran === monthStr &&
        t.tipe === 'pemasukan' &&
        t.kategoriId === catIuranBulanan.id
      );

      if (!hasPaid && state.isIuranWajib) {
        arrearsItems.push({
          type: 'bulanan',
          month: monthStr,
          amount: getMonthlyFee(monthStr, state.statusHuni),
          label: `Iuran Bulanan - ${monthLabel}`,
          categoryId: catIuranBulanan.id
        });
      }
    }

    // --- Iuran RT ---
    if (catIuranRT) {
      const isRT = state.isIuranRT || specialNamesIuranRT.some(n => warga.nama.toLowerCase().includes(n));
      if (isRT) {
        const hasPaidRT = transaksi.some(t =>
          t.wargaId === warga.id &&
          t.bulanIuran === monthStr &&
          t.tipe === 'pemasukan' &&
          t.kategoriId === catIuranRT.id
        );

        if (!hasPaidRT) {
          arrearsItems.push({
            type: 'bulanan',
            month: monthStr,
            amount: 20000,
            label: `Iuran RT - ${monthLabel}`,
            categoryId: catIuranRT.id
          });
        }
      }
    }

    checkDate = addMonths(checkDate, 1);
  }

  // 2. THR — use the state at the time of Lebaran 2026 (approx March 2026)
  const catTHR = kategori.find(k => k.nama.toLowerCase().includes('thr') && k.tipe === 'pemasukan');
  if (catTHR) {
    const thrMonthStr = '2026-03'; // Ramadan/Lebaran month
    const stateTHR = getWargaStateForMonth(warga, thrMonthStr, wargaHistory);

    // Same rule: Pemilik is always liable for THR regardless of residency status.
    if (stateTHR.status !== 'Pindah' || stateTHR.role === 'Pemilik') {
      const hasPaidTHR = transaksi.some(t =>
        t.wargaId === warga.id &&
        t.tipe === 'pemasukan' &&
        t.kategoriId === catTHR.id &&
        new Date(t.tanggal).getFullYear() === 2026
      );

      if (!hasPaidTHR) {
        const thrAmount = stateTHR.statusHuni === 'Menghuni' ? 180000 : 155000;
        arrearsItems.push({
          type: 'thr',
          amount: thrAmount,
          label: 'Iuran THR 2026',
          categoryId: catTHR.id
        });
      }
    }
  }

  // 3. Kegiatan — always use current status (event-based, not month-based)
  const catKegiatan = kategori.find(k => k.nama.toLowerCase().includes('kegiatan') && k.tipe === 'pemasukan');
  if (catKegiatan) {
    const otherKegiatanPayments = transaksi.filter(t =>
      t.tipe === 'pemasukan' &&
      t.kategoriId === catKegiatan.id &&
      t.wargaId && t.wargaId !== warga.id &&
      !t.keterangan.toLowerCase().includes('rapat warga') &&
      !t.keterangan.toLowerCase().includes('bukber') &&
      !t.keterangan.toLowerCase().includes('berbuka puasa') &&
      !t.keterangan.toLowerCase().includes('berbuka')
    );

    const cleanLabel = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\(.*\)/g, '').replace(/^iuran\s+/g, '').trim();
    const mandatoryKegiatanNormalized = Array.from(new Set(otherKegiatanPayments.map(t => cleanLabel(t.keterangan))));

    mandatoryKegiatanNormalized.forEach(normLabel => {
      if (!normLabel) return;

      const hasPaidThisKegiatan = transaksi.some(t =>
        t.wargaId === warga.id &&
        t.tipe === 'pemasukan' &&
        t.kategoriId === catKegiatan.id &&
        (cleanLabel(t.keterangan) === normLabel || cleanLabel(t.keterangan).includes(normLabel))
      );

      if (!hasPaidThisKegiatan) {
        const samples = otherKegiatanPayments.filter(t => cleanLabel(t.keterangan) === normLabel);
        const commonAmount = samples[0]?.jumlah || 100000;
        const originalLabel = samples[0]?.keterangan || normLabel;

        arrearsItems.push({
          type: 'kegiatan',
          amount: commonAmount,
          label: originalLabel,
          categoryId: catKegiatan.id
        });
      }
    });
  }

  return arrearsItems;
}
