import { Router, Request, Response } from 'express';
import { pool } from './db';
import crypto from 'crypto';

const router = Router();

// ============================================
// AUTH
// ============================================
const sessions = new Map<string, { username: string; email: string; displayName: string; createdAt: number }>();

function getSessionFromReq(req: Request): { username: string; email: string; displayName: string } | null {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  return session;
}

router.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (username === 'ghr-super' && password === 'repus2602') {
    const token = crypto.randomUUID();
    sessions.set(token, {
      username: 'ghr-super',
      email: 'ghr-super@ghr.local',
      displayName: 'Super Admin GHR',
      createdAt: Date.now()
    });
    res.json({ 
      success: true, 
      token,
      user: {
        displayName: 'Super Admin GHR',
        email: 'ghr-super@ghr.local'
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Username atau password salah.' });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true });
});

router.get('/auth/me', (req: Request, res: Response) => {
  const session = getSessionFromReq(req);
  if (session) {
    res.json({ 
      loggedIn: true, 
      user: {
        displayName: session.displayName,
        email: session.email
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ============================================
// GENERIC CRUD HELPERS  
// ============================================
const VALID_TABLES = ['warga', 'warga_history', 'kategori', 'transaksi', 'tunggakan_macet', 'petugas', 'events', 'backups'] as const;
type ValidTable = typeof VALID_TABLES[number];

function isValidTable(name: string): name is ValidTable {
  return VALID_TABLES.includes(name as ValidTable);
}

// Column name mappings per table for safe SQL construction
const TABLE_COLUMNS: Record<ValidTable, string[]> = {
  warga: ['nama', 'noRumah', 'phone', 'status', 'statusHuni', 'statusHuniUpdatedAt', 'noRumahUpdatedAt', 'isIuranWajib', 'isIuranRT', 'role', 'createdAt'],
  warga_history: ['wargaId', 'noRumah', 'status', 'statusHuni', 'isIuranWajib', 'isIuranRT', 'role', 'effectiveFrom', 'effectiveTo', 'keterangan', 'createdAt'],
  kategori: ['nama', 'tipe', 'icon', 'createdAt'],
  transaksi: ['tanggal', 'keterangan', 'jumlah', 'tipe', 'kategoriId', 'wargaId', 'eventId', 'petugasId', 'picName', 'bulanIuran', 'isHistorical', 'createdAt'],
  tunggakan_macet: ['wargaId', 'nama', 'totalBulan', 'nominalPerBulan', 'totalTagihan', 'nominalBayar', 'sisa', 'keterangan', 'status', 'createdAt'],
  petugas: ['nama', 'jabatan', 'phone', 'status', 'sisaKasbon2025', 'createdAt'],
  events: ['nama', 'tanggal', 'budget', 'deskripsi', 'status', 'createdAt'],
  backups: ['timestamp', 'label', 'version', 'collections', 'createdAt'],
};

function quoteCol(col: string): string {
  // Quote column names that are camelCase or reserved
  const needsQuoting = /[A-Z]/.test(col) || ['timestamp', 'key', 'value', 'status'].includes(col);
  return needsQuoting ? `"${col}"` : col;
}

// ============================================
// SPECIAL: Update warga status + create history entry atomically
// POST /api/warga/:id/update-status
// ============================================
router.post('/warga/:id/update-status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    noRumah, status, statusHuni, isIuranWajib, isIuranRT,
    role, effectiveFrom, keterangan
  } = req.body;

  if (!noRumah || !status || !statusHuni || effectiveFrom === undefined) {
    res.status(400).json({ error: 'noRumah, status, statusHuni, effectiveFrom are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Close any currently-open history entry for this warga
    await client.query(
      `UPDATE warga_history
       SET "effectiveTo" = $1
       WHERE "wargaId" = $2 AND "effectiveTo" IS NULL`,
      [effectiveFrom, id]
    );

    // 2. Insert new history entry
    await client.query(
      `INSERT INTO warga_history
         (id, "wargaId", "noRumah", status, "statusHuni", "isIuranWajib", "isIuranRT", role, "effectiveFrom", "effectiveTo", keterangan, "createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10)`,
      [id, noRumah, status, statusHuni, isIuranWajib, isIuranRT, role || 'Pemilik', effectiveFrom, keterangan || '', Date.now()]
    );

    // 3. Update the warga record itself
    await client.query(
      `UPDATE warga
       SET "noRumah" = $1, status = $2, "statusHuni" = $3,
           "isIuranWajib" = $4, "isIuranRT" = $5, role = $6,
           "statusHuniUpdatedAt" = $7, "noRumahUpdatedAt" = $8
       WHERE id = $9`,
      [noRumah, status, statusHuni, isIuranWajib, isIuranRT, role || 'Pemilik', effectiveFrom, effectiveFrom, id]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('update-status error:', error);
    res.status(500).json({ error: 'Transaction failed', details: String(error) });
  } finally {
    client.release();
  }
});

// ============================================
// SPECIAL: Migrate historical data for warga (seed warga_history)
// POST /api/warga/migrate-history
// Body: { wargaId, entries: [{ noRumah, status, statusHuni, isIuranWajib, isIuranRT, effectiveFrom, effectiveTo, keterangan }] }
// ============================================
router.post('/warga/migrate-history', async (req: Request, res: Response) => {
  const { wargaId, entries } = req.body;
  if (!wargaId || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({ error: 'wargaId and entries[] are required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Delete existing history for this warga so migration is idempotent
    await client.query(`DELETE FROM warga_history WHERE "wargaId" = $1`, [wargaId]);

    for (const entry of entries) {
      await client.query(
        `INSERT INTO warga_history
           (id, "wargaId", "noRumah", status, "statusHuni", "isIuranWajib", "isIuranRT", "effectiveFrom", "effectiveTo", keterangan, "createdAt")
         VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          wargaId,
          entry.noRumah,
          entry.status,
          entry.statusHuni,
          entry.isIuranWajib,
          entry.isIuranRT,
          entry.effectiveFrom,
          entry.effectiveTo ?? null,
          entry.keterangan || '',
          Date.now()
        ]
      );
    }
    await client.query('COMMIT');
    res.json({ success: true, migrated: entries.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('migrate-history error:', error);
    res.status(500).json({ error: 'Migration failed', details: String(error) });
  } finally {
    client.release();
  }
});

// ============================================
// GET ALL - /api/:table
// ============================================
router.get('/:table', async (req: Request, res: Response) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} ORDER BY "createdAt" DESC`);
    res.json(result.rows);
  } catch (error) {
    console.error(`GET /${table} error:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// ============================================
// GET ONE - /api/:table/:id
// ============================================
router.get('/:table/:id', async (req: Request, res: Response) => {
  const { table, id } = req.params;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(`GET /${table}/${id} error:`, error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// ============================================
// CREATE - POST /api/:table
// ============================================
router.post('/:table', async (req: Request, res: Response) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    const data = req.body;
    const allowedCols = TABLE_COLUMNS[table];
    
    // Filter to only allowed columns that have values
    const entries = Object.entries(data).filter(([key]) => allowedCols.includes(key));
    
    // Add createdAt if not present
    if (!data.createdAt) {
      entries.push(['createdAt', Date.now()]);
    }

    // For backups, handle the collections field as JSONB
    const cols = entries.map(([key]) => quoteCol(key));
    const placeholders = entries.map((_, i) => {
      const [key] = entries[i];
      if (key === 'collections' && table === 'backups') {
        return `$${i + 1}::jsonb`;
      }
      return `$${i + 1}`;
    });
    const values = entries.map(([key, val]) => {
      if (key === 'collections' && table === 'backups' && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });

    // If we also want to allow specifying an ID (for restores)
    let query = '';
    if (data.id) {
      cols.unshift('id');
      placeholders.unshift(`$${values.length + 1}`);
      values.push(data.id);
      query = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
    } else {
      query = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`;
    }

    const result = await pool.query(query, values);
    res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error(`POST /${table} error:`, error);
    res.status(500).json({ error: 'Database insert failed', details: String(error) });
  }
});

// ============================================
// UPDATE - PUT /api/:table/:id
// ============================================
router.put('/:table/:id', async (req: Request, res: Response) => {
  const { table, id } = req.params;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    const data = req.body;
    const allowedCols = TABLE_COLUMNS[table];
    const entries = Object.entries(data).filter(([key]) => allowedCols.includes(key));

    if (entries.length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const setClauses = entries.map(([key], i) => {
      if (key === 'collections' && table === 'backups') {
        return `${quoteCol(key)} = $${i + 1}::jsonb`;
      }
      return `${quoteCol(key)} = $${i + 1}`;
    });
    const values = entries.map(([key, val]) => {
      if (key === 'collections' && table === 'backups' && typeof val === 'object') {
        return JSON.stringify(val);
      }
      return val;
    });
    values.push(id);

    const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${values.length}`;
    await pool.query(query, values);
    res.json({ success: true });
  } catch (error) {
    console.error(`PUT /${table}/${id} error:`, error);
    res.status(500).json({ error: 'Database update failed', details: String(error) });
  }
});

// ============================================
// DELETE - DELETE /api/:table/:id
// ============================================
router.delete('/:table/:id', async (req: Request, res: Response) => {
  const { table, id } = req.params;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    console.error(`DELETE /${table}/${id} error:`, error);
    res.status(500).json({ error: 'Database delete failed' });
  }
});

// ============================================
// BULK DELETE - POST /api/:table/bulk-delete
// ============================================
router.post('/:table/bulk-delete', async (req: Request, res: Response) => {
  const table = req.params.table;
  if (!isValidTable(table)) {
    res.status(400).json({ error: `Invalid table: ${table}` });
    return;
  }

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array required' });
      return;
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    await pool.query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error(`BULK DELETE /${table} error:`, error);
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// ============================================
// SETTINGS
// ============================================
router.get('/settings/all', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM global_settings');
    const settings: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (error) {
    console.error('GET /settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/settings/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    await pool.query(
      'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, String(value)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
