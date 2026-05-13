import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Warga, Kategori, Transaksi } from '../types';
import { X, CreditCard, ChevronDown, Calendar, User, Info } from 'lucide-react';
import { cn, formatCurrency, getMonthlyFee } from '../lib/utils';
import { format, startOfMonth, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface IuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWarga?: Warga;
  wargaList: Warga[];
}

export default function IuranModal({ isOpen, onClose, selectedWarga, wargaList }: IuranModalProps) {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    wargaId: '',
    bulanIuran: format(new Date(), 'yyyy-MM'),
    jumlah: 200000, 
    keterangan: '',
    tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  useEffect(() => {
    const unsubK = dbService.subscribe('kategori', (data) => {
      setKategori(data.filter(k => k.tipe === 'pemasukan' && k.nama.toLowerCase().includes('iuran')));
    });
    return () => unsubK();
  }, []);

  useEffect(() => {
    if (selectedWarga) {
      const amount = getMonthlyFee(formData.bulanIuran, selectedWarga.statusHuni);
      setFormData(prev => ({
        ...prev,
        wargaId: selectedWarga.id,
        jumlah: amount,
        keterangan: `Iuran Bulanan - ${selectedWarga.nama} (${format(new Date(prev.bulanIuran), 'MMMM yyyy')})`
      }));
    }
  }, [selectedWarga]);

  useEffect(() => {
    if (formData.wargaId) {
      const w = wargaList.find(w => w.id === formData.wargaId);
      if (w) {
        const amount = getMonthlyFee(formData.bulanIuran, w.statusHuni);
        setFormData(prev => ({
          ...prev,
          jumlah: amount,
          keterangan: `Iuran Bulanan - ${w.nama} (${format(new Date(formData.bulanIuran), 'MMMM yyyy')})`
        }));
      }
    }
  }, [formData.bulanIuran, formData.wargaId, wargaList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.wargaId || !formData.bulanIuran) return;
    
    setLoading(true);
    try {
      const iuranKategori = kategori[0]; // Take the first iuran category found
      if (!iuranKategori) {
        alert('Kategori "Iuran" belum dibuat. Silakan buat di Pengaturan.');
        setLoading(false);
        return;
      }

      await dbService.add('transaksi', {
        ...formData,
        tipe: 'pemasukan',
        kategoriId: iuranKategori.id,
        tanggal: new Date(formData.tanggal).getTime(),
        jumlah: Number(formData.jumlah),
        createdAt: Date.now()
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Generate last 6 months + next 2 months for selection
  const monthOptions = Array.from({ length: 9 }).map((_, i) => {
    const d = addMonths(subMonths(new Date(), 6), i);
    return format(d, 'yyyy-MM');
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#F5F5F0] rounded-[40px] w-full max-w-lg shadow-2xl border border-[#E5E5DA] overflow-hidden"
        >
          <div className="p-10 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">Terima Iuran</h2>
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">Entry Cepat Kas Masuk</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="space-y-6">
              {/* Warga Selection */}
              <div>
                <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Pilih Warga</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                    value={formData.wargaId}
                    onChange={(e) => setFormData({...formData, wargaId: e.target.value})}
                  >
                    <option value="">-- Pilih Warga --</option>
                    {wargaList.sort((a,b) => a.nama.localeCompare(b.nama)).map(w => (
                      <option key={w.id} value={w.id}>{w.nama} (No: {w.noRumah})</option>
                    ))}
                  </select>
                  <User className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                </div>
              </div>

              {/* Month & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Untuk Bulan</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                      value={formData.bulanIuran}
                      onChange={(e) => setFormData({...formData, bulanIuran: e.target.value})}
                    >
                      {monthOptions.map(m => (
                        <option key={m} value={m}>{format(new Date(m), 'MMMM yyyy')}</option>
                      ))}
                    </select>
                    <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Jumlah Bayar</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-[#A3A375]">Rp</span>
                    <input 
                      required
                      type="number" 
                      className="w-full pl-14 pr-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={formData.jumlah}
                      onChange={(e) => setFormData({...formData, jumlah: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Keterangan Label</label>
                <input 
                  required
                  type="text"
                  className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                />
              </div>

              <div className="bg-[#5A5A40]/5 p-6 rounded-3xl flex gap-4 border border-[#5A5A40]/10">
                <Info className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
                <p className="text-xs text-[#5A5A40] font-medium leading-relaxed">
                  Iuran akan dicatat sebagai <span className="font-bold">Pemasukan</span> dan akan memperbarui status iuran warga untuk bulan yang dipilih.
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 px-8 py-5 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-white active:scale-95 transition-all"
              >
                Tutup
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] px-8 py-5 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Konfirmasi Pembayaran
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
