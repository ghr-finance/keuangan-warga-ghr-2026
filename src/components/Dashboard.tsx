import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { formatCurrency, formatDate, cn, getRTMasukCatIds, getRTKeluarCatIds } from '../lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Home,
  Moon,
  Sparkles
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Transaksi, Warga, Kategori, WargaHistory } from '../types';
import { subMonths, format, isSameMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import IuranModal from './IuranModal';

export default function Dashboard() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [wargaHistory, setWargaHistory] = useState<WargaHistory[]>([]);
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubW = dbService.subscribe('warga', setWarga);
    const unsubWH = dbService.subscribe('warga_history', setWargaHistory);
    return () => {
      unsubT();
      unsubW();
      unsubWH();
    };
  }, []);

  // Refined approach for Iuran RT: pre-filter using categories
  const [categories, setCategories] = useState<Kategori[]>([]);
  useEffect(() => {
    // Also subscribe to categories to handle dynamic updates or seeding
    const unsubC = dbService.subscribe('kategori', setCategories);
    return () => unsubC();
  }, []);

  const rtMasukCatIds = getRTMasukCatIds(categories);
  const rtKeluarCatIds = getRTKeluarCatIds(categories);

  // DKM calculations
  const dkmCatIds = categories.filter(c =>
    c.nama.toLowerCase().includes('dkm') ||
    c.nama.toLowerCase().includes('mushola') ||
    c.nama.toLowerCase().includes('masjid')
  ).map(c => c.id);

  const isRTTransaction = (t: Transaksi) => {
    return rtMasukCatIds.includes(t.kategoriId) || rtKeluarCatIds.includes(t.kategoriId);
  };

  const isDKMTransaction = (t: Transaksi) => {
    const fromCat = dkmCatIds.includes(t.kategoriId);
    const fromDesc = t.keterangan.toLowerCase().includes('dkm') ||
      t.keterangan.toLowerCase().includes('mushola') ||
      t.keterangan.toLowerCase().includes('musholla') ||
      t.keterangan.toLowerCase().includes('masjid');
    return fromCat || fromDesc;
  };

  const umumTransaksi = transaksi.filter(t => !isRTTransaction(t) && !isDKMTransaction(t));

  // Main general financial metrics (excluding RT/DKM per stakeholder requirement)
  const totalMasuk = umumTransaksi.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = umumTransaksi.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;

  const rtMasukTransactions = transaksi.filter(t => t.tipe === 'pemasukan' && rtMasukCatIds.includes(t.kategoriId));
  const rtKeluarTransactions = transaksi.filter(t => t.tipe === 'pengeluaran' && rtKeluarCatIds.includes(t.kategoriId));

  const rtMasuk = rtMasukTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtKeluar = rtKeluarTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtMasuk2026 = rtMasukTransactions.filter(t => !t.isHistorical).reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtKeluar2026 = rtKeluarTransactions.filter(t => !t.isHistorical).reduce((acc, curr) => acc + curr.jumlah, 0);

  // Historical Balances from 2025
  const saldoAwal2025 = 83268;
  const saldoRT2025 = 540000;

  const rtSaldo = saldoRT2025 + rtMasuk2026 - rtKeluar2026;

  // Calculate income purely from 2026 (excluding historical)
  const rtIncome2026 = rtMasuk2026;

  const dkmTransactions = transaksi.filter(t => isDKMTransaction(t));

  const dkmMasukTransactions = dkmTransactions.filter(t => t.tipe === 'pemasukan');
  const dkmKeluarTransactions = dkmTransactions.filter(t => t.tipe === 'pengeluaran');

  const dkmMasuk = dkmMasukTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmKeluar = dkmKeluarTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const dkmSaldo = dkmMasuk - dkmKeluar;

  const dkmIncome2026 = dkmMasukTransactions
    .filter(t => !t.isHistorical)
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  // Monthly stats for chart
  const months = Array.from({ length: 6 }).map((_, i) => subMonths(new Date(), 5 - i));
  const chartData = months.map(m => {
    const monthKey = format(m, 'MMM', { locale: id });
    const masuk = umumTransaksi
      .filter(t => t.tipe === 'pemasukan' && isSameMonth(new Date(t.tanggal), m))
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    const keluar = umumTransaksi
      .filter(t => t.tipe === 'pengeluaran' && isSameMonth(new Date(t.tanggal), m))
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    return { name: monthKey, masuk, keluar };
  });

  // Calculate arrears (simplified: check if Warga has paid iuran in CURRENT month)
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const wargaWajib = warga.filter(w => w.isIuranWajib && w.statusHuni === 'Menghuni');
  const paidThisMonth = new Set(
    transaksi
      .filter(t => t.bulanIuran === currentMonthStr)
      .map(t => t.wargaId)
  );
  const belumBayarCount = wargaWajib.filter(w => !paidThisMonth.has(w.id)).length;

  const stats = [
    { label: 'Saldo Kas Umum', value: formatCurrency(saldo), rawValue: saldo, icon: Wallet, color: 'text-blue-600', bg: 'bg-[#f0f4ff]' },
    { label: 'Pemasukan Umum', value: formatCurrency(totalMasuk), rawValue: totalMasuk, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-[#f0fff4]' },
    { label: 'Pengeluaran Umum', value: formatCurrency(totalKeluar), rawValue: totalKeluar, icon: TrendingDown, color: 'text-red-600', bg: 'bg-[#fff5f5]' },
    { label: 'Belum Bayar Iuran', value: `${belumBayarCount} Warga`, rawValue: belumBayarCount, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-[#fffbeb]' },
  ];

  return (
    <div className="dashboard-page space-y-10">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Ringkasan Keuangan</h1>
        <p className="dashboard-page__subtitle text-[#A3A375] font-medium mt-2">Pantau arus kas dan kewajiban warga secara real-time.</p>
      </div>

      <div className="dashboard-page__stats grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            onClick={stat.label.includes('Belum Bayar') ? () => setIsIuranModalOpen(true) : undefined}
            className={cn(
              "summary-item",
              stat.label.toLowerCase().replace(/\s+/g, '-'),
              "bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-[#E5E5DA] flex flex-col gap-3 sm:gap-5 transition-transform hover:scale-[1.02] duration-300",
              stat.label.includes('Belum Bayar') && "cursor-pointer hover:border-amber-400"
            )}
          >
            <div className={cn(
              "summary-item__icon",
              "p-2.5 sm:p-3 rounded-[20px] w-fit",
              stat.bg || "bg-gray-100"
            )}>
              <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", stat.color)} />
            </div>
            <div className="summary-item__content flex-1 min-w-0">
              <p className="summary-item__label text-[10px] sm:text-xs font-bold text-[#A3A375] uppercase tracking-widest leading-tight">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1 overflow-hidden">
                <p className={cn(
                  "summary-item__value",
                  "text-lg sm:text-xl font-black leading-tight",
                  !stat.label.includes('Warga') && "font-mono tracking-tight",
                  (stat.rawValue !== undefined && stat.rawValue < 0) ? "text-red-600 italic" : "text-[#3A3A2A]"
                )}>
                  {stat.value}
                </p>
              </div>
              {stat.label === 'Saldo Kas Umum' && (
                <div className="summary-item__caption flex items-center gap-1.5 mt-2 text-[10px] font-bold text-[#A3A375]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Carryforward Umum 2025: <span className="font-mono text-[10px]">{formatCurrency(saldoAwal2025)}</span></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Container for RT & DKM Cards */}
      <div className="dashboard-page__funds grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">

        {/* Special RT Summary Card */}
        <div className="fund-card fund-card--rt bg-[#5A5A40] rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 md:p-10 text-[#F5F5F0] shadow-xl shadow-[#5A5A40]/15 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
          <div className="fund-card__decoration absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="fund-card__content relative z-10 flex-1 flex flex-col justify-between gap-8">
            <div className="fund-card__header flex flex-col sm:flex-row lg:flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
              <div className="fund-card__title-area min-w-0 flex-1">
                <div className="fund-card__badge inline-flex items-center gap-2 bg-white/10 px-3.5 py-1 rounded-full mb-3.5">
                  <Home className="w-3.5 h-3.5 text-[#A3A375]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#F5F5F0]">Informasi Iuran Bulanan</span>
                </div>
                <h2 className="fund-card__title text-xl sm:text-2xl font-serif font-bold tracking-tight text-white leading-tight">Dana Iuran RT</h2>
                <p className="fund-card__description text-[#A3A375] text-xs font-semibold mt-1 leading-relaxed">Rekapitulasi khusus dana RT yang dikelola lingkungan.</p>
              </div>
              <div className="fund-card__status flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 self-start sm:self-auto lg:self-start xl:self-auto min-w-[150px] sm:min-w-[160px] shrink-0">
                <div className="fund-card__status-icon w-8 h-8 bg-[#A3A375] rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#5A5A40]" />
                </div>
                <div className="fund-card__status-text">
                  <p className="fund-card__status-label text-[8px] font-black text-[#A3A375] uppercase tracking-widest">Saldo Awal 2025</p>
                  <p className="fund-card__status-value text-sm font-bold text-white font-mono">{formatCurrency(saldoRT2025)}</p>
                </div>
              </div>
            </div>

            <div className="fund-card__stats grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-y-4 gap-x-6 pt-6 border-t border-white/10">
              <div className="fund-card__stat-item space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pemasukan</p>
                <p className="fund-card__stat-value fund-card__stat-value--in text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-bold text-emerald-400 whitespace-nowrap font-mono">+{formatCurrency(rtIncome2026)}</p>
              </div>
              <div className="fund-card__stat-item space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pengeluaran</p>
                <p className="fund-card__stat-value fund-card__stat-value--out text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-bold text-red-400 whitespace-nowrap font-mono">-{formatCurrency(rtKeluar2026)}</p>
              </div>
              <div className="fund-card__stat-item sm:pl-4 sm:border-l lg:pl-0 lg:border-l-0 xl:pl-4 xl:border-l border-white/10 space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Saldo Terbaru</p>
                <p className={cn(
                  "fund-card__stat-value fund-card__stat-value--total",
                  "text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-bold whitespace-nowrap font-mono",
                  rtSaldo < 0 ? "text-red-400 italic" : "text-white"
                )}>
                  {formatCurrency(rtSaldo)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Special DKM Summary Card */}
        <div className="fund-card fund-card--dkm bg-[#47554C] rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 md:p-10 text-[#F5F5F0] shadow-xl shadow-[#47554C]/15 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
          <div className="fund-card__decoration absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="fund-card__content relative z-10 flex-1 flex flex-col justify-between gap-8">
            <div className="fund-card__header flex flex-col sm:flex-row lg:flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
              <div className="fund-card__title-area min-w-0 flex-1">
                <div className="fund-card__badge inline-flex items-center gap-2 bg-white/10 px-3.5 py-1 rounded-full mb-3.5">
                  <Moon className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#F5F5F0]">Informasi Kas Masjid</span>
                </div>
                <h2 className="fund-card__title text-xl sm:text-2xl font-serif font-bold tracking-tight text-white leading-tight">Dana Kas DKM</h2>
                <p className="fund-card__description text-[#A6B2A8] text-xs font-semibold mt-1 leading-relaxed">Dana kas mushola/masjid, infaq warga, dan operasional ibadah.</p>
              </div>
              <div className="fund-card__status flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 self-start sm:self-auto lg:self-start xl:self-auto min-w-[150px] sm:min-w-[160px] shrink-0">
                <div className="fund-card__status-icon w-8 h-8 bg-emerald-700/60 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                </div>
                <div className="fund-card__status-text">
                  <p className="fund-card__status-label text-[8px] font-black text-[#A6B2A8] uppercase tracking-widest">Status Kas</p>
                  <p className="fund-card__status-value text-sm font-extrabold text-[#95C2A5]">Aktif &amp; Terbuka</p>
                </div>
              </div>
            </div>

            <div className="fund-card__stats grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-y-4 gap-x-6 pt-6 border-t border-white/10">
              <div className="fund-card__stat-item space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Pemasukan</p>
                <p className="fund-card__stat-value fund-card__stat-value--in text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-bold text-emerald-400 whitespace-nowrap font-mono">+{formatCurrency(dkmIncome2026)}</p>
              </div>
              <div className="fund-card__stat-item space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Pengeluaran</p>
                <p className="fund-card__stat-value fund-card__stat-value--out text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-bold text-red-400 whitespace-nowrap font-mono">-{formatCurrency(dkmKeluar)}</p>
              </div>
              <div className="fund-card__stat-item sm:pl-4 sm:border-l lg:pl-0 lg:border-l-0 xl:pl-4 xl:border-l border-white/10 space-y-1">
                <p className="fund-card__stat-label text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Saldo Terbaru</p>
                <p className={cn(
                  "fund-card__stat-value fund-card__stat-value--total",
                  "text-xs sm:text-sm md:text-base lg:text-sm xl:text-base font-semibold whitespace-nowrap font-mono",
                  dkmSaldo < 0 ? "text-red-400 italic font-bold" : "text-white"
                )}>
                  {formatCurrency(dkmSaldo)}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <IuranModal
        isOpen={isIuranModalOpen}
        onClose={() => setIsIuranModalOpen(false)}
        wargaList={warga}
        wargaHistory={wargaHistory}
      />

      <div className="dashboard-page__widgets grid grid-cols-1 xl:grid-cols-5 gap-6 sm:gap-8">
        <div className="chart-card xl:col-span-3 bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-[#E5E5DA] h-fit min-w-0 overflow-hidden">
            <h3 className="chart-card__title text-lg sm:text-xl font-bold text-[#3A3A2A] mb-8">Statistik Arus Kas Umum</h3>
          <div className="chart-card__content h-[280px] sm:h-[320px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A3A375" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#A3A375" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E5DA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#A3A375', fontSize: 10, fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A3A375', fontSize: 10, fontWeight: 600 }} tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  cursor={{ stroke: '#E5E5DA', strokeWidth: 2 }}
                  formatter={(value: number | string | readonly (number | string)[] | undefined) => {
                    const numericValue = typeof value === 'number'
                      ? value
                      : typeof value === 'string'
                        ? Number(value)
                        : Array.isArray(value)
                          ? Number(value[0])
                          : 0;
                    return [formatCurrency(numericValue), ''];
                  }}
                />
                <Area type="monotone" dataKey="masuk" stroke="#5A5A40" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                <Area type="monotone" dataKey="keluar" stroke="#8B4513" fillOpacity={0} strokeWidth={3} strokeDasharray="6 6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card__legend flex justify-center gap-6 mt-6">
            <div className="chart-card__legend-item flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#A3A375]">
              <div className="w-2.5 h-2.5 bg-[#5A5A40] rounded-full" /> Pemasukan
            </div>
            <div className="chart-card__legend-item flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#A3A375]">
              <div className="w-2.5 h-2.5 bg-[#8B4513] rounded-full" /> Pengeluaran
            </div>
          </div>
        </div>

        <div className="activity-card xl:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-[#E5E5DA] flex flex-col h-full min-h-[400px] min-w-0">
          <h3 className="activity-card__header text-lg sm:text-xl font-bold text-[#3A3A2A] mb-6 flex items-center justify-between shrink-0">
            Aktivitas
            <button className="activity-card__action text-[10px] sm:text-xs font-bold text-[#5A5A40] underline underline-offset-4 decoration-[#A3A375]/40 active:scale-95 transition-transform">Lihat Semua</button>
          </h3>
          <div className="activity-card__list space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {umumTransaksi.slice(0, 8).sort((a, b) => b.tanggal - a.tanggal).map((t) => (
              <div key={t.id} className="activity-item group p-4 rounded-[24px] bg-[#F5F5F0]/50 hover:bg-white hover:shadow-xl hover:shadow-[#5A5A40]/5 border border-[#E5E5DA]/30 hover:border-[#E5E5DA] transition-all duration-300 flex items-center justify-between gap-3 min-w-0">
                {/* Bagian Kiri: Icon + Keterangan & Tanggal */}
                <div className="activity-item__content flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "activity-item__icon",
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    t.tipe === 'pemasukan' ? "bg-emerald-50" : "bg-red-50"
                  )}>
                    {t.tipe === 'pemasukan' ? <ArrowDownLeft className="text-emerald-600 w-5 h-5" /> : <ArrowUpRight className="text-red-600 w-5 h-5" />}
                  </div>
                  <div className="activity-item__details min-w-0 flex-1">
                    <p className="activity-item__title text-xs font-bold text-[#3A3A2A] break-words leading-relaxed group-hover:text-[#5A5A40] transition-colors">
                      {t.keterangan}
                    </p>
                    <p className="activity-item__date text-[10px] uppercase tracking-wider font-extrabold text-[#A3A375] flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      <Calendar className="w-3 h-3 opacity-50 shrink-0" />
                      {formatDate(t.tanggal)}
                    </p>
                  </div>
                </div>

                {/* Bagian Kanan: Nominal Transaksi */}
                <div className="activity-item__amount shrink-0 text-right pl-2">
                  <p className={cn(
                    "activity-item__value",
                    "text-xs sm:text-sm font-bold font-mono tracking-tight whitespace-nowrap",
                    t.tipe === 'pemasukan' ? "text-emerald-700" : "text-red-700"
                  )}>
                    {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                  </p>
                </div>
              </div>
            ))}
            {umumTransaksi.length === 0 && (
              <div className="activity-card__empty text-center py-12 border-2 border-dashed border-[#E5E5DA] rounded-3xl h-full flex flex-col justify-center">
                <p className="text-[#A3A375] text-xs font-medium italic">Belum ada aktivitas kas umum</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
