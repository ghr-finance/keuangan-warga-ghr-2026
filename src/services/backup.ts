import { dbService } from './db';
import { format } from 'date-fns';

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

    // 1. Clear current data by fetching all and deleting
    const collectionNames = ['warga', 'transaksi', 'kategori', 'events', 'tunggakan_macet', 'petugas'];
    
    for (const name of collectionNames) {
      const items = await dbService.getAll(name) as any[];
      if (items && items.length > 0) {
        // Use bulk delete via API
        const ids = items.map(item => item.id);
        try {
          const token = localStorage.getItem('auth_token');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          
          await fetch(`/api/${name}/bulk-delete`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ids }),
          });
        } catch (err) {
          // Fallback: delete one by one
          for (const item of items) {
            await dbService.delete(name, item.id);
          }
        }
      }
    }

    // 2. Restore data (Preserving IDs for associations)
    const restoreCol = async (name: string, data: any[]) => {
      for (const item of data) {
        const { ...itemData } = item;
        await dbService.add(name, itemData);
      }
    };

    await restoreCol('warga', backup.collections.warga);
    await restoreCol('kategori', backup.collections.kategori);
    await restoreCol('transaksi', backup.collections.transaksi);
    await restoreCol('events', backup.collections.events);
    await restoreCol('tunggakan_macet', backup.collections.tunggakan_macet);
    await restoreCol('petugas', backup.collections.petugas);

    console.log('Restore completed successfully.');
    
    window.location.reload();
  }
};
