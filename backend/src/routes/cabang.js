// Route cabang. Kelola cabang hanya untuk admin; daftar bisa dilihat semua user login.
import { Router } from 'express';
import { satu, semua, query } from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

router.get('/', async (req, res, next) => {
  try {
    res.json(await semua('SELECT * FROM cabang ORDER BY id'));
  } catch (e) { next(e); }
});

router.post('/', izinkan('admin'), async (req, res, next) => {
  try {
    const { nama, alamat, telepon } = req.body || {};
    if (!nama) return res.status(400).json({ pesan: 'Nama cabang wajib diisi.' });
    const row = await satu(
      'INSERT INTO cabang (nama, alamat, telepon) VALUES ($1,$2,$3) RETURNING *',
      [nama, alamat || null, telepon || null]
    );
    res.status(201).json(row);
  } catch (e) { next(e); }
});

router.put('/:id', izinkan('admin'), async (req, res, next) => {
  try {
    const { nama, alamat, telepon } = req.body || {};
    const ada = await satu('SELECT id FROM cabang WHERE id = $1', [req.params.id]);
    if (!ada) return res.status(404).json({ pesan: 'Cabang tidak ditemukan.' });
    const row = await satu(
      'UPDATE cabang SET nama = $1, alamat = $2, telepon = $3 WHERE id = $4 RETURNING *',
      [nama, alamat || null, telepon || null, req.params.id]
    );
    res.json(row);
  } catch (e) { next(e); }
});

export default router;
