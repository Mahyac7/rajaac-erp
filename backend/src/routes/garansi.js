// Route garansi: daftar garansi unit terjual + status otomatis.
// Status: aktif (habis > 30 hari lagi), hampir_habis (<= 30 hari), kadaluarsa (lewat).
import { Router } from 'express';
import { semua } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return req.query.cabang_id ? Number(req.query.cabang_id) : null;
}

router.get('/', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req);
    const params = [];
    const cond = [];
    if (cabangId) { params.push(cabangId); cond.push(`g.cabang_id = $${params.length}`); }
    if (req.query.cari) { params.push(`%${req.query.cari}%`); cond.push(`(g.nama_produk ILIKE $${params.length} OR g.sku ILIKE $${params.length} OR g.nama_pembeli ILIKE $${params.length})`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = await semua(
      `SELECT g.id, g.nama_produk, g.sku, g.nama_pembeli, g.mulai, g.habis,
              i.nomor AS invoice_nomor, c.nama AS cabang_nama, pl.nama AS pelanggan_nama,
              (g.habis - CURRENT_DATE) AS sisa_hari,
              CASE
                WHEN g.habis < CURRENT_DATE THEN 'kadaluarsa'
                WHEN g.habis <= CURRENT_DATE + INTERVAL '30 days' THEN 'hampir_habis'
                ELSE 'aktif'
              END AS status
       FROM garansi g
       LEFT JOIN invoice i ON i.id = g.invoice_id
       LEFT JOIN cabang c ON c.id = g.cabang_id
       LEFT JOIN pelanggan pl ON pl.id = g.pelanggan_id
       ${where}
       ORDER BY g.habis ASC
       LIMIT 500`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
