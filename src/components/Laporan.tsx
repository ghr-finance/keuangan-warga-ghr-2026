import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Transaksi, Kategori, Warga } from '../types';
import { FileText, Download, TrendingUp, TrendingDown, ChevronRight, PieChart } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, isWithinInterval, startOfYear, eachMonthOfInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Laporan() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [kategori, setKategori] = useState<Kategori[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubK = dbService.subscribe('kategori', setKategori);
    const unsubW = dbService.subscribe('warga', setWarga);
    return () => {
      unsubT();
      unsubK();
      unsubW();
    };
  }, []);

  const months = eachMonthOfInterval({
    start: startOfYear(new Date()),
    end: new Date()
  }).reverse();

  const start = startOfMonth(new Date(selectedMonth));
  const end = endOfMonth(new Date(selectedMonth));

  const monthTransaksi = transaksi.filter(t => 
    isWithinInterval(new Date(t.tanggal), { start, end })
  );

  const totalMasuk = monthTransaksi.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = monthTransaksi.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const surplus = totalMasuk - totalKeluar;

  const categorySummary = kategori.map(k => {
    const amount = monthTransaksi
      .filter(t => t.kategoriId === k.id)
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    return { ...k, amount };
  }).filter(k => k.amount > 0).sort((a,b) => b.amount - a.amount);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const monthName = format(new Date(selectedMonth), 'MMMM yyyy', { locale: id });
    
    // Cumulative calculations (Jan 2026 to end of selected month)
    const runningYear = 2026;
    const yearStart = new Date(runningYear, 0, 1);
    const cumulativeEnd = endOfMonth(new Date(selectedMonth));
    
    const cumulativeTrans = transaksi.filter(t => {
      const txDate = new Date(t.tanggal);
      return txDate >= yearStart && txDate <= cumulativeEnd;
    });
    
    const cumTotalMasuk = cumulativeTrans.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
    const cumTotalKeluar = cumulativeTrans.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
    const cumSaldo = cumTotalMasuk - cumTotalKeluar;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(58, 58, 42); // #3A3A2A
    doc.text('LAPORAN KAS GHR', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(163, 163, 117); // #A3A375
    doc.text(`Periode: ${monthName}`, 105, 28, { align: 'center' });

    // Table 1: Selected Month Summary
    const monthSummaryData = [
      ['Pemasukan Bulan Ini', formatCurrency(totalMasuk)],
      ['Pengeluaran Bulan Ini', formatCurrency(totalKeluar)],
      ['Surplus/Defisit', formatCurrency(surplus)]
    ];

    autoTable(doc, {
      startY: 40,
      head: [[`Ringkasan Keuangan ${monthName}`, 'Jumlah']],
      body: monthSummaryData,
      theme: 'striped',
      headStyles: { fillColor: [90, 90, 64] }, // #5A5A40
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Table 2: Cumulative Summary (Jan 2026 until now)
    const cumulativeSummaryData = [
      ['Total Pemasukan (Sejak Jan 2026)', formatCurrency(cumTotalMasuk)],
      ['Total Pengeluaran (Sejak Jan 2026)', formatCurrency(cumTotalKeluar)],
      ['Saldo Kas Akhir', formatCurrency(cumSaldo)]
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Informasi Total (Kumulatif)', 'Jumlah']],
      body: cumulativeSummaryData,
      theme: 'striped',
      headStyles: { fillColor: [163, 163, 117] }, // #A3A375
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Category Breakdown
    const categoryData = categorySummary.map(k => [
      k.nama,
      k.tipe.toUpperCase(),
      formatCurrency(k.amount)
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Kategori Bulan Ini', 'Tipe', 'Total']],
      body: categoryData,
      theme: 'grid',
      headStyles: { fillColor: [110, 110, 85] }, 
      styles: { fontSize: 9 }
    });

    // Transaction Details
    const detailData = monthTransaksi
      .sort((a, b) => b.tanggal - a.tanggal)
      .map(t => {
        const cat = kategori.find(k => k.id === t.kategoriId)?.nama || '-';
        const wName = warga.find(w => w.id === t.wargaId)?.nama || '-';
        return [
          format(new Date(t.tanggal), 'dd/MM/yyyy'),
          t.keterangan + (wName !== '-' ? ` (${wName})` : ''),
          cat,
          t.tipe === 'pemasukan' ? formatCurrency(t.jumlah) : '',
          t.tipe === 'pengeluaran' ? formatCurrency(t.jumlah) : ''
        ];
      });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tanggal', 'Keterangan', 'Kategori', 'Masuk', 'Keluar']],
      body: detailData,
      theme: 'grid',
      headStyles: { fillColor: [90, 90, 64] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    // Save PDF
    doc.save(`Laporan_Kas_GHR_${monthName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Laporan Bulanan</h1>
          <p className="text-[#A3A375] font-medium mt-2">Analisis pemasukan dan pengeluaran tiap bulan.</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-6 py-3.5 bg-white border border-[#E5E5DA] rounded-full focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold text-sm text-[#4A4A3A] appearance-none"
          >
            {months.map(m => (
              <option key={format(m, 'yyyy-MM')} value={format(m, 'yyyy-MM')}>
                {format(m, 'MMMM yyyy', { locale: id })}
              </option>
            ))}
          </select>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-white border border-[#E5E5DA] text-[#4A4A3A] px-6 py-3.5 rounded-full font-bold hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="w-5 h-5 text-[#A3A375]" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Total Pemasukan</p>
          <p className="text-2xl sm:text-3xl font-black text-[#5A5A40]">{formatCurrency(totalMasuk)}</p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Total Pengeluaran</p>
          <p className="text-2xl sm:text-3xl font-black text-[#8B4513]">{formatCurrency(totalKeluar)}</p>
        </div>
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Surplus Bersih</p>
          <p className={cn("text-2xl sm:text-3xl font-black", surplus >= 0 ? "text-[#5A5A40]" : "text-[#8B4513]")}>
            {formatCurrency(surplus)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-[#F5F5F0] flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#3A3A2A] flex items-center gap-3">
              <PieChart className="w-6 h-6 text-[#A3A375]" /> Alokasi Kategori
            </h3>
            <span className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest bg-[#F5F5F0] px-3 py-1 rounded-full">{monthTransaksi.length} Transaksi</span>
          </div>
          <div className="p-8 space-y-8 flex-1">
            {categorySummary.length > 0 ? (
              categorySummary.map((k) => (
                <div key={k.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        k.tipe === 'pemasukan' ? "bg-[#5A5A40]" : "bg-[#8B4513]"
                      )} />
                      <span className="text-sm font-bold text-[#4A4A3A]">{k.nama}</span>
                    </div>
                    <span className="text-sm font-black text-[#3A3A2A]">{formatCurrency(k.amount)}</span>
                  </div>
                  <div className="h-2 w-full bg-[#F5F5F0] rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        k.tipe === 'pemasukan' ? "bg-[#5A5A40]" : "bg-[#8B4513]"
                      )}
                      style={{ width: `${(k.amount / (k.tipe === 'pemasukan' ? totalMasuk : totalKeluar)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <PieChart className="w-12 h-12 text-[#E5E5DA] mb-4" />
                <p className="text-[#A3A375] font-medium italic">Tidak ada alokasi data bulan ini.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-8 border-b border-[#F5F5F0] flex items-center justify-between">
            <h3 className="text-xl font-bold text-[#3A3A2A] flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-[#A3A375]" /> Histori Arus Kas
            </h3>
            <span className="text-[10px] font-black text-[#5A5A40] uppercase tracking-widest">Urutan Terbaru</span>
          </div>
          <div className="divide-y divide-[#F5F5F0] overflow-auto max-h-[500px]">
            {monthTransaksi.sort((a,b) => b.tanggal - a.tanggal).map((t) => (
              <div key={t.id} className="p-6 flex items-center justify-between hover:bg-[#F5F5F0]/30 transition-colors group">
                <div className="min-w-0 flex-1 pr-4">
                  <p className="text-sm font-bold text-[#3A3A2A] truncate group-hover:text-[#5A5A40] transition-colors">{t.keterangan}</p>
                  <p className="text-[10px] text-[#A3A375] font-bold uppercase mt-1">{format(new Date(t.tanggal), 'dd MMM HH:mm')}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black tabular-nums",
                    t.tipe === 'pemasukan' ? "text-[#5A5A40]" : "text-[#8B4513]"
                  )}>
                    {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                  </p>
                  <p className="text-[10px] text-[#A3A375] font-black uppercase opacity-60 tracking-wider mt-0.5">{kategori.find(k => k.id === t.kategoriId)?.nama}</p>
                </div>
              </div>
            ))}
            {monthTransaksi.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <TrendingUp className="w-12 h-12 text-[#E5E5DA] mb-4" />
                <p className="text-[#A3A375] font-medium italic">Belum ada histori transaksi bulan ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
