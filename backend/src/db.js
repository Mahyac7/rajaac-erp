// Koneksi database PostgreSQL (Supabase) memakai driver `pg`.
// Semua akses DB terpusat di sini. Ekspor:
//   - query(text, params)         -> jalankan 1 query, kembalikan { rows, rowCount }
//   - satu(text, params)          -> kembalikan baris pertama (atau undefined)
//   - semua(text, params)         -> kembalikan array semua baris
//   - denganTransaksi(async fn)   -> jalankan fn(client) dalam 1 transaksi (BEGIN/COMMIT/ROLLBACK)
//   - initSchema()                -> buat tabel bila belum ada
//
// Koneksi diambil dari env DATABASE_URL (connection string Supabase).
import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// pg mengembalikan NUMERIC (OID 1700) & BIGINT (OID 20) sebagai string.
// Parse ke number agar konsisten dengan perhitungan di frontend (PPN, total, dll).
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('⚠️  DATABASE_URL belum di-set. Salin .env.example menjadi .env lalu isi connection string Supabase.');
}

export const pool = new Pool({
  connectionString,
  // Supabase butuh SSL. rejectUnauthorized:false agar tidak perlu sertifikat lokal.
  ssl: connectionString && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
});

// Jalankan satu query.
export function query(text, params) {
  return pool.query(text, params);
}

// Ambil satu baris (atau undefined).
export async function satu(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0];
}

// Ambil semua baris.
export async function semua(text, params) {
  const { rows } = await pool.query(text, params);
  return rows;
}

