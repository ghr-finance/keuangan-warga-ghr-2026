import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Petugas } from '../types';
import { Plus, Search, MoreVertical, Phone, Filter, X, Pencil, Trash2, Eye, Receipt, Calendar, ArrowUpRight, ArrowDownLeft, AlertCircle, Banknote, CheckCircle2, Wallet, BadgeCheck } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Transaksi, Kategori, Warga } from '../types';
import { format } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getKasbonOutstanding(p: Petugas, transaksi: Transaksi[]): number {
  const related = transaksi.filter(t =>
    t.petugasId === p.id ||
    t.picName === p.nama ||
    t.keterangan.includes(`(PIC: ${p.nama})`)
  );
  const kasbon = related.filter(t =>
    t.tipe === 'pengeluaran' && t.keterangan.toLowerCase().includes('kasbon')
  ).reduce((acc, t) => acc + t.jumlah, 0);
  const bayar = related.filter(t =>
    t.tipe === 'pemasukan' &&
    (t.keterangan.toLowerCase().includes('bayar kasbon') ||
     t.keterangan.toLowerCase().includes('pelunasan kasbon'))
  ).reduce((acc, t) => acc + t.jumlah, 0);
  return (p.sisaKasbon2025 || 0) + kasbon - bayar;
}

// ─── KasbonModal ─────────────────────────────────────────────────────────────

interface KasbonModalProps {
  petugas: Petugas;
  kategoriList: Kategori[];
  onClose: () => void;
}

