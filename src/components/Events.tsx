import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Event, Transaksi, EventStatus, Warga } from '../types';
import { Plus, Calendar, Target, TrendingUp, TrendingDown, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn, formatDate, formatCurrency, resolveWargaForDate } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nama: '',
    tanggal: format(new Date(), "yyyy-MM-dd"),
    budget: 0,
    deskripsi: '',
    status: 'Berjalan' as EventStatus
  });

  useEffect(() => {
    const unsubE = dbService.subscribe('events', setEvents);
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubW = dbService.subscribe('warga', setWarga);
    return () => {
      unsubE();
      unsubT();
      unsubW();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await dbService.add('events', {
        ...formData,
        tanggal: new Date(formData.tanggal).getTime(),
        budget: Number(formData.budget),
        createdAt: Date.now()
      });
      setIsModalOpen(false);
      setFormData({ nama: '', tanggal: format(new Date(), "yyyy-MM-dd"), budget: 0, deskripsi: '', status: 'Berjalan' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Kegiatan & Budget</h1>
          <p className="text-[#A3A375] font-medium mt-2">Kelola anggaran untuk kegiatan warga secara transparan.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#5A5A40] text-[#F5F5F0] px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          Rencanakan Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.sort((a,b) => b.tanggal - a.tanggal).map((event) => {
          const eventTransactions = transaksi.filter(t => t.eventId === event.id);
          const actualSpending = eventTransactions
            .filter(t => t.tipe === 'pengeluaran')
            .reduce((acc, curr) => acc + curr.jumlah, 0);
          
          const progress = Math.min((actualSpending / event.budget) * 100, 100);
          const isOverBudget = actualSpending > event.budget;

          return (
            <div key={event.id} className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm overflow-hidden transition-all hover:shadow-md h-fit">
              <div className="p-8 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-[#3A3A2A] truncate">{event.nama}</h3>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none",
                        event.status === 'Berjalan' ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-[#A3A375] font-medium line-clamp-1">{event.deskripsi || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => dbService.update('events', event.id, { status: event.status === 'Berjalan' ? 'Selesai' : 'Berjalan' })}
                      className="p-2 text-[#A3A375] hover:text-[#5A5A40] transition-colors rounded-xl hover:bg-gray-50"
                      title="Ubah Status"
                    >
                      {event.status === 'Berjalan' ? <CheckCircle2 className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                    </button>
                    <button 
                      onClick={() => setDeletingId(event.id)}
                      className="p-2 text-[#E5E5DA] hover:text-[#8B4513] transition-colors rounded-xl hover:bg-[#fff5f5]"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-[#F5F5F0]/50 p-6 rounded-[24px] border border-[#E5E5DA]">
                  <div>
                    <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Target Anggaran</p>
                    <p className="text-base font-bold font-mono text-[#3A3A2A]">{formatCurrency(event.budget)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Realisasi</p>
                    <p className={cn("text-base font-bold font-mono", isOverBudget ? "text-rose-600" : "text-emerald-700")}>
                      {formatCurrency(actualSpending)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-[#A3A375] uppercase tracking-widest">Penyerapan Budget</span>
                    <span className={cn("px-2 py-0.5 rounded-md", isOverBudget ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700")}>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 w-full bg-[#F5F5F0] rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full",
                        isOverBudget ? "bg-rose-500" : "bg-[#A3A375]"
                      )}
                    />
                  </div>
                  {isOverBudget && (
                    <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5" /> OVER BUDGET: <span className="font-mono">{formatCurrency(actualSpending - event.budget)}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[#A3A375] font-black uppercase tracking-widest">
                  <Calendar className="w-3.5 h-3.5" />
                  Target: {formatDate(event.tanggal)}
                </div>
              </div>

              {eventTransactions.length > 0 && (
                <div className="border-t border-[#F5F5F0] bg-[#F5F5F0]/20 p-6">
                  <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-4">Realisasi Transaksi ({eventTransactions.length})</p>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {eventTransactions.sort((a,b) => b.tanggal - a.tanggal).map(t => (
                      <div key={t.id} className="flex items-center justify-between gap-4 bg-white/50 p-3 rounded-xl border border-[#E5E5DA]">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#4A4A3A] truncate">{t.keterangan}</p>
                          <p className="text-[10px] text-[#A3A375] font-bold">
                            {t.wargaId && (
                              <span className="text-[#5A5A40] mr-1.5">
                                {resolveWargaForDate(warga.find(w => w.id === t.wargaId), t.tanggal)?.nama} •
                              </span>
                            )}
                            {formatDate(t.tanggal)}
                          </p>
                        </div>
                        <p className={cn(
                          "text-xs font-bold font-mono shrink-0",
                          t.tipe === 'pemasukan' ? "text-emerald-700" : "text-rose-600"
                        )}>
                          {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
          {events.length === 0 && (
            <div className="md:col-span-2 py-24 bg-white border-2 border-dashed border-[#E5E5DA] rounded-[32px] text-center">
              <Calendar className="w-12 h-12 text-[#E5E5DA] mx-auto mb-4" />
              <p className="text-[#A3A375] font-medium italic">Belum ada kegiatan yang direncanakan.</p>
            </div>
          )}
      </div>

      {/* Modal Planning */}
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
              <h3 className="text-xl font-bold text-[#3A3A2A] mb-2">Hapus Kegiatan?</h3>
              <p className="text-[#A3A375] font-medium mb-8">
                Data kegiatan dan target anggaran akan dihapus secara permanen.
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
                    await dbService.delete('events', deletingId);
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

        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#3A3A2A]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden border border-[#E5E5DA]"
            >
              <div className="p-10 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-3xl font-serif font-bold text-[#3A3A2A]">Mulai Event</h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Nama Kegiatan</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Contoh: Kerja Bakti 17an"
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300 shadow-inner"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Tanggal Target</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold shadow-inner"
                      value={formData.tanggal}
                      onChange={(e) => setFormData({...formData, tanggal: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Budget (Rp)</label>
                    <input 
                      required
                      type="number" 
                      placeholder="500000"
                      className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300 shadow-inner"
                      value={formData.budget || ''}
                      onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-3">Deskripsi Singkat</label>
                  <textarea 
                    rows={3}
                    placeholder="Apa tujuan kegiatan ini?"
                    className="w-full px-6 py-4 bg-white border border-[#E5E5DA] rounded-3xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold resize-none placeholder:text-gray-300 shadow-inner"
                    value={formData.deskripsi}
                    onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                  />
                </div>
                <div className="pt-6 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-2xl shadow-[#5A5A40]/30 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Memproses...' : 'Simpan Rencana'}
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
