import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Transaksi, Warga, Kategori, TransactionType, Petugas, Event } from '../types';
import { Plus, Search, ArrowUpRight, ArrowDownLeft, Calendar, User, Tag, Trash2, Filter, X, CreditCard, ChevronDown, UserCheck, Layout } from 'lucide-react';
import { cn, formatDate, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function TransaksiList() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    bulanIuran: format(new Date(), "yyyy-MM"),
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kategoriId) return alert('Pilih kategori!');
    
    await dbService.add('transaksi', {
      ...formData,
      tanggal: new Date(formData.tanggal).getTime(),
      jumlah: Number(formData.jumlah),
      createdAt: Date.now()
    });
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
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
      bulanIuran: format(new Date(), "yyyy-MM"),
    });
  };

  const selectedCategory = kategori.find(k => k.id === formData.kategoriId);
  const isKegiatanCategory = selectedCategory?.nama.toLowerCase().includes('kegiatan');

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
            <p className="text-3xl font-black text-[#5A5A40]">{formatCurrency(totalMasuk)}</p>
          </div>
          <div className="w-14 h-14 bg-[#f0f9f1] rounded-[24px] flex items-center justify-center">
            <ArrowDownLeft className="text-emerald-700 w-8 h-8" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] flex items-center justify-between shadow-sm group hover:border-[#8B4513]/30 transition-colors">
          <div>
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Pengeluaran</p>
            <p className="text-3xl font-black text-[#8B4513]">{formatCurrency(totalKeluar)}</p>
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
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {formatDate(t.tanggal)}</span>
                  <span className="flex items-center gap-2"><Tag className="w-4 h-4" /> {kategori.find(k => k.id === t.kategoriId)?.nama || 'Tanpa Kategori'}</span>
                  {t.eventId && (
                    <span className="flex items-center gap-2 text-blue-600">
                      <Layout className="w-4 h-4" /> 
                      Event: {events.find(e => e.id === t.eventId)?.nama}
                    </span>
                  )}
                  {t.wargaId && <span className="flex items-center gap-2"><User className="w-4 h-4" /> {warga.find(w => w.id === t.wargaId)?.nama}</span>}
                  {(t.petugasId || t.picName) && (
                    <span className="flex items-center gap-2 text-emerald-600">
                      <UserCheck className="w-4 h-4" /> 
                      PIC: {t.petugasId ? petugas.find(p => p.id === t.petugasId)?.nama : t.picName}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-8">
                <p className={cn(
                  "text-xl font-black tabular-nums",
                  t.tipe === 'pemasukan' ? "text-[#5A5A40]" : "text-[#8B4513]"
                )}>
                  {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                </p>
                <button 
                  onClick={() => dbService.delete('transaksi', t.id)}
                  className="p-3 text-[#E5E5DA] hover:text-[#8B4513] hover:bg-[#fff5f5] transition-all rounded-full"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-[#E5E5DA]"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">Catat Transaksi</h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="flex p-1.5 bg-[#F5F5F0] rounded-2xl gap-1.5 border border-[#E5E5DA]">
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, tipe: 'pemasukan'})}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      formData.tipe === 'pemasukan' ? "bg-white text-[#5A5A40] shadow-sm shadow-[#A3A375]/10" : "text-[#A3A375]"
                    )}
                  >
                    Pemasukan
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, tipe: 'pengeluaran'})}
                    className={cn(
                      "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                      formData.tipe === 'pengeluaran' ? "bg-white text-[#8B4513] shadow-sm shadow-[#8B4513]/10" : "text-[#A3A375]"
                    )}
                  >
                    Pengeluaran
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Tanggal & Waktu</label>
                    <input 
                      required
                      type="datetime-local" 
                      className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Jumlah (Rp)</label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      placeholder="Contoh: 50000"
                      className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      value={formData.jumlah || ''}
                      onChange={(e) => setFormData({...formData, jumlah: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Kategori</label>
                  <div className="relative">
                    <select 
                      required
                      className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                      value={formData.kategoriId}
                      onChange={(e) => setFormData({...formData, kategoriId: e.target.value})}
                    >
                      <option value="">Pilih Kategori</option>
                      {kategori.filter(k => k.tipe === formData.tipe).map(k => (
                        <option key={k.id} value={k.id}>{k.nama}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375] pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Keterangan</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Contoh: Iuran Bulanan Bpk. Budi"
                    className="w-full px-5 py-3 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                    value={formData.keterangan}
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                  />
                </div>

                <div className="p-6 bg-white/50 rounded-[24px] border border-[#E5E5DA] space-y-4">
                  <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-[0.2em]">Kaitan Data</p>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.tipe === 'pemasukan' ? (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Warga</label>
                          <select 
                            className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                            value={formData.wargaId}
                            onChange={(e) => setFormData({...formData, wargaId: e.target.value})}
                          >
                            <option value="">Tidak ada</option>
                            {warga.map(w => (
                              <option key={w.id} value={w.id}>{w.nama} ({w.noRumah})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Masa Iuran</label>
                          <input 
                            type="month" 
                            className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                            value={formData.bulanIuran}
                            onChange={(e) => setFormData({...formData, bulanIuran: e.target.value})}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Petugas Penerima (PIC)</label>
                          <select 
                            className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                            value={formData.petugasId}
                            onChange={(e) => setFormData({...formData, petugasId: e.target.value, picName: ''})}
                          >
                            <option value="">Pilih Petugas (Opsional)</option>
                            {petugas.filter(p => p.status === 'Aktif').map(p => (
                              <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>
                            ))}
                            <option value="other">Lainnya (Manual)</option>
                          </select>
                        </div>
                        {formData.petugasId === 'other' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Nama PIC Manual</label>
                            <input 
                              type="text" 
                              placeholder="Masukkan nama penerima..."
                              className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                              value={formData.picName}
                              onChange={(e) => setFormData({...formData, picName: e.target.value})}
                            />
                          </div>
                        )}
                        {isKegiatanCategory && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1 text-blue-600">Event Terkait (Opsional)</label>
                            <select 
                              className="w-full px-4 py-2 text-sm bg-white border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none font-bold appearance-none cursor-pointer"
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
                      </>
                    ) : (
                      <>
                        <div className={cn(isKegiatanCategory ? "col-span-1" : "col-span-2")}>
                          <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Petugas (PIC)</label>
                          <select 
                            className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold appearance-none cursor-pointer"
                            value={formData.petugasId}
                            onChange={(e) => setFormData({...formData, petugasId: e.target.value, picName: ''})}
                          >
                            <option value="">Pilih Petugas</option>
                            {petugas.filter(p => p.status === 'Aktif').map(p => (
                              <option key={p.id} value={p.id}>{p.nama} ({p.jabatan})</option>
                            ))}
                            <option value="other">Lainnya (Manual)</option>
                          </select>
                        </div>
                        {isKegiatanCategory && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1 text-blue-600">Event & Budget</label>
                            <select 
                              required={isKegiatanCategory}
                              className="w-full px-4 py-2 text-sm bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none font-bold appearance-none cursor-pointer"
                              value={formData.eventId}
                              onChange={(e) => setFormData({...formData, eventId: e.target.value})}
                            >
                              <option value="">Pilih Event</option>
                              {events.filter(e => e.status === 'Berjalan').map(e => (
                                <option key={e.id} value={e.id}>{e.nama}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {formData.petugasId === 'other' && (
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-[#4A4A3A] mb-1.5 ml-1">Nama PIC Manual</label>
                            <input 
                              type="text" 
                              placeholder="Masukkan nama PIC..."
                              className="w-full px-4 py-2 text-sm bg-white border border-[#E5E5DA] rounded-xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold"
                              value={formData.picName}
                              onChange={(e) => setFormData({...formData, picName: e.target.value})}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

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
                    className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-5 h-5" />
                    Simpan Transaksi
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
