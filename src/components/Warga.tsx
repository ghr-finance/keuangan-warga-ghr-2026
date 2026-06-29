import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Warga, Transaksi, Kategori, TunggakanMacet, WargaHistory } from '../types';
import { Plus, Search, MoreVertical, Phone, Home, Filter, AlertCircle, CheckCircle2, Users, X, CreditCard, DollarSign, Pencil, Eye, Trash2, History, ArrowRightLeft, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import IuranModal from './IuranModal';
import WargaDetailModal from './WargaDetailModal';

// ─── Status Update Modal ──────────────────────────────────────────────────────

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Warga | null;
  wargaHistory: WargaHistory[];
}

function StatusUpdateModal({ isOpen, onClose, warga, wargaHistory }: StatusUpdateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'pemilik' | 'iuran'>('status');

  const [form, setForm] = useState({
    noRumah: '',
    status: 'Aktif' as 'Aktif' | 'Non-Aktif',
    statusHuni: 'Menghuni' as 'Menghuni' | 'Tidak Menghuni' | 'Keluar',
    isIuranWajib: true,
    isIuranRT: false,
    role: 'Pemilik' as 'Pemilik' | 'Penyewa',
    keterangan: '',
    effectiveFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  useEffect(() => {
    if (warga) {
      setForm({
        noRumah: warga.noRumah,
        status: warga.status,
        statusHuni: warga.statusHuni,
        isIuranWajib: warga.isIuranWajib,
        isIuranRT: warga.isIuranRT,
        role: warga.role,
        keterangan: '',
        effectiveFrom: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }, [warga]);

  if (!isOpen || !warga) return null;

  // Get current history entries for this warga
  const myHistory = wargaHistory
    .filter(h => h.wargaId === warga.id)
    .sort((a, b) => b.effectiveFrom - a.effectiveFrom);

  const handleSubmit = async () => {
    if (!form.keterangan.trim()) {
      alert('Keterangan perubahan wajib diisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await dbService.updateWargaStatus(warga.id, {
        noRumah: form.noRumah,
        status: form.status,
        statusHuni: form.statusHuni,
        isIuranWajib: form.isIuranWajib,
        isIuranRT: form.isIuranRT,
        role: form.role,
        effectiveFrom: new Date(form.effectiveFrom).getTime(),
        keterangan: form.keterangan.trim(),
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'status', label: 'Status Hunian', icon: Home },
    { id: 'iuran', label: 'Keikutsertaan Iuran', icon: CreditCard },
    { id: 'pemilik', label: 'Ganti Pemilik Rumah', icon: ArrowRightLeft },
  ] as const;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          className="bg-[#F5F5F0] rounded-[40px] w-full max-w-2xl shadow-2xl border border-[#E5E5DA] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-lg text-white font-serif font-bold text-xl">
                {warga.nama.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">Ubah Status</h2>
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">{warga.nama} · Rumah No. {warga.noRumah}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Tab bar */}
            <div className="flex gap-1 p-3 bg-white/30 border-b border-[#E5E5DA]">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold transition-all",
                    activeTab === tab.id
                      ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20"
                      : "text-[#A3A375] hover:bg-white"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-8 space-y-6">
              {/* Status Hunian Tab */}
              {activeTab === 'status' && (
                <div className="space-y-5">
                  <p className="text-xs text-[#A3A375] font-medium">Ubah status kehadiran fisik warga di rumah ini. Perubahan ini akan mempengaruhi besaran iuran yang harus dibayar.</p>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Peran Warga</label>
                    <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1 mb-5">
                      {(['Pemilik', 'Penyewa'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setForm({ ...form, role: r })}
                          className={cn(
                            "flex-1 py-3 text-xs font-bold rounded-xl transition-all",
                            form.role === r
                              ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20"
                              : "text-[#A3A375] hover:bg-gray-50"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Status Hunian</label>
                    <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                      {(['Menghuni', 'Tidak Menghuni', 'Keluar'] as const).map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setForm({ ...form, statusHuni: s, status: s === 'Keluar' ? 'Pindah' : (s === 'Menghuni' ? 'Aktif' : 'Non-Aktif') })}
                          className={cn(
                            "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-0.5",
                            form.statusHuni === s
                              ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20"
                              : "text-[#A3A375] hover:bg-gray-50"
                          )}
                        >
                          <span>{s === 'Keluar' ? 'Pindah/Keluar' : s}</span>
                          <span className="text-[8px] opacity-70">({s === 'Keluar' ? 'Pindah' : (s === 'Menghuni' ? 'Aktif' : 'Non-Aktif')})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Iuran Participation Tab */}
              {activeTab === 'iuran' && (
                <div className="space-y-4">
                  <p className="text-xs text-[#A3A375] font-medium">Atur keikutsertaan warga dalam program iuran tambahan. Perubahan ini dicatat secara historis.</p>
                  <div className="space-y-3">
                    {/* isIuranWajib is hidden because it's mandatory now */}

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isIuranRT: !form.isIuranRT })}
                      className="w-full flex items-center gap-4 bg-white p-5 rounded-2xl border border-[#E5E5DA] hover:border-[#A3A375] transition-all text-left"
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner", form.isIuranRT ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400")}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#3A3A2A]">Ikut Serta Iuran RT</p>
                        <p className="text-[10px] text-[#A3A375] font-bold">+Rp 20.000/bulan untuk pengelolaan lingkungan ekstra</p>
                      </div>
                      {form.isIuranRT ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-[#A3A375]" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Ganti Pemilik Tab */}
              {activeTab === 'pemilik' && (
                <div className="space-y-5">
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                    <p className="text-xs font-bold text-amber-800">⚠️ Perubahan nomor rumah akan memindahkan warga ini ke rumah baru, dan seluruh riwayat iuran tetap terhubung ke ID warga ini. Gunakan untuk kasus pindah rumah atau penyewa berganti.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Nomor Rumah Baru</label>
                    <input
                      type="text"
                      className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={form.noRumah}
                      onChange={e => setForm({ ...form, noRumah: e.target.value })}
                      placeholder="Contoh: 15A"
                    />
                  </div>
                  <p className="text-[10px] text-[#A3A375] font-medium">
                    Nomor rumah saat ini: <span className="font-bold text-[#5A5A40]">{warga.noRumah}</span>
                  </p>
                </div>
              )}

              {/* Common: tanggal efektif & keterangan */}
              <div className="pt-4 border-t border-[#E5E5DA] space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Tanggal Mulai Berlaku</label>
                  <input
                    type="datetime-local"
                    className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                    value={form.effectiveFrom}
                    onChange={e => setForm({ ...form, effectiveFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Keterangan Perubahan <span className="text-red-400">*</span></label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Mis: Pindah ke rumah orang tua, Masa sewa selesai, Mulai ikut program RT, dst."
                    className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-medium resize-none"
                    value={form.keterangan}
                    onChange={e => setForm({ ...form, keterangan: e.target.value })}
                  />
                </div>
              </div>

              {/* History Preview */}
              {myHistory.length > 0 && (
                <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/10 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-[#5A5A40]" />
                    <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">Riwayat Status Sebelumnya</p>
                  </div>
                  <div className="space-y-2">
                    {myHistory.slice(0, 3).map(h => (
                      <div key={h.id} className="flex items-start gap-3 text-xs">
                        <div className={cn("w-2 h-2 rounded-full mt-1 shrink-0", h.effectiveTo == null ? "bg-emerald-500 animate-pulse" : "bg-[#A3A375]")} />
                        <div>
                          <p className="font-bold text-[#3A3A2A]">{h.statusHuni} ({h.status}) · Rumah {h.noRumah}</p>
                          <p className="text-[#A3A375]">{formatDate(h.effectiveFrom)}{h.effectiveTo ? ` → ${formatDate(h.effectiveTo)}` : ' → Sekarang'}</p>
                          {h.keterangan && <p className="text-[#5A5A40] italic">"{h.keterangan}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-[#E5E5DA] bg-white/50 shrink-0 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-white active:scale-95 transition-all">
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !form.keterangan.trim()}
              className="flex-[2] px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><History className="w-5 h-5" />Simpan & Catat Riwayat</>}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ─── Main WargaList Component ─────────────────────────────────────────────────

export default function WargaList() {
  const [warga, setWarga] = useState<Warga[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [tunggakanMacet, setTunggakanMacet] = useState<TunggakanMacet[]>([]);
  const [wargaHistory, setWargaHistory] = useState<WargaHistory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedWargaPay, setSelectedWargaPay] = useState<Warga | undefined>(undefined);
  const [selectedWargaDetail, setSelectedWargaDetail] = useState<Warga | null>(null);
  const [selectedWargaStatus, setSelectedWargaStatus] = useState<Warga | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArrears, setFilterArrears] = useState(false);
  const [selectedViewMonth, setSelectedViewMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    noRumah: '',
    phone: '',
    isIuranWajib: true,
    isIuranRT: false,
    status: 'Aktif' as const,
    statusHuni: 'Menghuni' as const,
    role: 'Pemilik' as 'Pemilik' | 'Penyewa',
  });

  useEffect(() => {
    const unsubW = dbService.subscribe('warga', setWarga);
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubK = dbService.subscribe('kategori', setKategori);
    const unsubTM = dbService.subscribe('tunggakan_macet', setTunggakanMacet);
    const unsubH = dbService.subscribe('warga_history', setWargaHistory);

    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);

    return () => {
      unsubW();
      unsubT();
      unsubK();
      unsubTM();
      unsubH();
      window.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const oldWarga = warga.find(w => w.id === editingId);
        const hasStatusChanged = oldWarga?.statusHuni !== formData.statusHuni;
        const hasNoRumahChanged = oldWarga?.noRumah !== formData.noRumah;

        await dbService.update('warga', editingId, {
          ...formData,
          statusHuniUpdatedAt: hasStatusChanged ? Date.now() : (oldWarga?.statusHuniUpdatedAt ?? 0),
          noRumahUpdatedAt: hasNoRumahChanged ? Date.now() : (oldWarga?.noRumahUpdatedAt ?? 0)
        });
      } else {
        // New warga: create warga record first, then immediately seed initial warga_history
        const newId = await dbService.add('warga', {
          ...formData,
          statusHuniUpdatedAt: 0,
          noRumahUpdatedAt: 0,
          createdAt: Date.now()
        });

        // Seed the initial history entry so arrears calculation works correctly from day one
        if (newId) {
          await dbService.updateWargaStatus(newId, {
            noRumah: formData.noRumah,
            status: formData.status,
            statusHuni: formData.statusHuni,
            isIuranWajib: formData.isIuranWajib,
            isIuranRT: formData.isIuranRT,
            role: formData.role,
            effectiveFrom: Date.now(),
            keterangan: 'Warga baru terdaftar',
          });
        }
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
    setFormData({ nama: '', noRumah: '', phone: '', isIuranWajib: true, isIuranRT: false, status: 'Aktif', statusHuni: 'Menghuni', role: 'Pemilik' });
  };

  const handleEdit = (w: Warga) => {
    setEditingId(w.id);
    setFormData({
      nama: w.nama,
      noRumah: w.noRumah,
      phone: w.phone || '',
      isIuranWajib: w.isIuranWajib,
      isIuranRT: w.isIuranRT || false,
      status: w.status,
      statusHuni: w.statusHuni,
      role: w.role,
    });
    setIsModalOpen(true);
  };

  const handleViewDetail = (w: Warga) => {
    setSelectedWargaDetail(w);
    setIsDetailModalOpen(true);
  };

  const handleOpenStatusModal = (w: Warga) => {
    setSelectedWargaStatus(w);
    setIsStatusModalOpen(true);
  };

  const paidThisMonth = useMemo(() => new Set(
    transaksi
      .filter(t => t.bulanIuran === selectedViewMonth)
      .map(t => t.wargaId)
  ), [transaksi, selectedViewMonth]);

  const filteredWarga = useMemo(() => warga.filter(w => {
    const matchesSearch = w.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.noRumah.toLowerCase().includes(searchTerm.toLowerCase());
    const isArrear = w.isIuranWajib && w.status === 'Aktif' && !paidThisMonth.has(w.id);
    return matchesSearch && (!filterArrears || isArrear);
  }), [warga, searchTerm, filterArrears, paidThisMonth]);

  const sortedWarga = useMemo(() =>
    [...filteredWarga].sort((a, b) => parseInt(a.noRumah, 10) - parseInt(b.noRumah, 10) || a.nama.localeCompare(b.nama)),
    [filteredWarga]
  );

  const allKnownHouses = useMemo(() => {
    const houses = new Set<string>();
    wargaHistory.forEach(h => houses.add(h.noRumah));
    warga.forEach(w => houses.add(w.noRumah));
    return Array.from(houses).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [wargaHistory, warga]);

  // Houses without an active Pemilik (no owner = unmanaged property)
  const emptyHouses = useMemo(() => {
    return allKnownHouses.filter(noRumah => {
      const wargaForHouse = warga.filter(w => w.noRumah === noRumah);
      if (wargaForHouse.length === 0) return true;
      // A house is "unmanaged" if there's no active Pemilik for it
      const hasActivePemilik = wargaForHouse.some(
        w => (w.role || 'Pemilik') === 'Pemilik' && w.status !== 'Pindah'
      );
      return !hasActivePemilik;
    });
  }, [allKnownHouses, warga]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Daftar Warga</h1>
          <p className="text-[#A3A375] font-medium mt-2">Manajemen penduduk dan status iuran bulanan.</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setSelectedWargaPay(undefined);
              setIsIuranModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 bg-white text-[#5A5A40] border border-[#E5E5DA] px-6 py-3 rounded-full font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <DollarSign className="w-5 h-5 text-[#A3A375]" />
            Terima Iuran
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#5A5A40] text-[#F5F5F0] px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            Tambah Warga
          </button>
        </div>
      </div>

      {emptyHouses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[24px] p-6 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-900">Perhatian: Ada Rumah Tanpa Pemilik Terdaftar</h3>
            <p className="text-sm text-amber-800 mt-1 mb-3">
              Properti berikut tidak memiliki data <strong>Pemilik</strong> aktif. Tanpa Pemilik, tagihan iuran bulanan tidak akan dikenakan ke siapapun saat rumah kosong dari Penyewa. Segera tambahkan profil Pemilik dengan peran <strong>"Pemilik"</strong> dan status <strong>"Tidak Menghuni"</strong>.
            </p>
            <div className="flex flex-wrap gap-2">
              {emptyHouses.map(no => (
                <span key={no} className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-bold shadow-sm">
                  Rumah No. {no}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375]" />
          <input
            type="text"
            placeholder="Cari nama atau nomor rumah..."
            className="w-full pl-12 pr-6 py-3.5 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none placeholder:text-[#A3A375]/50 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select
            value={selectedViewMonth}
            onChange={(e) => setSelectedViewMonth(e.target.value)}
            className="px-6 py-3.5 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-sm text-[#4A4A3A] appearance-none"
          >
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1);
              return (
                <option key={format(d, 'yyyy-MM')} value={format(d, 'yyyy-MM')}>
                  Iuran {format(d, 'MMMM yyyy')}
                </option>
              );
            })}
          </select>
          <button
            onClick={() => setFilterArrears(!filterArrears)}
            className={cn(
              "flex items-center gap-2 px-6 py-3.5 rounded-full border transition-all font-bold text-sm shrink-0",
              filterArrears ? "bg-[#8B4513] border-[#8B4513] text-white" : "bg-white border-[#E5E5DA] text-[#4A4A3A] hover:bg-gray-50"
            )}
          >
            <Filter className="w-4 h-4" />
            {filterArrears ? 'Tagihan Menunggak' : 'Semua Warga'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5E5DA] rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F0]/50 border-b border-[#E5E5DA]">
                <th className="px-8 py-5 text-[10px] font-black text-[#A3A375] uppercase tracking-[0.2em]">Identitas Warga</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#A3A375] uppercase tracking-[0.2em]">Kontak</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#A3A375] uppercase tracking-[0.2em]">Status Iuran</th>
                <th className="px-8 py-5 text-[10px] font-black text-[#A3A375] uppercase tracking-[0.2em] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F5F0]">
              {sortedWarga.map((w) => {
                const hasPaid = paidThisMonth.has(w.id);
                const hasHistory = wargaHistory.some(h => h.wargaId === w.id);

                return (
                  <tr key={w.id} className="hover:bg-[#F5F5F0]/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#A3A375]/10 rounded-2xl flex items-center justify-center font-bold text-[#5A5A40]">
                          {w.nama.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#3A3A2A]">{w.nama}</p>
                            {hasHistory && (
                              <span title="Ada riwayat historis" className="w-4 h-4 flex items-center justify-center">
                                <History className="w-3.5 h-3.5 text-[#A3A375]" />
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 text-xs text-[#A3A375] font-bold">
                              <Home className="w-3.5 h-3.5" />
                              No: {w.noRumah}
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                              w.role === 'Penyewa' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {w.role || 'Pemilik'}
                            </span>
                            <button
                              onClick={() => handleOpenStatusModal(w)}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all hover:scale-105 active:scale-95 flex flex-col items-start leading-tight",
                                w.statusHuni === 'Menghuni' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                              )}
                              title="Klik untuk ubah status"
                            >
                              <span>{w.statusHuni}</span>
                              <span className="text-[7px] opacity-70">({w.status})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-sm text-[#4A4A3A] font-medium">
                        <div className="w-8 h-8 rounded-full bg-[#f0f4f0] flex items-center justify-center">
                          <Phone className="w-4 h-4 text-[#5A5A40]" />
                        </div>
                        {w.phone || '-'}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {w.status === 'Pindah' ? (
                        <span className="text-[10px] text-[#A3A375] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-200">Arsip / Pindah</span>
                      ) : (
                        <div className={cn(
                          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold",
                          hasPaid ? "bg-[#f0f9f1] text-emerald-700" : "bg-[#fff5f5] text-[#8B4513]"
                        )}>
                          {hasPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {hasPaid ? 'Sudah Bayar' : 'Belum Bayar'}
                        </div>
                      )}
                      {w.isIuranRT && w.status !== 'Pindah' && (
                        <span className="ml-2 text-[10px] text-emerald-600 font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-full">+RT</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === w.id ? null : w.id);
                          }}
                          className={cn(
                            "p-2 transition-all rounded-xl hover:bg-gray-100",
                            activeMenuId === w.id ? "bg-gray-100 text-[#5A5A40]" : "text-[#A3A375]"
                          )}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === w.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10, x: 10 }}
                              className="absolute right-16 top-1/2 -translate-y-1/2 z-50 min-w-[180px] bg-white border border-[#E5E5DA] shadow-xl rounded-2xl overflow-hidden py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { handleViewDetail(w); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                              >
                                <Eye className="w-4 h-4 text-[#A3A375]" />
                                Detail Warga
                              </button>

                              <button
                                onClick={() => { setSelectedWargaPay(w); setIsIuranModalOpen(true); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                              >
                                <CreditCard className="w-4 h-4 text-[#A3A375]" />
                                {hasPaid ? 'Bayar Lagi' : 'Bayar Iuran'}
                              </button>

                              <button
                                onClick={() => { handleOpenStatusModal(w); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                              >
                                <History className="w-4 h-4 text-[#A3A375]" />
                                Ubah Status & Riwayat
                              </button>

                              <button
                                onClick={() => { handleEdit(w); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                              >
                                <Pencil className="w-4 h-4 text-[#A3A375]" />
                                Edit Data Dasar
                              </button>

                              <button
                                onClick={() => { setDeletingId(w.id); setActiveMenuId(null); }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors border-t border-[#F5F5F0]"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                                Hapus Warga
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedWarga.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <Users className="w-12 h-12 text-[#E5E5DA] mx-auto mb-4" />
                    <p className="text-[#A3A375] font-medium italic">
                      {searchTerm ? 'Warga tidak ditemukan.' : 'Belum ada data warga terdaftar.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
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
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Hapus Data Warga?</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Tindakan ini akan menghapus data warga beserta seluruh riwayat statusnya secara permanen. Riwayat transaksi tetap ada.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setDeletingId(null)} className="flex-1 px-6 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375]">
                  Batal
                </button>
                <button
                  onClick={async () => {
                    await dbService.delete('warga', deletingId);
                    setDeletingId(null);
                  }}
                  className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => { setIsStatusModalOpen(false); setSelectedWargaStatus(null); }}
        warga={selectedWargaStatus}
        wargaHistory={wargaHistory}
      />

      {/* Iuran Modal */}
      <IuranModal
        isOpen={isIuranModalOpen}
        onClose={() => setIsIuranModalOpen(false)}
        selectedWarga={selectedWargaPay}
        wargaList={warga}
        wargaHistory={wargaHistory}
      />

      {/* Detail Modal */}
      <WargaDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        warga={selectedWargaDetail}
        transaksi={transaksi}
        kategori={kategori}
        tunggakanMacetList={tunggakanMacet}
        wargaHistory={wargaHistory}
        allWarga={warga}
      />

      {/* Add/Edit Warga Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Data Dasar Warga' : 'Tambah Warga Baru'}</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Nama Lengkap</label>
                    <input
                      required
                      type="text"
                      className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">No. Rumah</label>
                      <input
                        required
                        type="text"
                        className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                        value={formData.noRumah}
                        onChange={(e) => setFormData({ ...formData, noRumah: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">WhatsApp</label>
                      <input
                        type="tel"
                        className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0812..."
                      />
                    </div>
                  </div>

                  {!editingId && (
                    <>
                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Peran Warga</label>
                        <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                          {(['Pemilik', 'Penyewa'] as const).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setFormData({ ...formData, role: r })}
                              className={cn(
                                "flex-1 py-3 text-xs font-bold rounded-xl transition-all",
                                formData.role === r ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-[#A3A375] hover:bg-gray-50"
                              )}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Status Hunian Awal</label>
                        <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                          {(['Menghuni', 'Tidak Menghuni', 'Keluar'] as const).map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({ ...formData, statusHuni: s, status: s === 'Keluar' ? 'Pindah' : (s === 'Menghuni' ? 'Aktif' : 'Non-Aktif') })}
                              className={cn(
                                "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-0.5",
                                formData.statusHuni === s ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-[#A3A375] hover:bg-gray-50"
                              )}
                            >
                              <span>{s === 'Keluar' ? 'Pindah/Keluar' : s}</span>
                              <span className="text-[8px] opacity-80">({s === 'Keluar' ? 'Pindah' : (s === 'Menghuni' ? 'Aktif' : 'Non-Aktif')})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E5DA]">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner", formData.isIuranRT ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400")}>
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <label htmlFor="isIuranRT" className="text-sm font-bold text-[#3A3A2A]">Sertakan Iuran RT</label>
                          <p className="text-[10px] text-[#A3A375] font-bold">+Rp 20.000/bulan</p>
                        </div>
                        <input type="checkbox" id="isIuranRT" checked={formData.isIuranRT} onChange={(e) => setFormData({ ...formData, isIuranRT: e.target.checked })} className="w-6 h-6 rounded-lg border-[#E5E5DA] text-[#5A5A40] focus:ring-[#A3A375]" />
                      </div>
                    </>
                  )}

                  {editingId && (
                    <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/15 rounded-2xl p-4 flex items-start gap-3">
                      <History className="w-4 h-4 text-[#5A5A40] mt-0.5 shrink-0" />
                      <p className="text-xs text-[#5A5A40] font-medium">Untuk mengubah status hunian atau keikutsertaan iuran, gunakan menu <strong>"Ubah Status & Riwayat"</strong> agar perubahan tercatat secara historis.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex gap-4">
                  <button type="button" onClick={closeModal} className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 disabled:opacity-50">
                    {isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Simpan Data')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
