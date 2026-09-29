// Route stok: lihat stok per cabang, catat pergerakan masuk/keluar, riwayat.
import { Router } from 'express';
import db from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

// Kasir hanya boleh cabangnya sendiri; admin bisa pilih cabang mana saja.
function resolveCabang(req, cabangIdInput) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return cabangIdInput ? Number(cabangIdInput) : null;
}

// Stok per cabang
router.get('/', (req, res) => {
  const cabangId = resolveCabang(req, req.query.cabang_id);
  if (!cabangId) return res.status(400).json({ pesan: 'cabang_id wajib dipilih.' });
  const rows = db
    .prepare(
      `SELECT p.id AS produk_id, p.sku, p.nama, p.kategori, p.satuan, p.harga_jual,
              COALESCE(s.jumlah,0) AS jumlah
       FROM produk p
       LEFT JOIN stok s ON s.produk_id = p.id AND s.cabang_id = ?
       ORDER BY p.nama`
    )
    .all(cabangId);
  res.json(rows);
});

// Catat pergerakan stok (masuk/keluar)
router.post('/pergerakan', (req, res) => {
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

  const trx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO stok (produk_id, cabang_id, jumlah) VALUES (?,?,0)').run(produk_id, cabangId);
    const stok = db.prepare('SELECT jumlah FROM stok WHERE produk_id = ? AND cabang_id = ?').get(produk_id, cabangId);
    let baru = stok.jumlah + (tipe === 'masuk' ? qty : -qty);
    if (baru < 0) throw new Error('Stok tidak mencukupi untuk barang keluar.');
    db.prepare('UPDATE stok SET jumlah = ? WHERE produk_id = ? AND cabang_id = ?').run(baru, produk_id, cabangId);
    db.prepare(
      'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id) VALUES (?,?,?,?,?,?)'
    ).run(produk_id, cabangId, tipe, qty, keterangan || null, req.user.id);
    return baru;
  });

  try {
    const stokBaru = trx();
    res.status(201).json({ pesan: 'Pergerakan stok dicatat.', stok: stokBaru });
  } catch (e) {
    res.status(400).json({ pesan: e.message });
  }
});

// Riwayat pergerakan
router.get('/riwayat', (req, res) => {
  const cabangId = resolveCabang(req, req.query.cabang_id);
  const params = [];
  let where = '';
  if (cabangId) { where = 'WHERE ps.cabang_id = ?'; params.push(cabangId); }
  const rows = db
    .prepare(
      `SELECT ps.*, p.nama AS produk_nama, p.sku, c.nama AS cabang_nama, u.nama AS user_nama
       FROM pergerakan_stok ps
       JOIN produk p ON p.id = ps.produk_id
       JOIN cabang c ON c.id = ps.cabang_id
       LEFT JOIN users u ON u.id = ps.user_id
       ${where}
       ORDER BY ps.id DESC LIMIT 200`
    )
    .all(...params);
  res.json(rows);
});

export default router;
