import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Petugas } from '../types';
import { Plus, Search, MoreVertical, Phone, UserCircle2, Filter, X, Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function PetugasList() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    nama: '',
    jabatan: '',
    phone: '',
    status: 'Aktif' as const
  });

  useEffect(() => {
    const unsub = dbService.subscribe('petugas', (data) => {
      setPetugas(data);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await dbService.update('petugas', editingId, formData);
    } else {
      await dbService.add('petugas', {
        ...formData,
        createdAt: Date.now()
      });
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ nama: '', jabatan: '', phone: '', status: 'Aktif' });
  };

  const handleEdit = (p: Petugas) => {
    setEditingId(p.id);
    setFormData({
      nama: p.nama,
      jabatan: p.jabatan,
      phone: p.phone || '',
      status: p.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus petugas ini?')) {
      await dbService.delete('petugas', id);
    }
  };

  const filteredPetugas = petugas.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.jabatan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-serif font-bold text-[#3A3A2A] tracking-tight">Daftar Petugas</h1>
          <p className="text-[#A3A375] font-medium mt-2">Manajemen staf dan petugas operasional lingkungan.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-[#5A5A40] text-[#F5F5F0] px-6 py-3 rounded-full font-bold hover:opacity-90 transition-all shadow-lg shadow-[#5A5A40]/20"
        >
          <Plus className="w-5 h-5" />
          Tambah Petugas
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3A375]" />
          <input 
            type="text" 
            placeholder="Cari nama atau jabatan..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-medium shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-4 bg-white border border-[#E5E5DA] rounded-2xl font-bold text-[#5A5A40] hover:bg-gray-50 transition-all shadow-sm">
          <Filter className="w-5 h-5 text-[#A3A375]" />
          Filter
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-[#E5E5DA] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F5F5F0]/50">
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Identitas Petugas</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Jabatan</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Kontak</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-[#A3A375] uppercase tracking-widest border-b border-[#E5E5DA] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5DA]">
              {filteredPetugas.map((p) => (
                <tr key={p.id} className="hover:bg-[#F5F5F0]/30 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#5A5A40]/10 flex items-center justify-center text-[#5A5A40] font-serif font-bold text-lg shadow-inner">
                        {p.nama.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#3A3A2A]">{p.nama}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-medium text-[#5A5A40]">{p.jabatan}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2 text-sm text-[#A3A375] font-bold">
                      <Phone className="w-4 h-4" />
                      {p.phone || '-'}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
                      p.status === 'Aktif' ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="p-2 text-[#A3A375] hover:text-[#5A5A40] transition-colors rounded-xl hover:bg-gray-50"
                        title="Edit Petugas"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="p-2 text-[#A3A375] hover:text-red-500 transition-colors rounded-xl hover:bg-gray-50"
                        title="Hapus Petugas"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPetugas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-[#A3A375] font-serif italic text-lg opacity-60">
                    Belum ada data petugas...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#3A3A2A]/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#F5F5F0] rounded-[32px] w-full max-w-md shadow-2xl border border-[#E5E5DA] overflow-hidden"
            >
              <div className="p-8 border-b border-[#E5E5DA] flex items-center justify-between bg-white/50">
                <h2 className="text-2xl font-serif font-bold text-[#3A3A2A]">{editingId ? 'Edit Data Petugas' : 'Tambah Petugas'}</h2>
                <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-[#A3A375]"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="Masukkan nama petugas..."
                      value={formData.nama}
                      onChange={(e) => setFormData({...formData, nama: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Jabatan / Role</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="Contoh: Keamanan, Kebersihan, Staf Admin"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({...formData, jabatan: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2 ml-1">Nomor HP</label>
                    <input 
                      type="tel" 
                      className="w-full px-5 py-4 bg-white border border-[#E5E5DA] rounded-2xl focus:ring-2 focus:ring-[#A3A375] focus:outline-none font-bold placeholder:text-gray-300"
                      placeholder="0812xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A3A375] uppercase tracking-widest mb-2">Status Petugas</label>
                    <div className="flex p-1 bg-white border border-[#E5E5DA] rounded-2xl gap-1">
                      {(['Aktif', 'Non-Aktif'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormData({ ...formData, status: s })}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                            formData.status === s 
                              ? "bg-[#5A5A40] text-white shadow-sm" 
                              : "text-[#A3A375] hover:bg-gray-50"
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-6 py-4 rounded-full border border-[#E5E5DA] font-bold text-[#A3A375] hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-4 rounded-full bg-[#5A5A40] text-white font-bold hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#5A5A40]/30"
                  >
                    {editingId ? 'Simpan Perubahan' : 'Simpan Petugas'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
