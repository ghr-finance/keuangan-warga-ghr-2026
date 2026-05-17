import { format, startOfMonth, addMonths, isBefore } from 'date-fns';
import { Warga, Transaksi, Kategori } from '../types';
import { getMonthlyFee } from './utils';

export interface ArrearItem {
  type: 'bulanan' | 'thr' | 'kegiatan';
  amount: number;
  label: string;
  month?: string;
  categoryId: string;
}

export function calculateArrears(
  warga: Warga,
  transaksi: Transaksi[],
  kategori: Kategori[]
): ArrearItem[] {
  const arrearsItems: ArrearItem[] = [];
  
  if (!warga.isIuranWajib) return [];

  const today = new Date();
  const startDate = new Date(2026, 0, 1);
  const currentMonth = startOfMonth(today);
  
  // 1. Iuran Bulanan
  const catIuran = kategori.find(k => k.nama === 'Iuran Bulanan' && k.tipe === 'pemasukan');
  if (catIuran) {
    let checkDate = startDate;
    while (isBefore(checkDate, addMonths(currentMonth, 1))) {
      const monthStr = format(checkDate, 'yyyy-MM');
      const hasPaid = transaksi.some(t => 
        t.wargaId === warga.id && 
        t.bulanIuran === monthStr && 
        t.tipe === 'pemasukan' &&
        t.kategoriId === catIuran.id
      );

      if (!hasPaid) {
        arrearsItems.push({
          type: 'bulanan',
          month: monthStr,
          amount: getMonthlyFee(monthStr, warga.statusHuni),
          label: `Iuran Bulanan - ${format(checkDate, 'MMMM yyyy')}`,
          categoryId: catIuran.id
        });
      }
      checkDate = addMonths(checkDate, 1);
    }
  }

  // 2. THR
  const catTHR = kategori.find(k => k.nama.toLowerCase().includes('thr') && k.tipe === 'pemasukan');
  if (catTHR) {
    const hasPaidTHR = transaksi.some(t => 
      t.wargaId === warga.id && 
      t.tipe === 'pemasukan' && 
      t.kategoriId === catTHR.id &&
      new Date(t.tanggal).getFullYear() === 2026
    );

    if (!hasPaidTHR) {
      const thrAmount = warga.statusHuni === 'Menghuni' ? 180000 : 155000;
      arrearsItems.push({
        type: 'thr',
        amount: thrAmount,
        label: 'Iuran THR 2026',
        categoryId: catTHR.id
      });
    }
  }

  // 3. Kegiatan
  const catKegiatan = kategori.find(k => k.nama.toLowerCase().includes('kegiatan') && k.tipe === 'pemasukan');
  if (catKegiatan) {
    const otherKegiatanPayments = transaksi.filter(t => 
      t.tipe === 'pemasukan' && 
      t.kategoriId === catKegiatan.id && 
      t.wargaId && t.wargaId !== warga.id &&
      !t.keterangan.toLowerCase().includes('rapat warga')
    );

    const cleanLabel = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\(.*\)/g, '').trim();
    const mandatoryKegiatanNormalized = Array.from(new Set(otherKegiatanPayments.map(t => cleanLabel(t.keterangan))));

    mandatoryKegiatanNormalized.forEach(normLabel => {
      if (!normLabel) return;
      
      const hasPaidThisKegiatan = transaksi.some(t => 
        t.wargaId === warga.id && 
        t.tipe === 'pemasukan' && 
        t.kategoriId === catKegiatan.id &&
        cleanLabel(t.keterangan) === normLabel
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
