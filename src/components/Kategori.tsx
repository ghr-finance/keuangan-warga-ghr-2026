import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Kategori, TransactionType } from '../types';
import { Plus, Tag, Trash2, ArrowUpRight, ArrowDownLeft, Info, X, Check, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function KategoriList() {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    tipe: 'pemasukan' as TransactionType,
    icon: 'Tag'
  });

  useEffect(() => {
    const unsubK = dbService.subscribe('kategori', setKategori);
    return () => unsubK();
  }, []);

  const [deletingKategoriId, setDeletingKategoriId] = useState<string | null>(null);

  const handleDeleteKategori = async () => {
    if (deletingKategoriId) {
      await dbService.delete('kategori', deletingKategoriId);
      setDeletingKategoriId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await dbService.update('kategori', editingId, formData);
    } else {
      await dbService.add('kategori', formData);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nama: '', tipe: 'pemasukan', icon: 'Tag' });
  };

  const handleEdit = (k: Kategori) => {
    setEditingId(k.id);
    setFormData({ nama: k.nama, tipe: k.tipe, icon: k.icon || 'Tag' });
    setIsModalOpen(true);
  };

  const defaultKategori = [
    { nama: 'Iuran Bulanan', tipe: 'pemasukan', icon: 'Wallet' },
    { nama: 'Donasi', tipe: 'pemasukan', icon: 'Heart' },
    { nama: 'Listrik & Air', tipe: 'pengeluaran', icon: 'Droplets' },
    { nama: 'Kebersihan', tipe: 'pengeluaran', icon: 'Trash2' },
    { nama: 'Keamanan', tipe: 'pengeluaran', icon: 'Shield' },
  ];

  const initializeDefaults = async () => {
    for (const k of defaultKategori) {
      if (!kategori.find(ex => ex.nama === k.nama)) {
        await dbService.add('kategori', k);
      }
    }
  };

  const [isCleaning, setIsCleaning] = useState(false);
  const [showConfirmClean, setShowConfirmClean] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ count: number } | null>(null);

  const removeDuplicates = async () => {
    setIsCleaning(true);
    setShowConfirmClean(false);
    try {
    const transactions = await dbService.getAll('transaksi') as any[];
      const seen = new Set();
      let deletedCount = 0;

      // Sort by createdAt to keep the first one
      const sortedTransactions = [...transactions].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      for (const t of sortedTransactions) {
        // Deterministic key for duplicates
        let key = '';
        const cleanKeterangan = (t.keterangan || '').trim().toLowerCase();
        
        if (t.bulanIuran && t.wargaId) {
          // For Iuran, if same resident and same month, it's a duplicate regardless of day
          key = `iuran_${t.wargaId}_${t.bulanIuran}`;
        } else {
          // For other transactions, use the day + description + amount
          const dateOnly = new Date(t.tanggal).setHours(0, 0, 0, 0);
          key = `other_${cleanKeterangan}_${dateOnly}_${t.jumlah}_${t.tipe}_${t.wargaId || 'public'}`;
        }

        if (seen.has(key)) {
          await dbService.delete('transaksi', t.id);
          // Small delay to prevent rate issues if many duplicates
          await new Promise(resolve => setTimeout(resolve, 50));
          deletedCount++;
        } else {
          seen.add(key);
        }
      }
      setCleanResult({ count: deletedCount });
    } catch (error) {
      console.error(error);
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Kategori & Standar</h1>
          <p className="text-[#A3A375] font-medium mt-2">Sesuaikan kategori transaksi sesuai kebutuhan lingkungan.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowConfirmClean(true)}
            disabled={isCleaning}
            className="px-6 py-3.5 bg-red-50 border border-red-100 text-red-700 rounded-full font-bold hover:bg-red-100 transition-all text-sm shadow-sm disabled:opacity-50 flex items-center justify-center min-w-[140px]"
          >
            {isCleaning ? (
              <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Bersihkan Ganda'
            )}
          </button>
          <button 
            onClick={initializeDefaults}
            className="px-6 py-3.5 bg-white border border-[#E5E5DA] text-[#4A4A3A] rounded-full font-bold hover:bg-gray-50 transition-all text-sm shadow-sm"
          >
            Gunakan Standar
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[#5A5A40] text-white px-6 py-3.5 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
          >
            <Plus className="w-5 h-5" />
            Baru
          </button>
        </div>
      </div>

      <div className="bg-white border-2 border-dashed border-[#A3A375] p-6 rounded-[32px] flex gap-4 text-[#5A5A40] shadow-sm">
        <div className="w-12 h-12 bg-[#F5F5F0] rounded-2xl flex items-center justify-center shrink-0">
          <Info className="w-6 h-6 text-[#A3A375]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-relaxed">
            Kategori membantu Anda mengelompokkan transaksi untuk analisis laporan yang lebih akurat. 
            Gunakan <span className="text-[#8B4513]">"Gunakan Standar"</span> untuk membuat kategori umum RT/RW secara otomatis sesuai template kami.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-[#f0f9f1] rounded-lg flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-xl font-black text-[#3A3A2A] tracking-tight">Kategori Pemasukan</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {kategori.filter(k => k.tipe === 'pemasukan').map((k) => (
              <div key={k.id} className="list-item--kategori bg-white p-5 rounded-[24px] border border-[#E5E5DA] flex items-center justify-between group hover:border-[#A3A375] transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#A3A375] group-hover:bg-[#5A5A40] group-hover:text-white transition-colors shadow-inner">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-[#4A4A3A] group-hover:text-[#3A3A2A]">{k.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(k)}
                    className="p-2.5 text-[#A3A375] hover:text-[#5A5A40] hover:bg-[#F5F5F0] transition-all rounded-full opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingKategoriId(k.id)}
                    className="p-2.5 text-[#E5E5DA] hover:text-[#8B4513] hover:bg-[#fff5f5] transition-all rounded-full opacity-0 group-hover:opacity-100"
                    title="Hapus"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 bg-[#fff5f5] rounded-lg flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-[#8B4513]" />
            </div>
            <h3 className="text-xl font-black text-[#3A3A2A] tracking-tight">Kategori Pengeluaran</h3>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {kategori.filter(k => k.tipe === 'pengeluaran').map((k) => (
              <div key={k.id} className="list-item--kategori bg-white p-5 rounded-[24px] border border-[#E5E5DA] flex items-center justify-between group hover:border-[#8B4513]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-[#F5F5F0] rounded-2xl flex items-center justify-center text-[#A3A375] group-hover:bg-[#8B4513] group-hover:text-white transition-colors shadow-inner">
                    <Tag className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-[#4A4A3A] group-hover:text-[#3A3A2A]">{k.nama}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(k)}
                    className="p-2.5 text-[#A3A375] hover:text-[#5A5A40] hover:bg-[#F5F5F0] transition-all rounded-full opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingKategoriId(k.id)}
                    className="p-2.5 text-[#E5E5DA] hover:text-[#8B4513] hover:bg-[#fff5f5] transition-all rounded-full opacity-0 group-hover:opacity-100"
                    title="Hapus"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deletingKategoriId && (
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
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Hapus Kategori?</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Semua transaksi dengan kategori ini akan kehilangan labelnya. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingKategoriId(null)}
                  className="flex-1 px-6 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375]"
                >
                  Batal
                </button>
                <button 
                  onClick={handleDeleteKategori}
                  className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showConfirmClean && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-[#E5E5DA] p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Bersihkan Data Ganda?</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Transaksi dengan data identik pada hari yang sama akan dihapus secara otomatis. Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmClean(false)}
                  className="flex-1 px-6 py-3 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375]"
                >
                  Batal
                </button>
                <button 
                  onClick={removeDuplicates}
                  className="flex-1 px-6 py-3 rounded-full bg-red-600 text-white font-bold"
                >
                  Ya, Bersihkan
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {cleanResult && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-[#E5E5DA] p-8 text-center"
            >
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Selesai Dibersihkan</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Berhasil membersihkan {cleanResult.count} data transaksi ganda. Data keuangan sekarang lebih akurat.
              </p>
              <button 
                onClick={() => setCleanResult(null)}
                className="w-full px-6 py-3 rounded-full bg-[#5A5A40] text-white font-bold"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-[#E5E5DA]"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Kategori' : 'Buat Kategori'}</h2>
                <button 
                  onClick={closeModal} 
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Nama Kategori</label>
                  <input 
                    required
                    type="text" 
                    autoFocus
                    placeholder="Contoh: Perbaikan Jalan"
                    className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Tipe Transaksi</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, tipe: 'pemasukan'})}
                      className={cn(
                        "py-3 rounded-2xl border font-bold text-xs transition-all flex items-center justify-center gap-2",
                        formData.tipe === 'pemasukan' ? "bg-white border-[#5A5A40] text-[#5A5A40] shadow-sm" : "bg-white/50 border-[#E5E5DA] text-[#A3A375]"
                      )}
                    >
                      {formData.tipe === 'pemasukan' && <Check className="w-3.5 h-3.5" />}
                      Pemasukan
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, tipe: 'pengeluaran'})}
                      className={cn(
                        "py-3 rounded-2xl border font-bold text-xs transition-all flex items-center justify-center gap-2",
                        formData.tipe === 'pengeluaran' ? "bg-white border-[#8B4513] text-[#8B4513] shadow-sm" : "bg-white/50 border-[#E5E5DA] text-[#A3A375]"
                      )}
                    >
                      {formData.tipe === 'pengeluaran' && <Check className="w-3.5 h-3.5" />}
                      Pengeluaran
                    </button>
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-4 py-3.5 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all text-sm"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3.5 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 text-sm"
                  >
                    Simpan
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
