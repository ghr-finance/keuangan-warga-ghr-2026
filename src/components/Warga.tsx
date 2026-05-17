import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Warga, Transaksi, Kategori, TunggakanMacet } from '../types';
import { Plus, Search, MoreVertical, Phone, Home, Filter, AlertCircle, CheckCircle2, Users, X, CreditCard, DollarSign, Pencil, Eye, Trash2 } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import IuranModal from './IuranModal';
import WargaDetailModal from './WargaDetailModal';

export default function WargaList() {
  const [warga, setWarga] = useState<Warga[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [tunggakanMacet, setTunggakanMacet] = useState<TunggakanMacet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWargaPay, setSelectedWargaPay] = useState<Warga | undefined>(undefined);
  const [selectedWargaDetail, setSelectedWargaDetail] = useState<Warga | null>(null);
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
    statusHuni: 'Menghuni' as const
  });

  useEffect(() => {
    const unsubW = dbService.subscribe('warga', setWarga);
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubK = dbService.subscribe('kategori', setKategori);
    const unsubTM = dbService.subscribe('tunggakan_macet', setTunggakanMacet);
    
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    
    return () => {
      unsubW();
      unsubT();
      unsubK();
      unsubTM();
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
        await dbService.add('warga', {
          ...formData,
          statusHuniUpdatedAt: 0, // Set to 0 so it doesn't trigger past status flipping
          noRumahUpdatedAt: 0,
          createdAt: Date.now()
        });
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
    setFormData({ nama: '', noRumah: '', phone: '', isIuranWajib: true, isIuranRT: false, status: 'Aktif', statusHuni: 'Menghuni' });
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
      statusHuni: w.statusHuni
    });
    setIsModalOpen(true);
  };

  const handleViewDetail = (w: Warga) => {
    setSelectedWargaDetail(w);
    setIsDetailModalOpen(true);
  };

  const handleToggleStatusHuni = async (w: Warga) => {
    const nextStatusHuni = w.statusHuni === 'Menghuni' ? 'Tidak Menghuni' : 'Menghuni';
    const nextStatus = nextStatusHuni === 'Menghuni' ? 'Aktif' : 'Non-Aktif';
    await dbService.update('warga', w.id, { 
      statusHuni: nextStatusHuni,
      status: nextStatus,
      statusHuniUpdatedAt: Date.now()
    });
  };

  const paidThisMonth = new Set(
    transaksi
      .filter(t => t.bulanIuran === selectedViewMonth)
      .map(t => t.wargaId)
  );

  const filteredWarga = warga.filter(w => {
    const matchesSearch = w.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         w.noRumah.toLowerCase().includes(searchTerm.toLowerCase());
    const isArrear = w.isIuranWajib && w.status === 'Aktif' && !paidThisMonth.has(w.id);
    return matchesSearch && (!filterArrears || isArrear);
  });

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
            {/* Generate last 12 months for view filter */}
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
              {filteredWarga.map((w) => {
                const hasPaid = paidThisMonth.has(w.id);
                const isArrear = w.isIuranWajib && w.status === 'Aktif' && !hasPaid;
                
                return (
                  <tr key={w.id} className="hover:bg-[#F5F5F0]/30 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-[#A3A375]/10 rounded-2xl flex items-center justify-center font-bold text-[#5A5A40]">
                          {w.nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-[#3A3A2A]">{w.nama}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 text-xs text-[#A3A375] font-bold">
                              <Home className="w-3.5 h-3.5" />
                              No: {w.noRumah}
                            </div>
                            <button 
                              onClick={() => handleToggleStatusHuni(w)}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition-all hover:scale-105 active:scale-95 flex flex-col items-start leading-tight",
                                w.statusHuni === 'Menghuni' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                              )}
                              title="Ganti Status Hunian"
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
                      {w.isIuranWajib ? (
                        <div className={cn(
                          "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold",
                          hasPaid ? "bg-[#f0f9f1] text-emerald-700" : "bg-[#fff5f5] text-[#8B4513]"
                        )}>
                          {hasPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {hasPaid ? 'Sudah Bayar' : 'Belum Bayar'}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#A3A375] font-black uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">Bebas Iuran</span>
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
                              className="absolute right-16 top-1/2 -translate-y-1/2 z-50 min-w-[160px] bg-white border border-[#E5E5DA] shadow-xl rounded-2xl overflow-hidden py-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button 
                                onClick={() => {
                                  handleViewDetail(w);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                              >
                                <Eye className="w-4 h-4 text-[#A3A375]" />
                                Detail Warga
                              </button>
                              
                              <button 
                                onClick={() => {
                                  setSelectedWargaPay(w);
                                  setIsIuranModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                              >
                                <CreditCard className="w-4 h-4 text-[#A3A375]" />
                                {hasPaid ? 'Bayar Lagi' : 'Bayar Iuran'}
                              </button>

                              <button 
                                onClick={() => {
                                  handleEdit(w);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                              >
                                <Pencil className="w-4 h-4 text-[#A3A375]" />
                                Edit Data
                              </button>

                              <button 
                                onClick={() => {
                                  setDeletingId(w.id);
                                  setActiveMenuId(null);
                                }}
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
              {filteredWarga.length === 0 && (
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
                Tindakan ini akan menghapus data warga secara permanen. Riwayat transaksi iuran terkait akan tetap ada untuk keperluan audit.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-6 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375]"
                >
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

      {/* Modal Iuran */}
      <IuranModal 
        isOpen={isIuranModalOpen}
        onClose={() => setIsIuranModalOpen(false)}
        selectedWarga={selectedWargaPay}
        wargaList={warga}
      />

      {/* Modal Detail Warga */}
      <WargaDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        warga={selectedWargaDetail}
        transaksi={transaksi}
        kategori={kategori}
        tunggakanMacetList={tunggakanMacet}
      />

      {/* Modal Tambah Warga */}
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
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Data Warga' : 'Tambah Warga'}</h2>
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
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
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
                        onChange={(e) => setFormData({...formData, noRumah: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">WhatsApp</label>
                      <input 
                        type="tel" 
                        className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="0812..."
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Status Hunian & Keaktifan</label>
                    <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                      {(['Menghuni', 'Tidak Menghuni'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            statusHuni: s,
                            status: s === 'Menghuni' ? 'Aktif' : 'Non-Aktif'
                          })}
                          className={cn(
                            "flex-1 py-3 text-xs font-bold rounded-xl transition-all flex flex-col items-center gap-0.5",
                            formData.statusHuni === s 
                              ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" 
                              : "text-[#A3A375] hover:bg-gray-50"
                          )}
                        >
                          <span>{s}</span>
                          <span className={cn("text-[8px] uppercase tracking-tighter opacity-80", formData.statusHuni === s ? "text-white/80" : "text-[#A3A375]")}>
                            ({s === 'Menghuni' ? 'Aktif' : 'Non-Aktif'})
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E5DA]">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                      formData.isIuranWajib ? "bg-[#5A5A40] text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="isIuran" className="text-sm font-bold text-[#3A3A2A]">Wajib Bayar Iuran</label>
                      <p className="text-[10px] text-[#A3A375] font-bold">Pemasukan rutin bulanan</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="isIuran" 
                      checked={formData.isIuranWajib}
                      onChange={(e) => setFormData({...formData, isIuranWajib: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-[#E5E5DA] text-[#5A5A40] focus:ring-[#A3A375]"
                    />
                  </div>

                  <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E5DA]">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                      formData.isIuranRT ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="isIuranRT" className="text-sm font-bold text-[#3A3A2A]">Sertakan Iuran RT</label>
                      <p className="text-[10px] text-[#A3A375] font-bold">Benefit pengelolaan lingkungan ekstra</p>
                    </div>
                    <input 
                      type="checkbox" 
                      id="isIuranRT" 
                      checked={formData.isIuranRT}
                      onChange={(e) => setFormData({...formData, isIuranRT: e.target.checked})}
                      className="w-6 h-6 rounded-lg border-[#E5E5DA] text-[#5A5A40] focus:ring-[#A3A375]"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 disabled:opacity-50"
                  >
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
