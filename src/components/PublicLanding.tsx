import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { formatCurrency, cn } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Home, 
  Moon, 
  Sparkles, 
  ShieldAlert, 
  LogIn, 
  CreditCard 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { subMonths, format, isSameMonth, endOfMonth } from 'date-fns';
import { Transaksi, Kategori, Event } from '../types';

export function GhrBrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-10 h-10 rounded-xl",
    lg: "w-12 h-12 rounded-2xl"
  };
  const iconClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7.5 h-7.5"
  };
  
  return (
    <div className={cn("bg-[#FA3E3E] flex items-center justify-center shadow-md", sizeClasses[size])}>
      <svg 
        viewBox="0 0 100 100" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={cn("text-white", iconClasses[size])}
      >
        <line x1="16" y1="75" x2="84" y2="75" />
        <path d="M 24 75 L 24 55 A 8 8 0 0 1 32 47 L 42 47 L 42 75" />
        <path d="M 42 75 L 42 34 A 8 8 0 0 1 50 26 A 8 8 0 0 1 58 34 L 58 75" />
        <path d="M 58 75 L 58 47 L 68 47 A 8 8 0 0 1 76 55 L 76 75" />
      </svg>
    </div>
  );
}

interface PublicLandingProps {
  onLogin: () => void;
}

