// Route pelanggan (CRUD). Semua user login boleh lihat & tambah (untuk transaksi).
import { Router } from 'express';
import { satu, semua, query } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

router.get('/', async (req, res, next) => {
  try {
    const cari = req.query.cari ? `%${req.query.cari}%` : null;
    const rows = cari
      ? await semua('SELECT * FROM pelanggan WHERE nama ILIKE $1 OR telepon ILIKE $1 ORDER BY nama LIMIT 200', [cari])
      : await semua('SELECT * FROM pelanggan ORDER BY nama LIMIT 200');
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { nama, telepon, alamat, catatan } = req.body || {};
    if (!nama) return res.status(400).json({ pesan: 'Nama pelanggan wajib diisi.' });
    const row = await satu(
      'INSERT INTO pelanggan (nama, telepon, alamat, catatan) VALUES ($1,$2,$3,$4) RETURNING *',
      [nama, telepon || null, alamat || null, catatan || null]
    );
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { nama, telepon, alamat, catatan } = req.body || {};
    const ada = await satu('SELECT * FROM pelanggan WHERE id = $1', [req.params.id]);
    if (!ada) return res.status(404).json({ pesan: 'Pelanggan tidak ditemukan.' });
    const row = await satu(
      'UPDATE pelanggan SET nama=$1, telepon=$2, alamat=$3, catatan=$4 WHERE id=$5 RETURNING *',
      [nama ?? ada.nama, telepon ?? ada.telepon, alamat ?? ada.alamat, catatan ?? ada.catatan, req.params.id]
    );
    res.json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM pelanggan WHERE id = $1', [req.params.id]);
    res.json({ pesan: 'Pelanggan dihapus.' });
  } catch (e) {
    // Bila masih dipakai invoice/garansi, FK akan menolak.
    if (e.code === '23503') {
      return res.status(400).json({ pesan: 'Pelanggan tidak bisa dihapus karena masih terkait transaksi.' });
    }
    next(e);
  }
});

// Detail + riwayat pembelian & garansi milik pelanggan.
router.get('/:id', async (req, res, next) => {
  try {
    const p = await satu('SELECT * FROM pelanggan WHERE id = $1', [req.params.id]);
    if (!p) return res.status(404).json({ pesan: 'Pelanggan tidak ditemukan.' });
    p.invoice = await semua(
      'SELECT id, nomor, total, dibuat_pada FROM invoice WHERE pelanggan_id = $1 ORDER BY id DESC LIMIT 50',
      [req.params.id]
    );
    p.garansi = await semua(
      'SELECT id, nama_produk, sku, mulai, habis FROM garansi WHERE pelanggan_id = $1 ORDER BY habis DESC',
      [req.params.id]
    );
    res.json(p);
  } catch (e) { next(e); }
});

export default router;
