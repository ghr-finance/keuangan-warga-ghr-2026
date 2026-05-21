import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Users, 
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
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Transaksi, Warga, Kategori } from '../types';
import { startOfMonth, subMonths, format, isSameMonth } from 'date-fns';
import IuranModal from './IuranModal';

export default function Dashboard() {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [warga, setWarga] = useState<Warga[]>([]);
  const [isIuranModalOpen, setIsIuranModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubT = dbService.subscribe('transaksi', setTransaksi);
    const unsubW = dbService.subscribe('warga', setWarga);
    return () => {
      unsubT();
      unsubW();
    };
  }, []);

  const totalMasuk = transaksi.filter(t => t.tipe === 'pemasukan').reduce((acc, curr) => acc + curr.jumlah, 0);
  const totalKeluar = transaksi.filter(t => t.tipe === 'pengeluaran').reduce((acc, curr) => acc + curr.jumlah, 0);
  const saldo = totalMasuk - totalKeluar;

  // Refined approach for Iuran RT: pre-filter using categories
  const [categories, setCategories] = useState<Kategori[]>([]);
  useEffect(() => {
    // Also subscribe to categories to handle dynamic updates or seeding
    const unsubC = dbService.subscribe('kategori', setCategories);
    return () => unsubC();
  }, []);

  const rtMasukCatIds = categories.filter(c => 
    c.nama.toLowerCase() === 'iuran rt'
  ).map(c => c.id);
  
  const rtKeluarCatIds = categories.filter(c => 
    c.nama.toLowerCase() === 'penyerahan iuran rt'
  ).map(c => c.id);
  
  const rtMasukTransactions = transaksi.filter(t => t.tipe === 'pemasukan' && rtMasukCatIds.includes(t.kategoriId));
  const rtKeluarTransactions = transaksi.filter(t => t.tipe === 'pengeluaran' && rtKeluarCatIds.includes(t.kategoriId));
  
  const rtMasuk = rtMasukTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtKeluar = rtKeluarTransactions.reduce((acc, curr) => acc + curr.jumlah, 0);
  const rtSaldo = rtMasuk - rtKeluar;

  // Historical Balances from 2025
  const saldoAwal2025 = 83268;
  const saldoRT2025 = 540000;
  
  // Calculate income purely from 2026 (excluding historical)
  const rtIncome2026 = rtMasukTransactions
    .filter(t => !t.isHistorical)
    .reduce((acc, curr) => acc + curr.jumlah, 0);

  // DKM calculations
  const dkmCatIds = categories.filter(c => 
    c.nama.toLowerCase().includes('dkm') || 
    c.nama.toLowerCase().includes('mushola') || 
    c.nama.toLowerCase().includes('masjid')
  ).map(c => c.id);

  const dkmTransactions = transaksi.filter(t => {
    const fromCat = dkmCatIds.includes(t.kategoriId);
    const fromDesc = t.keterangan.toLowerCase().includes('dkm') || 
                     t.keterangan.toLowerCase().includes('mushola') || 
                     t.keterangan.toLowerCase().includes('musholla') ||
                     t.keterangan.toLowerCase().includes('masjid');
    return fromCat || fromDesc;
  });

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
    const monthKey = format(m, 'MMM');
    const masuk = transaksi
      .filter(t => t.tipe === 'pemasukan' && isSameMonth(new Date(t.tanggal), m))
      .reduce((acc, curr) => acc + curr.jumlah, 0);
    const keluar = transaksi
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
    { label: 'Saldo Saat Ini', value: formatCurrency(saldo), rawValue: saldo, icon: Wallet, color: 'text-blue-600', bg: 'bg-[#f0f4ff]' },
    { label: 'Pemasukan Total', value: formatCurrency(totalMasuk), rawValue: totalMasuk, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-[#f0fff4]' },
    { label: 'Pengeluaran Total', value: formatCurrency(totalKeluar), rawValue: totalKeluar, icon: TrendingDown, color: 'text-red-600', bg: 'bg-[#fff5f5]' },
    { label: 'Belum Bayar Iuran', value: `${belumBayarCount} Warga`, rawValue: belumBayarCount, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-[#fffbeb]' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Ringkasan Keuangan</h1>
        <p className="text-[#A3A375] font-medium mt-2">Pantau arus kas dan kewajiban warga secara real-time.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.label.includes('Belum Bayar') ? () => setIsIuranModalOpen(true) : undefined}
            className={cn(
              "bg-white p-5 sm:p-6 rounded-[32px] shadow-sm border border-[#E5E5DA] flex flex-col gap-3 sm:gap-5 transition-transform hover:scale-[1.02] duration-300",
              stat.label.includes('Belum Bayar') && "cursor-pointer hover:border-amber-400"
            )}
          >
            <div className={cn(
              "p-2.5 sm:p-3 rounded-[20px] w-fit shadow-inner",
              stat.bg || "bg-gray-100"
            )}>
              <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", stat.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-bold text-[#A3A375] uppercase tracking-widest leading-tight truncate">{stat.label}</p>
              <div className="flex items-baseline gap-1 mt-1 overflow-hidden">
                <p className={cn(
                  "text-lg sm:text-xl xl:text-2xl font-black leading-tight truncate",
                  (stat.rawValue !== undefined && stat.rawValue < 0) ? "text-red-600 italic" : "text-[#3A3A2A]"
                )}>
                  {stat.value}
                </p>
              </div>
              {stat.label === 'Saldo Saat Ini' && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-[#A3A375]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="truncate">Sisa 2025: {formatCurrency(saldoAwal2025)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Container for RT & DKM Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Special RT Summary Card */}
        <div className="bg-[#5A5A40] rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 md:p-10 text-[#F5F5F0] shadow-xl shadow-[#5A5A40]/15 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10 flex-1 flex flex-col justify-between gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1 rounded-full mb-3.5">
                  <Home className="w-3.5 h-3.5 text-[#A3A375]" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Informasi Iuran Bulanan</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-white">Dana Iuran RT</h2>
                <p className="text-[#A3A375] text-xs font-semibold mt-1 leading-relaxed">Rekapitulasi khusus dana RT yang dikelola lingkungan.</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 self-start sm:self-auto min-w-[150px] sm:min-w-[160px] shrink-0">
                <div className="w-8 h-8 bg-[#A3A375] rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#5A5A40]" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-[#A3A375] uppercase tracking-widest">Saldo Awal 2025</p>
                  <p className="text-sm font-extrabold text-white">{formatCurrency(saldoRT2025)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <div className="space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pemasukan</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-emerald-400 truncate">+{formatCurrency(rtIncome2026)}</p>
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pengeluaran</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-red-400 truncate">-{formatCurrency(rtKeluar)}</p>
              </div>
              <div className="pl-4 border-l border-white/10 space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Saldo Terbaru</p>
                <p className={cn(
                  "text-sm sm:text-base md:text-lg font-black truncate",
                  rtSaldo < 0 ? "text-red-400 italic font-bold" : "text-white"
                )}>
                  {formatCurrency(rtSaldo)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Special DKM Summary Card */}
        <div className="bg-[#47554C] rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 md:p-10 text-[#F5F5F0] shadow-xl shadow-[#47554C]/15 relative overflow-hidden flex flex-col justify-between h-full min-h-[300px]">
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="relative z-10 flex-1 flex flex-col justify-between gap-8">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 bg-white/10 px-3.5 py-1 rounded-full mb-3.5">
                  <Moon className="w-3.5 h-3.5 text-emerald-200" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-200">Informasi Kas Masjid</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-white">Dana Kas DKM</h2>
                <p className="text-[#A6B2A8] text-xs font-semibold mt-1 leading-relaxed">Dana kas mushola/masjid, infaq warga, dan operasional ibadah.</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/10 self-start sm:self-auto min-w-[150px] sm:min-w-[160px] shrink-0">
                <div className="w-8 h-8 bg-emerald-700/60 rounded-lg flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-[#A6B2A8] uppercase tracking-widest">Status Kas</p>
                  <p className="text-sm font-extrabold text-[#95C2A5]">Aktif &amp; Terbuka</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <div className="space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Pemasukan</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-emerald-400 truncate">+{formatCurrency(dkmIncome2026)}</p>
              </div>
              <div className="space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Pengeluaran</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-red-400 truncate">-{formatCurrency(dkmKeluar)}</p>
              </div>
              <div className="pl-4 border-l border-white/10 space-y-1 overflow-hidden">
                <p className="text-[9px] font-black text-[#A6B2A8] uppercase tracking-widest opacity-80">Saldo Terbaru</p>
                <p className={cn(
                  "text-sm sm:text-base md:text-lg font-black truncate",
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
      />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 sm:gap-8">
        <div className="xl:col-span-3 bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-[#E5E5DA] h-fit min-w-0 overflow-hidden">
          <h3 className="text-lg sm:text-xl font-bold text-[#3A3A2A] mb-8">Statistik Arus Kas</h3>
          <div className="h-[280px] sm:h-[320px] w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A3A375" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#A3A375" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E5DA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A3A375', fontSize: 10, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#A3A375', fontSize: 10, fontWeight: 600}} tickFormatter={(val) => `Rp${val/1000}k`} />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px'}}
                  cursor={{stroke: '#E5E5DA', strokeWidth: 2}}
                  formatter={(val: number) => [formatCurrency(val), '']}
                />
                <Area type="monotone" dataKey="masuk" stroke="#5A5A40" fillOpacity={1} fill="url(#colorIn)" strokeWidth={3} />
                <Area type="monotone" dataKey="keluar" stroke="#8B4513" fillOpacity={0} strokeWidth={3} strokeDasharray="6 6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#A3A375]">
              <div className="w-2.5 h-2.5 bg-[#5A5A40] rounded-full" /> Pemasukan
            </div>
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-[#A3A375]">
              <div className="w-2.5 h-2.5 bg-[#8B4513] rounded-full" /> Pengeluaran
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-6 sm:p-8 rounded-[32px] shadow-sm border border-[#E5E5DA] flex flex-col h-full min-h-[400px] min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-[#3A3A2A] mb-6 flex items-center justify-between shrink-0">
            Aktivitas
            <button className="text-[10px] sm:text-xs font-bold text-[#5A5A40] underline underline-offset-4 decoration-[#A3A375]/40 active:scale-95 transition-transform">Lihat Semua</button>
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {transaksi.slice(0, 8).sort((a,b) => b.tanggal - a.tanggal).map((t) => (
              <div key={t.id} className="group p-4 rounded-[24px] bg-[#F5F5F0]/50 hover:bg-white hover:shadow-xl hover:shadow-[#5A5A40]/5 border border-[#E5E5DA]/30 hover:border-[#E5E5DA] transition-all duration-300 flex items-center justify-between gap-3 min-w-0">
                {/* Bagian Kiri: Icon + Keterangan & Tanggal */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                    t.tipe === 'pemasukan' ? "bg-emerald-50" : "bg-red-50"
                  )}>
                    {t.tipe === 'pemasukan' ? <ArrowDownLeft className="text-emerald-600 w-5 h-5" /> : <ArrowUpRight className="text-red-600 w-5 h-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#3A3A2A] break-words leading-relaxed group-hover:text-[#5A5A40] transition-colors">
                      {t.keterangan}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#A3A375] flex items-center gap-1 mt-0.5 whitespace-nowrap">
                      <Calendar className="w-3 h-3 opacity-50 shrink-0" />
                      {formatDate(t.tanggal)}
                    </p>
                  </div>
                </div>

                {/* Bagian Kanan: Nominal Transaksi */}
                <div className="shrink-0 text-right pl-2">
                  <p className={cn(
                    "text-xs sm:text-sm font-black tabular-nums whitespace-nowrap",
                    t.tipe === 'pemasukan' ? "text-emerald-700" : "text-red-700"
                  )}>
                    {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                  </p>
                </div>
              </div>
            ))}
            {transaksi.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-[#E5E5DA] rounded-3xl h-full flex flex-col justify-center">
                <p className="text-[#A3A375] text-xs font-medium italic">Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