function KasbonModal({ petugas, kategoriList, onClose }: KasbonModalProps) {
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState(`Kasbon ${petugas.nama}`);
  const [tanggal, setTanggal] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Try to use Kasbon/Pengeluaran/Gaji category, fallback to first pengeluaran
  const defaultCat = useMemo(() =>
    kategoriList.find(k => k.tipe === 'pengeluaran' && (k.nama.toLowerCase().includes('kasbon') || k.nama.toLowerCase().includes('gaji') || k.nama.toLowerCase().includes('honor'))) ||
    kategoriList.find(k => k.tipe === 'pengeluaran'),
  [kategoriList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || Number(jumlah) <= 0) return;
    setIsSubmitting(true);
    try {
      await dbService.add('transaksi', {
        tanggal: new Date(tanggal).getTime(),
        jumlah: Number(jumlah),
        keterangan,
        tipe: 'pengeluaran',
        kategoriId: defaultCat?.id || '',
        petugasId: petugas.id,
        picName: petugas.nama,
        createdAt: Date.now(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="form-card form-card--petugas bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
      >
        <div className="p-6 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#3A3A2A]">Ajukan Kasbon</h2>
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">{petugas.nama}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jumlah Kasbon</label>
            <input
              required
              type="number"
              min="1"
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-bold font-mono placeholder:text-gray-300"
              placeholder="0"
              value={jumlah}
              onChange={e => setJumlah(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Keterangan</label>
            <input
              required
              type="text"
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-bold placeholder:text-gray-300"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Tanggal</label>
            <input
              type="datetime-local"
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-amber-400 focus:outline-none font-bold"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium">
            Kasbon akan dicatat sebagai <strong>pengeluaran</strong> dan menambah outstanding kasbon petugas ini.
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 transition-all">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-5 py-3 rounded-full bg-amber-500 text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Simpan Kasbon'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── BayarKasbonModal ─────────────────────────────────────────────────────────

interface BayarKasbonModalProps {
  petugas: Petugas;
  outstanding: number;
  kategoriList: Kategori[];
  onClose: () => void;
}

function BayarKasbonModal({ petugas, outstanding, kategoriList, onClose }: BayarKasbonModalProps) {
  const [jumlah, setJumlah] = useState(String(outstanding > 0 ? outstanding : ''));
  const [keterangan, setKeterangan] = useState(`Bayar Kasbon ${petugas.nama}`);
  const [tanggal, setTanggal] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultCat = useMemo(() =>
    kategoriList.find(k => k.tipe === 'pemasukan' && (k.nama.toLowerCase().includes('kasbon') || k.nama.toLowerCase().includes('iuran'))) ||
    kategoriList.find(k => k.tipe === 'pemasukan'),
  [kategoriList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || Number(jumlah) <= 0) return;
    setIsSubmitting(true);
    try {
      await dbService.add('transaksi', {
        tanggal: new Date(tanggal).getTime(),
        jumlah: Number(jumlah),
        keterangan,
        tipe: 'pemasukan',
        kategoriId: defaultCat?.id || '',
        petugasId: petugas.id,
        picName: petugas.nama,
        createdAt: Date.now(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="form-card form-card--petugas bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
      >
        <div className="p-6 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#3A3A2A]">Bayar Kasbon</h2>
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">{petugas.nama}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {outstanding > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 font-medium">
                Outstanding kasbon saat ini: <span className="font-bold font-mono">{formatCurrency(outstanding)}</span>
              </p>
            </div>
          )}
          {outstanding <= 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-emerald-800 font-medium">Tidak ada kasbon outstanding untuk petugas ini.</p>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jumlah Pembayaran</label>
            <input
              required
              type="number"
              min="1"
              max={outstanding > 0 ? outstanding : undefined}
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none font-bold font-mono placeholder:text-gray-300"
              placeholder="0"
              value={jumlah}
              onChange={e => setJumlah(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Keterangan</label>
            <input
              required
              type="text"
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none font-bold placeholder:text-gray-300"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Tanggal</label>
            <input
              type="datetime-local"
              className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:outline-none font-bold"
              value={tanggal}
              onChange={e => setTanggal(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 transition-all">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-5 py-3 rounded-full bg-emerald-600 text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── BayarGajiModal ───────────────────────────────────────────────────────────

interface BayarGajiModalProps {
  petugas: Petugas;
  kategoriList: Kategori[];
  allTransaksi: Transaksi[];
  onClose: () => void;
}

function BayarGajiModal({ petugas, kategoriList, allTransaksi, onClose }: BayarGajiModalProps) {
  const today = new Date();
  const [bulanGaji, setBulanGaji] = useState(format(today, 'yyyy-MM'));
  const [jumlah, setJumlah] = useState('');
  const [keterangan, setKeterangan] = useState(`Gaji ${petugas.nama}`);
  const [tanggal, setTanggal] = useState(format(today, "yyyy-MM-dd'T'HH:mm"));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gajiKat = useMemo(() =>
    kategoriList.find(k =>
      k.tipe === 'pengeluaran' &&
      (k.nama.toLowerCase().includes('gaji') || k.nama.toLowerCase().includes('honor'))
    ),
  [kategoriList]);

  // Check for duplicate: same petugas + same bulanGaji + same kategori
  const duplikat = useMemo(() => {
    if (!gajiKat || !bulanGaji) return null;
    return allTransaksi.find(t =>
      t.petugasId === petugas.id &&
      t.tipe === 'pengeluaran' &&
      t.kategoriId === gajiKat.id &&
      t.bulanIuran === bulanGaji
    ) ?? null;
  }, [allTransaksi, gajiKat, petugas.id, bulanGaji]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jumlah || Number(jumlah) <= 0 || !gajiKat) return;
    if (duplikat) return;
    setIsSubmitting(true);
    try {
      await dbService.add('transaksi', {
        tanggal: new Date(tanggal).getTime(),
        jumlah: Number(jumlah),
        keterangan,
        tipe: 'pengeluaran',
        kategoriId: gajiKat.id,
        petugasId: petugas.id,
        picName: petugas.nama,
        bulanIuran: bulanGaji,
        createdAt: Date.now(),
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="form-card form-card--petugas bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[#3A3A2A]">Pembayaran Gaji</h2>
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">{petugas.nama} · {petugas.jabatan}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!gajiKat ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="font-bold text-[#3A3A2A] mb-1">Kategori Gaji Tidak Ditemukan</p>
            <p className="text-xs text-[#A3A375] font-medium mt-1 leading-relaxed">
              Tambahkan kategori pengeluaran dengan nama{' '}
              <span className="font-bold text-[#5A5A40]">Gaji</span> atau{' '}
              <span className="font-bold text-[#5A5A40]">Honor</span> di halaman Kategori terlebih dahulu.
            </p>
            <button onClick={onClose} className="mt-6 px-6 py-2.5 rounded-full bg-[#5A5A40] text-white text-sm font-bold">
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Periode Gaji */}
            <div>
              <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Periode Gaji (Bulan)</label>
              <input
                required
                type="month"
                className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#5A5A40] focus:outline-none font-bold"
                value={bulanGaji}
                onChange={e => {
                  setBulanGaji(e.target.value);
                  if (e.target.value) {
                    const [yr, mo] = e.target.value.split('-');
                    const monthName = new Date(Number(yr), Number(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    setKeterangan(`Gaji ${petugas.nama} ${monthName}`);
                  }
                }}
              />
            </div>

            {/* Duplikat warning */}
            {duplikat && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Gaji Bulan Ini Sudah Tercatat</p>
                  <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                    Transaksi <span className="font-bold">"{duplikat.keterangan}"</span> sebesar{' '}
                    <span className="font-bold font-mono">{formatCurrency(duplikat.jumlah)}</span> sudah ada untuk periode ini.
                    Ubah periode atau periksa Daftar Transaksi jika ingin mengedit.
                  </p>
                </div>
              </div>
            )}

            {/* Jumlah */}
            <div>
              <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jumlah Gaji (Rp)</label>
              <input
                required
                type="number"
                min="1"
                disabled={!!duplikat}
                className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#5A5A40] focus:outline-none font-bold font-mono placeholder:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="0"
                value={jumlah}
                onChange={e => setJumlah(e.target.value)}
              />
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Keterangan</label>
              <input
                required
                type="text"
                disabled={!!duplikat}
                className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#5A5A40] focus:outline-none font-bold placeholder:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                value={keterangan}
                onChange={e => setKeterangan(e.target.value)}
              />
            </div>

            {/* Tanggal */}
            <div>
              <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Tanggal Pembayaran</label>
              <input
                type="datetime-local"
                disabled={!!duplikat}
                className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#5A5A40] focus:outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                value={tanggal}
                onChange={e => setTanggal(e.target.value)}
              />
            </div>

            {/* Info */}
            {!duplikat && (
              <div className="p-4 bg-[#5A5A40]/5 border border-[#E5E5DA] rounded-2xl text-xs text-[#5A5A40] font-medium flex items-start gap-2">
                <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#5A5A40]" />
                <span>
                  Dicatat sebagai <strong>pengeluaran</strong> kategori <strong>{gajiKat.nama}</strong> dan terhubung langsung ke petugas ini.
                </span>
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-5 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 transition-all">
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !!duplikat}
                className="flex-1 px-5 py-3 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#5A5A40]/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Gaji'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────


export default function PetugasList() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [wargaList, setWargaList] = useState<Warga[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPetugasForDetail, setSelectedPetugasForDetail] = useState<Petugas | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [petugasTransactions, setPetugasTransactions] = useState<Transaksi[]>([]);
  const [kasbonTarget, setKasbonTarget] = useState<Petugas | null>(null);
  const [bayarKasbonTarget, setBayarKasbonTarget] = useState<Petugas | null>(null);
  const [bayarGajiTarget, setBayarGajiTarget] = useState<Petugas | null>(null);
  // 'dropdown' = pilih dari warga, 'manual' = ketik bebas
  const [nameMode, setNameMode] = useState<'dropdown' | 'manual'>('dropdown');
  const [namaDropdownSearch, setNamaDropdownSearch] = useState('');
  const [showWargaDropdown, setShowWargaDropdown] = useState(false);

  const [formData, setFormData] = useState<{
    nama: string;
    jabatan: string;
    phone: string;
    status: 'Aktif' | 'Non-Aktif';
    sisaKasbon2025: number;
  }>({
    nama: '',
    jabatan: '',
    phone: '',
    status: 'Aktif',
    sisaKasbon2025: 0
  });

  useEffect(() => {
    const unsub = dbService.subscribe('petugas', (data) => {
      const enrichedData = data.map((p: any) => {
        if (p.nama.toLowerCase() === 'udin' && p.sisaKasbon2025 === undefined) {
          return { ...p, sisaKasbon2025: 300000 };
        }
        return p;
      });
      setPetugas(enrichedData);
    });

    const unsubT = dbService.subscribe('transaksi', (data: Transaksi[]) => {
      setPetugasTransactions(data);
    });

    const unsubK = dbService.subscribe('kategori', (data: Kategori[]) => {
      setKategori(data);
    });

    const unsubW = dbService.subscribe('warga', (data: Warga[]) => {
      setWargaList(data);
    });

    const handleClickOutside = () => { setActiveMenuId(null); setShowWargaDropdown(false); };
    window.addEventListener('click', handleClickOutside);

    return () => {
      unsub();
      unsubT();
      unsubK();
      unsubW();
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await dbService.update('petugas', editingId, formData);
      } else {
        await dbService.add('petugas', { ...formData, createdAt: Date.now() });
      }
      closeModal();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nama: '', jabatan: '', phone: '', status: 'Aktif', sisaKasbon2025: 0 });
    setNameMode('dropdown');
    setNamaDropdownSearch('');
    setShowWargaDropdown(false);
  };

  const handleEdit = (p: Petugas) => {
    setEditingId(p.id);
    setFormData({
      nama: p.nama,
      jabatan: p.jabatan,
      phone: p.phone || '',
      status: p.status,
      sisaKasbon2025: p.sisaKasbon2025 || 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await dbService.delete('petugas', deletingId);
      setDeletingId(null);
    }
  };

  const filteredPetugas = petugas.filter(p =>
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Daftar Petugas</h1>
          <p className="text-[#A3A375] font-medium mt-2">Manajemen staf dan petugas operasional lingkungan.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#5A5A40] text-[#F5F5F0] px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Petugas
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375]" />
          <input
            type="text"
            placeholder="Cari nama atau jabatan..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-medium shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-[#E5E5DA] rounded-2xl font-bold text-[#5A5A40] hover:bg-gray-50 transition-all shadow-sm">
          <Filter className="w-5 h-5 text-[#A3A375]" />
          Filter
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-[#E5E5DA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F0]/50">
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Identitas Petugas</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Jabatan</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Kontak</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Kasbon</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5DA]">
              {filteredPetugas.map((p) => {
                const outstanding = getKasbonOutstanding(p, petugasTransactions);
                return (
                  <tr key={p.id} className="table-row table-row--petugas hover:bg-[#F5F5F0]/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] font-serif font-bold text-lg shadow-inner">
                          {p.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#3A3A2A]">{p.nama}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="font-medium text-[#5A5A40]">{p.jabatan}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-[#A3A375] font-bold">
                        <Phone className="w-4 h-4" />
                        {p.phone || '-'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {outstanding > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                          <Banknote className="w-3 h-3" />
                          {formatCurrency(outstanding)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 className="w-3 h-3" />
                          Lunas
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                        p.status === 'Aktif' ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                      )}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === p.id ? null : p.id);
                          }}
                          className={cn(
                            "p-2 transition-all rounded-xl hover:bg-gray-100",
                            activeMenuId === p.id ? "bg-gray-100 text-[#5A5A40]" : "text-[#A3A375]"
                          )}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === p.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                              className="absolute right-16 top-1/2 -translate-y-1/2 z-50 min-w-[180px] bg-white border border-[#E5E5DA] shadow-xl rounded-2xl overflow-hidden py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { setSelectedPetugasForDetail(p); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                              >
                                <Eye className="w-4 h-4 text-[#A3A375]" />
                                View Detail
                              </button>

                              <button
                                onClick={() => { setKasbonTarget(p); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors border-t border-[#F5F5F0]"
                              >
                                <Banknote className="w-4 h-4 text-amber-500" />
                                Kasbon
                              </button>

                              <button
                                onClick={() => { setBayarKasbonTarget(p); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors border-t border-[#F5F5F0]"
                              >
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Bayar Kasbon
                              </button>

                              <button
                                onClick={() => { setBayarGajiTarget(p); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                              >
                                <Wallet className="w-4 h-4 text-[#A3A375]" />
                                Bayar Gaji
                              </button>

                              <button
                                onClick={() => { handleEdit(p); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                              >
                                <Pencil className="w-4 h-4 text-[#A3A375]" />
                                Edit Petugas
                              </button>

                              <button
                                onClick={() => { setDeletingId(p.id); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-[#F5F5F0]"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                Hapus Petugas
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredPetugas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-[#A3A375] font-serif italic text-lg opacity-60">
                    Belum ada data petugas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Kasbon Modal ── */}
      <AnimatePresence>
        {kasbonTarget && (
          <KasbonModal
            petugas={kasbonTarget}
            kategoriList={kategori}
            onClose={() => setKasbonTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Bayar Kasbon Modal ── */}
      <AnimatePresence>
        {bayarKasbonTarget && (
          <BayarKasbonModal
            petugas={bayarKasbonTarget}
            outstanding={getKasbonOutstanding(bayarKasbonTarget, petugasTransactions)}
            kategoriList={kategori}
            onClose={() => setBayarKasbonTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Bayar Gaji Modal ── */}
      <AnimatePresence>
        {bayarGajiTarget && (
          <BayarGajiModal
            petugas={bayarGajiTarget}
            kategoriList={kategori}
            allTransaksi={petugasTransactions}
            onClose={() => setBayarGajiTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-[#E5E5DA] p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Hapus Petugas?</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Tindakan ini akan menghapus data petugas secara permanen.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-6 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375]"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* ── Add / Edit Modal ── */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="form-card form-card--petugas bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Data Petugas' : 'Tambah Petugas'}</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  {/* ── Nama Lengkap: dropdown warga atau manual ── */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest ml-1">Nama Lengkap</label>
                      {!editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setNameMode(nameMode === 'dropdown' ? 'manual' : 'dropdown');
                            setFormData({ ...formData, nama: '' });
                            setNamaDropdownSearch('');
                            setShowWargaDropdown(false);
                          }}
                          className="text-[10px] font-bold text-[#5A5A40] hover:underline"
                        >
                          {nameMode === 'dropdown' ? '✏️ Input Manual' : '👥 Pilih dari Warga'}
                        </button>
                      )}
                    </div>

                    {!editingId && nameMode === 'dropdown' ? (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <input
                          readOnly
                          required
                          className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300 cursor-pointer"
                          placeholder="Ketik untuk cari warga..."
                          value={formData.nama || namaDropdownSearch}
                          onClick={() => { setShowWargaDropdown(true); setFormData({ ...formData, nama: '' }); }}
                        />
                        {/* overlay search */}
                        {showWargaDropdown && (
                          <div className="absolute inset-0 z-10">
                            <input
                              autoFocus
                              className="w-full h-full px-5 py-4 bg-white border-2 border-[#5A5A40] rounded-2xl focus:outline-none font-bold placeholder:text-gray-300"
                              placeholder="Ketik untuk cari warga..."
                              value={namaDropdownSearch}
                              onChange={(e) => { setNamaDropdownSearch(e.target.value); }}
                            />
                          </div>
                        )}
                        {showWargaDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E5DA] rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto">
                            {wargaList
                              .filter(w => w.nama.toLowerCase().includes(namaDropdownSearch.toLowerCase()))
                              .sort((a, b) => a.nama.localeCompare(b.nama))
                              .map(w => (
                                <button
                                  key={w.id}
                                  type="button"
                                  className="w-full text-left px-5 py-3 hover:bg-[#F5F5F0] transition-colors flex items-center justify-between group"
                                  onClick={() => {
                                    setFormData({ ...formData, nama: w.nama, phone: w.phone || formData.phone });
                                    setNamaDropdownSearch('');
                                    setShowWargaDropdown(false);
                                  }}
                                >
                                  <span className="font-bold text-[#3A3A2A] text-sm">{w.nama}</span>
                                  <span className="text-[10px] font-bold text-[#A3A375] bg-[#F5F5F0] group-hover:bg-white px-2 py-0.5 rounded-full">No. {w.noRumah}</span>
                                </button>
                              ))
                            }
                            {wargaList.filter(w => w.nama.toLowerCase().includes(namaDropdownSearch.toLowerCase())).length === 0 && (
                              <p className="px-5 py-4 text-sm text-[#A3A375] text-center">Tidak ada warga ditemukan</p>
                            )}
                          </div>
                        )}
                        {formData.nama && (
                          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#5A5A40]/10 rounded-xl">
                            <span className="text-xs font-bold text-[#5A5A40]">{formData.nama}</span>
                            <button type="button" onClick={() => setFormData({ ...formData, nama: '' })} className="ml-auto text-[#A3A375] hover:text-[#3A3A2A]">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        required type="text"
                        className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                        placeholder="Masukkan nama petugas..."
                        value={formData.nama}
                        onChange={(e) => setFormData({...formData, nama: e.target.value})}
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jabatan / Role</label>
                    <input
                      required type="text"
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="Contoh: Keamanan, Kebersihan, Staf Admin"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Nomor HP</label>
                    <input
                      type="tel"
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="0812xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Sisa Kasbon Tahun 2025 (Opsional)</label>
                    <input
                      type="number"
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="0"
                      value={formData.sisaKasbon2025 === 0 ? '' : formData.sisaKasbon2025}
                      onChange={(e) => setFormData({...formData, sisaKasbon2025: Number(e.target.value)})}
                    />
                  </div>
                  {/* Status hanya tampil saat Edit */}
                  {editingId && (
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Status Petugas</label>
                      <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                        {(['Aktif', 'Non-Aktif'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setFormData({ ...formData, status: s })}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                              formData.status === s
                                ? "bg-[#5A5A40] text-white shadow-sm"
                                : "text-[#A3A375] hover:bg-gray-50"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={closeModal} className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 disabled:opacity-50">
                    {isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Simpan Petugas')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Detail Modal ── */}
      <AnimatePresence>
        {selectedPetugasForDetail && (() => {
          const p = selectedPetugasForDetail;
          const outstanding = getKasbonOutstanding(p, petugasTransactions);
          const relatedTx = petugasTransactions.filter(t =>
            t.petugasId === p.id ||
            t.picName === p.nama ||
            t.keterangan.includes(`(PIC: ${p.nama})`)
          ).sort((a, b) => b.tanggal - a.tanggal);

          return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#F5F5F0] rounded-[32px] w-full max-w-2xl shadow-2xl border border-[#E5E5DA] overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50 shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#5A5A40] flex items-center justify-center text-white font-serif font-bold text-xl shadow-lg shadow-[#5A5A40]/30">
                      {p.nama.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-serif font-bold text-[#3A3A2A] leading-tight">{p.nama}</h2>
                      <p className="text-[#A3A375] font-bold text-xs uppercase tracking-widest mt-1">{p.jabatan}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPetugasForDetail(null)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375] border border-[#E5E5DA]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  <div className="space-y-6">
                    {/* Kasbon alert */}
                    {outstanding > 0 ? (
                      <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 text-sm">Outstanding Kasbon</p>
                          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                            Petugas ini masih memiliki kasbon sebesar{' '}
                            <span className="font-bold font-mono">{formatCurrency(outstanding)}</span> yang belum terlunasi.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => { setBayarKasbonTarget(p); setSelectedPetugasForDetail(null); }}
                            className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md"
                          >
                            Bayar Kasbon
                          </button>
                          <button
                            onClick={() => { setKasbonTarget(p); setSelectedPetugasForDetail(null); }}
                            className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md"
                          >
                            + Kasbon
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-3xl flex items-center gap-4">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-emerald-900 text-sm">Tidak ada kasbon outstanding</p>
                          <p className="text-emerald-700 text-xs mt-0.5">Semua kasbon petugas ini telah lunas.</p>
                        </div>
                        <button
                          onClick={() => { setKasbonTarget(p); setSelectedPetugasForDetail(null); }}
                          className="px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-bold hover:opacity-90 transition-all shadow-md shrink-0"
                        >
                          + Kasbon
                        </button>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                        <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Outstanding Kasbon</p>
                        <p className={cn("text-base lg:text-lg font-bold font-mono", outstanding > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {formatCurrency(outstanding > 0 ? outstanding : 0)}
                        </p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                        <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Kasbon Diambil</p>
                        <p className="text-base lg:text-lg font-bold font-mono text-amber-600">
                          {formatCurrency(
                            (p.sisaKasbon2025 || 0) +
                            relatedTx.filter(t => t.tipe === 'pengeluaran' && t.keterangan.toLowerCase().includes('kasbon'))
                              .reduce((acc, t) => acc + t.jumlah, 0)
                          )}
                        </p>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                        <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Jumlah Transaksi</p>
                        <p className="text-lg lg:text-xl font-black text-[#5A5A40]">
                          {relatedTx.length} <span className="text-[10px] font-bold text-[#A3A375] uppercase underline underline-offset-4 decoration-2 decoration-[#5A5A40]/20">Record</span>
                        </p>
                      </div>
                    </div>

                    {/* Transaction history */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-[#3A3A2A] uppercase tracking-widest flex items-center gap-2 px-2">
                        <Receipt className="w-4 h-4 text-[#A3A375]" />
                        Riwayat Transaksi PIC
                      </h3>

                      <div className="space-y-3">
                        {relatedTx.map((t) => (
                          <div key={t.id} className="bg-white p-5 rounded-2xl border border-[#E5E5DA] hover:border-[#A3A375] transition-all group shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                  t.tipe === 'pemasukan' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                )}>
                                  {t.tipe === 'pemasukan' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div>
                                  <p className="font-bold text-[#3A3A2A] text-sm group-hover:text-[#5A5A40] transition-colors">{t.keterangan}</p>
                                  <p className="text-[10px] font-bold text-[#A3A375] flex items-center gap-1 mt-0.5">
                                    <Calendar className="w-3 h-3" /> {formatDate(t.tanggal)}
                                  </p>
                                </div>
                              </div>
                              <p className={cn(
                                "font-bold font-mono tracking-tight whitespace-nowrap",
                                t.tipe === 'pemasukan' ? "text-green-600" : "text-red-600"
                              )}>
                                {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                              </p>
                            </div>
                          </div>
                        ))}

                        {relatedTx.length === 0 && (
                          <div className="text-center py-12 px-6 bg-white/50 border border-dashed border-[#E5E5DA] rounded-3xl">
                            <Receipt className="w-10 h-10 text-[#E5E5DA] mx-auto mb-3" />
                            <p className="text-[#A3A375] font-serif italic">Belum ada catatan transaksi untuk petugas ini.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[#E5E5DA] bg-white/50 flex flex-wrap justify-end gap-2 shrink-0">
                  <button
                    onClick={() => { setKasbonTarget(p); setSelectedPetugasForDetail(null); }}
                    className="px-5 py-2.5 rounded-full bg-amber-500 text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center gap-2"
                  >
                    <Banknote className="w-4 h-4" /> Kasbon
                  </button>
                  <button
                    onClick={() => { setBayarKasbonTarget(p); setSelectedPetugasForDetail(null); }}
                    className="px-5 py-2.5 rounded-full bg-emerald-600 text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-emerald-600/20 text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Bayar Kasbon
                  </button>
                  <button
                    onClick={() => { setBayarGajiTarget(p); setSelectedPetugasForDetail(null); }}
                    className="px-5 py-2.5 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#5A5A40]/20 text-sm flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" /> Bayar Gaji
                  </button>
                  <button
                    onClick={() => setSelectedPetugasForDetail(null)}
                    className="px-5 py-2.5 rounded-full border border-[#E5E5DA] text-[#5A5A40] font-bold hover:bg-[#F5F5F0] active:scale-95 transition-all text-sm"
                  >
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
