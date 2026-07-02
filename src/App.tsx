import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  ArrowUpRight, 
  Calendar, 
  Settings, 
  FileText,
  LogOut,
  Menu,
  X,
  UserCircle2,
  Lock
} from 'lucide-react';
import { dbService } from './services/db';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
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
  const [user, setUser] = useState<{ email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavItem>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  // Authentication states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.loggedIn && data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        } else {
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginWithCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setAuthError('Silakan lengkapi username dan password.');
      return;
    }

    try {
      setLoginLoading(true);
      setAuthError(null);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username.trim(), password })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setAuthError(data.error || 'Username atau password salah.');
        return;
      }

      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        setShowLoginModal(false);
      } else {
        setAuthError('Terjadi kesalahan saat masuk.');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Terjadi kesalahan saat masuk.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setAuthError(null);
    }
  };

  useEffect(() => {
    if (user) {
      // Unused seeding functions removed
      const runAutoBackupCheck = async () => {
        const today = new Date();
        const monthKey = format(today, 'yyyy-MM');
        const storageKey = `auto_backup_${monthKey}`;
        
        if (today.getDate() === 1) {
          console.log(`Monthly auto-backup check: today is the 1st of ${format(today, 'MMMM', { locale: id })}. Checking existing backups...`);
          
          try {
            const backups = await backupService.listBackups() as any[];
            const hasBackupForCurrentMonth = backups.some(b => 
              b.label && b.label.includes('Auto-Backup') && 
              b.timestamp && format(new Date(b.timestamp), 'yyyy-MM') === monthKey
            );

            if (!hasBackupForCurrentMonth) {
              console.log('No auto-backup found for this month. Creating one...');
              await backupService.createBackup(`Auto-Backup ${format(today, 'MMMM yyyy', { locale: id })}`);
              localStorage.setItem(storageKey, 'true');
            }
          } catch (err) {
            console.error('Auto-backup job failed:', err);
          }
        }
      };

      runAutoBackupCheck();

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

      // Migrate hardcoded No. 14 (Fuad → Faradila) history to warga_history table
      const migrateNo14History = async () => {
        const hasRun = localStorage.getItem('migrate_no14_history_v1');
        if (hasRun) return;

        // wargaId for Faradila / No. 14 (the hardcoded one from old code)
        const WARGA_ID_NO14 = 'iwGZETLlW9DTKLjgckoK';

        // Verify warga exists before migrating
        const residents = await dbService.getAll('warga') as any[];
        const warga14 = residents.find(r => r.id === WARGA_ID_NO14 || r.noRumah === '14');
        if (!warga14) {
          console.log('No. 14 warga not found, skipping history migration.');
          localStorage.setItem('migrate_no14_history_v1', 'true');
          return;
        }

        // Jan 2026 00:00:00 WIB
        const jan2026 = new Date(2026, 0, 1).getTime();
        // 31 Mar 2026 00:00:00 WIB
        const mar31_2026 = new Date(2026, 2, 31).getTime();

        await dbService.migrateWargaHistory(warga14.id, [
          {
            noRumah: '14',
            status: 'Aktif',
            statusHuni: 'Menghuni',
            isIuranWajib: true,
            isIuranRT: false,
            effectiveFrom: jan2026,
            effectiveTo: mar31_2026,
            keterangan: 'Masa sewa Fuad (Januari 2026 – 30 Maret 2026)',
          },
          {
            noRumah: '14',
            status: 'Non-Aktif',
            statusHuni: 'Tidak Menghuni',
            isIuranWajib: true,
            isIuranRT: false,
            effectiveFrom: mar31_2026,
            effectiveTo: null,
            keterangan: 'Faradila (pemilik asli) kembali, saat ini tidak menghuni',
          }
        ]);

        localStorage.setItem('migrate_no14_history_v1', 'true');
        console.log('Migrated No. 14 (Fuad → Faradila) history to warga_history table.');
      };

      migrateNo14History();
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
    return (
      <>
        <PublicLanding onLogin={() => {
          setAuthError(null);
          setShowLoginModal(true);
        }} />
        
        {/* Modern, Highly Polished Custom Login Modal */}
        <AnimatePresence>
          {showLoginModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowLoginModal(false)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              />
              
              {/* Modal Box */}
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative bg-[#F5F5F0] rounded-[32px] border border-[#E5E5DA] shadow-2xl p-6 sm:p-8 w-full max-w-md overflow-hidden"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-5 right-5 p-2 text-[#A3A375] hover:text-[#5A5A40] rounded-full hover:bg-black/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-[#FA3E3E] rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20 mx-auto mb-4">
                    <svg 
                      viewBox="0 0 100 100" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="w-7 h-7 text-white"
                    >
                      <line x1="16" y1="75" x2="84" y2="75" />
                      <path d="M 24 75 L 24 55 A 8 8 0 0 1 32 47 L 42 47 L 42 75" />
                      <path d="M 42 75 L 42 34 A 8 8 0 0 1 50 26 A 8 8 0 0 1 58 34 L 58 75" />
                      <path d="M 58 75 L 58 47 L 68 47 A 8 8 0 0 1 76 55 L 76 75" />
                    </svg>
                  </div>
                  <h3 className="font-serif font-black text-2xl text-[#3A3A2A] tracking-tight">Login Pengurus GHR</h3>
                  <p className="text-xs text-[#A3A375] font-semibold mt-1">Gunakan Akun Terdaftar untuk mengakses Dashboard</p>
                </div>

                {/* Error Banner */}
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3.5 text-xs font-semibold mb-6 text-center leading-relaxed"
                  >
                    {authError}
                  </motion.div>
                )}

                {/* Action Buttons & Form */}
                <div className="space-y-4">
                  {/* Credentials form */}
                  <form onSubmit={loginWithCredentials} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#5A5A40] mb-1">
                        Username Super Admin
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Masukkan ghr-super"
                        disabled={loginLoading}
                        className="w-full bg-white border border-[#E5E5DA] text-[#3A3A2A] p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A3A375]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-[#5A5A40] mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loginLoading}
                        className="w-full bg-white border border-[#E5E5DA] text-[#3A3A2A] p-3 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A3A375]/40"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full flex items-center justify-center gap-2 bg-[#5A5A40] hover:bg-[#4E4E37] text-white py-3 px-5 rounded-xl font-bold text-xs transition-all shadow-sm hover:shadow disabled:opacity-50"
                    >
                      {loginLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Masuk sebagai Super Admin</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
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
        "fixed inset-y-0 left-0 z-50 w-64 h-screen bg-[#5A5A40] text-[#F5F5F0] transition-transform duration-300 shadow-2xl border-r border-[#6B6B4D] lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FA3E3E] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/10">
                <svg 
                  viewBox="0 0 100 100" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="w-6 h-6 text-white"
                >
                  <line x1="16" y1="75" x2="84" y2="75" />
                  <path d="M 24 75 L 24 55 A 8 8 0 0 1 32 47 L 42 47 L 42 75" />
                  <path d="M 42 75 L 42 34 A 8 8 0 0 1 50 26 A 8 8 0 0 1 58 34 L 58 75" />
                  <path d="M 58 75 L 58 47 L 68 47 A 8 8 0 0 1 76 55 L 76 75" />
                </svg>
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
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`} className="w-9 h-9 rounded-full border-2 border-[#A3A375]" alt="Profile" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{user.displayName}</p>
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
      <main className="flex-1 overflow-auto lg:ml-64">
        <header className="sticky top-0 z-30 bg-[#F5F5F0]/90 backdrop-blur-md border-b border-[#E5E5DA] px-6 py-5 flex items-center justify-between lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FA3E3E] rounded-lg flex items-center justify-center shadow-sm">
              <svg 
                viewBox="0 0 100 100" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="w-5 h-5 text-white"
              >
                <line x1="16" y1="75" x2="84" y2="75" />
                <path d="M 24 75 L 24 55 A 8 8 0 0 1 32 47 L 42 47 L 42 75" />
                <path d="M 42 75 L 42 34 A 8 8 0 0 1 50 26 A 8 8 0 0 1 58 34 L 58 75" />
                <path d="M 58 75 L 58 47 L 68 47 A 8 8 0 0 1 76 55 L 76 75" />
              </svg>
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
