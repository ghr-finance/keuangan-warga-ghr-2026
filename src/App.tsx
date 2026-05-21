import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Settings, 
  FileText,
  LogOut,
  User,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  CreditCard,
  UserCircle2
} from 'lucide-react';
import { auth } from './lib/firebase';
import { dbService } from './services/db';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { cn, formatCurrency } from './lib/utils';
import { format } from 'date-fns';
import Dashboard from './components/Dashboard';
import WargaList from './components/Warga';
import TransaksiList from './components/Transaksi';
import Laporan from './components/Laporan';
import EventList from './components/Events';
import Pengaturan from './components/Pengaturan';
import PetugasList from './components/Petugas';
import PublicLanding from './components/PublicLanding';
import { backupService } from './services/backup';
import { motion, AnimatePresence } from 'motion/react';

type NavItem = 'dashboard' | 'warga' | 'petugas' | 'transaksi' | 'event' | 'laporan' | 'pengaturan';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavItem>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
  };

  const logout = () => signOut(auth);

  useEffect(() => {
    if (user) {
      const seedData = async () => {
        const hasRun = localStorage.getItem('seed_zulkarnaen_v2');
        if (hasRun) return;

        const transactions = [
          {
            tanggal: new Date(2026, 0, 1).getTime(),
            jumlah: 180000,
            tipe: 'pemasukan' as const,
            kategoriId: 'twzek4iqF0nEr6o3nYuo',
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-01',
            keterangan: 'Iuran Bulanan - Zulkarnaen (Januari 2026)',
            createdAt: new Date(2026, 0, 1).getTime()
          },
          {
            tanggal: new Date(2026, 1, 1).getTime(),
            jumlah: 180000,
            tipe: 'pemasukan' as const,
            kategoriId: 'twzek4iqF0nEr6o3nYuo',
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-02',
            keterangan: 'Iuran Bulanan - Zulkarnaen (Februari 2026)',
            createdAt: new Date(2026, 1, 1).getTime()
          },
          {
            tanggal: new Date(2026, 2, 1).getTime(),
            jumlah: 200000,
            tipe: 'pemasukan' as const,
            kategoriId: 'twzek4iqF0nEr6o3nYuo',
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-03',
            keterangan: 'Iuran Bulanan - Zulkarnaen (Maret 2026)',
            createdAt: new Date(2026, 2, 1).getTime()
          }
        ];

        for (const t of transactions) {
          await dbService.add('transaksi', t);
        }
        
        localStorage.setItem('seed_zulkarnaen_v2', 'true');
        console.log('Seeding Zulkarnaen transactions completed.');
      };
      
      const seedRTData = async () => {
        const hasRun = localStorage.getItem('seed_zulkarnaen_rt_v3');
        if (hasRun) return;

        const categories = await dbService.getAll('kategori') as any[];
        let rtCatId = categories.find(c => c.nama.toLowerCase().includes('iuran rt') && c.tipe === 'pemasukan')?.id;
        
        if (!rtCatId) {
          rtCatId = await dbService.add('kategori', {
            nama: 'Iuran RT',
            tipe: 'pemasukan',
            icon: 'Home'
          });
        }

        const rtTransactions = [
          {
            tanggal: new Date(2026, 0, 1).getTime(),
            jumlah: 20000,
            tipe: 'pemasukan' as const,
            kategoriId: rtCatId,
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-01',
            keterangan: 'Iuran RT - Zulkarnaen (Januari 2026)',
            createdAt: new Date(2026, 0, 1).getTime()
          },
          {
            tanggal: new Date(2026, 1, 1).getTime(),
            jumlah: 20000,
            tipe: 'pemasukan' as const,
            kategoriId: rtCatId,
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-02',
            keterangan: 'Iuran RT - Zulkarnaen (Februari 2026)',
            createdAt: new Date(2026, 1, 1).getTime()
          },
          {
            tanggal: new Date(2026, 2, 1).getTime(),
            jumlah: 20000,
            tipe: 'pemasukan' as const,
            kategoriId: rtCatId,
            wargaId: 'JvkwTyCvhUnmCrGArbE4',
            bulanIuran: '2026-03',
            keterangan: 'Iuran RT - Zulkarnaen (Maret 2026)',
            createdAt: new Date(2026, 2, 1).getTime()
          }
        ];

        for (const t of rtTransactions) {
          await dbService.add('transaksi', t);
        }
        
        localStorage.setItem('seed_zulkarnaen_rt_v3', 'true');
        console.log('Seeding Zulkarnaen RT v3 transactions completed.');
      };

      const seedBatchData = async () => {
        const hasRun = localStorage.getItem('seed_batch_warga_v2');
        if (hasRun) return;

        const targetNames = ['Sum', 'Sarman', 'Rohmat', 'Yudi', 'Rustam', 'Imam', 'Wawan', 'Fitrah', 'Andri', 'Fuad', 'Temi', 'Tri', 'Ali', 'Arsy'];
        // Fetch all residents
        const residents = await dbService.getAll('warga') as any[];
        
        const categories = await dbService.getAll('kategori') as any[];
        const bulananCatId = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan')?.id;
        if (!bulananCatId) return;

        const months = [
          { name: 'Januari', month: '01', amount: 180000 },
          { name: 'Februari', month: '02', amount: 180000 },
          { name: 'Maret', month: '03', amount: 200000 },
          { name: 'April', month: '04', amount: 200000 },
          { name: 'Mei', month: '05', amount: 200000 },
        ];

        let count = 0;
        for (const name of targetNames) {
          const citizen = residents.find(r => r.nama.toLowerCase().includes(name.toLowerCase()));
          if (citizen) {
            for (const m of months) {
              const monthIndex = parseInt(m.month) - 1;
              await dbService.add('transaksi', {
                tanggal: new Date(2026, monthIndex, 1).getTime(),
                jumlah: m.amount,
                tipe: 'pemasukan' as const,
                kategoriId: bulananCatId,
                wargaId: citizen.id,
                bulanIuran: `2026-${m.month}`,
                keterangan: `Iuran Bulanan - ${citizen.nama} (${m.name} 2026)`,
                createdAt: new Date(2026, monthIndex, 1).getTime()
              });
              count++;
            }
          }
        }
        
        localStorage.setItem('seed_batch_warga_v2', 'true');
        console.log(`Seeding batch completed. Created ${count} transactions for ${targetNames.length} names.`);
      };

      const seedUnoccupiedData = async () => {
        const hasRun = localStorage.getItem('seed_unoccupied_v2');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const targets = [
          { name: 'Suyat', endMonth: 4 }, // Jan-May (0-4)
          { name: 'Developer', endMonth: 3 }, // Jan-Apr (0-3)
          { name: 'Anshori', endMonth: 1 }, // Jan-Feb (0-1)
          { name: 'Novan', endMonth: 2 }, // Jan-Mar (0-2)
        ];

        const categories = await dbService.getAll('kategori') as any[];
        const bulananCatId = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan')?.id;
        if (!bulananCatId) return;

        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei'];
        let count = 0;

        for (const target of targets) {
          const citizen = residents.find(r => r.nama.toLowerCase().includes(target.name.toLowerCase()));
          if (!citizen) continue;

          for (let monthIndex = 0; monthIndex <= target.endMonth; monthIndex++) {
            const amount = monthIndex <= 1 ? 155000 : 175000;
            const monthStr = (monthIndex + 1).toString().padStart(2, '0');
            
            await dbService.add('transaksi', {
              tanggal: new Date(2026, monthIndex, 1).getTime(),
              jumlah: amount,
              tipe: 'pemasukan' as const,
              kategoriId: bulananCatId,
              wargaId: citizen.id,
              bulanIuran: `2026-${monthStr}`,
              keterangan: `Iuran Bulanan - ${citizen.nama} (${monthNames[monthIndex]} 2026)`,
              createdAt: new Date(2026, monthIndex, 1).getTime()
            });
            count++;
          }
        }

        localStorage.setItem('seed_unoccupied_v2', 'true');
        console.log(`Seeding unoccupied completed. Created ${count} transactions.`);
      };

      const seedHermanData = async () => {
        const hasRun = localStorage.getItem('seed_herman_v3');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const citizen = residents.find(r => r.nama.toLowerCase().includes('herman'));
        if (!citizen) return;

        const categories = await dbService.getAll('kategori') as any[];
        const bulananCatId = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan')?.id;
        if (!bulananCatId) return;

        const months = [
          { name: 'Januari', month: '01' },
          { name: 'Februari', month: '02' },
          { name: 'Maret', month: '03' },
        ];

        let count = 0;
        for (const m of months) {
          const monthIndex = parseInt(m.month) - 1;
          // Determine amount based on statusHuni
          const amount = (citizen.statusHuni === 'Menghuni') 
            ? (monthIndex <= 1 ? 180000 : 200000)
            : (monthIndex <= 1 ? 155000 : 175000);

          await dbService.add('transaksi', {
            tanggal: new Date(2026, monthIndex, 1).getTime(),
            jumlah: amount,
            tipe: 'pemasukan' as const,
            kategoriId: bulananCatId,
            wargaId: citizen.id,
            bulanIuran: `2026-${m.month}`,
            keterangan: `Iuran Bulanan - ${citizen.nama} (${m.name} 2026)`,
            createdAt: new Date(2026, monthIndex, 1).getTime()
          });
          count++;
        }

        localStorage.setItem('seed_herman_v3', 'true');
        console.log(`Seeding Herman completed. Created ${count} transactions.`);
      };

      const seedRTBatchData = async () => {
        const hasRun = localStorage.getItem('seed_rt_batch_v2');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const targets = [
          { name: 'Arsy', endMonth: 1 }, // Jan-Feb (0-1)
          { name: 'Ali', endMonth: 1 }, // Jan-Feb (0-1)
          { name: 'Wawan', endMonth: 4 }, // Jan-May (0-4)
        ];

        const categories = await dbService.getAll('kategori') as any[];
        const rtCatId = categories.find(c => c.nama === 'Iuran RT' && c.tipe === 'pemasukan')?.id;
        if (!rtCatId) return;

        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei'];
        let count = 0;

        for (const target of targets) {
          const citizen = residents.find(r => r.nama.toLowerCase().includes(target.name.toLowerCase()));
          if (!citizen) continue;

          for (let monthIndex = 0; monthIndex <= target.endMonth; monthIndex++) {
            const monthStr = (monthIndex + 1).toString().padStart(2, '0');
            
            await dbService.add('transaksi', {
              tanggal: new Date(2026, monthIndex, 1).getTime(),
              jumlah: 20000,
              tipe: 'pemasukan' as const,
              kategoriId: rtCatId,
              wargaId: citizen.id,
              bulanIuran: `2026-${monthStr}`,
              keterangan: `Iuran RT - ${citizen.nama} (${monthNames[monthIndex]} 2026)`,
              createdAt: new Date(2026, monthIndex, 1).getTime()
            });
            count++;
          }
        }

        localStorage.setItem('seed_rt_batch_v2', 'true');
        console.log(`Seeding RT batch completed. Created ${count} transactions.`);
      };

      const seedTHRData = async () => {
        const hasRun = localStorage.getItem('seed_thr_v2');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const categories = await dbService.getAll('kategori') as any[];
        let thrCategoryId = categories.find(k => k.nama.toLowerCase().includes('thr'))?.id;

        if (!thrCategoryId) {
          thrCategoryId = await dbService.add('kategori', {
            nama: 'THR',
            tipe: 'pemasukan',
            icon: 'Gift'
          });
        }

        const list180k = ['Temi', 'Yudi', 'Arsy', 'Rustam', 'Sarman', 'Sum', 'Fuad', 'Andri', 'Fitrah', 'Rohmat', 'Herman', 'Ali', 'Imam', 'Wawan', 'Tri'];
        const list155k = ['Developer', 'Suyat', 'Anshori', 'Novan'];

        let count = 0;
        const processList = async (names: string[], amount: number) => {
          for (const name of names) {
            const citizen = residents.find(r => r.nama.toLowerCase().includes(name.toLowerCase()));
            if (citizen) {
              await dbService.add('transaksi', {
                tanggal: new Date(2026, 2, 15).getTime(),
                jumlah: amount,
                tipe: 'pemasukan' as const,
                kategoriId: thrCategoryId,
                wargaId: citizen.id,
                bulanIuran: '2026-03',
                keterangan: 'Iuran THR',
                createdAt: new Date(2026, 2, 15).getTime()
              });
              count++;
            }
          }
        };

        await processList(list180k, 180000);
        await processList(list155k, 155000);

        localStorage.setItem('seed_thr_v2', 'true');
        console.log(`Seeding THR completed. Created ${count} transactions.`);
      };

      const seedFinalExpenditures = async () => {
        const hasRun = localStorage.getItem('seed_expenditure_final_v3');
        if (hasRun) return;

        // Fetch all current transactions to clear expenditures if needed
        const allTransactions = await dbService.getAll('transaksi') as any[];
        const expendituresToDelete = allTransactions.filter(t => t.tipe === 'pengeluaran');
        
        console.log(`Clearing ${expendituresToDelete.length} old expenditures before reseeding...`);
        for (const t of expendituresToDelete) {
          await dbService.delete('transaksi', t.id);
        }

        const data = [
          { timestamp: "2026-01-03 23:09:41", category: "Permintaan Kasbon", pic: "Wahyu", amount: 200000, date: "2026-01-03", note: "Keperluan" },
          { timestamp: "2026-01-05 09:22:47", category: "Gaji", pic: "Tisna", amount: 600000, date: "2026-01-05", note: "Pembayaran gaji desember 25" },
          { timestamp: "2026-01-05 20:54:56", category: "Pantry", pic: "Wawan", amount: 59500, date: "2026-01-05", note: "Kopi" },
          { timestamp: "2026-01-05 23:26:03", category: "Gaji", pic: "Udin", amount: 500000, date: "2026-01-05", note: "Tahap 1" },
          { timestamp: "2026-01-05 23:26:37", category: "Gaji", pic: "Wahyu", amount: 300000, date: "2026-01-05", note: "Tahap 1" },
          { timestamp: "2026-01-09 15:26:23", category: "Gaji", pic: "Udin", amount: 400000, date: "2026-01-08", note: "GAJI tahap 2" },
          { timestamp: "2026-01-09 15:27:12", category: "Gaji", pic: "Wahyu", amount: 400000, date: "2026-01-08", note: "GAJI tahap 2" },
          { timestamp: "2026-01-09 15:57:39", category: "Gaji", pic: "Wahyu", amount: 200000, date: "2026-01-06", note: "Tahap 1" },
          { timestamp: "2026-01-17 22:30:33", category: "Permintaan Kasbon", pic: "Udin", amount: 300000, date: "2026-01-01", note: "Rekap Sisa Kasbon 2025" },
          { timestamp: "2026-01-26 18:44:44", category: "Gaji", pic: "Udin", amount: 400000, date: "2026-01-17", note: "tahap 3" },
          { timestamp: "2026-01-26 18:50:49", category: "Gaji", pic: "Wahyu", amount: 300000, date: "2026-01-17", note: "TAHAP 3" },
          { timestamp: "2026-01-28 21:49:36", category: "Pantry", pic: "Udin", amount: 60000, date: "2026-01-23", note: "Kopi pouch besar 350gr" },
          { timestamp: "2026-01-28 21:50:13", category: "Pantry", pic: "Udin", amount: 20000, date: "2026-01-19", note: "Aqua galon" },
          { timestamp: "2026-01-28 21:50:36", category: "Pantry", pic: "Udin", amount: 20000, date: "2026-01-28", note: "Aqua galon" },
          { timestamp: "2026-02-02 14:59:55", category: "Listrik & Air", pic: "Wawan", amount: 103000, date: "2026-01-31", note: "Token listrik pos" },
          { timestamp: "2026-02-02 15:04:34", category: "Pantry", pic: "Udin", amount: 20000, date: "2026-01-31", note: "Aqua Galon" },
          { timestamp: "2026-02-02 15:10:07", category: "Permintaan Kasbon", pic: "Wahyu", amount: 100000, date: "2026-01-28", note: "Keperluan Keluarga" },
          { timestamp: "2026-02-05 12:30:26", category: "Gaji", pic: "Udin", amount: 1000000, date: "2026-02-05", note: "gaji tahap 1" },
          { timestamp: "2026-02-05 12:31:12", category: "Gaji", pic: "Wahyu", amount: 1000000, date: "2026-02-05", note: "Gaji tahap 1" },
          { timestamp: "2026-02-07 21:41:04", category: "Gaji", pic: "Tisna", amount: 600000, date: "2026-02-06", note: "Gaji Februari 2026" },
          { timestamp: "2026-02-08 17:07:08", category: "Pantry", pic: "Wawan", amount: 80000, date: "2026-02-08", note: "Gula 1 Kg + Kopi 350g" },
          { timestamp: "2026-02-10 11:10:57", category: "Kegiatan", pic: "Andri", amount: 76000, date: "2026-02-08", note: "Konsumsi Rapat" },
          { timestamp: "2026-02-10 11:12:52", category: "Pemeliharaan Rutin", pic: "Andri", amount: 100000, date: "2026-02-09", note: "Perbaikan lampu gerbang masuk, pompa air, konsumsi pelaksanaan" },
          { timestamp: "2026-02-11 15:37:35", category: "Gaji", pic: "Udin", amount: 300000, date: "2026-02-11", note: "gaji feb tahap 2" },
          { timestamp: "2026-02-11 15:37:57", category: "Gaji", pic: "Wahyu", amount: 200000, date: "2026-02-11", note: "gaji feb tahap 2" },
          { timestamp: "2026-02-18 21:44:14", category: "Kegiatan", pic: "Andri", amount: 100000, date: "2026-02-17", note: "Pembelian alat-bahan kebersihan untuk Kerja bakti" },
          { timestamp: "2026-02-18 21:45:04", category: "Pantry", pic: "Udin", amount: 20000, date: "2026-02-12", note: "pembelian Aqua galon" },
          { timestamp: "2026-02-19 20:11:33", category: "Penyerahan Iuran RT", pic: "Wawan", amount: 600000, date: "2026-02-03", note: "pencairan IPL RT hingga Desember 2025" },
          { timestamp: "2026-02-23 20:21:16", category: "Insentif Kebersihan", pic: "Udin", amount: 100000, date: "2026-02-22", note: "Insentif Pemeliharaan Rutin fasum" },
          { timestamp: "2026-02-23 20:21:16", category: "Pantry", pic: "Wawan", amount: 56000, date: "2026-02-22", note: "KOPI 350gram" },
          { timestamp: "2026-03-01 11:35:42", category: "Pantry", pic: "Wawan", amount: 16000, date: "2026-02-25", note: "Kopi Saset Pak a.n Pak Andry" },
          { timestamp: "2026-03-01 11:37:38", category: "Permintaan Kasbon", pic: "Udin", amount: 200000, date: "2026-02-18", note: "keperluan munggahan" },
          { timestamp: "2026-03-01 11:38:38", category: "Permintaan Kasbon", pic: "Wahyu", amount: 200000, date: "2026-02-26", note: "keperluan" },
          { timestamp: "2026-03-08 20:35:58", category: "Gaji", pic: "Udin", amount: 1300000, date: "2026-03-06", note: "GAJI" },
          { timestamp: "2026-03-08 20:36:22", category: "Gaji", pic: "Wahyu", amount: 1200000, date: "2026-03-06", note: "GAJI" },
          { timestamp: "2026-03-08 20:36:43", category: "Gaji", pic: "Tisna", amount: 600000, date: "2026-03-07", note: "GAJI" },
          { timestamp: "2026-03-09 10:17:48", category: "Permintaan Kasbon", pic: "Udin", amount: 100000, date: "2026-03-01", note: "keperluan servis pompa di rumahnya" },
          { timestamp: "2026-03-17 21:53:22", category: "Pantry", pic: "Udin", amount: 20000, date: "2026-03-17", note: "Aqua galon" },
          { timestamp: "2026-03-17 21:54:15", category: "Pemeliharaan Rutin", pic: "Udin", amount: 100000, date: "2026-03-17", note: "Pemeliharaan Rutin fasum" },
          { timestamp: "2026-03-17 21:54:56", category: "Pantry", pic: "Udin", amount: 68000, date: "2026-03-17", note: "Kopi besar + toples kopi" },
          { timestamp: "2026-03-17 21:55:40", category: "Pencairan THR", pic: "Udin", amount: 1300000, date: "2026-03-16", note: "THR Pak Udin" },
          { timestamp: "2026-03-17 21:56:14", category: "Pencairan THR", pic: "Wahyu", amount: 1200000, date: "2026-03-16", note: "THR Pak Wahyu" },
          { timestamp: "2026-03-17 21:56:51", category: "Pencairan THR", pic: "Tisna", amount: 600000, date: "2026-03-16", note: "THR Kang Entis" },
          { timestamp: "2026-04-07 09:57:02", category: "Gaji", pic: "Tisna", amount: 600000, date: "2026-04-07", note: "Gaji petugas sampah April" },
          { timestamp: "2026-04-09 09:53:10", category: "Gaji", pic: "Udin", amount: 400000, date: "2026-04-07", note: "GAJI APRIL KE-1" },
          { timestamp: "2026-04-09 09:53:36", category: "Gaji", pic: "Wahyu", amount: 400000, date: "2026-04-07", note: "GAJI APRIL KE-1" },
          { timestamp: "2026-04-10 14:31:39", category: "Pantry", pic: "Udin", amount: 45000, date: "2026-04-05", note: "Pembelian kopi dan aqua galon" },
          { timestamp: "2026-04-15 14:31:25", category: "Penyaluran Santunan", pic: "Wawan", amount: 500000, date: "2026-03-08", note: "Penyaluran Santunan YAYASAN AL MUAWANAH" },
          { timestamp: "2026-04-20 19:15:41", category: "Gaji", pic: "Udin", amount: 900000, date: "2026-04-19", note: "gaji april tahap 2" },
          { timestamp: "2026-04-20 19:15:58", category: "Gaji", pic: "Wahyu", amount: 800000, date: "2026-04-19", note: "gaji april tahap 2" },
          { timestamp: "2026-04-21 19:13:38", category: "Listrik & Air", pic: "Wawan", amount: 103000, date: "2026-04-20", note: "TOKEN LISTRIK" },
          { timestamp: "2026-04-23 11:30:18", category: "Pantry", pic: "Wawan", amount: 20000, date: "2026-04-14", note: "aqua galon" },
          { timestamp: "2026-04-24 22:48:12", category: "DKM", pic: "Wawan", amount: 1295680, date: "2026-04-24", note: "Pembayaran Laundry Karpet Mushola" },
          { timestamp: "2026-05-06 19:06:40", category: "Gaji", pic: "Tisna", amount: 600000, date: "2026-05-06", note: "gaji Mei 2026" },
          { timestamp: "2026-05-06 19:07:17", category: "Gaji", pic: "Udin", amount: 500000, date: "2026-05-06", note: "Gaji Mei 2026 (tahap 1)" },
          { timestamp: "2026-05-06 19:07:34", category: "Gaji", pic: "Wahyu", amount: 500000, date: "2026-05-06", note: "Gaji Mei 2026 (tahap 1)" },
          { timestamp: "2026-05-08 16:25:54", category: "Pantry", pic: "Udin", amount: 64000, date: "2026-05-01", note: "kopi pouch 250gr dan kopi saset warung om" },
          { timestamp: "2026-05-08 16:26:18", category: "Pantry", pic: "Wawan", amount: 21000, date: "2026-05-07", note: "aqua galon" },
          { timestamp: "2026-05-08 16:30:13", category: "Pantry", pic: "Wawan", amount: 58000, date: "2026-05-08", note: "KOPI POUCH BESAR 350GR" },
          { timestamp: "2026-05-10 09:16:45", category: "Gaji", pic: "Udin", amount: 500000, date: "2026-05-10", note: "Gaji mei tahap 2" },
          { timestamp: "2026-05-10 09:17:13", category: "Gaji", pic: "Wahyu", amount: 500000, date: "2026-05-10", note: "Gaji mei tahap 2" }
        ];

        const currentCategories = await dbService.getAll('kategori') as any[];
        const catMap: Record<string, string> = {};

        let count = 0;
        for (const item of data) {
          if (!catMap[item.category]) {
            let cat = currentCategories.find(k => k.nama.toLowerCase() === item.category.toLowerCase() && k.tipe === 'pengeluaran');
            if (!cat) {
              const newId = await dbService.add('kategori', {
                nama: item.category,
                tipe: 'pengeluaran',
                icon: 'Package'
              });
              catMap[item.category] = newId;
            } else {
              catMap[item.category] = cat.id;
            }
          }

          // Convert specific date string to timestamp
          const [year, month, day] = item.date.split('-');
          const transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();

          await dbService.add('transaksi', {
            tanggal: transactionDate,
            jumlah: item.amount,
            tipe: 'pengeluaran' as const,
            kategoriId: catMap[item.category],
            keterangan: `${item.note} (PIC: ${item.pic})`,
            createdAt: new Date(item.timestamp).getTime()
          });
          count++;
        }

        localStorage.setItem('seed_expenditure_final_v3', 'true');
        console.log(`Final expenditure re-seeding completed. Created ${count} transactions.`);
      };

      const seedBukberData = async () => {
        const hasRun = localStorage.getItem('seed_bukber_v3');
        if (hasRun) return;

        // Clean up previous v2 records if they exist to avoid duplicates
        const allTransactions = await dbService.getAll('transaksi') as any[];
        const allEvents = await dbService.getAll('events') as any[];
        
        const oldBukberEvent = allEvents.find(e => e.nama === 'Berbuka Puasa Bersama');
        if (oldBukberEvent) {
          // Delete transactions linked to this event
          const linkedTrans = allTransactions.filter(t => t.eventId === oldBukberEvent.id);
          for (const t of linkedTrans) {
            await dbService.delete('transaksi', t.id);
          }
          // Delete the event itself to re-create it with correct date
          await dbService.delete('events', oldBukberEvent.id);
        }

        const residents = await dbService.getAll('warga') as any[];
        const categories = await dbService.getAll('kategori') as any[];
        let kegiatanInCatId = categories.find(k => k.nama.toLowerCase().includes('kegiatan') && k.tipe === 'pemasukan')?.id;

        if (!kegiatanInCatId) {
          kegiatanInCatId = await dbService.add('kategori', {
            nama: 'Kegiatan',
            tipe: 'pemasukan',
            icon: 'Calendar'
          });
        }

        let kegiatanOutCatId = categories.find(k => k.nama.toLowerCase().includes('kegiatan') && k.tipe === 'pengeluaran')?.id;
        if (!kegiatanOutCatId) {
          kegiatanOutCatId = await dbService.add('kategori', {
            nama: 'Kegiatan',
            tipe: 'pengeluaran',
            icon: 'Calendar'
          });
        }

        // Create the Event with corrected date: 1 Maret 2026
        const eventId = await dbService.add('events', {
          nama: 'Berbuka Puasa Bersama',
          tanggal: new Date(2026, 2, 1).getTime(),
          budget: 1500000,
          deskripsi: 'Berbuka puasa bersama warga GHR',
          status: 'Berjalan',
          createdAt: new Date(2026, 1, 1).getTime()
        });

        const date24 = ['Ali', 'Arsy', 'Zulkarnaen'];
        const date25 = ['Sum', 'Herman', 'Yudi', 'Andri', 'Temi', 'Imam', 'Tri'];

        let count = 0;
        // Process Income: Change to Februari 2026
        const processGroup = async (names: string[], day: number) => {
          for (const name of names) {
            const citizen = residents.find(r => r.nama.toLowerCase().includes(name.toLowerCase()));
            if (citizen) {
              await dbService.add('transaksi', {
                tanggal: new Date(2026, 1, day).getTime(), // Februari
                jumlah: 100000,
                tipe: 'pemasukan' as const,
                kategoriId: kegiatanInCatId,
                wargaId: citizen.id,
                eventId: eventId,
                bulanIuran: '2026-02',
                keterangan: 'Iuran Berbuka Puasa Bersama',
                createdAt: new Date(2026, 1, day).getTime()
              });
              count++;
            }
          }
        };

        await processGroup(date24, 24);
        await processGroup(date25, 25);

        // Add Expenditure linked to event with corrected date: 1 Maret 2026
        await dbService.add('transaksi', {
          tanggal: new Date(2026, 2, 1).getTime(), // 1 Maret
          jumlah: 1000000,
          tipe: 'pengeluaran' as const,
          kategoriId: kegiatanOutCatId,
          eventId: eventId,
          picName: 'Andri',
          keterangan: 'Konsumsi Berbuka Puasa Bersama',
          createdAt: new Date(2026, 2, 1, 10, 0, 0).getTime()
        });

        localStorage.setItem('seed_bukber_v3', 'true');
        console.log(`Seeding Bukber v3 completed. Corrected event and ${count + 1} transactions.`);
      };

      const seedInitialBalances = async () => {
        const hasRun = localStorage.getItem('seed_balances_2025_v1');
        if (hasRun) return;

        const categories = await dbService.getAll('kategori') as any[];
        let kasUmumCat = categories.find(k => k.nama.toLowerCase() === 'kas umum' && k.tipe === 'pemasukan');
        if (!kasUmumCat) {
          kasUmumCat = { id: await dbService.add('kategori', { nama: 'Kas Umum', tipe: 'pemasukan', icon: 'Wallet' }) };
        }

        let iuranRTCat = categories.find(k => k.nama.toLowerCase().includes('iuran rt') && k.tipe === 'pemasukan');
        if (!iuranRTCat) {
          iuranRTCat = { id: await dbService.add('kategori', { nama: 'Iuran RT', tipe: 'pemasukan', icon: 'Home' }) };
        }

        // 1. Saldo Umum 2025
        await dbService.add('transaksi', {
          tanggal: new Date(2025, 11, 31).getTime(),
          jumlah: 83268,
          tipe: 'pemasukan',
          kategoriId: kasUmumCat.id,
          keterangan: 'Saldo Awal Tahun 2026 (Historical 2025)',
          isHistorical: true,
          createdAt: new Date(2025, 11, 31).getTime()
        });

        // 3. Saldo RT 2025
        await dbService.add('transaksi', {
          tanggal: new Date(2025, 11, 31).getTime(),
          jumlah: 540000,
          tipe: 'pemasukan',
          kategoriId: iuranRTCat.id,
          keterangan: 'Saldo RT Awal Tahun 2026 (Historical 2025)',
          isHistorical: true,
          createdAt: new Date(2025, 11, 31).getTime()
        });

        localStorage.setItem('seed_balances_2025_v1', 'true');
        console.log('Seeding initial balances completed.');
      };

      const seedTunggakanMacet = async () => {
        const hasRun = localStorage.getItem('seed_tunggakan_2025_v3');
        if (hasRun) return;

        // Clean up previous records
        const oldTM = await dbService.getAll('tunggakan_macet') as any[];
        for (const t of oldTM) {
          await dbService.delete('tunggakan_macet', t.id);
        }

        const residents = await dbService.getAll('warga') as any[];
        
        // Robust finder for Didin and Wira
        const findResident = (query: string) => 
          residents.find(r => r.nama.toLowerCase().includes(query.toLowerCase()) || r.noRumah.toLowerCase().includes(query.toLowerCase()));

        let didin = findResident('Didin');
        if (!didin) {
          const didinId = await dbService.add('warga', {
            nama: 'Didin',
            noRumah: 'Kavling 1',
            telepon: '081234567890',
            status: 'Aktif',
            isIuranWajib: true,
            statusHuni: 'Menghuni',
            createdAt: Date.now()
          });
          didin = { id: didinId, nama: 'Didin' };
        }

        let wira = findResident('Kavling 4');
        if (!wira) {
          const wiraId = await dbService.add('warga', {
            nama: 'Bapak Wira',
            noRumah: 'Kavling 4',
            telepon: '081234567891',
            status: 'Aktif',
            isIuranWajib: true,
            statusHuni: 'Menghuni',
            createdAt: Date.now()
          });
          wira = { id: wiraId, nama: 'Bapak Wira' };
        }

        console.log('Seeding Tunggakan for:', { didinId: didin.id, wiraId: wira.id });

        const dataTunggakan = [
          {
            wargaId: didin.id,
            nama: didin.nama,
            totalBulan: 7,
            nominalPerBulan: 180000,
            totalTagihan: 7 * 180000,
            nominalBayar: 0,
            sisa: 7 * 180000,
            keterangan: 'Juni - Desember 2025',
            status: 'Macet' as const,
            createdAt: Date.now()
          },
          {
            wargaId: wira.id,
            nama: wira.nama,
            totalBulan: 7,
            nominalPerBulan: 180000,
            totalTagihan: 7 * 180000,
            nominalBayar: 0,
            sisa: 7 * 180000,
            keterangan: 'Juni - Desember 2025',
            status: 'Macet' as const,
            createdAt: Date.now()
          }
        ];

        for (const t of dataTunggakan) {
          await dbService.add('tunggakan_macet', t);
        }

        localStorage.setItem('seed_tunggakan_2025_v3', 'true');
      };

      const fixRTTransactions = async () => {
        const hasRun = localStorage.getItem('fix_rt_categories_v1');
        if (hasRun) return;

        const categories = await dbService.getAll('kategori') as any[];
        const rtCat = categories.find(c => c.nama.toLowerCase() === 'iuran rt');
        const bulananCat = categories.find(c => c.nama.toLowerCase().includes('iuran bulanan'));

        if (!rtCat || !bulananCat) return;

        const transactions = await dbService.getAll('transaksi') as any[];
        const toFix = transactions.filter(t => 
          t.kategoriId === bulananCat.id && 
          (t.keterangan.toLowerCase().includes('iuran rt') || t.keterangan === 'Iuran RT')
        );

        console.log(`Fixing ${toFix.length} Iuran RT transactions...`);

        for (const t of toFix) {
          await dbService.update('transaksi', t.id, {
            kategoriId: rtCat.id
          });
        }

        localStorage.setItem('fix_rt_categories_v1', 'true');
        console.log('Finished fixing Iuran RT categories.');
      };

      const removeDuplicateRTTransactions = async () => {
        const hasRun = localStorage.getItem('remove_duplicate_rt_internal_v1');
        if (hasRun) return;

        console.log('Cleaning up duplicate RT transactions...');
        const categories = await dbService.getAll('kategori') as any[];
        const rtCat = categories.find(c => c.nama.toLowerCase() === 'iuran rt');
        if (!rtCat) return;

        const transactions = await dbService.getAll('transaksi') as any[];
        const rtTransactions = transactions.filter(t => t.kategoriId === rtCat.id && t.wargaId && t.bulanIuran);

        const groups: Record<string, any[]> = {};
        for (const t of rtTransactions) {
          const key = `${t.wargaId}_${t.bulanIuran}`;
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
        }

        let deletedCount = 0;
        for (const key in groups) {
          const group = groups[key];
          if (group.length > 1) {
            const duplicates = group.slice(1);
            for (const dup of duplicates) {
              await dbService.delete('transaksi', dup.id);
              deletedCount++;
            }
          }
        }

        localStorage.setItem('remove_duplicate_rt_internal_v1', 'true');
        console.log(`Finished cleaning duplicates. Deleted ${deletedCount} transactions.`);
      };

      const fixTemiData = async () => {
        const hasRun = localStorage.getItem('fix_temi_v2');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const temi = residents.find(r => r.nama.toLowerCase().includes('temi'));
        if (temi) {
          console.log('Fixing Temi data inconsistency (v2)...');
          await dbService.update('warga', temi.id, {
            statusHuniUpdatedAt: 0
          });
        }
        localStorage.setItem('fix_temi_v2', 'true');
      };

      const globalDataAudit = async () => {
        const hasRun = localStorage.getItem('global_data_audit_v6');
        if (hasRun) return;

        console.log('Running master data audit and stabilization v6...');
        const transactions = await dbService.getAll('transaksi') as any[];
        const categories = await dbService.getAll('kategori') as any[];
        const residents = await dbService.getAll('warga') as any[];

        const bulananCat = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan');
        const rtCat = categories.find(c => c.nama === 'Iuran RT' && c.tipe === 'pemasukan');
        const thrCat = categories.find(c => c.nama.toLowerCase().includes('thr') && c.tipe === 'pemasukan');
        const kegiatanCat = categories.find(c => c.nama.toLowerCase().includes('kegiatan') && c.tipe === 'pemasukan');

        if (!bulananCat || !rtCat) return;

        let fixedCount = 0;
        let deletedCount = 0;

        // 1. Reset Resident Status metadata for fresh calculation
        for (const r of residents) {
          if (r.statusHuniUpdatedAt !== 0) {
            await dbService.update('warga', r.id, { statusHuniUpdatedAt: 0 });
            fixedCount++;
          }
        }

        // 2. Stabilization and Label Normalization
        const standardizeLabel = (label: string) => {
          const l = label.toLowerCase();
          if (l.includes('bukber') || l.includes('berbuka puasa')) return 'Iuran Bukber';
          if (l.includes('thr')) return 'Iuran THR';
          if (l.includes('iuran bulanan')) return 'Iuran Bulanan';
          if (l.includes('iuran rt')) return 'Iuran RT';
          return label;
        };

        for (const t of transactions) {
          let needsUpdate = false;
          let updateData: any = {};

          const desc = (t.keterangan || '').toLowerCase();
          
          // A. Category Corrections
          let correctCatId = t.kategoriId;
          const targetLabel = standardizeLabel(t.keterangan || '');
          
          if (targetLabel === 'Iuran Bulanan') correctCatId = bulananCat.id;
          else if (targetLabel === 'Iuran RT') correctCatId = rtCat.id;
          else if (targetLabel === 'Iuran THR' && thrCat) correctCatId = thrCat.id;
          else if (targetLabel === 'Iuran Bukber' && kegiatanCat) correctCatId = kegiatanCat.id;

          if (correctCatId !== t.kategoriId) {
            updateData.kategoriId = correctCatId;
            needsUpdate = true;
          }

          if (targetLabel !== t.keterangan && (correctCatId === bulananCat.id || correctCatId === rtCat.id || (thrCat && correctCatId === thrCat.id) || (kegiatanCat && correctCatId === kegiatanCat.id))) {
            updateData.keterangan = targetLabel;
            needsUpdate = true;
          }

          // B. Fix Missing BulanIuran for Recurring
          if (!t.bulanIuran && (correctCatId === bulananCat.id || correctCatId === rtCat.id || (thrCat && correctCatId === thrCat.id) || (kegiatanCat && correctCatId === kegiatanCat.id))) {
            const monthMap: Record<string, string> = {
              'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 
              'juni': '06', 'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 
              'november': '11', 'desember': '12'
            };
            for (const [mName, mVal] of Object.entries(monthMap)) {
              if (desc.includes(mName)) {
                updateData.bulanIuran = `2026-${mVal}`;
                needsUpdate = true;
                break;
              }
            }
            
            // Hardcoded defaults for specific types if still missing
            if (!updateData.bulanIuran && !t.bulanIuran) {
              if (targetLabel === 'Iuran THR') {
                updateData.bulanIuran = '2026-03';
                needsUpdate = true;
              } else if (targetLabel === 'Iuran Bukber') {
                updateData.bulanIuran = '2026-02';
                needsUpdate = true;
              }
            }
          }

          // C. Normalize BulanIuran format
          const b = updateData.bulanIuran || t.bulanIuran;
          if (b && b.includes('-')) {
            const [y, m] = b.split('-');
            if (m.length === 1) {
              updateData.bulanIuran = `${y}-${m.padStart(2, '0')}`;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await dbService.update('transaksi', t.id, updateData);
            fixedCount++;
          }
        }

        // 2. Master Deduction (Aggressive Removal of duplicates)
        const freshTrans = await dbService.getAll('transaksi') as any[];
        const incomeTrans = freshTrans.filter(t => t.tipe === 'pemasukan' && t.wargaId && !t.isHistorical);
        
        const groups: Record<string, any[]> = {};
        for (const t of incomeTrans) {
          const key = t.bulanIuran 
            ? `${t.wargaId}_${t.kategoriId}_${t.bulanIuran}`
            : `${t.wargaId}_${t.kategoriId}_${t.keterangan.trim().toLowerCase()}`;
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
        }

        for (const key in groups) {
          const group = groups[key];
          if (group.length > 1) {
            group.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            const duplicates = group.slice(1);
            for (const dup of duplicates) {
              await dbService.delete('transaksi', dup.id);
              deletedCount++;
            }
          }
        }

        console.log(`Audit v6 complete: Fixed ${fixedCount}, Deleted ${deletedCount}.`);
        localStorage.setItem('global_data_audit_v6', 'true');
      };

      const fixWawanData = async () => {
        const hasRun = localStorage.getItem('fix_wawan_v1');
        if (hasRun) return;

        const residents = await dbService.getAll('warga') as any[];
        const wawan = residents.find(r => r.nama.toLowerCase().includes('wawan'));
        if (!wawan) return;

        console.log('Fixing Wawan data inconsistency...');

        const currentTransactions = await dbService.getAll('transaksi') as any[];
        const categories = await dbService.getAll('kategori') as any[];
        
        const bulananCat = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan');
        const rtCat = categories.find(c => c.nama === 'Iuran RT' && c.tipe === 'pemasukan');
        const thrCat = categories.find(c => c.nama.toLowerCase().includes('thr') && c.tipe === 'pemasukan');

        if (!bulananCat || !rtCat) return;

        // Delete existing 2026 transactions (Bulanan, RT, THR)
        const toDelete = currentTransactions.filter(t => 
          t.wargaId === wawan.id && 
          !t.isHistorical && 
          (t.kategoriId === bulananCat.id || t.kategoriId === rtCat.id || (thrCat && t.kategoriId === thrCat.id))
        );

        for (const t of toDelete) {
          await dbService.delete('transaksi', t.id);
        }

        // Re-seed standard 2026 data
        const months = [
          { name: 'Januari', m: '01', bulanan: 180000 },
          { name: 'Februari', m: '02', bulanan: 180000 },
          { name: 'Maret', m: '03', bulanan: 200000 },
          { name: 'April', m: '04', bulanan: 200000 },
          { name: 'Mei', m: '05', bulanan: 200000 },
        ];

        for (const m of months) {
          const mIdx = parseInt(m.m) - 1;
          const date = new Date(2026, mIdx, 1).getTime();
          
          await dbService.add('transaksi', {
            tanggal: date,
            jumlah: m.bulanan,
            tipe: 'pemasukan',
            kategoriId: bulananCat.id,
            wargaId: wawan.id,
            bulanIuran: `2026-${m.m}`,
            keterangan: `Iuran Bulanan - Wawan (${m.name} 2026)`,
            createdAt: date
          });

          await dbService.add('transaksi', {
            tanggal: date,
            jumlah: 20000,
            tipe: 'pemasukan',
            kategoriId: rtCat.id,
            wargaId: wawan.id,
            bulanIuran: `2026-${m.m}`,
            keterangan: `Iuran RT - Wawan (${m.name} 2026)`,
            createdAt: date
          });
        }

        if (thrCat) {
          await dbService.add('transaksi', {
            tanggal: new Date(2026, 2, 15).getTime(),
            jumlah: 180000,
            tipe: 'pemasukan',
            kategoriId: thrCat.id,
            wargaId: wawan.id,
            bulanIuran: '2026-03',
            keterangan: 'Iuran THR',
            createdAt: new Date(2026, 2, 15).getTime()
          });
        }

        // Ensure status accuracy
        await dbService.update('warga', wawan.id, {
          statusHuniUpdatedAt: 0
        });

        localStorage.setItem('fix_wawan_v1', 'true');
        console.log('Wawan data fix complete.');
      };

      // All seed functions are disabled for production to prevent data multiplication
      // seedData();
      // seedRTData();
      // seedBatchData();
      // seedUnoccupiedData();
      // seedHermanData();
      // seedRTBatchData();
      // seedTHRData();
      // seedFinalExpenditures();
      // seedBukberData();
      // seedInitialBalances();
      // seedTunggakanMacet();
      // fixWawanData();
      
      const v8Audit = async () => {
        const hasRun = localStorage.getItem('global_data_audit_v8');
        if (hasRun) return;

        console.log('Running master super-aggressive data cleanup v8...');
        const transactions = await dbService.getAll('transaksi') as any[];
        const categories = await dbService.getAll('kategori') as any[];
        
        const bulananCat = categories.find(c => c.nama === 'Iuran Bulanan' && c.tipe === 'pemasukan');
        const rtCat = categories.find(c => c.nama === 'Iuran RT' && c.tipe === 'pemasukan');
        const thrCat = categories.find(c => c.nama.toLowerCase().includes('thr') && c.tipe === 'pemasukan');
        const kegiatanCat = categories.find(c => c.nama.toLowerCase().includes('kegiatan') && c.tipe === 'pemasukan');

        const groups: Record<string, any[]> = {};
        let deletedCount = 0;

        for (const t of transactions) {
          if (t.tipe !== 'pemasukan' || t.isHistorical || !t.wargaId) continue;
          
          // 1. Determine Logical Category
          let logicalCatId = t.kategoriId;
          const desc = (t.keterangan || '').toLowerCase();
          
          if (desc.includes('iuran bulanan') || (bulananCat && t.kategoriId === bulananCat.id)) logicalCatId = bulananCat?.id || 'bulanan';
          else if (desc.includes('iuran rt') || (rtCat && t.kategoriId === rtCat.id)) logicalCatId = rtCat?.id || 'rt';
          else if (desc.includes('thr') || (thrCat && t.kategoriId === thrCat.id)) logicalCatId = thrCat?.id || 'thr';
          else if (desc.includes('bukber') || (kegiatanCat && t.kategoriId === kegiatanCat.id)) logicalCatId = kegiatanCat?.id || 'bukber';

          // 2. Normalize Month
          const month = t.bulanIuran || 'no-month';
          
          // 3. Create key
          // We include amount to be safe, but duplicates often have same amount
          const key = `${t.wargaId}_${logicalCatId}_${month}`;
          
          if (!groups[key]) groups[key] = [];
          groups[key].push(t);
        }

        for (const key in groups) {
          const group = groups[key];
          if (group.length > 1) {
            // Sort by amount descending (keep the larger one if mismatch), then by date
            group.sort((a, b) => {
              if (b.jumlah !== a.jumlah) return b.jumlah - a.jumlah;
              return (b.createdAt || 0) - (a.createdAt || 0);
            });
            
            const duplicates = group.slice(1);
            for (const dup of duplicates) {
              await dbService.delete('transaksi', dup.id);
              deletedCount++;
            }
          }
        }

        console.log(`Audit v8 complete: Deleted ${deletedCount} duplicates.`);
        localStorage.setItem('global_data_audit_v8', 'true');
      };

      v8Audit();
      globalDataAudit();

      const runAutoBackupCheck = async () => {
        const today = new Date();
        if (today.getDate() !== 1) return; // Only run on 1st

        const monthKey = format(today, 'yyyy-MM');
        const storageKey = `auto_backup_${monthKey}`;
        
        if (localStorage.getItem(storageKey)) return;

        console.log(`Monthly auto-backup check: today is the 1st of ${format(today, 'MMMM')}. Checking existing backups...`);
        
        try {
          const backups = await backupService.listBackups() as any[];
          const hasBackupThisMonth = backups.some(b => 
            b.label && b.label.includes('Auto-Backup') && 
            b.timestamp && format(new Date(b.timestamp), 'yyyy-MM') === monthKey
          );

          if (!hasBackupThisMonth) {
            console.log('No auto-backup found for this month. Creating one...');
            await backupService.createBackup(`Auto-Backup ${format(today, 'MMMM yyyy')}`);
            localStorage.setItem(storageKey, 'true');
          }
        } catch (err) {
          console.error('Auto-backup job failed:', err);
        }
      };

      runAutoBackupCheck();

      // One-time cleanup for 'Pembayaran Tunggakan' category
      const cleanupKategori = async () => {
        const hasCleaned = localStorage.getItem('cleanup_tunggakan_cat_v1');
        if (hasCleaned) return;
        
        const categories = await dbService.getAll('kategori') as any[];
        const target = categories.find(k => k.nama === 'Pembayaran Tunggakan');
        if (target) {
          await dbService.delete('kategori', target.id);
          console.log('Deleted legacy category: Pembayaran Tunggakan');
        }
        localStorage.setItem('cleanup_tunggakan_cat_v1', 'true');
      };
      
      cleanupKategori();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F5F0]">
        <div className="w-12 h-12 border-4 border-[#A3A375] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <PublicLanding onLogin={login} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'warga', label: 'Data Warga', icon: Users },
    { id: 'petugas', label: 'Petugas/PIC', icon: UserCircle2 },
    { id: 'transaksi', label: 'Transaksi', icon: ArrowUpRight },
    { id: 'event', label: 'Event & Budget', icon: Calendar },
    { id: 'laporan', label: 'Laporan Bulanan', icon: FileText },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F5F0] text-[#4A4A3A] font-sans">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#5A5A40] text-[#F5F5F0] transition-transform duration-300 lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-[#6B6B4D]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#A3A375] rounded-xl flex items-center justify-center shadow-lg">
                <CreditCard className="w-6 h-6 text-[#F5F5F0]" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-xl tracking-tight">Keuangan</span>
                <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Warga GHR</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors">
              <X className="w-5 h-5 text-[#F5F5F0]" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as NavItem);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "flex items-center gap-4 w-full px-4 py-3.5 rounded-2xl transition-all font-medium text-sm",
                  activeTab === item.id 
                    ? "bg-[#6B6B4D] text-white shadow-inner" 
                    : "text-[#F5F5F0]/70 hover:bg-[#6B6B4D]/50 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id ? "text-white" : "text-[#A3A375]")} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 bg-[#6B6B4D] rounded-[24px] mb-4">
              <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} className="w-9 h-9 rounded-full border-2 border-[#A3A375]" alt="Profile" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{user.displayName}</p>
                <p className="text-[10px] text-[#A3A375] font-bold uppercase">Petugas</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-[#F5F5F0]/60 hover:bg-white/5 hover:text-white transition-all text-sm font-bold"
            >
              <LogOut className="w-4 h-4" />
              Keluar Sesi
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-[#E5E5DA] px-6 py-5 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#5A5A40] rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif font-bold text-xl text-[#3A3A2A]">Keuangan Warga</span>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-[#E5E5DA] rounded-xl transition-colors">
            <Menu className="w-6 h-6 text-[#5A5A40]" />
          </button>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 xl:p-12 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard />}
              {activeTab === 'warga' && <WargaList />}
              {activeTab === 'petugas' && <PetugasList />}
              {activeTab === 'transaksi' && <TransaksiList />}
              {activeTab === 'event' && <EventList />}
              {activeTab === 'laporan' && <Laporan />}
              {activeTab === 'pengaturan' && <Pengaturan />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
