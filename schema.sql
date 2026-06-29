-- Keuangan Warga GHR - PostgreSQL Schema
-- Migration from Firebase Firestore

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- WARGA (Residents)
-- ============================================
CREATE TABLE IF NOT EXISTS warga (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama TEXT NOT NULL,
  "noRumah" TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif', 'Pindah')),
  "statusHuni" TEXT NOT NULL DEFAULT 'Menghuni' CHECK ("statusHuni" IN ('Menghuni', 'Tidak Menghuni', 'Keluar')),
  "statusHuniUpdatedAt" BIGINT DEFAULT 0,
  "noRumahUpdatedAt" BIGINT DEFAULT 0,
  "isIuranWajib" BOOLEAN NOT NULL DEFAULT true,
  "isIuranRT" BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'Pemilik' CHECK (role IN ('Pemilik', 'Penyewa')),
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- WARGA_HISTORY (Resident Status History)
-- Tracks every significant change in a resident's status over time:
-- ownership (noRumah), active status, occupancy, and iuran participation.
-- ============================================
CREATE TABLE IF NOT EXISTS warga_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "wargaId" TEXT NOT NULL,
  "noRumah" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif', 'Pindah')),
  "statusHuni" TEXT NOT NULL DEFAULT 'Menghuni' CHECK ("statusHuni" IN ('Menghuni', 'Tidak Menghuni', 'Keluar')),
  "isIuranWajib" BOOLEAN NOT NULL DEFAULT true,
  "isIuranRT" BOOLEAN NOT NULL DEFAULT false,
  role TEXT NOT NULL DEFAULT 'Pemilik' CHECK (role IN ('Pemilik', 'Penyewa')),
  "effectiveFrom" BIGINT NOT NULL,
  "effectiveTo" BIGINT,
  keterangan TEXT DEFAULT '',
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_warga_history_wargaid ON warga_history ("wargaId");
CREATE INDEX IF NOT EXISTS idx_warga_history_effective ON warga_history ("effectiveFrom", "effectiveTo");

-- ============================================
-- KATEGORI (Categories)
-- ============================================
CREATE TABLE IF NOT EXISTS kategori (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
  icon TEXT DEFAULT 'Package',
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- TRANSAKSI (Transactions)
-- ============================================
CREATE TABLE IF NOT EXISTS transaksi (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tanggal BIGINT NOT NULL,
  keterangan TEXT NOT NULL DEFAULT '',
  jumlah BIGINT NOT NULL DEFAULT 0,
  tipe TEXT NOT NULL CHECK (tipe IN ('pemasukan', 'pengeluaran')),
  "kategoriId" TEXT,
  "wargaId" TEXT,
  "eventId" TEXT,
  "petugasId" TEXT,
  "picName" TEXT,
  "bulanIuran" TEXT,
  "isHistorical" BOOLEAN DEFAULT false,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- TUNGGAKAN_MACET (Bad Debts / Arrears)
-- ============================================
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
  status TEXT NOT NULL DEFAULT 'Macet' CHECK (status IN ('Lunas', 'Belum Lunas', 'Macet')),
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- PETUGAS (Officers / Staff)
-- ============================================
CREATE TABLE IF NOT EXISTS petugas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL DEFAULT '',
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Non-Aktif')),
  "sisaKasbon2025" BIGINT DEFAULT 0,
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nama TEXT NOT NULL,
  tanggal BIGINT NOT NULL,
  budget BIGINT NOT NULL DEFAULT 0,
  deskripsi TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Berjalan' CHECK (status IN ('Berjalan', 'Selesai')),
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- BACKUPS
-- ============================================
CREATE TABLE IF NOT EXISTS backups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp BIGINT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  collections JSONB NOT NULL DEFAULT '{}',
  "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================
-- GLOBAL SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default settings
INSERT INTO global_settings (key, value) VALUES ('iuranBulanan', '200000')
ON CONFLICT (key) DO NOTHING;
