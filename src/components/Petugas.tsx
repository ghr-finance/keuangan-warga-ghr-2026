import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Petugas } from '../types';
import { Plus, Search, MoreVertical, Phone, UserCircle2, Filter, X, Pencil, Trash2, Eye, Receipt, Calendar, ArrowUpRight, ArrowDownLeft, AlertCircle } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Transaksi } from '../types';

export default function PetugasList() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedPetugasForDetail, setSelectedPetugasForDetail] = useState<Petugas | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [petugasTransactions, setPetugasTransactions] = useState<Transaksi[]>([]);
  
  const [formData, setFormData] = useState({
    nama: '',
    jabatan: '',
    phone: '',
    status: 'Aktif' as const,
    sisaKasbon2025: 0
  });

  useEffect(() => {
    const unsub = dbService.subscribe('petugas', (data) => {
      // Auto-assign 300k to Udin if not set (as requested)
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
    
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    
    return () => {
      unsub();
      unsubT();
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
        await dbService.add('petugas', {
          ...formData,
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
    setFormData({ nama: '', jabatan: '', phone: '', status: 'Aktif', sisaKasbon2025: 0 });
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
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5DA]">
              {filteredPetugas.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F5F0]/30 transition-colors">
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
                            className="absolute right-16 top-1/2 -translate-y-1/2 z-50 min-w-[160px] bg-white border border-[#E5E5DA] shadow-xl rounded-2xl overflow-hidden py-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              onClick={() => {
                                setSelectedPetugasForDetail(p);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors"
                            >
                              <Eye className="w-4 h-4 text-[#A3A375]" />
                              View Detail
                            </button>

                            <button 
                              onClick={() => {
                                handleEdit(p);
                                setActiveMenuId(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-colors border-t border-[#F5F5F0]"
                            >
                              <Pencil className="w-4 h-4 text-[#A3A375]" />
                              Edit Petugas
                            </button>
                            
                            <button 
                              onClick={() => {
                                setDeletingId(p.id);
                                setActiveMenuId(null);
                              }}
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
              ))}
              {filteredPetugas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-[#A3A375] font-serif italic text-lg opacity-60">
                    Belum ada data petugas...
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

        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Data Petugas' : 'Tambah Petugas'}</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="Masukkan nama petugas..."
                      value={formData.nama}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jabatan / Role</label>
                    <input 
                      required
                      type="text" 
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
                    {isSubmitting ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : 'Simpan Petugas')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPetugasForDetail && (
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
                    {selectedPetugasForDetail.nama.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-[#3A3A2A] leading-tight">{selectedPetugasForDetail.nama}</h2>
                    <p className="text-[#A3A375] font-bold text-xs uppercase tracking-widest mt-1">{selectedPetugasForDetail.jabatan}</p>
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
                <div className="space-y-8">
                  {selectedPetugasForDetail.sisaKasbon2025 ? (
                    <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-amber-900 text-sm">Informasi Kasbon 2025</p>
                        <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                          Petugas ini memiliki sisa kasbon tahun 2025 sebesar <span className="font-bold font-mono underline scale-105 inline-block mx-0.5">{formatCurrency(selectedPetugasForDetail.sisaKasbon2025)}</span> yang belum terlunasi.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Tanggung Jawab</p>
                      <p className="text-base lg:text-lg font-bold font-mono text-[#5A5A40]">
                        {formatCurrency(petugasTransactions.filter(t => 
                          t.petugasId === selectedPetugasForDetail.id || 
                          t.picName === selectedPetugasForDetail.nama ||
                          t.keterangan.includes(`(PIC: ${selectedPetugasForDetail.nama})`)
                        ).reduce((acc, curr) => acc + curr.jumlah, 0))}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Kasbon</p>
                      <p className="text-base lg:text-lg font-bold font-mono text-amber-600">
                        {formatCurrency(
                          (selectedPetugasForDetail.sisaKasbon2025 || 0) + 
                          petugasTransactions.filter(t => 
                            (t.petugasId === selectedPetugasForDetail.id || 
                            t.picName === selectedPetugasForDetail.nama ||
                            t.keterangan.includes(`(PIC: ${selectedPetugasForDetail.nama})`)) &&
                            t.keterangan.toLowerCase().includes('kasbon')
                          ).reduce((acc, curr) => acc + curr.jumlah, 0)
                        )}
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-[#E5E5DA] shadow-sm">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Jumlah Transaksi</p>
                      <p className="text-lg lg:text-xl font-black text-[#5A5A40]">
                        {petugasTransactions.filter(t => 
                          t.petugasId === selectedPetugasForDetail.id || 
                          t.picName === selectedPetugasForDetail.nama ||
                          t.keterangan.includes(`(PIC: ${selectedPetugasForDetail.nama})`)
                        ).length} <span className="text-[10px] font-bold text-[#A3A375] uppercase underline underline-offset-4 decoration-2 decoration-[#5A5A40]/20">Record</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-black text-[#3A3A2A] uppercase tracking-widest flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-[#A3A375]" />
                        Riwayat Transaksi PIC
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {petugasTransactions
                        .filter(t => 
                          // Match by explicit ID
                          t.petugasId === selectedPetugasForDetail.id || 
                          // Match by explicit picName
                          t.picName === selectedPetugasForDetail.nama ||
                          // Match by seed data format in keterangan: "... (PIC: Name)"
                          t.keterangan.includes(`(PIC: ${selectedPetugasForDetail.nama})`)
                        )
                        .sort((a, b) => b.tanggal - a.tanggal)
                        .map((t) => (
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

                      {petugasTransactions.filter(t => 
                        t.petugasId === selectedPetugasForDetail.id || 
                        t.picName === selectedPetugasForDetail.nama ||
                        t.keterangan.includes(`(PIC: ${selectedPetugasForDetail.nama})`)
                      ).length === 0 && (
                        <div className="text-center py-12 px-6 bg-white/50 border border-dashed border-[#E5E5DA] rounded-3xl">
                          <Receipt className="w-10 h-10 text-[#E5E5DA] mx-auto mb-3" />
                          <p className="text-[#A3A375] font-serif italic">Belum ada catatan transaksi untuk petugas ini.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-[#E5E5DA] bg-white/50 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedPetugasForDetail(null)}
                  className="px-8 py-3 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#5A5A40]/20 text-sm"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
