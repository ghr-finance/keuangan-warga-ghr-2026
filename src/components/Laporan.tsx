import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Transaksi, Kategori, Warga } from '../types';
import { FileText, Download, TrendingUp, TrendingDown, ChevronRight, PieChart, Coins, Home, Moon } from 'lucide-react';
import { formatCurrency, cn, resolveWargaForDate } from '../lib/utils';
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

  // RT & DKM category and description helper filters for stakeholder separation
  const rtMasukCatIds = kategori.filter(c => 
    c.nama.toLowerCase() === 'iuran rt'
  ).map(c => c.id);
  
  const rtKeluarCatIds = kategori.filter(c => 
    c.nama.toLowerCase() === 'penyerahan iuran rt'
  ).map(c => c.id);

  const dkmCatIds = kategori.filter(c => 
    c.nama.toLowerCase().includes('dkm') || 
    c.nama.toLowerCase().includes('mushola') || 
    c.nama.toLowerCase().includes('masjid')
  ).map(c => c.id);

  const isRTTransaction = (t: Transaksi) => {
    return rtMasukCatIds.includes(t.kategoriId) || rtKeluarCatIds.includes(t.kategoriId);
  };

  const isDKMTransaction = (t: Transaksi) => {
    const fromCat = dkmCatIds.includes(t.kategoriId);
    const fromDesc = (t.keterangan || '').toLowerCase().includes('dkm') || 
                     (t.keterangan || '').toLowerCase().includes('mushola') || 
                     (t.keterangan || '').toLowerCase().includes('musholla') ||
                     (t.keterangan || '').toLowerCase().includes('masjid');
    return fromCat || fromDesc;
  };

  const monthTransaksi = transaksi.filter(t => 
    isWithinInterval(new Date(t.tanggal), { start, end }) &&
    !isRTTransaction(t) &&
    !isDKMTransaction(t)
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

  // Cumulative calculations (Jan 2026 to end of selected month)
  const runningYear = 2026;
  const yearStart = new Date(runningYear, 0, 1);
  const cumulativeEnd = endOfMonth(new Date(selectedMonth));
  
  const cumulativeTrans = transaksi.filter(t => {
    const txDate = new Date(t.tanggal);
    return txDate >= yearStart && txDate <= cumulativeEnd && !isRTTransaction(t) && !isDKMTransaction(t);
  });
  
  const carryforwardTrans = transaksi.filter(t => (t.isHistorical || new Date(t.tanggal) < yearStart) && !isRTTransaction(t) && !isDKMTransaction(t));
  const carryforwardBal = carryforwardTrans.reduce((acc, curr) => {
    if (curr.tipe === 'pemasukan') return acc + curr.jumlah;
    if (curr.tipe === 'pengeluaran') return acc - curr.jumlah;
    return acc;
  }, 0);

  const cumTotalMasuk = cumulativeTrans.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const cumTotalKeluar = cumulativeTrans.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const cumSaldo = cumTotalMasuk - cumTotalKeluar;
  const finalSaldoAkhir = cumSaldo + carryforwardBal;

  // RT & DKM calculations for the selected month
  const monthRTTransactions = transaksi.filter(t => 
    isWithinInterval(new Date(t.tanggal), { start, end }) && isRTTransaction(t)
  );
  const rtMonthMasuk = monthRTTransactions.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtMonthKeluar = monthRTTransactions.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtMonthSurplus = rtMonthMasuk - rtMonthKeluar;

  const monthDKMTransactions = transaksi.filter(t => 
    isWithinInterval(new Date(t.tanggal), { start, end }) && isDKMTransaction(t)
  );
  const dkmMonthMasuk = monthDKMTransactions.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmMonthKeluar = monthDKMTransactions.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmMonthSurplus = dkmMonthMasuk - dkmMonthKeluar;

  // Cumulative balances up to the end of selected month for RT & DKM
  const rtCumulativeTransactions = transaksi.filter(t => {
    const txDate = new Date(t.tanggal);
    return txDate <= cumulativeEnd && isRTTransaction(t);
  });
  const rtCumulativeSaldo = rtCumulativeTransactions.reduce((acc, curr) => {
    return curr.tipe === 'pemasukan' ? acc + curr.jumlah : acc - curr.jumlah;
  }, 0);

  const dkmCumulativeTransactions = transaksi.filter(t => {
    const txDate = new Date(t.tanggal);
    return txDate <= cumulativeEnd && isDKMTransaction(t);
  });
  const dkmCumulativeSaldo = dkmCumulativeTransactions.reduce((acc, curr) => {
    return curr.tipe === 'pemasukan' ? acc + curr.jumlah : acc - curr.jumlah;
  }, 0);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const monthName = format(new Date(selectedMonth), 'MMMM yyyy', { locale: id });

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
      styles: { fontSize: 10, cellPadding: 2.5 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const text = data.cell.text[0];
          if (text.includes('-')) {
            data.cell.styles.textColor = [220, 38, 38]; // text-red-600
            data.cell.styles.fontStyle = 'italic';
          }
        }
      }
    });

    // Table 2: Cumulative Summary (Jan 2026 until now + Carryforward)
    const cumulativeSummaryData = [
      ['Total Pemasukan (Sejak Jan 2026)', formatCurrency(cumTotalMasuk)],
      ['Total Pengeluaran (Sejak Jan 2026)', formatCurrency(cumTotalKeluar)],
      ['Saldo Awal (Carryforward 2025)', formatCurrency(carryforwardBal)],
      ['Saldo Kas Akhir', formatCurrency(finalSaldoAkhir)]
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Informasi Total (Kumulatif)', 'Jumlah']],
      body: cumulativeSummaryData,
      theme: 'striped',
      headStyles: { fillColor: [163, 163, 117] }, // #A3A375
      styles: { fontSize: 10, cellPadding: 2.5 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const text = data.cell.text[0];
          if (text.includes('-')) {
            data.cell.styles.textColor = [220, 38, 38]; // text-red-600
            data.cell.styles.fontStyle = 'italic';
          }
        }
      }
    });

    // Table 2b: Separated Stakeholder Summary (Iuran RT & DKM)
    const stakeholderSummaryData = [
      ['Dana Iuran RT', `+${formatCurrency(rtMonthMasuk)}`, `-${formatCurrency(rtMonthKeluar)}`, formatCurrency(rtMonthSurplus), formatCurrency(rtCumulativeSaldo)],
      ['Dana Kas DKM', `+${formatCurrency(dkmMonthMasuk)}`, `-${formatCurrency(dkmMonthKeluar)}`, formatCurrency(dkmMonthSurplus), formatCurrency(dkmCumulativeSaldo)]
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Kas Stakeholder Terpisah', 'Masuk (Bulan Ini)', 'Keluar (Bulan Ini)', 'Surplus (Bulan Ini)', 'Saldo Akhir']],
      body: stakeholderSummaryData,
      theme: 'striped',
      headStyles: { fillColor: [74, 85, 78] }, // #4A554E (dark sage)
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
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
        const wName = resolveWargaForDate(warga.find(w => w.id === t.wargaId), t.tanggal)?.nama || '-';
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
      head: [['Tanggal', 'Keterangan (Kas Umum)', 'Kategori', 'Masuk', 'Keluar']],
      body: detailData,
      theme: 'grid',
      headStyles: { fillColor: [90, 90, 64] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    // Table: Detailed RT Transactions
    if (monthRTTransactions.length > 0) {
      const rtDetailData = monthRTTransactions
        .sort((a, b) => b.tanggal - a.tanggal)
        .map(t => {
          const cat = kategori.find(k => k.id === t.kategoriId)?.nama || '-';
          const wName = resolveWargaForDate(warga.find(w => w.id === t.wargaId), t.tanggal)?.nama || '-';
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
        head: [[{ content: 'Detail Transaksi Iuran RT (Sinking Fund)', colSpan: 5, styles: { halign: 'left', fillColor: [90, 90, 64] } }], ['Tanggal', 'Keterangan', 'Kategori', 'Masuk', 'Keluar']],
        body: rtDetailData,
        theme: 'grid',
        headStyles: { fillColor: [110, 110, 85] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });
    }

    // Table: Detailed DKM Transactions
    if (monthDKMTransactions.length > 0) {
      const dkmDetailData = monthDKMTransactions
        .sort((a, b) => b.tanggal - a.tanggal)
        .map(t => {
          const cat = kategori.find(k => k.id === t.kategoriId)?.nama || '-';
          const wName = resolveWargaForDate(warga.find(w => w.id === t.wargaId), t.tanggal)?.nama || '-';
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
        head: [[{ content: 'Detail Transaksi Kas DKM', colSpan: 5, styles: { halign: 'left', fillColor: [71, 85, 76] } }], ['Tanggal', 'Keterangan', 'Kategori', 'Masuk', 'Keluar']],
        body: dkmDetailData,
        theme: 'grid',
        headStyles: { fillColor: [95, 110, 100] },
        styles: { fontSize: 8 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' }
        }
      });
    }

    // Save PDF
    doc.save(`Laporan_Kas_GHR_${monthName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Laporan Bulanan</h1>
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
        <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1 overflow-hidden">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Total Pemasukan</p>
          <p className="text-base sm:text-lg font-bold font-mono text-[#5A5A40] truncate" title={formatCurrency(totalMasuk)}>{formatCurrency(totalMasuk)}</p>
        </div>
        <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1 overflow-hidden">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Total Pengeluaran</p>
          <p className="text-base sm:text-lg font-bold font-mono text-[#8B4513] truncate" title={formatCurrency(totalKeluar)}>{formatCurrency(totalKeluar)}</p>
        </div>
        <div className="bg-white p-6 sm:p-7 rounded-[32px] border border-[#E5E5DA] shadow-sm transform transition-transform hover:-translate-y-1 sm:col-span-2 lg:col-span-1 overflow-hidden">
          <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Surplus Bersih</p>
          <p className={cn(
            "text-base sm:text-lg font-bold font-mono truncate", 
            surplus < 0 ? "text-red-600 italic" : "text-[#5A5A40]"
          )} title={formatCurrency(surplus)}>
            {formatCurrency(surplus)}
          </p>
        </div>
      </div>

      {/* Kas Stakeholder Terpisah (RT & DKM) */}
      <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F5F5F0] pb-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#3A3A2A] flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#5A5A40]" />
              Kas Stakeholder Terpisah ({format(new Date(selectedMonth), 'MMMM yyyy', { locale: id })})
            </h3>
            <p className="text-xs text-[#A3A375] font-medium leading-relaxed">
              Pencatatan kas untuk iuran RT (sinking fund khusus) dan kas Mushola/DKM yang dikelola terpisah.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Iuran RT Card */}
          <div className="bg-[#5A5A40]/5 border border-[#5A5A40]/15 rounded-[24px] p-6 space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 bg-[#5A5A40]/10 px-3 py-1 rounded-full">
                    <Home className="w-3 h-3 text-[#5A5A40]" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#5A5A40]">Sinking Fund RT</span>
                  </div>
                  <h4 className="text-base font-bold text-[#3A3A2A] truncate">Dana Iuran RT</h4>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest">Saldo Akhir Periode</p>
                  <p className={cn(
                    "text-base font-bold font-mono mt-0.5",
                    rtCumulativeSaldo < 0 ? "text-red-600 font-bold italic" : "text-[#5A5A40]"
                  )}>
                    {formatCurrency(rtCumulativeSaldo)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-2 pt-4 border-t border-[#5A5A40]/10 text-xs">
              <div>
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Masuk (Bulan Ini)</p>
                <p className="font-bold text-emerald-700 mt-1 whitespace-nowrap font-mono">+{formatCurrency(rtMonthMasuk)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Keluar (Bulan Ini)</p>
                <p className="font-bold text-red-700 mt-1 whitespace-nowrap font-mono">-{formatCurrency(rtMonthKeluar)}</p>
              </div>
              <div className="sm:pl-3 sm:border-l border-[#5A5A40]/10">
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Surplus (Bulan Ini)</p>
                <p className={cn(
                  "font-bold mt-1 whitespace-nowrap font-mono",
                  rtMonthSurplus < 0 ? "text-red-700 italic" : "text-[#5A5A40]"
                )}>
                  {formatCurrency(rtMonthSurplus)}
                </p>
              </div>
            </div>
          </div>

          {/* DKM Mushola Card */}
          <div className="bg-[#47554C]/5 border border-[#47554C]/15 rounded-[24px] p-6 space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/40 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 bg-[#47554C]/10 px-3 py-1 rounded-full">
                    <Moon className="w-3 h-3 text-[#47554C]" />
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#47554C]">Kas Masjid / Mushola</span>
                  </div>
                  <h4 className="text-base font-bold text-[#3A3A2A] truncate">Dana Kas DKM</h4>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest">Saldo Akhir Periode</p>
                  <p className={cn(
                    "text-base font-bold font-mono mt-0.5",
                    dkmCumulativeSaldo < 0 ? "text-red-600 font-bold italic" : "text-[#47554C]"
                  )}>
                    {formatCurrency(dkmCumulativeSaldo)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-2 pt-4 border-t border-[#47554C]/10 text-xs">
              <div>
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Masuk (Bulan Ini)</p>
                <p className="font-bold text-emerald-700 mt-1 whitespace-nowrap font-mono">+{formatCurrency(dkmMonthMasuk)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Keluar (Bulan Ini)</p>
                <p className="font-bold text-red-700 mt-1 whitespace-nowrap font-mono">-{formatCurrency(dkmMonthKeluar)}</p>
              </div>
              <div className="sm:pl-3 sm:border-l border-[#47554C]/10">
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-wider">Surplus (Bulan Ini)</p>
                <p className={cn(
                  "font-bold mt-1 whitespace-nowrap font-mono",
                  dkmMonthSurplus < 0 ? "text-red-700 italic" : "text-[#47554C]"
                )}>
                  {formatCurrency(dkmMonthSurplus)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ringkasan Kumulatif (Sejak Jan 2026) */}
      <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-[#5A5A40]" />
            <h3 className="text-lg font-bold text-[#3A3A2A]">Informasi Total (Kumulatif &amp; Saldo Awal)</h3>
          </div>
          <span className="text-[10px] font-bold px-3 py-1 bg-[#A3A375]/10 rounded-full text-[#5A5A40]">
            Kas Umum &amp; Carryforward 2025
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#F5F5F0]/50 p-5 rounded-2xl border border-[#E5E5DA]/40">
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Saldo Awal (Carryforward 2025)</p>
            <p className="text-sm sm:text-base font-bold text-[#3A3A2A] font-mono">{formatCurrency(carryforwardBal)}</p>
            <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Sisa Kas Umum Wilayah (Rp 83.268) akhir tahun 2025.</p>
          </div>
          
          <div className="bg-[#F5F5F0]/50 p-5 rounded-2xl border border-[#E5E5DA]/40">
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Pemasukan 2026</p>
            <p className="text-sm sm:text-base font-bold text-emerald-700 font-mono">+{formatCurrency(cumTotalMasuk)}</p>
            <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Akumulasi iuran, THR, dan kegiatan yang masuk pada tahun 2026.</p>
          </div>
          
          <div className="bg-[#F5F5F0]/50 p-5 rounded-2xl border border-[#E5E5DA]/40">
            <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1">Pengeluaran 2026</p>
            <p className="text-sm sm:text-base font-bold text-red-700 font-mono">-{formatCurrency(cumTotalKeluar)}</p>
            <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Total dana keluar untuk gaji petugas, operasional, &amp; bukber.</p>
          </div>
          
          <div className="bg-[#5A5A40]/5 p-5 rounded-2xl border border-[#5A5A40]/15">
            <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-widest mb-1">Saldo Kas Akhir</p>
            <p className={cn(
              "text-sm sm:text-base font-bold font-mono",
              finalSaldoAkhir < 0 ? "text-red-600 italic" : "text-[#3A3A2A]"
            )}>{formatCurrency(finalSaldoAkhir)}</p>
            <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Dipadukan dengan Carryforward 2025 (Sama persis dengan Dashboard).</p>
          </div>
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
                    <span className="text-sm font-bold text-[#3A3A2A] font-mono text-[13px]">{formatCurrency(k.amount)}</span>
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
                    "text-sm font-bold font-mono tracking-tight",
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
