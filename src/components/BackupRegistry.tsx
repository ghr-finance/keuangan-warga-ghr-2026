import React, { useState, useEffect } from 'react';
import { backupService, BackupData } from '../services/backup';
import { Database, Download, RotateCcw, AlertTriangle, CheckCircle2, History, Trash2, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../services/db';

export default function BackupRegistry() {
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState<string | null>(null);
  const [backupLabel, setBackupLabel] = useState('');

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const data = await backupService.listBackups();
      setBackups(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setError(null);
    try {
      await backupService.createBackup(backupLabel || 'Manual Backup');
      setSuccess('Backup berhasil dibuat!');
      setBackupLabel('');
      await loadBackups();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(`Gagal membuat backup: ${err.message || 'Error tidak diketahui'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await backupService.restoreBackup(id);
      // reload happens in service
    } catch (err) {
      setError('Gagal melakukan restore');
      setLoading(false);
      setShowConfirmRestore(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Hapus historical backup ini?')) return;
    try {
      await dbService.delete('backups', id);
      await loadBackups();
    } catch (err) {
      setError('Gagal menghapus backup');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-[32px] border border-[#E5E5DA] shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
            <Database className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-bold text-[#3A3A2A]">Manajemen Backup</h3>
            <p className="text-[#A3A375] text-xs font-medium">Cadangkan seluruh data aplikasi untuk keamanan.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            placeholder="Label backup (contoh: Sebelum update Mei)"
            className="flex-1 px-5 py-3.5 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-sm"
            value={backupLabel}
            onChange={(e) => setBackupLabel(e.target.value)}
          />
          <button 
            disabled={loading}
            onClick={handleCreateBackup}
            className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Backup Sekarang
          </button>
        </div>

        {success && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold">
            <CheckCircle2 className="w-5 h-5" /> {success}
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold">
            <AlertTriangle className="w-5 h-5" /> {error}
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[36px] border border-[#E5E5DA] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center">
              <History className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-xl font-serif font-bold text-[#3A3A2A]">Riwayat & Restore Point</h4>
              <p className="text-[#A3A375] text-sm font-medium">Daftar cadangan data yang pernah dibuat.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-[10px] font-black uppercase tracking-tighter">
            <ShieldCheck className="w-3.5 h-3.5" /> Data Terenkripsi & Aman
          </div>
        </div>

        <div className="space-y-4">
          {backups.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Database className="w-16 h-16 text-[#E5E5DA] mb-4" />
              <p className="text-[#A3A375] font-bold">Belum ada riwayat backup.</p>
            </div>
          ) : (
            backups.map((bak) => (
              <div key={bak.id} className="group flex items-center justify-between p-5 bg-[#F5F5F0]/50 hover:bg-white hover:shadow-xl hover:shadow-[#5A5A40]/5 border border-transparent hover:border-[#E5E5DA] rounded-[28px] transition-all duration-500">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-[#E5E5DA] group-hover:scale-110 transition-transform shadow-sm">
                    <Database className="w-6 h-6 text-[#5A5A40]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-[#3A3A2A] text-lg leading-none mb-1.5">{bak.label}</h5>
                    <div className="flex items-center gap-4">
                      <p className="text-xs font-black text-[#A3A375] uppercase tracking-widest flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {format(new Date(bak.timestamp), 'dd MMMM yyyy HH:mm', { locale: id })}
                      </p>
                      <span className="px-2.5 py-0.5 bg-white border border-[#E5E5DA] rounded-full text-[10px] font-black text-[#5A5A40] uppercase tracking-tight">
                        VERSI: {bak.version}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowConfirmRestore(bak.id!)}
                    className="px-6 py-2.5 bg-white border-2 border-[#E5E5DA] hover:border-blue-500 hover:text-blue-600 text-[#5A5A40] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button 
                    onClick={() => handleDeleteBackup(bak.id!)}
                    className="p-2.5 bg-white border-2 border-[#E5E5DA] hover:border-red-500 hover:text-red-600 text-[#A3A375] rounded-xl transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      <AnimatePresence>
        {showConfirmRestore && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowConfirmRestore(null)}
              className="absolute inset-0 bg-[#3A3A2A]/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
               <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-6">
                    <AlertTriangle className="w-10 h-10 text-red-600 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-[#3A3A2A] mb-3">Konfirmasi Restore Data</h3>
                  <p className="text-[#4A4A3A] text-sm font-medium leading-relaxed mb-8 opacity-80">
                    <span className="text-red-600 font-bold">PERINGATAN:</span> Tindakan ini akan menghapus seluruh data saat ini dan menggantinya dengan data dari backup <span className="font-bold underline">"{backups.find(b => b.id === showConfirmRestore)?.label}"</span>. Data yang tidak dicadangkan akan hilang permanen.
                  </p>

                  <div className="flex flex-col w-full gap-3">
                    <button 
                      disabled={loading}
                      onClick={() => handleRestore(showConfirmRestore)}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-red-600/20"
                    >
                      {loading ? 'Sedang Memproses...' : 'YA, TIMPA DATA SAYA'}
                    </button>
                    <button 
                      disabled={loading}
                      onClick={() => setShowConfirmRestore(null)}
                      className="w-full py-4 text-[#A3A375] font-black text-xs uppercase tracking-widest hover:text-[#5A5A40] transition-colors"
                    >
                      Batal
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
