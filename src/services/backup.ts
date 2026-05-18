import { dbService } from './db';
import { format } from 'date-fns';
import { doc, setDoc, collection, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface BackupData {
  id?: string;
  timestamp: number;
  label: string;
  version: string;
  collections: {
    warga: any[];
    transaksi: any[];
    kategori: any[];
    events: any[];
    tunggakan_macet: any[];
    petugas: any[];
  };
}

export const backupService = {
  async createBackup(label: string = 'Manual Backup'): Promise<string> {
    console.log(`Starting backup: ${label}...`);
    
    const [warga, transaksi, kategori, events, tunggakan_macet, petugas] = await Promise.all([
      dbService.getAll('warga'),
      dbService.getAll('transaksi'),
      dbService.getAll('kategori'),
      dbService.getAll('events'),
      dbService.getAll('tunggakan_macet'),
      dbService.getAll('petugas'),
    ]);

    const backup: Omit<BackupData, 'id'> = JSON.parse(JSON.stringify({
      timestamp: Date.now(),
      label,
      version: format(new Date(), 'yyyyMMdd-HHmm'),
      collections: {
        warga: warga || [],
        transaksi: transaksi || [],
        kategori: kategori || [],
        events: events || [],
        tunggakan_macet: tunggakan_macet || [],
        petugas: petugas || [],
      }
    }));

    const backupId = await dbService.add('backups', backup);
    console.log(`Backup completed with ID: ${backupId}`);
    return backupId!;
  },

  async listBackups() {
    const backups = await dbService.getAll('backups');
    return (backups || []).sort((a: any, b: any) => b.timestamp - a.timestamp);
  },

  async restoreBackup(backupId: string) {
    const backups = await dbService.getAll('backups') as BackupData[];
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) throw new Error('Backup not found');

    console.log(`Restoring backup: ${backup.label} (${backup.version})...`);

    // 1. Clear current data
    const collectionNames = ['warga', 'transaksi', 'kategori', 'events', 'tunggakan_macet', 'petugas'];
    
    for (const name of collectionNames) {
      const q = await getDocs(collection(db, name));
      await Promise.all(q.docs.map(d => deleteDoc(doc(db, name, d.id))));
    }

    // 2. Restore data (Preserving IDs for associations)
    const restorePromises: Promise<any>[] = [];

    const restoreCol = (name: string, data: any[]) => {
      data.forEach(item => {
        const { id, ...cleanData } = item;
        if (id) {
          restorePromises.push(setDoc(doc(db, name, id), cleanData));
        }
      });
    };

    restoreCol('warga', backup.collections.warga);
    restoreCol('transaksi', backup.collections.transaksi);
    restoreCol('kategori', backup.collections.kategori);
    restoreCol('events', backup.collections.events);
    restoreCol('tunggakan_macet', backup.collections.tunggakan_macet);
    restoreCol('petugas', backup.collections.petugas);

    await Promise.all(restorePromises);
    console.log('Restore completed successfully.');
    
    window.location.reload();
  }
};
