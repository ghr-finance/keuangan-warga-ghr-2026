import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Parse BIGINT (INT8, OID 20) as javascript number
pg.types.setTypeParser(20, (val) => parseInt(val, 10));

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('PostgreSQL (Neon) connection successful');
    return true;
  } catch (error) {
    console.error('PostgreSQL connection error:', error);
    return false;
  }
}

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS warga (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nama TEXT NOT NULL,
        "noRumah" TEXT NOT NULL,
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'Aktif',
        "statusHuni" TEXT NOT NULL DEFAULT 'Menghuni',
        "statusHuniUpdatedAt" BIGINT DEFAULT 0,
        "noRumahUpdatedAt" BIGINT DEFAULT 0,
        "isIuranWajib" BOOLEAN NOT NULL DEFAULT true,
        "isIuranRT" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    // Migrations: add new columns to existing tables without dropping data
    await client.query(`ALTER TABLE warga ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Pemilik'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS warga_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "wargaId" TEXT NOT NULL,
        "noRumah" TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Aktif',
        "statusHuni" TEXT NOT NULL DEFAULT 'Menghuni',
        "isIuranWajib" BOOLEAN NOT NULL DEFAULT true,
        "isIuranRT" BOOLEAN NOT NULL DEFAULT false,
        role TEXT NOT NULL DEFAULT 'Pemilik',
        "effectiveFrom" BIGINT NOT NULL,
        "effectiveTo" BIGINT,
        keterangan TEXT DEFAULT '',
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_warga_history_wargaid ON warga_history ("wargaId")`);
    await client.query(`ALTER TABLE warga_history ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'Pemilik'`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kategori (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nama TEXT NOT NULL,
        tipe TEXT NOT NULL,
        icon TEXT DEFAULT 'Package',
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transaksi (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tanggal BIGINT NOT NULL,
        keterangan TEXT NOT NULL DEFAULT '',
        jumlah BIGINT NOT NULL DEFAULT 0,
        tipe TEXT NOT NULL,
        "kategoriId" TEXT,
        "wargaId" TEXT,
        "eventId" TEXT,
        "petugasId" TEXT,
        "picName" TEXT,
        "bulanIuran" TEXT,
        "isHistorical" BOOLEAN DEFAULT false,
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tunggakan_macet (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "wargaId" TEXT NOT NULL,
        nama TEXT NOT NULL,
        "totalBulan" INTEGER NOT NULL DEFAULT 0,
        "nominalPerBulan" BIGINT NOT NULL DEFAULT 0,
        "totalTagihan" BIGINT NOT NULL DEFAULT 0,
        "nominalBayar" BIGINT NOT NULL DEFAULT 0,
        sisa BIGINT NOT NULL DEFAULT 0,
        keterangan TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Macet',
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS petugas (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nama TEXT NOT NULL,
        jabatan TEXT NOT NULL DEFAULT '',
        phone TEXT,
        status TEXT NOT NULL DEFAULT 'Aktif',
        "sisaKasbon2025" BIGINT DEFAULT 0,
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        nama TEXT NOT NULL,
        tanggal BIGINT NOT NULL,
        budget BIGINT NOT NULL DEFAULT 0,
        deskripsi TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'Berjalan',
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        timestamp BIGINT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        collections JSONB NOT NULL DEFAULT '{}',
        "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    await client.query(`
      INSERT INTO global_settings (key, value) VALUES ('iuranBulanan', '200000')
      ON CONFLICT (key) DO NOTHING
    `);

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { pool };
