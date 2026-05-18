import React, { useState } from 'react';
import KategoriList from './Kategori';
import BackupRegistry from './BackupRegistry';
import { Tag, Database, Settings } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Pengaturan() {
  const [activeSubTab, setActiveSubTab] = useState<'kategori' | 'backup'>('kategori');

  const tabs = [
    { id: 'kategori', label: 'Kelola Kategori', icon: Tag },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[#5A5A40] rounded-xl">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#3A3A2A]">Pengaturan</h1>
          </div>
          <p className="text-[#A3A375] font-medium">Konfigurasi aplikasi dan pemeliharaan basis data.</p>
        </div>

        <div className="flex bg-[#E5E5DA]/50 p-1.5 rounded-[22px] border border-[#E5E5DA]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                activeSubTab === tab.id 
                  ? "bg-white text-[#5A5A40] shadow-md shadow-[#3A3A2A]/5" 
                  : "text-[#A3A375] hover:text-[#5A5A40]"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeSubTab === tab.id ? "text-[#5A5A40]" : "text-[#A3A375]")} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'kategori' && <KategoriList />}
          {activeSubTab === 'backup' && <BackupRegistry />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
