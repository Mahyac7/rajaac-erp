// Route produk. Lihat: semua user. Tambah/ubah: admin.
// Termasuk pencarian by SKU (dipakai fitur scan QR).
import { Router } from 'express';
import db from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

// Daftar produk + total stok (opsional per cabang via ?cabang_id=)
router.get('/', (req, res) => {
  const cabangId = req.query.cabang_id ? Number(req.query.cabang_id) : null;
  const produk = db.prepare('SELECT * FROM produk ORDER BY nama').all();
  const stokStmt = cabangId
    ? db.prepare('SELECT jumlah FROM stok WHERE produk_id = ? AND cabang_id = ?')
    : db.prepare('SELECT COALESCE(SUM(jumlah),0) jumlah FROM stok WHERE produk_id = ?');
  const hasil = produk.map((p) => {
    const row = cabangId ? stokStmt.get(p.id, cabangId) : stokStmt.get(p.id);
    return { ...p, stok: row ? row.jumlah : 0 };
  });
  res.json(hasil);
});

// Cari 1 produk berdasarkan SKU (untuk hasil scan QR)
router.get('/sku/:sku', (req, res) => {
  const produk = db.prepare('SELECT * FROM produk WHERE sku = ?').get(req.params.sku);
  if (!produk) return res.status(404).json({ pesan: 'Produk dengan SKU tersebut tidak ditemukan.' });
  const cabangId = req.query.cabang_id ? Number(req.query.cabang_id) : req.user.cabang_id;
  let stok = 0;
  if (cabangId) {
    const row = db.prepare('SELECT jumlah FROM stok WHERE produk_id = ? AND cabang_id = ?').get(produk.id, cabangId);
    stok = row ? row.jumlah : 0;
  }
  res.json({ ...produk, stok });
});

router.post('/', izinkan('admin'), (req, res) => {
  const { sku, nama, kategori, satuan, harga_beli, harga_jual } = req.body || {};
  if (!sku || !nama) return res.status(400).json({ pesan: 'SKU dan nama wajib diisi.' });
  const ada = db.prepare('SELECT id FROM produk WHERE sku = ?').get(sku);
  if (ada) return res.status(409).json({ pesan: 'SKU sudah dipakai.' });
  const info = db
    .prepare('INSERT INTO produk (sku, nama, kategori, satuan, harga_beli, harga_jual) VALUES (?,?,?,?,?,?)')
    .run(sku, nama, kategori || null, satuan || 'unit', harga_beli || 0, harga_jual || 0);
  // Inisialisasi stok 0 di semua cabang
  const cabang = db.prepare('SELECT id FROM cabang').all();
  const insStok = db.prepare('INSERT OR IGNORE INTO stok (produk_id, cabang_id, jumlah) VALUES (?,?,0)');
  for (const c of cabang) insStok.run(info.lastInsertRowid, c.id);
  res.status(201).json(db.prepare('SELECT * FROM produk WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', izinkan('admin'), (req, res) => {
  const { sku, nama, kategori, satuan, harga_beli, harga_jual } = req.body || {};
  const p = db.prepare('SELECT * FROM produk WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ pesan: 'Produk tidak ditemukan.' });
  db.prepare(
    'UPDATE produk SET sku=?, nama=?, kategori=?, satuan=?, harga_beli=?, harga_jual=? WHERE id=?'
  ).run(
    sku ?? p.sku, nama ?? p.nama, kategori ?? p.kategori, satuan ?? p.satuan,
    harga_beli ?? p.harga_beli, harga_jual ?? p.harga_jual, req.params.id
  );
  res.json(db.prepare('SELECT * FROM produk WHERE id = ?').get(req.params.id));
});

export default router;
