import React from 'react';
import { Warga, Transaksi, Kategori, TunggakanMacet } from '../types';
import { X, History, AlertCircle, CheckCircle2, Calendar, ArrowUpRight, Clock, Home, Phone, Printer, AlertTriangle, Calculator, Save, Tag } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { calculateArrears } from '../lib/arrears';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WargaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  warga: Warga | null;
  transaksi: Transaksi[];
  kategori: Kategori[];
  tunggakanMacetList: TunggakanMacet[];
  wargaHistory: import('../types').WargaHistory[];
  allWarga: Warga[];
}

export default function WargaDetailModal({ isOpen, onClose, warga, transaksi, kategori, tunggakanMacetList, wargaHistory, allWarga }: WargaDetailModalProps) {
  const [payAmount, setPayAmount] = React.useState<string>('');
  const [payDate, setPayDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [duplicateWarning, setDuplicateWarning] = React.useState<string | null>(null);

  if (!isOpen || !warga) return null;

  // Filter tunggakan macet 2025 for this warga
  const entryMacet = tunggakanMacetList.find(t => t.wargaId === warga.id);

  const handleUpdateMacet = async (force: boolean = false) => {
    if (!entryMacet || !payAmount) return;
    
    const amount = parseInt(payAmount);
    const submissionDate = new Date(payDate).getTime();

    // Duplicate check: check if a payment for "Tunggakan Macet 2025" with same amount was added on same day
    const sameDay = new Date(submissionDate).setHours(0,0,0,0);
    const isDuplicate = transaksi.some(t => {
      const transDay = new Date(typeof t.tanggal === 'string' && !isNaN(Number(t.tanggal)) ? Number(t.tanggal) : t.tanggal).setHours(0,0,0,0);
      return t.wargaId === warga.id && 
             t.jumlah === amount && 
             t.keterangan.includes('Tunggakan Macet 2025') &&
             transDay === sameDay;
    });

    if (isDuplicate && !force) {
      setDuplicateWarning('Pembayaran macet identik sudah tercatat hari ini.');
      return;
    }

    setIsUpdating(true);
    try {
      const newPaid = entryMacet.nominalBayar + amount;
      const newSisa = Math.max(0, entryMacet.totalTagihan - newPaid);
      const newStatus = newSisa === 0 ? 'Lunas' : 'Belum Lunas';

      await dbService.update('tunggakan_macet', entryMacet.id, {
        nominalBayar: newPaid,
        sisa: newSisa,
        status: newStatus
      });

      // Add a transaction record for this payment
      const catIuran = kategori.find(k => (k.nama.toLowerCase().includes('iuran bulanan') || k.nama.toLowerCase() === 'ipl') && k.tipe === 'pemasukan');
      const catName = catIuran?.nama || 'IPL';
      
      await dbService.add('transaksi', {
        tanggal: submissionDate,
        jumlah: amount,
        tipe: 'pemasukan',
        kategoriId: catIuran?.id || 'historical-cat',
        wargaId: warga.id,
        keterangan: `Pembayaran Tunggakan ${warga.nama} - ${catName} (Historical 2025)`,
        createdAt: Date.now()
      });

      setPayAmount('');
      setPayDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setDuplicateWarning(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter transactions for this warga
  const wargaTransaksiBase = transaksi
    .filter(t => t.wargaId === warga.id)
    .sort((a, b) => b.tanggal - a.tanggal);

  // Calculate Arrears (Tunggakan)
  const arrearsItems = calculateArrears(warga, transaksi, kategori, wargaHistory, allWarga);

  const totalCurrentTunggakan = arrearsItems.reduce((acc, item) => acc + item.amount, 0);

  const exportPDF = () => {
    if (!warga) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(58, 58, 42); // #3A3A2A
    doc.text('LAPORAN AKTIVITAS WARGA', 20, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(163, 163, 117); // #A3A375
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm')}`, 20, 32);

    // Warga Info Box
    doc.setDrawColor(229, 229, 218); // #E5E5DA
    doc.setFillColor(245, 245, 240); // #F5F5F0
    doc.roundedRect(20, 40, pageWidth - 40, 35, 3, 3, 'FD');
    
    doc.setFontSize(14);
    doc.setTextColor(58, 58, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(warga.nama.toUpperCase(), 25, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 90, 64); // #5A5A40
    doc.text(`Nomor Rumah : ${warga.noRumah}`, 25, 57);
    doc.text(`Nomor Telp  : ${warga.phone || '-'}`, 25, 62);
    doc.text(`Status Huni : ${warga.statusHuni} (${warga.status})`, 25, 67);

    // Summary Stats
    const totalKontribusi = wargaTransaksiBase.reduce((acc, t) => acc + (t.tipe === 'pemasukan' ? t.jumlah : 0), 0);
    const totalTunggakan = totalCurrentTunggakan + (entryMacet?.sisa || 0);

    doc.setFontSize(11);
    doc.text('RINGKASAN KEUANGAN', 20, 85);
    doc.line(20, 87, 80, 87);

    doc.setFontSize(10);
    doc.text('Total Kontribusi Masuk', 20, 95);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totalKontribusi), 80, 95);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Status Iuran & Kewajiban', 20, 102);
    doc.setFont('helvetica', 'bold');
    if (arrearsItems.length === 0) {
      doc.setTextColor(16, 185, 129); // text-emerald-500
      doc.text('LUNAS', 80, 102);
    } else {
      doc.setTextColor(245, 158, 11); // text-amber-500
      doc.text(`${arrearsItems.length} Item Belum Bayar`, 80, 102);
    }
    doc.setTextColor(90, 90, 64);

    if (entryMacet) {
      doc.setFont('helvetica', 'normal');
      doc.text('Sisa Macet 2025', 20, 109);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(entryMacet.sisa), 80, 109);
    }

    // Transaction History Table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('RIWAYAT TRANSAKSI', 20, 120);
    
    const tableData = wargaTransaksiBase.map(t => [
      formatDate(t.tanggal),
      t.keterangan,
      `+ ${formatCurrency(t.jumlah)}`
    ]);

    autoTable(doc, {
      startY: 120,
      head: [['Tanggal', 'Keterangan / Label', 'Jumlah']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [90, 90, 64], textColor: [255, 255, 255] },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        2: { halign: 'right', fontStyle: 'bold' }
      }
    });

    // Arrears List if any
    if (arrearsItems.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      doc.setFontSize(11);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text('DAFTAR TUNGGAKAN KEWAJIBAN', 20, finalY);

      const arrearsData = arrearsItems.map(item => [
        item.label,
        formatCurrency(item.amount)
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [['Deskripsi Kewajiban', 'Wajib Bayar']],
        body: arrearsData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: {
          1: { halign: 'right', fontStyle: 'bold' }
        }
      });

      const lastArrearsY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL TAGIHAN (INC. MACET 2025):', 20, lastArrearsY);
      doc.text(formatCurrency(totalTunggakan), pageWidth - 20, lastArrearsY, { align: 'right' });
    }

    // Footer signature
    const finalPageY = doc.internal.pageSize.getHeight() - 30;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(163, 163, 117);
    doc.text('Mengetahui,', pageWidth - 60, finalPageY);
    doc.line(pageWidth - 65, finalPageY + 15, pageWidth - 15, finalPageY + 15);
    doc.text('Bendahara Lingkungan', pageWidth - 60, finalPageY + 20);

    doc.save(`Laporan_${warga.nama.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          className="bg-[#F5F5F0] rounded-[40px] w-full max-w-4xl max-h-[90vh] shadow-2xl border border-[#E5E5DA] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 sm:p-10 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50 shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#5A5A40] rounded-[24px] flex items-center justify-center shadow-xl text-white font-serif font-bold text-2xl">
                {warga.nama.charAt(0)}
              </div>
              <div>
                <h2 className="text-3xl font-serif font-bold text-[#3A3A2A]">{warga.nama}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#A3A375] font-black uppercase tracking-widest">
                    <Home className="w-3.5 h-3.5" />
                    No: {warga.noRumah}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#A3A375] font-black uppercase tracking-widest">
                    <Phone className="w-3.5 h-3.5" />
                    {warga.phone || '-'}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    (warga.role || 'Pemilik') === 'Penyewa' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                  )}>
                    {warga.role || 'Pemilik'}
                  </span>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                    warga.statusHuni === 'Menghuni' ? "bg-emerald-50 text-emerald-600" : (warga.statusHuni === 'Keluar' ? "bg-gray-100 text-gray-500 border border-gray-200" : "bg-amber-50 text-amber-600")
                  )}>
                    {warga.statusHuni === 'Keluar' ? 'Pindah/Keluar (Arsip)' : `${warga.statusHuni} (${warga.status})`}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="w-12 h-12 flex items-center justify-center hover:bg-white rounded-full transition-colors text-[#A3A375]"
            >
              <X className="w-8 h-8" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-10">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] shadow-sm">
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-4">Total Kontribusi</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(wargaTransaksiBase.reduce((acc, t) => acc + (t.tipe === 'pemasukan' ? t.jumlah : 0), 0))}
                  </h3>
                  <ArrowUpRight className="w-6 h-6 text-emerald-300" />
                </div>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] shadow-sm">
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-4">Status Kewajiban</p>
                <div className="flex items-center gap-3">
                  {arrearsItems.length === 0 ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span className="font-bold text-emerald-600">Lunas</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-6 h-6 text-amber-500" />
                      <span className="font-bold text-amber-600">{arrearsItems.length} Item Tunggakan</span>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] shadow-sm">
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-4">Warga Sejak</p>
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-[#A3A375]" />
                  <span className="font-bold text-[#3A3A2A]">{format(new Date(typeof warga.createdAt === 'string' && !isNaN(Number(warga.createdAt)) ? Number(warga.createdAt) : warga.createdAt), 'dd MMMM yyyy')}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Tunggakan Macet 2025 Section */}
              {entryMacet && (
                <div className="lg:col-span-2 bg-[#8B4513]/5 border-2 border-dashed border-[#8B4513]/20 rounded-[40px] p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#8B4513] rounded-2xl flex items-center justify-center shadow-lg">
                        <AlertTriangle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-[#3A3A2A]">Tunggakan Macet Tahun 2025</h3>
                        <p className="text-xs font-bold text-[#8B4513] uppercase tracking-widest">{entryMacet.keterangan}</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      entryMacet.status === 'Lunas' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      {entryMacet.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="bg-white/50 p-5 rounded-3xl border border-[#8B4513]/10">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Total Tagihan (7x)</p>
                      <p className="text-lg font-bold text-[#3A3A2A] font-mono">{formatCurrency(entryMacet.totalTagihan)}</p>
                    </div>
                    <div className="bg-white/50 p-5 rounded-3xl border border-[#8B4513]/10">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Sudah Dibayar</p>
                      <p className="text-lg font-bold text-emerald-600 font-mono">{formatCurrency(entryMacet.nominalBayar)}</p>
                    </div>
                    <div className="bg-white/50 p-5 rounded-3xl border border-[#8B4513]/10">
                      <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Sisa Hutang</p>
                      <p className="text-lg font-bold text-red-600 font-mono">{formatCurrency(entryMacet.sisa)}</p>
                    </div>
                  </div>

                  {entryMacet.status !== 'Lunas' && (
                    <div className="flex flex-col gap-4 bg-white/40 p-6 rounded-3xl border border-[#8B4513]/10">
                      {duplicateWarning && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl animate-in fade-in slide-in-from-top-1 mb-2">
                          <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-bold text-amber-900 mb-2">{duplicateWarning} Tetap simpan data baru?</p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setDuplicateWarning(null)}
                                  className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                >
                                  Batal
                                </button>
                                <button 
                                  onClick={() => handleUpdateMacet(true)}
                                  className="px-3 py-1.5 bg-amber-600 text-white rounded-full text-[10px] font-bold uppercase tracking-wider"
                                >
                                  Ya, Simpan
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row items-end gap-4">
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-black text-[#8B4513] uppercase tracking-widest mb-2">Angsur Cicilan (Nominal Bayar)</label>
                          <div className="relative">
                            <Calculator className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A375]" />
                            <input 
                              type="number"
                              placeholder="Contoh: 180000"
                              className="w-full pl-11 pr-5 py-3 bg-white rounded-2xl border border-[#E5E5DA] focus:ring-2 focus:ring-[#8B4513] focus:outline-none font-bold text-sm"
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex-1 w-full">
                          <label className="block text-[10px] font-black text-[#8B4513] uppercase tracking-widest mb-2">Tanggal Bayar</label>
                          <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A375]" />
                            <input 
                              type="datetime-local"
                              className="w-full pl-11 pr-5 py-3 bg-white rounded-2xl border border-[#E5E5DA] focus:ring-2 focus:ring-[#8B4513] focus:outline-none font-bold text-sm"
                              value={payDate}
                              onChange={(e) => setPayDate(e.target.value)}
                            />
                          </div>
                        </div>
                        <button 
                          disabled={!payAmount || isUpdating}
                          onClick={() => handleUpdateMacet(false)}
                          className="px-8 py-3.5 bg-[#8B4513] text-white rounded-full font-bold text-sm shadow-xl shadow-[#8B4513]/20 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center gap-2 h-[46px]"
                        >
                          <Save className="w-4 h-4" />
                          Update
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Timeline Histori Status Warga */}
              {wargaHistory.filter(h => h.wargaId === warga.id).length > 0 && (
                <div className="lg:col-span-2 bg-[#A3A375]/10 border border-[#A3A375]/30 rounded-[32px] p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-[#5A5A40]" />
                    <h4 className="text-lg font-bold text-[#3A3A2A]">Rentang Histori Perubahan Status & Kepenghunian</h4>
                  </div>
                  <div className="relative border-l-2 border-[#A3A375]/30 ml-3 pl-6 space-y-6">
                    {wargaHistory
                      .filter(h => h.wargaId === warga.id)
                      .sort((a, b) => a.effectiveFrom - b.effectiveFrom)
                      .map((h) => (
                        <div key={h.id} className="relative">
                          <div className={cn(
                            "absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-[#F5F5F0] shadow-sm",
                            h.effectiveTo == null ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                          )} />
                          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-wider">
                            {formatDate(h.effectiveFrom)} {h.effectiveTo ? `- ${formatDate(h.effectiveTo)}` : '(Sekarang)'}
                          </p>
                          <h5 className="font-bold text-[#3A3A2A] text-sm mt-0.5">Rumah No. {h.noRumah}</h5>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                              (h.role || 'Pemilik') === 'Penyewa' ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"
                            )}>
                              {h.role || 'Pemilik'}
                            </span>
                            <p className="text-xs text-[#5A5A40] bg-white inline-block px-3 py-1.5 rounded-xl border border-[#E5E5DA]">
                              Status: <span className={cn("font-bold", h.status === 'Aktif' ? "text-emerald-600" : (h.status === 'Pindah' ? "text-gray-500" : "text-amber-600"))}>{h.statusHuni} ({h.status})</span>
                              {h.status !== 'Pindah' && " • Wajib Iuran"}
                              {h.isIuranRT && h.status !== 'Pindah' && " + RT"}
                            </p>
                          </div>
                          {h.keterangan && (
                            <p className="text-xs text-[#5A5A40] italic mt-2">"{h.keterangan}"</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* History Table */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <History className="w-5 h-5 text-[#5A5A40]" />
                  <h3 className="text-xl font-serif font-bold text-[#3A3A2A]">Semua Riwayat Transaksi</h3>
                </div>
                <div className="bg-white rounded-[32px] border border-[#E5E5DA] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-[#F5F5F0]/50 text-[10px] font-black text-[#A3A375] uppercase tracking-widest">
                        <th className="px-6 py-4">Tanggal / Keterangan</th>
                        <th className="px-6 py-4 text-right">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5DA]">
                      {wargaTransaksiBase.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-6 py-10 text-center text-[#A3A375] italic">Belum ada catatan aktivitas</td>
                        </tr>
                      ) : (
                        wargaTransaksiBase.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-[#3A3A2A] text-sm flex flex-wrap items-center gap-2">
                                {t.keterangan}
                              </p>
                              <p className="text-[10px] font-bold text-[#A3A375] uppercase tracking-tight">{formatDate(t.tanggal)}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={cn(
                                "font-bold text-sm font-mono tracking-tight",
                                t.tipe === 'pemasukan' ? "text-emerald-600" : "text-[#8B4513]"
                              )}>
                                {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Arrears List */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className={cn("w-5 h-5", arrearsItems.length > 0 ? "text-amber-500" : "text-[#5A5A40]")} />
                  <h3 className="text-xl font-serif font-bold text-[#3A3A2A]">Daftar Tunggakan</h3>
                </div>
                <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-8">
                  {arrearsItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-[#3A3A2A]">Semua Kewajiban Terbayar!</p>
                        <p className="text-sm text-[#A3A375] mt-1">Warga ini tidak memiliki tunggakan kewajiban wajib.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {arrearsItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <Tag className="w-5 h-5 text-amber-500" />
                            </div>
                            <div>
                              <p className="font-bold text-[#3A3A2A]">{item.label}</p>
                              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Tunggakan</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#3A3A2A] font-mono text-sm">{formatCurrency(item.amount)}</p>
                          </div>
                        </div>
                      ))}
                      <div className="pt-6 border-t border-[#E5E5DA] mt-6 flex justify-between items-center">
                        <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">Total Tagihan (Inc. Macet 2025)</p>
                        <p className="text-xl font-bold text-amber-600 font-mono">
                          {formatCurrency(totalCurrentTunggakan + (entryMacet?.sisa || 0))}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-[#E5E5DA] bg-white/50 shrink-0 flex justify-end gap-4">
             <button 
                onClick={exportPDF}
                className="px-8 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#5A5A40] hover:bg-white active:scale-95 transition-all flex items-center gap-3"
              >
                <Printer className="w-5 h-5" />
                Cetak PDF
              </button>
             <button 
                onClick={onClose}
                className="px-8 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30"
              >
                Selesai & Tutup
              </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
