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
  Home
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
  const wargaWajib = warga.filter(w => w.isIuranWajib && w.status === 'Aktif');
  const paidThisMonth = new Set(
    transaksi
      .filter(t => t.bulanIuran === currentMonthStr)
      .map(t => t.wargaId)
  );
  const belumBayarCount = wargaWajib.filter(w => !paidThisMonth.has(w.id)).length;

  const stats = [
    { label: 'Saldo Saat Ini', value: formatCurrency(saldo), icon: Wallet, color: 'text-blue-600', bg: 'bg-[#f0f4ff]' },
    { label: 'Pemasukan Total', value: formatCurrency(totalMasuk), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-[#f0fff4]' },
    { label: 'Pengeluaran Total', value: formatCurrency(totalKeluar), icon: TrendingDown, color: 'text-red-600', bg: 'bg-[#fff5f5]' },
    { label: 'Belum Bayar Iuran', value: `${belumBayarCount} Warga`, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-[#fffbeb]' },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Ringkasan Keuangan</h1>
        <p className="text-[#A3A375] font-medium mt-2">Pantau arus kas dan kewajiban warga secara real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.label.includes('Belum Bayar') ? () => setIsIuranModalOpen(true) : undefined}
            className={cn(
              "bg-white p-6 rounded-[32px] shadow-sm border border-[#E5E5DA] flex flex-col gap-5 transition-transform hover:scale-[1.02] duration-300",
              stat.label.includes('Belum Bayar') && "cursor-pointer hover:border-amber-400"
            )}
          >
            <div className={cn(
              "p-3 rounded-[20px] w-fit shadow-inner",
              stat.bg || "bg-gray-100"
            )}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <p className="text-xs font-bold text-[#A3A375] uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-[#3A3A2A] mt-1">{stat.value}</p>
              {stat.label === 'Saldo Saat Ini' && (
                <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-[#A3A375]">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Termasuk Saldo 2025: {formatCurrency(saldoAwal2025)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Special RT Summary Card */}
      <div className="bg-[#5A5A40] rounded-[40px] p-8 sm:p-10 text-[#F5F5F0] shadow-xl shadow-[#5A5A40]/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full mb-4">
                <Home className="w-4 h-4 text-[#A3A375]" />
                <span className="text-[10px] font-black uppercase tracking-widest">Informasi Iuran Bulanan</span>
              </div>
              <h2 className="text-3xl font-serif font-bold tracking-tight">Dana Iuran RT</h2>
              <p className="text-[#A3A375] text-sm font-medium mt-1">Rekapitulasi khusus dana RT yang dikelola lingkungan.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-white/10">
              <div className="w-10 h-10 bg-[#A3A375] rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#5A5A40]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest">Saldo Awal 2025</p>
                <p className="text-lg font-bold">{formatCurrency(saldoRT2025)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pemasukan (2026)</p>
              <p className="text-2xl font-bold text-emerald-400">+{formatCurrency(rtIncome2026)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Pengeluaran (2026)</p>
              <p className="text-2xl font-bold text-red-400">-{formatCurrency(rtKeluar)}</p>
            </div>
            <div className="pt-6 sm:pt-0 sm:pl-8 border-t sm:border-t-0 sm:border-l border-white/10 space-y-1">
              <p className="text-[10px] font-black text-[#A3A375] uppercase tracking-widest opacity-80">Saldo Terbaru</p>
              <p className="text-3xl font-black">{formatCurrency(rtSaldo)}</p>
            </div>
          </div>
        </div>
      </div>

      <IuranModal 
        isOpen={isIuranModalOpen}
        onClose={() => setIsIuranModalOpen(false)}
        wargaList={warga}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[32px] shadow-sm border border-[#E5E5DA]">
          <h3 className="text-xl font-bold text-[#3A3A2A] mb-8">Statistik Arus Kas</h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A3A375" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#A3A375" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E5E5DA" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#A3A375', fontSize: 11, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#A3A375', fontSize: 11, fontWeight: 600}} tickFormatter={(val) => `Rp${val/1000}k`} />
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
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#A3A375]">
              <div className="w-3 h-3 bg-[#5A5A40] rounded-full" /> Pemasukan
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#A3A375]">
              <div className="w-3 h-3 bg-[#8B4513] rounded-full" /> Pengeluaran
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-[#E5E5DA]">
          <h3 className="text-xl font-bold text-[#3A3A2A] mb-6 flex items-center justify-between">
            Aktivitas
            <button className="text-xs font-bold text-[#5A5A40] underline underline-offset-4 decoration-[#A3A375]/40 active:scale-95 transition-transform">Lihat Semua</button>
          </h3>
          <div className="space-y-5">
            {transaksi.slice(0, 6).sort((a,b) => b.tanggal - a.tanggal).map((t) => (
              <div key={t.id} className="flex items-center gap-4 group">
                <div className={cn(
                  "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  t.tipe === 'pemasukan' ? "bg-[#f0f9f1]" : "bg-[#fff5f5]"
                )}>
                  {t.tipe === 'pemasukan' ? <ArrowDownLeft className="text-emerald-700 w-5 h-5" /> : <ArrowUpRight className="text-[#8B4513] w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#3A3A2A] truncate group-hover:text-[#5A5A40] transition-colors">{t.keterangan}</p>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-[#A3A375]">{formatDate(t.tanggal)}</p>
                </div>
                <p className={cn(
                  "text-sm font-black tabular-nums",
                  t.tipe === 'pemasukan' ? "text-[#5A5A40]" : "text-[#8B4513]"
                )}>
                  {t.tipe === 'pemasukan' ? '+' : '-'} {formatCurrency(t.jumlah)}
                </p>
              </div>
            ))}
            {transaksi.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-[#E5E5DA] rounded-3xl">
                <p className="text-gray-400 text-sm italic">Belum ada aktivitas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
