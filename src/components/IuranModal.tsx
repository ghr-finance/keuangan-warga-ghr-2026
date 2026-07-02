import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../services/db';
import { Warga, Kategori, Transaksi, WargaHistory } from '../types';
import { X, CreditCard, Calendar, User, Info, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { calculateArrears, ArrearItem } from '../lib/arrears';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface IuranModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWarga?: Warga;
  wargaList: Warga[];
  wargaHistory: WargaHistory[];
}

export default function IuranModal({ isOpen, onClose, selectedWarga, wargaList, wargaHistory }: IuranModalProps) {
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(false);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [selectedArrearsKeys, setSelectedArrearsKeys] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    wargaId: '',
    kategoriId: '',
    tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  });
  
  const [useKasUmum, setUseKasUmum] = useState(false);

  const categoriesPemasukan = useMemo(() => 
    kategori.filter(k => k.tipe === 'pemasukan' && k.nama !== 'Pembayaran Tunggakan'),
  [kategori]);

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubK = dbService.subscribe('kategori', setKategori);
    return () => {
      unsubT();
      unsubK();
    };
  }, []);

  // Show all warga that are isIuranWajib in the dropdown.
  // Filtering by arrears caused the dropdown to be empty on first open
  // because kategori/transaksi are still loading (empty []) at that point.
  const allIuranWargaSorted = useMemo(() => {
    return wargaList
      .filter(w => w.isIuranWajib)
      .sort((a, b) => parseInt(a.noRumah, 10) - parseInt(b.noRumah, 10));
  }, [wargaList]);

  // Arrears for selected warga
  const currentArrears = useMemo(() => {
    const targetId = selectedWarga?.id || formData.wargaId;
    if (!targetId) return [];
    const w = wargaList.find(r => r.id === targetId);
    if (!w) return [];
    return calculateArrears(w, transaksi, kategori, wargaHistory, wargaList);
  }, [formData.wargaId, selectedWarga, transaksi, kategori, wargaList, wargaHistory]);

  const kasUmumCategory = useMemo(() => 
    kategori.find(k => k.nama.toLowerCase().includes('kas umum')),
  [kategori]);

  const kasUmumBalance = useMemo(() => {
    if (!formData.wargaId || !kasUmumCategory) return 0;
    
    const wargaTransactions = transaksi.filter(t => t.wargaId === formData.wargaId && t.kategoriId === kasUmumCategory.id);
    
    const masuk = wargaTransactions.filter(t => t.tipe === 'pemasukan').reduce((sum, t) => sum + t.jumlah, 0);
    const keluar = wargaTransactions.filter(t => t.tipe === 'pengeluaran').reduce((sum, t) => sum + t.jumlah, 0);
    
    return masuk - keluar;
  }, [formData.wargaId, kasUmumCategory, transaksi]);

  useEffect(() => {
    if (kasUmumBalance <= 0) {
      setUseKasUmum(false);
    }
  }, [kasUmumBalance]);

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
  const amountDeductedFromKasUmum = (useKasUmum && kasUmumBalance > 0) ? Math.min(totalAmount, kasUmumBalance) : 0;
  const netAmountToPay = totalAmount - amountDeductedFromKasUmum;

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.wargaId || selectedArrearsItems.length === 0) return;
    
    const w = wargaList.find(r => r.id === formData.wargaId);
    if (!w) return;

    setLoading(true);
    try {
      // Create a transaction for each selected arrear
      for (const item of selectedArrearsItems) {
        // Use chosen category if selected, otherwise use the one from ArrearItem
        const finalCatId = formData.kategoriId || item.categoryId;
        const cat = kategori.find(k => k.id === finalCatId);
        const catName = cat?.nama || 'Iuran';
        
        const monthLabel = item.month ? format(new Date(item.month), 'MMMM yyyy', { locale: id }) : '';
        const displayMonth = monthLabel ? `(${monthLabel})` : '';
        
        // Pattern: Pembayaran Tunggakan [Warga] - [Item Label] ([Bulan Tahun])
        const detailLabel = item.type === 'bulanan' ? catName : item.label;
        const keterangan = `Pembayaran Tunggakan ${w.nama} - ${detailLabel} ${displayMonth}`.replace(/\s+/g, ' ').trim();
        
        await dbService.add('transaksi', {
          tanggal: new Date(formData.tanggal).getTime(),
          jumlah: item.amount,
          keterangan,
          tipe: 'pemasukan',
          kategoriId: finalCatId,
          wargaId: w.id,
          bulanIuran: item.month || null,
          createdAt: Date.now()
        });
      }

      // If Kas Umum is used, deduct the amount from their wallet
      if (useKasUmum && kasUmumCategory && amountDeductedFromKasUmum > 0) {
        await dbService.add('transaksi', {
          tanggal: new Date(formData.tanggal).getTime(),
          jumlah: amountDeductedFromKasUmum,
          keterangan: `Pemotongan Saldo Kas Umum untuk Pembayaran Tagihan`,
          tipe: 'pengeluaran',
          kategoriId: kasUmumCategory.id,
          wargaId: w.id,
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
          className="form-card form-card--iuran bg-[#F5F5F0] rounded-[40px] w-full max-w-xl shadow-2xl border border-[#E5E5DA] overflow-hidden flex flex-col max-h-[90vh]"
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
                <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Pilih Warga</label>
                <div className="relative">
                  <select 
                    required
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                    value={formData.wargaId}
                    onChange={(e) => setFormData({...formData, wargaId: e.target.value})}
                  >
                    <option value="">-- Pilih Warga --</option>
                    {allIuranWargaSorted.map(w => (
                      <option key={w.id} value={w.id}>{w.nama} (Rumah: {w.noRumah})</option>
                    ))}
                  </select>
                  <User className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3 ml-1">Kategori Transaksi (Opsional)</label>
                <div className="relative">
                  <select 
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                    value={formData.kategoriId}
                    onChange={(e) => setFormData({...formData, kategoriId: e.target.value})}
                  >
                    <option value="">-- Gunakan Kategori Default --</option>
                    {categoriesPemasukan.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.nama}</option>
                    ))}
                  </select>
                  <Info className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
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
                              "list-item--tunggakan p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
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
                            <p className="font-bold text-[#3A3A2A] font-mono text-sm">{formatCurrency(item.amount)}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Kas Umum Option */}
              {kasUmumBalance > 0 && formData.wargaId && (
                <div className="bg-[#5A5A40]/5 p-6 rounded-3xl border border-[#5A5A40]/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Saldo Kas Umum / Dompet</p>
                    <p className="text-lg font-bold text-[#3A3A2A] font-mono">{formatCurrency(kasUmumBalance)}</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="text-sm font-bold text-[#5A5A40]">Gunakan Saldo</span>
                    <div className="relative">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={useKasUmum}
                        onChange={(e) => setUseKasUmum(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A5A40]"></div>
                    </div>
                  </label>
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
                      <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Total Sisa Bayar Tunai</p>
                      <p className="text-xl font-bold font-mono tracking-tight">{formatCurrency(netAmountToPay)}</p>
                      {useKasUmum && amountDeductedFromKasUmum > 0 && (
                        <p className="text-[10px] opacity-80 mt-1">
                          (Dipotong Kas Umum: {formatCurrency(amountDeductedFromKasUmum)})
                        </p>
                      )}
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
