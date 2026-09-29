// Route pengaturan toko (nama, alamat, telepon, logo, PPN). Ubah: admin.
import { Router } from 'express';
import db from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

router.get('/', (req, res) => {
  const p = db.prepare('SELECT * FROM pengaturan WHERE id = 1').get();
  res.json(p || {});
});

router.put('/', izinkan('admin'), (req, res) => {
  const { nama_toko, alamat, telepon, logo, persen_ppn } = req.body || {};
  const ada = db.prepare('SELECT id FROM pengaturan WHERE id = 1').get();
  if (!ada) {
    db.prepare(
      'INSERT INTO pengaturan (id, nama_toko, alamat, telepon, logo, persen_ppn) VALUES (1,?,?,?,?,?)'
    ).run(nama_toko || null, alamat || null, telepon || null, logo || null, persen_ppn ?? 11);
  } else {
    const cur = db.prepare('SELECT * FROM pengaturan WHERE id = 1').get();
    db.prepare(
      'UPDATE pengaturan SET nama_toko=?, alamat=?, telepon=?, logo=?, persen_ppn=? WHERE id = 1'
    ).run(
      nama_toko ?? cur.nama_toko,
      alamat ?? cur.alamat,
      telepon ?? cur.telepon,
      logo !== undefined ? logo : cur.logo,
      persen_ppn ?? cur.persen_ppn
    );
  }
  res.json(db.prepare('SELECT * FROM pengaturan WHERE id = 1').get());
});

export default router;
