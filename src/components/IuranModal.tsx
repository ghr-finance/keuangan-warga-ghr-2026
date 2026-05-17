import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Warga, Kategori, Transaksi } from '../types';
import { X, CreditCard, Calendar, User, Info, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calculateArrears, ArrearItem } from '../lib/arrears';
import { format } from 'date-fns';
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
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [selectedArrearsKeys, setSelectedArrearsKeys] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    wargaId: '',
    tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubK = dbService.subscribe('kategori', setKategori);
    return () => {
      unsubT();
      unsubK();
    };
  }, []);

  // Filter warga that have arrears
  const wargaWithArrears = useMemo(() => {
    return wargaList.filter(w => {
      const arrears = calculateArrears(w, transaksi, kategori);
      return arrears.length > 0;
    }).sort((a,b) => a.nama.localeCompare(b.nama));
  }, [wargaList, transaksi, kategori]);

  // Arrears for selected warga
  const currentArrears = useMemo(() => {
    const targetId = selectedWarga?.id || formData.wargaId;
    if (!targetId) return [];
    const w = wargaList.find(r => r.id === targetId);
    if (!w) return [];
    return calculateArrears(w, transaksi, kategori);
  }, [formData.wargaId, selectedWarga, transaksi, kategori, wargaList]);

  // Arrear Key Generator
  const getArrearKey = (item: ArrearItem) => `${item.type}-${item.label}-${item.month || ''}`;

  useEffect(() => {
    if (selectedWarga) {
      setFormData(prev => ({ ...prev, wargaId: selectedWarga.id }));
    }
  }, [selectedWarga]);

  // Reset selected arrears when warga changes
  useEffect(() => {
    setSelectedArrearsKeys([]);
  }, [formData.wargaId]);

  const toggleArrear = (key: string) => {
    setSelectedArrearsKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectedArrearsItems = currentArrears.filter(item => 
    selectedArrearsKeys.includes(getArrearKey(item))
  );

  const totalAmount = selectedArrearsItems.reduce((acc, item) => acc + item.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.wargaId || selectedArrearsItems.length === 0) return;
    
    const w = wargaList.find(r => r.id === formData.wargaId);
    if (!w) return;

    setLoading(true);
    try {
      // Create a transaction for each selected arrear
      for (const item of selectedArrearsItems) {
        const cat = kategori.find(k => k.id === item.categoryId);
        const catName = cat?.nama || 'Iuran';
        const monthLabel = item.month ? format(new Date(item.month), 'MMMM yyyy') : '';
        const displayMonth = monthLabel ? `(${monthLabel})` : '';
        
        await dbService.add('transaksi', {
          tanggal: new Date(formData.tanggal).getTime(),
          jumlah: item.amount,
          keterangan: `Pembayaran Tunggakan ${w.nama} - ${catName} ${displayMonth}`.trim(),
          tipe: 'pemasukan',
          kategoriId: item.categoryId,
          wargaId: w.id,
          bulanIuran: item.month || null,
          createdAt: Date.now()
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#F5F5F0] rounded-[40px] w-full max-w-xl shadow-2xl border border-[#E5E5DA] overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">Terima Iuran</h2>
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">Pilih Item Tunggakan Warga</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="space-y-6">
              {/* Warga Selection */}
              <div>
                <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Pilih Warga (Hanya dengan Tunggakan)</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                    value={formData.wargaId}
                    onChange={(e) => setFormData({...formData, wargaId: e.target.value})}
                  >
                    <option value="">-- Pilih Warga --</option>
                    {wargaWithArrears.map(w => (
                      <option key={w.id} value={w.id}>{w.nama} (Rumah: {w.noRumah})</option>
                    ))}
                  </select>
                  <User className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                </div>
              </div>

              {formData.wargaId && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Daftar Tunggakan</label>
                  <div className="space-y-3">
                    {currentArrears.length === 0 ? (
                      <div className="bg-emerald-50 p-6 rounded-3xl flex items-center gap-4 border border-emerald-100">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        <p className="text-sm font-bold text-emerald-700">Warga ini tidak memiliki tunggakan!</p>
                      </div>
                    ) : (
                      currentArrears.map((item) => {
                        const key = getArrearKey(item);
                        const isSelected = selectedArrearsKeys.includes(key);
                        return (
                          <div 
                            key={key}
                            onClick={() => toggleArrear(key)}
                            className={cn(
                              "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                              isSelected 
                                ? "bg-white border-[#5A5A40] shadow-md ring-2 ring-[#5A5A40]/5" 
                                : "bg-white/50 border-[#E5E5DA] hover:border-[#A3A375]"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                isSelected ? "bg-[#5A5A40] border-[#5A5A40]" : "border-[#E5E5DA] group-hover:border-[#A3A375]"
                              )}>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#3A3A2A]">{item.label}</p>
                                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">
                                  {item.type === 'bulanan' ? 'Iuran Wajib' : item.type.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <p className="font-black text-[#3A3A2A]">{formatCurrency(item.amount)}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Date */}
              {selectedArrearsKeys.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 pt-4 border-t border-[#E5E5DA]"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Tanggal Bayar</label>
                      <div className="relative">
                        <input 
                          required
                          type="datetime-local"
                          className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                          value={formData.tanggal}
                          onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                        />
                        <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                      </div>
                    </div>
                    <div className="bg-[#5A5A40] p-6 rounded-3xl flex flex-col justify-center items-end text-white shadow-lg">
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Total Bayar</p>
                      <p className="text-2xl font-serif font-bold">{formatCurrency(totalAmount)}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="bg-[#5A5A40]/5 p-6 rounded-3xl flex gap-4 border border-[#5A5A40]/10">
                <Info className="w-5 h-5 text-[#5A5A40] shrink-0 mt-0.5" />
                <p className="text-xs text-[#5A5A40] font-medium leading-relaxed">
                  Data pembayaran akan dicatat sebagai transaksi individual untuk setiap item yang dipilih.
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-[#E5E5DA] bg-white/50 shrink-0 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-8 py-5 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-white active:scale-95 transition-all"
            >
              Tutup
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading || selectedArrearsKeys.length === 0}
              className="flex-[2] px-8 py-5 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Konfirmasi {selectedArrearsKeys.length} Pembayaran
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
