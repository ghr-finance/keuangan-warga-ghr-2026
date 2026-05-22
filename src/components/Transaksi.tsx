import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Transaksi, Warga, Kategori, TransactionType, Petugas, Event } from '../types';
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Calendar, User, Tag, Trash2, Filter, X, CreditCard, ChevronDown, UserCheck, Layout, Info, CheckCircle2, Edit2 } from 'lucide-react';
import { cn, formatDate, formatCurrency, resolveWargaForDate } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function TransaksiList() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterWarga, setFilterWarga] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Reset category filter if it's not valid for the current type filter
  useEffect(() => {
    if (filterCategory !== 'all') {
      const currentCat = kategori.find(k => k.id === filterCategory);
      if (currentCat && filterType !== 'all' && currentCat.tipe !== filterType) {
        setFilterCategory('all');
      }
    }
  }, [filterType, kategori, filterCategory]);

  const [selectedMonths, setSelectedMonths] = useState<string[]>([format(new Date(), "yyyy-MM")]);
  const [selectedBaseAmount, setSelectedBaseAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<number | ''>('');

  const [formData, setFormData] = useState({
    tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    keterangan: '',
    jumlah: 0,
    tipe: 'pemasukan' as TransactionType,
    kategoriId: '',
    wargaId: '',
    petugasId: '',
    eventId: '',
    picName: '',
  });

  const selectedCategory = kategori.find(k => k.id === formData.kategoriId);
  const isKegiatanCategory = selectedCategory?.nama.toLowerCase().includes('kegiatan');
  const isIuranBulanan = selectedCategory?.nama === 'Iuran Bulanan';

  const selectedWarga = resolveWargaForDate(warga.find(w => w.id === formData.wargaId), formData.tanggal);
  const isWargaMenghuni = selectedWarga?.statusHuni === 'Menghuni';
  const displayBaseAmountForReference = isWargaMenghuni ? 200000 : 175000;

  // Total amount calculation
  const calculatedTotal = isIuranBulanan 
    ? (selectedBaseAmount || 0) + (typeof customAmount === 'number' ? customAmount : 0)
    : (typeof customAmount === 'number' ? customAmount : 0);

  const divisor = selectedBaseAmount || displayBaseAmountForReference;
  const maxMonths = isIuranBulanan ? Math.max(1, Math.floor(calculatedTotal / divisor)) : 1;

  // Sync jumlah with calculated total
  useEffect(() => {
    setFormData(prev => ({ ...prev, jumlah: calculatedTotal }));
  }, [calculatedTotal]);

  // Adjust selected months if they exceed maxMonths
  useEffect(() => {
    if (selectedMonths.length > maxMonths && maxMonths > 0) {
      setSelectedMonths(prev => prev.slice(0, maxMonths));
    }
  }, [maxMonths]);

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubW = dbService.subscribe('warga', setWarga);
    const unsubK = dbService.subscribe('kategori', setKategori);
    const unsubP = dbService.subscribe('petugas', setPetugas);
    const unsubE = dbService.subscribe('events', setEvents);
    return () => {
      unsubT();
      unsubW();
      unsubK();
      unsubP();
      unsubE();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    if (!formData.kategoriId) {
      setErrorMsg('Pilih kategori!');
      return;
    }
    
    // Check for identical transactions in the last 24 hours (only for new transactions)
    if (!editingId) {
      const sameDay = new Date(formData.tanggal).setHours(0,0,0,0);
      const cleanKeterangan = (formData.keterangan || '').trim().toLowerCase();

      const isDuplicate = transaksi.some(t => {
        const transDay = new Date(t.tanggal).setHours(0,0,0,0);
        const tCleanKeterangan = (t.keterangan || '').trim().toLowerCase();
        
        return t.jumlah === Number(formData.jumlah) && 
               tCleanKeterangan === cleanKeterangan && 
               t.tipe === formData.tipe &&
               t.kategoriId === formData.kategoriId &&
               t.wargaId === formData.wargaId &&
               transDay === sameDay;
      });

      if (isDuplicate && !force) {
        setDuplicateWarning('Ditemukan transaksi yang identik pada hari yang sama.');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const submissionDate = new Date(formData.tanggal).getTime();
      
      if (editingId) {
        await dbService.update('transaksi', editingId, {
          ...formData,
          keterangan: (formData.keterangan || '').trim(),
          tanggal: submissionDate,
          jumlah: Number(formData.jumlah),
          bulanIuran: formData.tipe === 'pemasukan' ? (selectedMonths[0] || null) : null,
          updatedAt: Date.now()
        });
      } else if (selectedMonths.length > 1 && formData.tipe === 'pemasukan') {
        // Create multiple transactions for each month
        const amountPerMonth = formData.jumlah / selectedMonths.length;
        const promises = selectedMonths.map(month => {
          return dbService.add('transaksi', {
            ...formData,
            keterangan: (formData.keterangan || '').trim(),
            tanggal: submissionDate,
            jumlah: amountPerMonth,
            bulanIuran: month,
            createdAt: Date.now()
          });
        });
        await Promise.all(promises);
      } else {
        await dbService.add('transaksi', {
          ...formData,
          keterangan: (formData.keterangan || '').trim(),
          tanggal: submissionDate,
          jumlah: Number(formData.jumlah),
          bulanIuran: formData.tipe === 'pemasukan' ? (selectedMonths[0] || null) : null,
          createdAt: Date.now()
        });
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMsg('Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (t: Transaksi) => {
    setEditingId(t.id);
    setFormData({
      tanggal: format(new Date(t.tanggal), "yyyy-MM-dd'T'HH:mm"),
      keterangan: t.keterangan,
      jumlah: t.jumlah,
      tipe: t.tipe,
      kategoriId: t.kategoriId,
      wargaId: t.wargaId || '',
      petugasId: t.petugasId || '',
      eventId: t.eventId || '',
      picName: t.picName || '',
    });
    
    if (t.bulanIuran) {
      setSelectedMonths([t.bulanIuran]);
    } else {
      setSelectedMonths([]);
    }

    // Try to guess selectedBaseAmount
    const possibleBases = [200000, 180000, 175000, 155000];
    const cat = kategori.find(k => k.id === t.kategoriId);
    if (cat?.nama === 'Iuran Bulanan') {
      const foundBase = possibleBases.find(b => b === t.jumlah);
      if (foundBase) {
        setSelectedBaseAmount(foundBase);
        setCustomAmount('');
      } else {
        setSelectedBaseAmount(null);
        setCustomAmount(t.jumlah);
      }
    } else {
      setCustomAmount(t.jumlah);
    }
    
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setDuplicateWarning(null);
    setErrorMsg(null);
    setSelectedMonths([format(new Date(), "yyyy-MM")]);
    setSelectedBaseAmount(null);
    setCustomAmount('');
    setFormData({
      tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      keterangan: '',
      jumlah: 0,
      tipe: 'pemasukan',
      kategoriId: '',
      wargaId: '',
      petugasId: '',
      eventId: '',
      picName: '',
    });
  };


  const filteredTransaksi = transaksi.filter(t => {
    const matchesSearch = t.keterangan.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.tipe === filterType;
    const matchesCategory = filterCategory === 'all' || t.kategoriId === filterCategory;
    const matchesWarga = filterWarga === 'all' || t.wargaId === filterWarga;
    
    let matchesMonth = true;
    if (filterMonth !== 'all') {
      const transDate = new Date(t.tanggal);
      const transMonth = format(transDate, 'yyyy-MM');
      matchesMonth = transMonth === filterMonth;
    }

    return matchesSearch && matchesType && matchesCategory && matchesWarga && matchesMonth;
  }).sort((a,b) => b.tanggal - a.tanggal);

  const totalMasuk = filteredTransaksi.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = filteredTransaksi.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Data Transaksi</h1>
          <p className="text-[#A3A375] font-medium mt-2">Catatan pemasukan dan pengeluaran kas warga.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#5A5A40] text-[#F5F5F0] px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Transaksi
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] flex items-center justify-between shadow-sm group hover:border-[#A3A375] transition-colors">
          <div>
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Pemasukan</p>
            <p className="text-2xl font-bold font-mono text-[#5A5A40] tracking-tight">{formatCurrency(totalMasuk)}</p>
          </div>
          <div className="w-14 h-14 bg-[#f0f9f1] rounded-[24px] flex items-center justify-center">
            <ArrowDownLeft className="text-emerald-700 w-8 h-8" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] flex items-center justify-between shadow-sm group hover:border-[#8B4513]/30 transition-colors">
          <div>
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-bold font-mono text-[#8B4513] tracking-tight">{formatCurrency(totalKeluar)}</p>
          </div>
          <div className="w-14 h-14 bg-[#fff5f5] rounded-[24px] flex items-center justify-center">
            <ArrowUpRight className="text-[#8B4513] w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A375]" />
            <input 
              type="text" 
              placeholder="Cari keterangan..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none placeholder:text-[#A3A375]/50 font-medium text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-3 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-[11px] uppercase tracking-wider text-[#4A4A3A] appearance-none cursor-pointer"
            >
              <option value="all">Semua Tipe</option>
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
            
            <select 
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-[11px] uppercase tracking-wider text-[#4A4A3A] appearance-none cursor-pointer"
            >
              <option value="all">Kategori</option>
              {kategori.filter(k => filterType === 'all' || k.tipe === filterType).map(k => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>

            <select 
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-3 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-[11px] uppercase tracking-wider text-[#4A4A3A] appearance-none cursor-pointer"
            >
              <option value="all">Bulan</option>
              {Array.from(new Set(transaksi.map(t => format(new Date(t.tanggal), 'yyyy-MM'))))
                .sort((a, b) => (b as string).localeCompare(a as string))
                .map((m) => (
                  <option key={m as string} value={m as string}>{format(new Date(m as string), 'MMM yy')}</option>
                ))
              }
            </select>

            <select 
              value={filterWarga}
              onChange={(e) => setFilterWarga(e.target.value)}
              className="px-4 py-3 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-[11px] uppercase tracking-wider text-[#4A4A3A] appearance-none cursor-pointer"
            >
              <option value="all">Warga</option>
              {warga.map(w => (
                <option key={w.id} value={w.id}>{w.nama}</option>
              ))}
            </select>

            {(filterType !== 'all' || filterCategory !== 'all' || filterMonth !== 'all' || filterWarga !== 'all' || searchTerm !== '') && (
              <button 
                onClick={() => {
                  setFilterType('all');
                  setFilterCategory('all');
                  setFilterMonth('all');
                  setFilterWarga('all');
                  setSearchTerm('');
                }}
                className="p-3 bg-[#fff5f5] text-[#8B4513] border border-[#8B4513]/20 rounded-full hover:bg-[#8B4513] hover:text-white transition-all flex items-center justify-center shrink-0"
                title="Reset Filter"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-[11px] font-black text-[#A3A375] uppercase tracking-[0.2em]">
          Menampilkan <span className="text-[#5A5A40] underline underline-offset-4 decoration-2">{filteredTransaksi.length}</span> Transaksi
        </p>
      </div>

      <div className="bg-white border border-[#E5E5DA] rounded-[32px] overflow-hidden shadow-sm">
        <div className="divide-y divide-[#F5F5F0]">
          {filteredTransaksi.map((t) => (
            <div key={t.id} className="p-6 sm:p-8 hover:bg-[#F5F5F0]/30 transition-colors flex flex-col sm:flex-row sm:items-center gap-6 group">
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                t.tipe === 'pemasukan' ? "bg-[#f0f9f1]" : "bg-[#fff5f5]"
              )}>
                {t.tipe === 'pemasukan' ? <ArrowDownLeft className="text-emerald-700 w-7 h-7" /> : <ArrowUpRight className="text-[#8B4513] w-7 h-7" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-bold text-[#3A3A2A] text-lg truncate group-hover:text-[#5A5A40] transition-colors">{t.keterangan}</h4>
                  {t.bulanIuran && (
                    <span className="text-[10px] font-black text-[#5A5A40] bg-[#A3A375]/20 px-3 py-1 rounded-full uppercase tracking-[0.1em] shrink-0">
                      Tagihan {format(new Date(t.bulanIuran), 'MMM yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#A3A375] font-bold">
                  {t.wargaId && (
                    <span className="flex items-center gap-2 text-[#5A5A40]">
                      <User className="w-4 h-4" /> 
                      {resolveWargaForDate(warga.find(w => w.id === t.wargaId), t.tanggal)?.nama}
                    </span>
                  )}
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {formatDate(t.tanggal)}</span>
                  <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> {kategori.find(k => k.id === t.kategoriId)?.nama || 'Tanpa Kategori'}</span>
                  {t.eventId && (
                    <span className="flex items-center gap-2 text-blue-600">
                      <Layout className="w-4 h-4" /> 
                      Event: {events.find(e => e.id === t.eventId)?.nama}
                    </span>
                  )}
                  {(t.petugasId || t.picName) && (
                    <span className="flex items-center gap-2 text-emerald-600">
                      <UserCheck className="w-4 h-4" /> 
                      PIC: {t.petugasId ? petugas.find(p => p.id === t.petugasId)?.nama : t.picName}
                    </span>
                  )}
                </div>
              </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                  <p className={cn(
                    "text-base sm:text-lg font-bold font-mono tracking-tight",
                    t.tipe === 'pemasukan' ? "text-[#5A5A40]" : "text-[#8B4513]"
                  )}>
                    {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                  </p>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button 
                      onClick={() => handleEdit(t)}
                      className="p-2.5 text-[#A3A375] hover:text-[#5A5A40] hover:bg-[#A3A375]/10 transition-all rounded-full"
                      title="Edit Transaksi"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => dbService.delete('transaksi', t.id)}
                      className="p-2.5 text-[#E5E5DA] hover:text-[#8B4513] hover:bg-[#fff5f5] transition-all rounded-full"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
            </div>
          ))}
          {filteredTransaksi.length === 0 && (
            <div className="px-8 py-24 text-center">
              <Search className="w-12 h-12 text-[#E5E5DA] mx-auto mb-4" />
              <p className="text-[#A3A375] font-medium italic">Transaksi tidak ditemukan.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Tambah Transaksi */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-[#E5E5DA] flex flex-col max-h-[90vh]"
            >
              <div className="p-6 sm:p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50 shrink-0">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">
                  {editingId ? 'Edit Transaksi' : 'Catat Transaksi'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scrollbar">
                {duplicateWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                      <Info className="w-6 h-6 text-amber-600 shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Data Ganda Terdeteksi?</h4>
                        <p className="text-xs text-amber-700 leading-relaxed mb-4">{duplicateWarning}</p>
                        <div className="flex gap-3">
                          <button 
                            type="button"
                            onClick={() => setDuplicateWarning(null)}
                            className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          >
                            Batal
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setDuplicateWarning(null);
                              handleSubmit(null as any, true);
                            }}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider"
                          >
                            Tetap Simpan
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex gap-3 text-red-700 text-xs font-bold">
                    <X className="w-4 h-4 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="flex p-2 bg-white/50 rounded-2xl gap-2 border border-[#E5E5DA]">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, tipe: 'pemasukan'})}
                    className={cn(
                      "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      formData.tipe === 'pemasukan' ? "bg-[#10B981] text-white shadow-lg shadow-[#10B981]/20" : "text-[#A3A375] hover:bg-white"
                    )}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Pemasukan
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, tipe: 'pengeluaran'})}
                    className={cn(
                      "flex-1 py-3 px-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      formData.tipe === 'pengeluaran' ? "bg-[#9CA3AF] text-white shadow-lg shadow-[#9CA3AF]/20" : "text-[#A3A375] hover:bg-white"
                    )}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Pengeluaran
                  </button>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-[#E5E5DA] shadow-sm space-y-6">
                  <div className={cn("grid gap-4", formData.tipe === 'pemasukan' ? "grid-cols-2" : "grid-cols-1")}>
                    <div>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Kategori</label>
                      <div className="relative">
                        <select 
                          required
                          className="w-full px-4 py-2.5 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                          value={formData.kategoriId}
                          onChange={(e) => setFormData({...formData, kategoriId: e.target.value})}
                        >
                          <option value="">Pilih Kategori</option>
                          {kategori.filter(k => k.tipe === formData.tipe).map(k => (
                            <option key={k.id} value={k.id}>{k.nama}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A375] pointer-events-none" />
                      </div>
                    </div>
                    {formData.tipe === 'pemasukan' && (
                      <div>
                        <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Warga</label>
                        <div className="relative">
                          <select 
                            className="w-full px-4 py-2.5 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                            value={formData.wargaId}
                            onChange={(e) => setFormData({...formData, wargaId: e.target.value})}
                          >
                            <option value="">Tidak ada</option>
                            {warga.map(w => (
                              <option key={w.id} value={w.id}>{w.nama}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A375] pointer-events-none" />
                        </div>
                        {selectedWarga && (
                          <div className="mt-2 flex items-center gap-2">
                            <input 
                              type="checkbox" 
                              checked={selectedWarga.statusHuni === 'Menghuni'} 
                              readOnly 
                              className="rounded border-gray-300 text-[#5A5A40]" 
                            />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-[#4A4A3A]">{selectedWarga.statusHuni === 'Menghuni' ? 'Aktif (MENGHUNI)' : 'Nonaktif (TIDAK MENGHUNI)'}</span>
                              <span className="text-[9px] text-[#A3A375]">Status warga terikat waktu status berubah</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={cn("grid gap-3", formData.tipe === 'pemasukan' && isIuranBulanan ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-1")}>
                    {formData.tipe === 'pemasukan' && isIuranBulanan && (
                      <>
                        {/* Status Aktif / Menghuni Options */}
                        {[200000, 180000].map((amt) => {
                          const isDisabled = !isWargaMenghuni;
                          const isSelected = selectedBaseAmount === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setSelectedBaseAmount(isSelected ? null : amt)}
                              className={cn(
                                "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left relative overflow-hidden",
                                isSelected ? "bg-[#10B981]/5 border-[#10B981] text-[#065F46]" : "bg-white border-[#E5E5DA] text-[#A3A375]",
                                isDisabled && "opacity-40 grayscale cursor-not-allowed bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center", isSelected ? "bg-[#10B981] border-[#10B981]" : "border-gray-300")}>
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <p className="text-xs font-black">{amt}</p>
                              </div>
                              <p className="text-[9px] font-bold opacity-70 ml-5 text-emerald-600">IPL Aktif</p>
                            </button>
                          );
                        })}

                        {/* Status Non-Aktif / Tidak Menghuni Options */}
                        {[175000, 155000].map((amt) => {
                          const isDisabled = isWargaMenghuni;
                          const isSelected = selectedBaseAmount === amt;
                          return (
                            <button
                              key={amt}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setSelectedBaseAmount(isSelected ? null : amt)}
                              className={cn(
                                "flex flex-col items-start gap-1 p-3 rounded-xl border transition-all text-left relative overflow-hidden",
                                isSelected ? "bg-[#10B981]/5 border-[#10B981] text-[#065F46]" : "bg-white border-[#E5E5DA] text-[#A3A375]",
                                isDisabled && "opacity-40 grayscale cursor-not-allowed bg-gray-50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn("w-3.5 h-3.5 rounded-sm border flex items-center justify-center", isSelected ? "bg-[#10B981] border-[#10B981]" : "border-gray-300")}>
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <p className="text-xs font-black">{amt}</p>
                              </div>
                              <p className="text-[9px] font-bold opacity-70 ml-5 text-amber-600">IPL Nonaktif</p>
                            </button>
                          );
                        })}
                      </>
                    )}

                    <div className={cn("flex flex-col gap-1 p-3 rounded-xl border transition-all", customAmount !== '' ? "bg-[#10B981]/5 border-[#10B981]" : "bg-white border-[#E5E5DA]", formData.tipe === 'pemasukan' && isIuranBulanan ? "sm:col-span-1" : "")}>
                      <p className="text-[10px] font-black text-[#A3A375] uppercase mb-1">
                        {formData.tipe === 'pemasukan' && isIuranBulanan ? 'Nominal Lainnya' : 'Nominal'}
                      </p>
                      <input 
                        type="number" 
                        placeholder={formData.tipe === 'pengeluaran' ? "0" : "-"}
                        className="w-full bg-transparent border-none p-0 text-lg font-bold focus:ring-0 placeholder:text-gray-300"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value === '' ? '' : Number(e.target.value));
                        }}
                      />
                    </div>
                  </div>
                </div>

                {formData.tipe === 'pemasukan' && (
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Periode</label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, idx) => {
                        const year = new Date().getFullYear();
                        const monthVal = (idx + 1).toString().padStart(2, '0');
                        const fullMonth = `${year}-${monthVal}`;
                        const isSelected = selectedMonths.includes(fullMonth);
                        const canSelectMore = selectedMonths.length < maxMonths;
                        
                        return (
                          <button 
                            key={m}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedMonths(selectedMonths.filter(sm => sm !== fullMonth));
                              } else {
                                if (canSelectMore) {
                                  setSelectedMonths([...selectedMonths, fullMonth]);
                                } else {
                                  // If at limit but clicking a new one, swap if limit is 1
                                  if (maxMonths === 1) {
                                    setSelectedMonths([fullMonth]);
                                  }
                                }
                              }
                            }}
                            className={cn(
                              "py-2.5 px-1 rounded-lg text-[10px] font-bold border transition-all",
                              isSelected ? "bg-[#C4B5FD] border-[#8B5CF6] text-[#5B21B6]" : "bg-white border-[#E5E5DA] text-[#4A4A3A] hover:bg-gray-50"
                            )}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Keterangan (Opsional)</label>
                  <textarea 
                    rows={2}
                    placeholder="Masukkan keterangan..."
                    className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300 text-sm resize-none"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className={cn(formData.tipe === 'pemasukan' && !isKegiatanCategory && formData.petugasId !== 'other' ? "col-span-2" : "col-span-1")}>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Tanggal & Waktu</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    />
                  </div>
                  {(formData.tipe === 'pengeluaran' || isKegiatanCategory || formData.petugasId === 'other') && (
                    <div className={cn(formData.tipe === 'pengeluaran' ? "col-span-1" : "col-span-1")}>
                      <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Petugas / PIC</label>
                      <select 
                        className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                        value={formData.petugasId}
                        onChange={(e) => setFormData({...formData, petugasId: e.target.value, picName: ''})}
                      >
                        <option value="">Pilih</option>
                        {petugas.filter(p => p.status === 'Aktif').map(p => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                        <option value="other">Manual</option>
                      </select>
                    </div>
                  )}
                </div>

                {formData.tipe === 'pemasukan' && !isKegiatanCategory && formData.petugasId !== 'other' && (
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Petugas / PIC (Opsional)</label>
                    <select 
                      className="w-full px-4 py-2.5 text-xs bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                      value={formData.petugasId}
                      onChange={(e) => setFormData({...formData, petugasId: e.target.value, picName: ''})}
                    >
                      <option value="">Pilih Petugas</option>
                      {petugas.filter(p => p.status === 'Aktif').map(p => (
                        <option key={p.id} value={p.id}>{p.nama}</option>
                      ))}
                      <option value="other">Lainnya (Manual)</option>
                    </select>
                  </div>
                )}

                {formData.petugasId === 'other' && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Nama PIC Manual</label>
                    <input 
                      type="text" 
                      placeholder="Masukkan nama..."
                      className="w-full px-4 py-2.5 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={formData.picName}
                      onChange={(e) => setFormData({...formData, picName: e.target.value})}
                    />
                  </div>
                )}

                {isKegiatanCategory && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1 text-blue-600">Event Terkait (Opsional)</label>
                    <select 
                      className="w-full px-4 py-2.5 text-sm bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none font-bold appearance-none cursor-pointer"
                      value={formData.eventId}
                      onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                    >
                      <option value="">Pilih Event</option>
                      {events.map(e => (
                        <option key={e.id} value={e.id}>{e.nama}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Simpan Transaksi
                      </>
                    )}
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