export default function PublicLanding({ onLogin }: PublicLandingProps) {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Public unauthenticated subscriptions
    const unsubT = dbService.subscribe('transaksi', (data) => {
      setTransaksi(data);
      setLoading(false);
    });
    const unsubC = dbService.subscribe('kategori', setCategories);
    const unsubE = dbService.subscribe('events', setEvents);

    return () => {
      unsubT();
      unsubC();
      unsubE();
    };
  }, []);

  // 1. Core Categories & Identification Helpers for RT & DKM
  const rtMasukCatIds = categories.filter(c => 
    c.nama.toLowerCase() === 'iuran rt'
  ).map(c => c.id);
  
  const rtKeluarCatIds = categories.filter(c => 
    c.nama.toLowerCase() === 'penyerahan iuran rt'
  ).map(c => c.id);

  const dkmCatIds = categories.filter(c => 
    c.nama.toLowerCase().includes('dkm') || 
    c.nama.toLowerCase().includes('mushola') || 
    c.nama.toLowerCase().includes('masjid')
  ).map(c => c.id);

  const isRTTransaction = (t: any) => {
    return rtMasukCatIds.includes(t.kategoriId) || rtKeluarCatIds.includes(t.kategoriId);
  };

  const isDKMTransaction = (t: any) => {
    const fromCat = dkmCatIds.includes(t.kategoriId);
    const fromDesc = t.keterangan.toLowerCase().includes('dkm') || 
                     t.keterangan.toLowerCase().includes('mushola') || 
                     t.keterangan.toLowerCase().includes('musholla') ||
                     t.keterangan.toLowerCase().includes('masjid');
    return fromCat || fromDesc;
  };

  // Calculate General RT Balance Metrics (identical to Admin Panel)
  // These exclude Iuran RT and DKM transactions per stakeholder requirement
  const totalMasuk = transaksi.filter(t => t.tipe === 'pemasukan' && !isRTTransaction(t) && !isDKMTransaction(t)).reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = transaksi.filter(t => t.tipe === 'pengeluaran' && !isRTTransaction(t) && !isDKMTransaction(t)).reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldoSemua = totalMasuk - totalKeluar;

  // Cumulative Year 2026 (Since Jan 2026)
  const runningYear = 2026;
  const yearStart = new Date(runningYear, 0, 1);
  
  const cumulativeTrans = transaksi.filter(t => {
    const txDate = new Date(t.tanggal);
    return txDate >= yearStart;
  });

  // Calculate General Carryforward from 2025 (Excluding RT/DKM)
  const carryforwardTrans = transaksi.filter(t => (t.isHistorical || new Date(t.tanggal) < yearStart) && !isRTTransaction(t) && !isDKMTransaction(t));
  const carryforwardBal = carryforwardTrans.reduce((acc, curr) => {
    if (curr.tipe === 'pemasukan') return acc + curr.jumlah;
    if (curr.tipe === 'pengeluaran') return acc - curr.jumlah;
    return acc;
  }, 0);

  // General Grand Totals for 2026 (Excluding RT/DKM)
  const cumTotalMasuk = cumulativeTrans.filter(t => t.tipe === 'pemasukan' && !isRTTransaction(t) && !isDKMTransaction(t)).reduce((acc, curr) => acc + curr.jumlah, 0);
  const cumTotalKeluar = cumulativeTrans.filter(t => t.tipe === 'pengeluaran' && !isRTTransaction(t) && !isDKMTransaction(t)).reduce((acc, curr) => acc + curr.jumlah, 0);
  const cumSaldo = cumTotalMasuk - cumTotalKeluar;
  const finalSaldoAkhir = cumSaldo + carryforwardBal;

  // 2. Iuran RT specific calculations
  const rtMasukTransactions = transaksi.filter(t => t.tipe === 'pemasukan' && rtMasukCatIds.includes(t.kategoriId));
  const rtKeluarTransactions = transaksi.filter(t => t.tipe === 'pengeluaran' && rtKeluarCatIds.includes(t.kategoriId));
  
  const rtMasuk = rtMasukTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtKeluar = rtKeluarTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtSaldo = rtMasuk - rtKeluar;

  const saldoRT2025 = 540000; // Baseline 2025 RT Sinking fund
  
  // Calculate income purely from 2026 (excluding historical)
  const rtIncome2026 = rtMasukTransactions
    .filter(t => !t.isHistorical)
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  // 3. DKM specific calculations
  const dkmTransactions = transaksi.filter(t => isDKMTransaction(t));

  const dkmMasuk = dkmTransactions.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmKeluar = dkmTransactions.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmSaldo = dkmMasuk - dkmKeluar;

  const dkmIncome2026 = dkmTransactions
    .filter(t => t.tipe === 'pemasukan' && !t.isHistorical)
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  // 4. Monthly Stats for clean Recharts visualizations (last 6 months)
  const lastMonths = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
  const chartData = lastMonths.map(m => {
    const monthLabel = format(m, 'MMM');
    const masuk = transaksi
      .filter(t => t.tipe === 'pemasukan' && isSameMonth(new Date(t.tanggal), m))
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    const keluar = transaksi
      .filter(t => t.tipe === 'pengeluaran' && isSameMonth(new Date(t.tanggal), m))
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    return { name: monthLabel, masuk, keluar };
  });

  // Calculate top spending categories for transparency
  const categorySummary = categories.map(k => {
    const amount = cumulativeTrans
      .filter(t => t.kategoriId === k.id)
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    return { ...k, amount };
  }).filter(k => k.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#4A4A3A] font-sans antialiased flex flex-col justify-between">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#F5F5F0]/85 backdrop-blur-md border-b border-[#E5E5DA]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GhrBrandLogo size="md" />
            <div>
              <span className="font-serif font-extrabold text-lg sm:text-xl text-[#3A3A2A] tracking-tight block leading-none">Keuangan GHR</span>
              <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#A3A375]">Transparansi Publik</span>
            </div>
          </div>

          <button
            onClick={onLogin}
            className="flex items-center gap-2 bg-[#5A5A40] text-white px-5 py-2 sm:py-2.5 rounded-full hover:bg-[#4E4E37] shadow-sm hover:shadow-md transition-all text-xs sm:text-sm font-semibold"
          >
            <LogIn className="w-4 h-4" />
            <span>Login Admin</span>
          </button>
        </div>
      </header>

      {/* Main Content Sections */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex-1 w-full space-y-12">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#A3A375]/10 px-4.5 py-1.5 rounded-full border border-[#A3A375]/25">
            <Sparkles className="w-3.5 h-3.5 text-[#5A5A40]" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#5A5A40]">Informasi Terbuka & Accuntable</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight text-[#3A3A2A]">
            Portal Transparansi Keuangan Warga GHR
          </h1>
          <p className="text-[#5A5A40] text-sm sm:text-base font-medium leading-relaxed max-w-2xl mx-auto">
            Selamat datang di layanan keterbukaan data <strong className="font-black">keuangan</strong> sosial <strong className="font-black">warga</strong> lingkungan Green Hills Residency (<strong className="font-black">GHR</strong>). Di sini, Anda dapat memantau realisasi anggaran, iuran masuk, biaya operasional pemeliharaan lingkungan, serta total saldo kas secara real-time.
          </p>
        </section>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[#A3A375] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-[#A3A375] font-semibold uppercase tracking-wider">Memuat Data Transparansi...</p>
          </div>
        ) : (
          <>
            {/* Quick Summary Cards (Sejak Jan 2026 & Carryforward) */}
            <section className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-[#3A3A2A] flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#5A5A40]" />
                    <span>Akumulasi Laporan Keuangan Warga</span>
                  </h3>
                  <p className="text-xs text-[#A3A375] font-medium font-sans">Kalkulasi kas kumulatif, dipadukan dengan Carryforward sisa saldo akhir tahun 2025.</p>
                </div>
                <span className="text-[10px] font-bold px-3 py-1 bg-[#A3A375]/10 rounded-full text-[#5A5A40] self-start sm:self-auto">
                  Tahun Anggaran 2026
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#F5F5F0]/40 p-5 rounded-2xl border border-[#E5E5DA]/40">
                  <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1.5">Saldo Awal (Carryforward 2025)</p>
                  <p className="text-lg font-extrabold text-[#3A3A2A]">{formatCurrency(carryforwardBal)}</p>
                  <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Sisa Kas Umum &amp; sisa iuran warga akhir tahun 2025.</p>
                </div>

                <div className="bg-[#F5F5F0]/40 p-5 rounded-2xl border border-[#E5E5DA]/40">
                  <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1.5 font-bold">Total Pemasukan 2026</p>
                  <p className="text-lg font-extrabold text-emerald-700">+{formatCurrency(cumTotalMasuk)}</p>
                  <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Akumulasi seluruh iuran masuk, THR, dan donasi kegiatan warga.</p>
                </div>

                <div className="bg-[#F5F5F0]/40 p-5 rounded-2xl border border-[#E5E5DA]/40">
                  <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-1.5 font-bold">Total Pengeluaran 2026</p>
                  <p className="text-lg font-extrabold text-red-700">-{formatCurrency(cumTotalKeluar)}</p>
                  <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Alokasi pembayaran gaji petugas, perbendaharaan, &amp; pemeliharaan.</p>
                </div>

                <div className="bg-[#5A5A40]/5 p-5 rounded-2xl border border-[#5A5A40]/15">
                  <p className="text-[10px] font-black text-[#5A5A40] uppercase tracking-widest mb-1.5 font-bold">Saldo Kas Akhir GHR</p>
                  <p className="text-xl font-black text-[#3A3A2A]">{formatCurrency(finalSaldoAkhir)}</p>
                  <p className="text-[9px] text-[#A3A375] mt-1 font-medium">Sisa saldo saat ini yang dipegang di kas warga secara riil.</p>
                </div>
              </div>
            </section>

            {/* Split RT & DKM Specific Fund Cards */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* RT Fund Box */}
              <div className="bg-[#5A5A40] rounded-[32px] p-6 sm:p-8 text-[#F5F5F0] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                        <Home className="w-3.5 h-3.5 text-[#A3A375]" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A375]">Fokus Dana Warga</span>
                      </div>
                      <h4 className="text-xl font-serif font-bold text-white">Kas Iuran Bulanan RT</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-[#A3A375] block uppercase tracking-wider">Saldo Awal 2025</span>
                      <span className="text-sm font-extrabold text-white">{formatCurrency(saldoRT2025)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest leading-none">Pemasukan 2026</p>
                      <p className="text-base font-extrabold text-[#74E39A] mt-1">+{formatCurrency(rtIncome2026)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest leading-none">Pengeluaran</p>
                      <p className="text-base font-extrabold text-red-300 mt-1">-{formatCurrency(rtKeluar)}</p>
                    </div>
                    <div className="pl-3 border-l border-white/10">
                      <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest leading-none">Saldo Akhir RT</p>
                      <p className="text-base font-black text-white mt-1">{formatCurrency(rtSaldo)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* DKM Box */}
              <div className="bg-[#47554C] rounded-[32px] p-6 sm:p-8 text-[#F5F5F0] shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
                        <Moon className="w-3.5 h-3.5 text-emerald-200" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#95C2A5]">Fokus Keagamaan</span>
                      </div>
                      <h4 className="text-xl font-serif font-bold text-white">Kas Mushola DKM</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-[#A6B2A8] block uppercase tracking-wider">Status Masjid</span>
                      <span className="text-xs font-bold text-emerald-300 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Terbuka &amp; Aktif</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest leading-none">Pemasukan 2026</p>
                      <p className="text-base font-extrabold text-[#74E39A] mt-1">+{formatCurrency(dkmIncome2026)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest leading-none">Pengeluaran</p>
                      <p className="text-base font-extrabold text-red-300 mt-1">-{formatCurrency(dkmKeluar)}</p>
                    </div>
                    <div className="pl-3 border-l border-white/10">
                      <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest leading-none">Saldo DKM</p>
                      <p className="text-base font-black text-white mt-1">{formatCurrency(dkmSaldo)}</p>
                    </div>
                  </div>
                </div>
              </div>

            </section>

            {/* Monthly Trend Section & Category Transparency */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left & Middle: Recharts Graph */}
              <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 lg:col-span-2 space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-[#3A3A2A]">Sirkulasi Arus Kas Bulanan</h4>
                  <p className="text-xs text-[#A3A375] font-medium leading-normal mt-1">
                    Visualisasi perbandingan kas masuk dan keluar selama 6 bulan terakhir.
                  </p>
                </div>
                
                <div className="h-64 sm:h-72 w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F0" />
                      <XAxis dataKey="name" stroke="#A3A375" fontSize={11} tickLine={false} />
                      <YAxis stroke="#A3A375" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp ${(val/1000000).toFixed(1)}jt`} />
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), '']} 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #E5E5DA', fontSize: '12px' }}
                      />
                      <Bar dataKey="masuk" fill="#10B981" radius={[4, 4, 0, 0]} name="Pemasukan" maxBarSize={30} />
                      <Bar dataKey="keluar" fill="#EF4444" radius={[4, 4, 0, 0]} name="Pengeluaran" maxBarSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: Allocation Category Breakdown */}
              <div className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 space-y-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-[#3A3A2A]">Alokasi Pengeluaran Terbesar</h4>
                  <p className="text-xs text-[#A3A375] font-medium leading-normal mt-1">
                    Kategori penyalur anggaran terbesar tahun 2026 demi kenyamanan bersama.
                  </p>
                </div>

                <div className="space-y-4 flex-1 overflow-auto mt-4 max-h-[220px] pr-1">
                  {categorySummary.length === 0 ? (
                    <div className="text-center py-8 text-xs text-[#A3A375] font-semibold uppercase">Belum ada pengeluaran</div>
                  ) : (
                    categorySummary.map((cat, idx) => {
                      const maxAmount = Math.max(...categorySummary.map(c => c.amount), 1);
                      const percentage = (cat.amount / maxAmount) * 100;
                      return (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-[#3A3A2A] truncate max-w-[150px]">{cat.nama}</span>
                            <span className="text-[#5A5A40] shrink-0">{formatCurrency(cat.amount)}</span>
                          </div>
                          <div className="w-full bg-[#F5F5F0] h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-[#A3A375] h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="text-[10px] text-center text-[#A3A375] font-sans bg-[#F5F5F0]/50 py-2.5 px-4 rounded-xl border border-[#E5E5DA]/30">
                  Data iuran individu dan identitas warga aman terlindungi dari publik.
                </div>
              </div>
            </section>

            {/* Upcoming Event Badges tracker */}
            {events.length > 0 && (
              <section className="bg-white rounded-[32px] border border-[#E5E5DA] shadow-sm p-6 sm:p-8 space-y-6">
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-[#3A3A2A]">Anggaran Kegiatan Warga</h4>
                  <p className="text-xs text-[#A3A375] font-medium leading-normal mt-1">
                    Status kelayakan dana dan anggaran untuk kegiatan-kegiatan bergotong-royong GHR.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const eventTransactions = transaksi.filter(t => t.eventId === event.id);
                    const realisasi = eventTransactions
                      .filter(t => t.tipe === 'pengeluaran')
                      .reduce((acc, curr) => acc + curr.jumlah, 0);
                    const progress = event.budget && event.budget > 0 ? (realisasi / event.budget) * 100 : 0;
                    return (
                      <div key={event.id} className="relative bg-[#F5F5F0]/30 border border-[#E5E5DA]/50 rounded-2xl p-5 space-y-4 hover:border-[#A3A375]/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A375]">KEGIATAN WARGA</span>
                            <h5 className="font-bold text-sm text-[#3A3A2A] mt-0.5">{event.nama}</h5>
                          </div>
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0",
                            event.status === 'Selesai' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {event.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#A3A375] font-sans">Realisasi Pengeluaran:</span>
                            <span className="font-extrabold text-[#3A3A2A]">{formatCurrency(realisasi)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#A3A375] font-medium">
                            <span>Budget Target:</span>
                            <span>{formatCurrency(event.budget || 0)}</span>
                          </div>
                          {event.budget && event.budget > 0 ? (
                            <div className="w-full bg-[#E5E5DA]/50 h-1.5 rounded-full overflow-hidden mt-1">
                              <div className="bg-[#5A5A40] h-full rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}



      </main>

      {/* Footer */}
      <footer className="border-t border-[#E5E5DA] bg-white py-10 text-center text-xs text-[#A3A375] space-y-2 mt-12">
        <p className="font-bold flex items-center justify-center gap-1.5 text-[#3A3A2A]">
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="w-4 h-4 text-[#FA3E3E]"
          >
            <line x1="16" y1="75" x2="84" y2="75" />
            <path d="M 24 75 L 24 55 A 8 8 0 0 1 32 47 L 42 47 L 42 75" />
            <path d="M 42 75 L 42 34 A 8 8 0 0 1 50 26 A 8 8 0 0 1 58 34 L 58 75" />
            <path d="M 58 75 L 58 47 L 68 47 A 8 8 0 0 1 76 55 L 76 75" />
          </svg>
          <span>Keuangan Warga GHR © 2026. Seluruh hak cipta dilindungi.</span>
        </p>
        <p className="text-[10px] text-[#A3A375]/80 font-medium">
          Dikelola secara mandiri oleh pengurus perbendaharaan warga Green Hills Residency (GHR).
        </p>
      </footer>
    </div>
  );
}
