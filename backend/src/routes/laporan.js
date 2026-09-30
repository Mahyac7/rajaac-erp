// Route laporan penjualan: ringkasan & agregat untuk grafik.
// Mendukung filter periode (dari/sampai) & cabang. Kasir dibatasi ke cabangnya.
import { Router } from 'express';
import { satu, semua } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return req.query.cabang_id ? Number(req.query.cabang_id) : null;
}

// Bangun klausa WHERE untuk filter tanggal & cabang.
function buildFilter(req) {
  const cabangId = resolveCabang(req);
  const { dari, sampai } = req.query;
  const cond = [];
  const params = [];
  if (cabangId) { params.push(cabangId); cond.push(`i.cabang_id = $${params.length}`); }
  if (dari) { params.push(dari); cond.push(`i.dibuat_pada >= $${params.length}`); }
  if (sampai) { params.push(sampai + ' 23:59:59'); cond.push(`i.dibuat_pada <= $${params.length}`); }
  return { where: cond.length ? 'WHERE ' + cond.join(' AND ') : '', params };
}

// Ringkasan: total penjualan, jumlah invoice, total retur, penjualan bersih, estimasi laba.
router.get('/ringkasan', async (req, res, next) => {
  try {
    const { where, params } = buildFilter(req);

    const penjualan = await satu(
      `SELECT COALESCE(SUM(i.total),0) AS total_penjualan,
              COALESCE(SUM(i.subtotal),0) AS subtotal_penjualan,
              COUNT(*)::int AS jumlah_invoice
       FROM invoice i ${where}`,
      params
    );

    // Estimasi laba = SUM((harga jual - harga beli) * qty) dari item terjual.
    const laba = await satu(
      `SELECT COALESCE(SUM((ii.harga - p.harga_beli) * ii.jumlah),0) AS estimasi_laba
       FROM invoice_item ii
       JOIN invoice i ON i.id = ii.invoice_id
       JOIN produk p ON p.id = ii.produk_id
       ${where}`,
      params
    );

    // Retur pada periode & cabang yang sama (filter pakai kolom retur).
    const cabangId = resolveCabang(req);
    const { dari, sampai } = req.query;
    const rCond = [];
    const rParams = [];
    if (cabangId) { rParams.push(cabangId); rCond.push(`cabang_id = $${rParams.length}`); }
    if (dari) { rParams.push(dari); rCond.push(`dibuat_pada >= $${rParams.length}`); }
    if (sampai) { rParams.push(sampai + ' 23:59:59'); rCond.push(`dibuat_pada <= $${rParams.length}`); }
    const retur = await satu(
      `SELECT COALESCE(SUM(total),0) AS total_retur, COUNT(*)::int AS jumlah_retur
       FROM retur ${rCond.length ? 'WHERE ' + rCond.join(' AND ') : ''}`,
      rParams
    );

    const totalPenjualan = Number(penjualan.total_penjualan);
    const totalRetur = Number(retur.total_retur);
    res.json({
      total_penjualan: totalPenjualan,
      jumlah_invoice: penjualan.jumlah_invoice,
      total_retur: totalRetur,
      jumlah_retur: retur.jumlah_retur,
      penjualan_bersih: totalPenjualan - totalRetur,
      estimasi_laba: Number(laba.estimasi_laba),
    });
  } catch (e) { next(e); }
});

// Penjualan per hari (untuk grafik garis/bar).
router.get('/harian', async (req, res, next) => {
  try {
    const { where, params } = buildFilter(req);
    const rows = await semua(
      `SELECT to_char(i.dibuat_pada, 'YYYY-MM-DD') AS tanggal,
              COALESCE(SUM(i.total),0) AS total,
              COUNT(*)::int AS jumlah
       FROM invoice i ${where}
       GROUP BY tanggal ORDER BY tanggal`,
      params
    );
    res.json(rows.map((r) => ({ ...r, total: Number(r.total) })));
  } catch (e) { next(e); }
});

// Produk terlaris (top 10 berdasarkan qty terjual).
router.get('/produk-terlaris', async (req, res, next) => {
  try {
    const { where, params } = buildFilter(req);
    const rows = await semua(
      `SELECT ii.sku, ii.nama_produk,
              SUM(ii.jumlah)::int AS total_qty,
              COALESCE(SUM(ii.subtotal),0) AS total_nilai
       FROM invoice_item ii
       JOIN invoice i ON i.id = ii.invoice_id
       ${where}
       GROUP BY ii.sku, ii.nama_produk
       ORDER BY total_qty DESC
       LIMIT 10`,
      params
    );
    res.json(rows.map((r) => ({ ...r, total_nilai: Number(r.total_nilai) })));
  } catch (e) { next(e); }
});

// Penjualan per cabang (untuk admin; grafik perbandingan cabang).
router.get('/per-cabang', async (req, res, next) => {
  try {
    // Abaikan filter cabang di sini; tampilkan semua cabang. Tetap hormati tanggal.
    const { dari, sampai } = req.query;
    const cond = [];
    const params = [];
    if (dari) { params.push(dari); cond.push(`i.dibuat_pada >= $${params.length}`); }
    if (sampai) { params.push(sampai + ' 23:59:59'); cond.push(`i.dibuat_pada <= $${params.length}`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = await semua(
      `SELECT c.id AS cabang_id, c.nama AS cabang_nama,
              COALESCE(SUM(i.total),0) AS total,
              COUNT(i.id)::int AS jumlah
       FROM cabang c
       LEFT JOIN invoice i ON i.cabang_id = c.id ${where ? 'AND ' + where.slice(6) : ''}
       GROUP BY c.id, c.nama ORDER BY c.id`,
      params
    );
    res.json(rows.map((r) => ({ ...r, total: Number(r.total) })));
  } catch (e) { next(e); }
});

export default router;
