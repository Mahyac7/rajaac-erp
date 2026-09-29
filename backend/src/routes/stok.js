// Route stok: lihat stok per cabang, catat pergerakan masuk/keluar, riwayat.
import { Router } from 'express';
import { satu, semua, denganTransaksi } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

// Kasir hanya boleh cabangnya sendiri; admin bisa pilih cabang mana saja.
function resolveCabang(req, cabangIdInput) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return cabangIdInput ? Number(cabangIdInput) : null;
}

// Stok per cabang
router.get('/', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req, req.query.cabang_id);
    if (!cabangId) return res.status(400).json({ pesan: 'cabang_id wajib dipilih.' });
    const rows = await semua(
      `SELECT p.id AS produk_id, p.sku, p.nama, p.kategori, p.satuan, p.harga_jual,
              COALESCE(s.jumlah,0) AS jumlah
       FROM produk p
       LEFT JOIN stok s ON s.produk_id = p.id AND s.cabang_id = $1
       ORDER BY p.nama`,
      [cabangId]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// Catat pergerakan stok (masuk/keluar)
router.post('/pergerakan', async (req, res, next) => {
  try {
    const { produk_id, tipe, jumlah, keterangan } = req.body || {};
    const cabangId = resolveCabang(req, req.body.cabang_id);
    if (!produk_id || !tipe || !jumlah || !cabangId) {
      return res.status(400).json({ pesan: 'produk_id, tipe, jumlah, dan cabang wajib diisi.' });
    }
    if (!['masuk', 'keluar'].includes(tipe)) {
      return res.status(400).json({ pesan: 'Tipe harus masuk atau keluar.' });
    }
    const qty = Number(jumlah);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ pesan: 'Jumlah harus bilangan bulat positif.' });
    }

    const stokBaru = await denganTransaksi(async (client) => {
      await client.query(
        'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES ($1,$2,0) ON CONFLICT (produk_id, cabang_id) DO NOTHING',
        [produk_id, cabangId]
      );
      // Kunci baris stok agar aman dari race condition antar cabang/user.
      const { rows } = await client.query(
        'SELECT jumlah FROM stok WHERE produk_id = $1 AND cabang_id = $2 FOR UPDATE',
        [produk_id, cabangId]
      );
      const baru = rows[0].jumlah + (tipe === 'masuk' ? qty : -qty);
      if (baru < 0) throw new Error('Stok tidak mencukupi untuk barang keluar.');
      await client.query('UPDATE stok SET jumlah = $1 WHERE produk_id = $2 AND cabang_id = $3', [baru, produk_id, cabangId]);
      await client.query(
        'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [produk_id, cabangId, tipe, qty, keterangan || null, req.user.id]
      );
      return baru;
    });

    res.status(201).json({ pesan: 'Pergerakan stok dicatat.', stok: stokBaru });
  } catch (e) {
    if (e.message && e.message.includes('Stok tidak mencukupi')) {
      return res.status(400).json({ pesan: e.message });
    }
    next(e);
  }
});

// Riwayat pergerakan
router.get('/riwayat', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req, req.query.cabang_id);
    const params = [];
    let where = '';
    if (cabangId) { where = 'WHERE ps.cabang_id = $1'; params.push(cabangId); }
    const rows = await semua(
      `SELECT ps.*, p.nama AS produk_nama, p.sku, c.nama AS cabang_nama, u.nama AS user_nama
       FROM pergerakan_stok ps
       JOIN produk p ON p.id = ps.produk_id
       JOIN cabang c ON c.id = ps.cabang_id
       LEFT JOIN users u ON u.id = ps.user_id
       ${where}
       ORDER BY ps.id DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
