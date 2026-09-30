// Route pengaturan toko (nama, alamat, telepon, logo, PPN). Ubah: admin.
import { Router } from 'express';
import { satu } from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

router.get('/', async (req, res, next) => {
  try {
    const p = await satu('SELECT * FROM pengaturan WHERE id = 1');
    res.json(p || {});
  } catch (e) { next(e); }
});

router.put('/', izinkan('admin'), async (req, res, next) => {
  try {
    const { nama_toko, alamat, telepon, logo, persen_ppn, batas_stok } = req.body || {};
    const cur = await satu('SELECT * FROM pengaturan WHERE id = 1');
    if (!cur) {
      await satu(
        'INSERT INTO pengaturan (id, nama_toko, alamat, telepon, logo, persen_ppn, batas_stok) VALUES (1,$1,$2,$3,$4,$5,$6)',
        [nama_toko || null, alamat || null, telepon || null, logo || null, persen_ppn ?? 11, batas_stok ?? 5]
      );
    } else {
      await satu(
        'UPDATE pengaturan SET nama_toko=$1, alamat=$2, telepon=$3, logo=$4, persen_ppn=$5, batas_stok=$6 WHERE id = 1',
        [
          nama_toko ?? cur.nama_toko,
          alamat ?? cur.alamat,
          telepon ?? cur.telepon,
          logo !== undefined ? logo : cur.logo,
          persen_ppn ?? cur.persen_ppn,
          batas_stok ?? cur.batas_stok,
        ]
      );
    }
    res.json(await satu('SELECT * FROM pengaturan WHERE id = 1'));
  } catch (e) { next(e); }
});

export default router;
