// Route transfer stok antar cabang. HANYA ADMIN.
// Mengurangi stok cabang asal dan menambah stok cabang tujuan dalam satu transaksi.
import { Router } from 'express';
import { satu, semua, denganTransaksi } from '../db.js';
import { autentikasi, izinkan } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

async function nomorTransferBaru(client) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `TRF-${ym}-`;
  const { rows } = await client.query(
    'SELECT nomor FROM transfer_stok WHERE nomor LIKE $1 ORDER BY id DESC LIMIT 1',
    [prefix + '%']
  );
  let urut = 1;
  if (rows[0]) urut = parseInt(rows[0].nomor.slice(prefix.length), 10) + 1;
  return prefix + String(urut).padStart(4, '0');
}

// Buat transfer. Body: { produk_id, cabang_asal, cabang_tujuan, jumlah, keterangan }
router.post('/', izinkan('admin'), async (req, res, next) => {
  try {
    const { produk_id, cabang_asal, cabang_tujuan, jumlah, keterangan } = req.body || {};
    if (!produk_id || !cabang_asal || !cabang_tujuan || !jumlah) {
      return res.status(400).json({ pesan: 'produk, cabang asal, cabang tujuan, dan jumlah wajib diisi.' });
    }
    if (Number(cabang_asal) === Number(cabang_tujuan)) {
      return res.status(400).json({ pesan: 'Cabang asal dan tujuan tidak boleh sama.' });
    }
    const qty = Number(jumlah);
    if (!Number.isInteger(qty) || qty <= 0) {
      return res.status(400).json({ pesan: 'Jumlah harus bilangan bulat positif.' });
    }

    const hasil = await denganTransaksi(async (client) => {
      const { rows: pr } = await client.query('SELECT * FROM produk WHERE id = $1', [produk_id]);
      const produk = pr[0];
      if (!produk) throw new Error('Produk tidak ditemukan.');

      // Kunci stok cabang asal & cek cukup.
      await client.query(
        'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES ($1,$2,0) ON CONFLICT (produk_id, cabang_id) DO NOTHING',
        [produk_id, cabang_asal]
      );
      const { rows: sr } = await client.query(
        'SELECT jumlah FROM stok WHERE produk_id = $1 AND cabang_id = $2 FOR UPDATE',
        [produk_id, cabang_asal]
      );
      if (sr[0].jumlah < qty) throw new Error(`Stok ${produk.nama} di cabang asal tidak cukup (tersisa ${sr[0].jumlah}).`);

      // Kurangi asal, tambah tujuan.
      await client.query('UPDATE stok SET jumlah = jumlah - $1 WHERE produk_id = $2 AND cabang_id = $3', [qty, produk_id, cabang_asal]);
      await client.query(
        'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES ($1,$2,$3) ON CONFLICT (produk_id, cabang_id) DO UPDATE SET jumlah = stok.jumlah + $3',
        [produk_id, cabang_tujuan, qty]
      );

      const nomor = await nomorTransferBaru(client);
      const { rows: tr } = await client.query(
        'INSERT INTO transfer_stok (nomor, produk_id, cabang_asal, cabang_tujuan, jumlah, keterangan, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [nomor, produk_id, cabang_asal, cabang_tujuan, qty, keterangan || null, req.user.id]
      );
      const id = tr[0].id;

      // Catat pergerakan di kedua cabang untuk jejak audit.
      await client.query(
        'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [produk_id, cabang_asal, 'keluar', qty, `Transfer ${nomor} ke cabang lain`, req.user.id]
      );
      await client.query(
        'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [produk_id, cabang_tujuan, 'masuk', qty, `Transfer ${nomor} dari cabang lain`, req.user.id]
      );
      return id;
    });

    res.status(201).json(await getTransferLengkap(hasil));
  } catch (e) {
    if (e.message && (e.message.includes('tidak cukup') || e.message.includes('tidak ditemukan'))) {
      return res.status(400).json({ pesan: e.message });
    }
    next(e);
  }
});

async function getTransferLengkap(id) {
  return satu(
    `SELECT t.*, p.nama AS produk_nama, p.sku,
            ca.nama AS asal_nama, ct.nama AS tujuan_nama, u.nama AS user_nama
     FROM transfer_stok t
     JOIN produk p ON p.id = t.produk_id
     JOIN cabang ca ON ca.id = t.cabang_asal
     JOIN cabang ct ON ct.id = t.cabang_tujuan
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = $1`,
    [id]
  );
}

router.get('/', async (req, res, next) => {
  try {
    // Kasir hanya lihat transfer yang menyangkut cabangnya; admin lihat semua.
    const params = [];
    let where = '';
    if (req.user.role === 'kasir') {
      params.push(req.user.cabang_id);
      where = 'WHERE t.cabang_asal = $1 OR t.cabang_tujuan = $1';
    }
    const rows = await semua(
      `SELECT t.id, t.nomor, t.jumlah, t.keterangan, t.dibuat_pada,
              p.nama AS produk_nama, p.sku,
              ca.nama AS asal_nama, ct.nama AS tujuan_nama, u.nama AS user_nama
       FROM transfer_stok t
       JOIN produk p ON p.id = t.produk_id
       JOIN cabang ca ON ca.id = t.cabang_asal
       JOIN cabang ct ON ct.id = t.cabang_tujuan
       LEFT JOIN users u ON u.id = t.user_id
       ${where}
       ORDER BY t.id DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

export default router;
