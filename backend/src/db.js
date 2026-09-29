// Koneksi database SQLite + inisialisasi skema.
// Arsitektur dibuat lewat satu modul ini supaya mudah diganti ke PostgreSQL nanti
// (cukup ganti driver & sesuaikan query). Lihat README bagian "Migrasi ke PostgreSQL".
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'erp.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Skema tabel
// ---------------------------------------------------------------------------
export function initSchema() {
  db.exec(`
    -- Cabang toko
    CREATE TABLE IF NOT EXISTS cabang (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      alamat     TEXT,
      telepon    TEXT,
      dibuat_pada TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Pengguna (admin / kasir). Kasir terikat ke satu cabang.
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nama       TEXT NOT NULL,
      username   TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,               -- hash bcrypt
      role       TEXT NOT NULL CHECK (role IN ('admin','kasir')),
      cabang_id  INTEGER REFERENCES cabang(id),
      aktif      INTEGER NOT NULL DEFAULT 1,
      dibuat_pada TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Produk (AC & sparepart). SKU unik dipakai untuk QR code.
    CREATE TABLE IF NOT EXISTS produk (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      sku          TEXT NOT NULL UNIQUE,
      nama         TEXT NOT NULL,
      kategori     TEXT,
      satuan       TEXT DEFAULT 'unit',
      harga_beli   REAL NOT NULL DEFAULT 0,
      harga_jual   REAL NOT NULL DEFAULT 0,
      dibuat_pada  TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Stok per produk per cabang.
    CREATE TABLE IF NOT EXISTS stok (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      produk_id  INTEGER NOT NULL REFERENCES produk(id),
      cabang_id  INTEGER NOT NULL REFERENCES cabang(id),
      jumlah     INTEGER NOT NULL DEFAULT 0,
      UNIQUE (produk_id, cabang_id)
    );

    -- Pergerakan stok: masuk (restock) / keluar (penjualan/penyesuaian).
    CREATE TABLE IF NOT EXISTS pergerakan_stok (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      produk_id   INTEGER NOT NULL REFERENCES produk(id),
      cabang_id   INTEGER NOT NULL REFERENCES cabang(id),
      tipe        TEXT NOT NULL CHECK (tipe IN ('masuk','keluar')),
      jumlah      INTEGER NOT NULL,
      keterangan  TEXT,
      user_id     INTEGER REFERENCES users(id),
      invoice_id  INTEGER REFERENCES invoice(id),
      dibuat_pada TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Invoice penjualan.
    CREATE TABLE IF NOT EXISTS invoice (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor         TEXT NOT NULL UNIQUE,
      cabang_id     INTEGER NOT NULL REFERENCES cabang(id),
      user_id       INTEGER REFERENCES users(id),
      nama_pembeli  TEXT,
      subtotal      REAL NOT NULL DEFAULT 0,
      persen_ppn    REAL NOT NULL DEFAULT 11,
      nilai_ppn     REAL NOT NULL DEFAULT 0,
      total         REAL NOT NULL DEFAULT 0,
      dibuat_pada   TEXT DEFAULT (datetime('now','localtime'))
    );

    -- Item pada invoice.
    CREATE TABLE IF NOT EXISTS invoice_item (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  INTEGER NOT NULL REFERENCES invoice(id) ON DELETE CASCADE,
      produk_id   INTEGER NOT NULL REFERENCES produk(id),
      nama_produk TEXT NOT NULL,
      sku         TEXT NOT NULL,
      harga       REAL NOT NULL,
      jumlah      INTEGER NOT NULL,
      subtotal    REAL NOT NULL
    );

    -- Pengaturan toko (nama, alamat, logo) - satu baris.
    CREATE TABLE IF NOT EXISTS pengaturan (
      id         INTEGER PRIMARY KEY CHECK (id = 1),
      nama_toko  TEXT,
      alamat     TEXT,
      telepon    TEXT,
      logo       TEXT,                -- data URL (base64)
      persen_ppn REAL NOT NULL DEFAULT 11
    );
  `);
}

export default db;
