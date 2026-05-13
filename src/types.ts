export type TransactionType = 'pemasukan' | 'pengeluaran';
export type WargaStatus = 'Aktif' | 'Non-Aktif';
export type StatusHuni = 'Menghuni' | 'Tidak Menghuni';
export type EventStatus = 'Berjalan' | 'Selesai';

export interface Warga {
  id: string;
  nama: string;
  noRumah: string;
  phone?: string;
  status: WargaStatus;
  statusHuni: StatusHuni;
  isIuranWajib: boolean;
  createdAt: number;
}

export interface Kategori {
  id: string;
  nama: string;
  tipe: TransactionType;
  icon: string;
}

export interface Transaksi {
  id: string;
  tanggal: number;
  keterangan: string;
  jumlah: number;
  tipe: TransactionType;
  kategoriId: string;
  wargaId?: string;
  eventId?: string;
  petugasId?: string;
  picName?: string;
  bulanIuran?: string; // YYYY-MM
  isHistorical?: boolean; // For balances from 2025
  createdAt: number;
}

export interface TunggakanMacet {
  id: string;
  wargaId: string;
  nama: string;
  totalBulan: number;
  nominalPerBulan: number;
  totalTagihan: number;
  nominalBayar: number;
  sisa: number;
  keterangan: string; // e.g., "Juni - Desember 2025"
  status: 'Lunas' | 'Belum Lunas' | 'Macet';
  createdAt: number;
}

export interface Petugas {
  id: string;
  nama: string;
  jabatan: string;
  phone?: string;
  status: 'Aktif' | 'Non-Aktif';
  createdAt: number;
}

export interface Event {
  id: string;
  nama: string;
  tanggal: number;
  budget: number;
  deskripsi: string;
  status: EventStatus;
  createdAt: number;
}

export interface GlobalSettings {
  iuranBulanan: number;
}
