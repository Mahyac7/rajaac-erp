// Route produk. Lihat: semua user. Tambah/ubah: admin.
// Termasuk pencarian by SKU (dipakai fitur scan QR).
import { Router } from 'express';
import { satu, semua, query } from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

// Daftar produk + total stok (opsional per cabang via ?cabang_id=)
router.get('/', async (req, res, next) => {
  try {
    const cabangId = req.query.cabang_id ? Number(req.query.cabang_id) : null;
    let rows;
    if (cabangId) {
      rows = await semua(
        `SELECT p.*, COALESCE(s.jumlah, 0) AS stok
         FROM produk p
         LEFT JOIN stok s ON s.produk_id = p.id AND s.cabang_id = $1
         ORDER BY p.nama`,
        [cabangId]
      );
    } else {
      rows = await semua(
        `SELECT p.*, COALESCE((SELECT SUM(jumlah) FROM stok WHERE produk_id = p.id), 0) AS stok
         FROM produk p
         ORDER BY p.nama`
      );
    }
    res.json(rows);
  } catch (e) { next(e); }
});

// Cari 1 produk berdasarkan SKU (untuk hasil scan QR)
router.get('/sku/:sku', async (req, res, next) => {
  try {
    const produk = await satu('SELECT * FROM produk WHERE sku = $1', [req.params.sku]);
    if (!produk) return res.status(404).json({ pesan: 'Produk dengan SKU tersebut tidak ditemukan.' });
    const cabangId = req.query.cabang_id ? Number(req.query.cabang_id) : req.user.cabang_id;
    let stok = 0;
    if (cabangId) {
      const row = await satu('SELECT jumlah FROM stok WHERE produk_id = $1 AND cabang_id = $2', [produk.id, cabangId]);
      stok = row ? row.jumlah : 0;
    }
    res.json({ ...produk, stok });
  } catch (e) { next(e); }
});

router.post('/', izinkan('admin'), async (req, res, next) => {
  try {
    const { sku, nama, kategori, satuan, harga_beli, harga_jual } = req.body || {};
    if (!sku || !nama) return res.status(400).json({ pesan: 'SKU dan nama wajib diisi.' });
    const ada = await satu('SELECT id FROM produk WHERE sku = $1', [sku]);
    if (ada) return res.status(409).json({ pesan: 'SKU sudah dipakai.' });
    const produk = await satu(
      'INSERT INTO produk (sku, nama, kategori, satuan, harga_beli, harga_jual) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [sku, nama, kategori || null, satuan || 'unit', harga_beli || 0, harga_jual || 0]
    );
    // Inisialisasi stok 0 di semua cabang
    await query(
      `INSERT INTO stok (produk_id, cabang_id, jumlah)
       SELECT $1, id, 0 FROM cabang
       ON CONFLICT (produk_id, cabang_id) DO NOTHING`,
      [produk.id]
    );
    res.status(201).json(produk);
  } catch (e) { next(e); }
});

router.put('/:id', izinkan('admin'), async (req, res, next) => {
  try {
    const { sku, nama, kategori, satuan, harga_beli, harga_jual } = req.body || {};
    const p = await satu('SELECT * FROM produk WHERE id = $1', [req.params.id]);
    if (!p) return res.status(404).json({ pesan: 'Produk tidak ditemukan.' });
    const row = await satu(
      'UPDATE produk SET sku=$1, nama=$2, kategori=$3, satuan=$4, harga_beli=$5, harga_jual=$6 WHERE id=$7 RETURNING *',
      [
        sku ?? p.sku, nama ?? p.nama, kategori ?? p.kategori, satuan ?? p.satuan,
        harga_beli ?? p.harga_beli, harga_jual ?? p.harga_jual, req.params.id,
      ]
    );
    res.json(row);
  } catch (e) { next(e); }
});

export default router;
