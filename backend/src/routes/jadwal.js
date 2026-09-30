// Route jadwal servis/pemasangan (CRUD + ubah status). Teknisi = teks bebas.
import { Router } from 'express';
import { satu, semua, query } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req, input) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return input ? Number(input) : null;
}

router.get('/', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req, req.query.cabang_id);
    const params = [];
    const cond = [];
    if (cabangId) { params.push(cabangId); cond.push(`j.cabang_id = $${params.length}`); }
    if (req.query.status) { params.push(req.query.status); cond.push(`j.status = $${params.length}`); }
    const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
    const rows = await semua(
      `SELECT j.*, c.nama AS cabang_nama, pl.nama AS pelanggan_nama_ref
       FROM jadwal_servis j
       LEFT JOIN cabang c ON c.id = j.cabang_id
       LEFT JOIN pelanggan pl ON pl.id = j.pelanggan_id
       ${where}
       ORDER BY j.tanggal DESC, j.id DESC
       LIMIT 300`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { tanggal, jenis, pelanggan_id, nama_pelanggan, telepon, alamat, teknisi, catatan } = req.body || {};
    const cabangId = resolveCabang(req, req.body.cabang_id);
    if (!tanggal || !jenis) return res.status(400).json({ pesan: 'Tanggal dan jenis wajib diisi.' });
    if (!['pasang', 'servis'].includes(jenis)) return res.status(400).json({ pesan: 'Jenis harus pasang atau servis.' });
    const row = await satu(
      `INSERT INTO jadwal_servis (tanggal, jenis, pelanggan_id, nama_pelanggan, telepon, alamat, teknisi, catatan, cabang_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tanggal, jenis, pelanggan_id || null, nama_pelanggan || null, telepon || null, alamat || null, teknisi || null, catatan || null, cabangId, req.user.id]
    );
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const j = await satu('SELECT * FROM jadwal_servis WHERE id = $1', [req.params.id]);
    if (!j) return res.status(404).json({ pesan: 'Jadwal tidak ditemukan.' });
    const { tanggal, jenis, nama_pelanggan, telepon, alamat, teknisi, catatan, status } = req.body || {};
    if (status && !['dijadwalkan', 'selesai', 'batal'].includes(status)) {
      return res.status(400).json({ pesan: 'Status tidak valid.' });
    }
    const row = await satu(
      `UPDATE jadwal_servis SET tanggal=$1, jenis=$2, nama_pelanggan=$3, telepon=$4, alamat=$5, teknisi=$6, catatan=$7, status=$8
       WHERE id=$9 RETURNING *`,
      [
        tanggal ?? j.tanggal, jenis ?? j.jenis, nama_pelanggan ?? j.nama_pelanggan, telepon ?? j.telepon,
        alamat ?? j.alamat, teknisi ?? j.teknisi, catatan ?? j.catatan, status ?? j.status, req.params.id,
      ]
    );
    res.json(row);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM jadwal_servis WHERE id = $1', [req.params.id]);
    res.json({ pesan: 'Jadwal dihapus.' });
  } catch (e) { next(e); }
});

export default router;
