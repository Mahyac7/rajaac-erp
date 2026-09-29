// Route cabang. Kelola cabang hanya untuk admin; daftar bisa dilihat semua user login.
import { Router } from 'express';
import db from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM cabang ORDER BY id').all());
});

router.post('/', izinkan('admin'), (req, res) => {
  const { nama, alamat, telepon } = req.body || {};
  if (!nama) return res.status(400).json({ pesan: 'Nama cabang wajib diisi.' });
  const info = db
    .prepare('INSERT INTO cabang (nama, alamat, telepon) VALUES (?,?,?)')
    .run(nama, alamat || null, telepon || null);
  res.status(201).json(db.prepare('SELECT * FROM cabang WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/:id', izinkan('admin'), (req, res) => {
  const { nama, alamat, telepon } = req.body || {};
  const ada = db.prepare('SELECT id FROM cabang WHERE id = ?').get(req.params.id);
  if (!ada) return res.status(404).json({ pesan: 'Cabang tidak ditemukan.' });
  db.prepare('UPDATE cabang SET nama = ?, alamat = ?, telepon = ? WHERE id = ?').run(
    nama, alamat || null, telepon || null, req.params.id
  );
  res.json(db.prepare('SELECT * FROM cabang WHERE id = ?').get(req.params.id));
});

export default router;