// Jalankan sekumpulan operasi dalam satu transaksi.
// fn menerima objek client dengan method .query(text, params).
export async function denganTransaksi(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hasil = await fn(client);
    await client.query('COMMIT');
    return hasil;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Skema tabel (sintaks PostgreSQL).
// ---------------------------------------------------------------------------
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cabang (
      id          SERIAL PRIMARY KEY,
      nama        TEXT NOT NULL,
      alamat      TEXT,
      telepon     TEXT,
      dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      nama        TEXT NOT NULL,
      username    TEXT NOT NULL UNIQUE,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL CHECK (role IN ('admin','kasir')),
      cabang_id   INTEGER REFERENCES cabang(id),
      aktif       BOOLEAN NOT NULL DEFAULT TRUE,
      dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS produk (
      id          SERIAL PRIMARY KEY,
      sku         TEXT NOT NULL UNIQUE,
      nama        TEXT NOT NULL,
      kategori    TEXT,
      satuan      TEXT DEFAULT 'unit',
      harga_beli  NUMERIC NOT NULL DEFAULT 0,
      harga_jual  NUMERIC NOT NULL DEFAULT 0,
      dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stok (
      id         SERIAL PRIMARY KEY,
      produk_id  INTEGER NOT NULL REFERENCES produk(id),
      cabang_id  INTEGER NOT NULL REFERENCES cabang(id),
      jumlah     INTEGER NOT NULL DEFAULT 0,
      UNIQUE (produk_id, cabang_id)
    );

    CREATE TABLE IF NOT EXISTS invoice (
      id           SERIAL PRIMARY KEY,
      nomor        TEXT NOT NULL UNIQUE,
      cabang_id    INTEGER NOT NULL REFERENCES cabang(id),
      user_id      INTEGER REFERENCES users(id),
      nama_pembeli TEXT,
      subtotal     NUMERIC NOT NULL DEFAULT 0,
      persen_ppn   NUMERIC NOT NULL DEFAULT 11,
      nilai_ppn    NUMERIC NOT NULL DEFAULT 0,
      total        NUMERIC NOT NULL DEFAULT 0,
      dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pergerakan_stok (
      id          SERIAL PRIMARY KEY,
      produk_id   INTEGER NOT NULL REFERENCES produk(id),
      cabang_id   INTEGER NOT NULL REFERENCES cabang(id),
      tipe        TEXT NOT NULL CHECK (tipe IN ('masuk','keluar')),
      jumlah      INTEGER NOT NULL,
      keterangan  TEXT,
      user_id     INTEGER REFERENCES users(id),
      invoice_id  INTEGER REFERENCES invoice(id),
      dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invoice_item (
      id          SERIAL PRIMARY KEY,
      invoice_id  INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
      produk_id   INTEGER NOT NULL REFERENCES produk(id),
      nama_produk TEXT NOT NULL,
      sku         TEXT NOT NULL,
      harga       NUMERIC NOT NULL,
      jumlah      INTEGER NOT NULL,
      subtotal    NUMERIC NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pengaturan (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      nama_toko  TEXT,
      alamat     TEXT,
      telepon    TEXT,
      logo       TEXT,
      persen_ppn NUMERIC NOT NULL DEFAULT 11
    );

    -- Retur penjualan: barang dikembalikan pelanggan -> stok kembali.
    CREATE TABLE IF NOT EXISTS retur (
      id           SERIAL PRIMARY KEY,
      nomor        TEXT NOT NULL UNIQUE,
      invoice_id   INTEGER REFERENCES invoice(id),
      cabang_id    INTEGER NOT NULL REFERENCES cabang(id),
      user_id      INTEGER REFERENCES users(id),
      alasan       TEXT,
      total        NUMERIC NOT NULL DEFAULT 0,
      dibuat_pada  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS retur_item (
      id          SERIAL PRIMARY KEY,
      retur_id    INTEGER NOT NULL REFERENCES retur(id) ON DELETE CASCADE,
      produk_id   INTEGER NOT NULL REFERENCES produk(id),
      nama_produk TEXT NOT NULL,
      sku         TEXT NOT NULL,
      harga       NUMERIC NOT NULL,
      jumlah      INTEGER NOT NULL,
      subtotal    NUMERIC NOT NULL
    );

    -- Transfer stok antar cabang (hanya admin).
    CREATE TABLE IF NOT EXISTS transfer_stok (
      id             SERIAL PRIMARY KEY,
      nomor          TEXT NOT NULL UNIQUE,
      produk_id      INTEGER NOT NULL REFERENCES produk(id),
      cabang_asal    INTEGER NOT NULL REFERENCES cabang(id),
      cabang_tujuan  INTEGER NOT NULL REFERENCES cabang(id),
      jumlah         INTEGER NOT NULL,
      keterangan     TEXT,
      user_id        INTEGER REFERENCES users(id),
      dibuat_pada    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Pelanggan.
    CREATE TABLE IF NOT EXISTS pelanggan (
      id          SERIAL PRIMARY KEY,
      nama        TEXT NOT NULL,
      telepon     TEXT,
      alamat      TEXT,
      catatan     TEXT,
      dibuat_pada TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Garansi unit terjual (dibuat otomatis saat invoice).
    CREATE TABLE IF NOT EXISTS garansi (
      id            SERIAL PRIMARY KEY,
      invoice_id    INTEGER REFERENCES invoice(id) ON DELETE CASCADE,
      produk_id     INTEGER NOT NULL REFERENCES produk(id),
      nama_produk   TEXT NOT NULL,
      sku           TEXT NOT NULL,
      pelanggan_id  INTEGER REFERENCES pelanggan(id),
      nama_pembeli  TEXT,
      cabang_id     INTEGER REFERENCES cabang(id),
      mulai         DATE NOT NULL,
      habis         DATE NOT NULL,
      dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Jadwal servis / pemasangan.
    CREATE TABLE IF NOT EXISTS jadwal_servis (
      id            SERIAL PRIMARY KEY,
      tanggal       DATE NOT NULL,
      jenis         TEXT NOT NULL CHECK (jenis IN ('pasang','servis')),
      pelanggan_id  INTEGER REFERENCES pelanggan(id),
      nama_pelanggan TEXT,
      telepon       TEXT,
      alamat        TEXT,
      teknisi       TEXT,
      catatan       TEXT,
      status        TEXT NOT NULL DEFAULT 'dijadwalkan' CHECK (status IN ('dijadwalkan','selesai','batal')),
      cabang_id     INTEGER REFERENCES cabang(id),
      user_id       INTEGER REFERENCES users(id),
      dibuat_pada   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Tambah kolom pada tabel yang sudah ada (aman untuk DB produksi existing).
  await pool.query(`
    ALTER TABLE produk     ADD COLUMN IF NOT EXISTS garansi_bulan INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE invoice    ADD COLUMN IF NOT EXISTS metode_bayar TEXT NOT NULL DEFAULT 'tunai';
    ALTER TABLE invoice    ADD COLUMN IF NOT EXISTS pelanggan_id INTEGER REFERENCES pelanggan(id);
    ALTER TABLE pengaturan ADD COLUMN IF NOT EXISTS batas_stok INTEGER NOT NULL DEFAULT 5;
  `);
}

export default pool;
