// Route retur barang: barang dikembalikan pelanggan -> stok kembali ke cabang.
// Retur mengurangi angka penjualan bersih di laporan (lihat routes/laporan.js).
import { Router } from 'express';
import { satu, semua, denganTransaksi } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req, input) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return input ? Number(input) : null;
}

async function nomorReturBaru(client, cabangId) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `RET-${cabangId}-${ym}-`;
  const { rows } = await client.query(
    'SELECT nomor FROM retur WHERE nomor LIKE $1 ORDER BY id DESC LIMIT 1',
    [prefix + '%']
  );
  let urut = 1;
  if (rows[0]) urut = parseInt(rows[0].nomor.slice(prefix.length), 10) + 1;
  return prefix + String(urut).padStart(4, '0');
}

// Buat retur. Body: { cabang_id?, invoice_id?, alasan, items:[{produk_id, jumlah}] }
router.post('/', async (req, res, next) => {
  try {
    const { invoice_id, alasan, items } = req.body || {};
    const cabangId = resolveCabang(req, req.body.cabang_id);
    if (!cabangId) return res.status(400).json({ pesan: 'Cabang wajib dipilih.' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ pesan: 'Minimal 1 item pada retur.' });
    }

    const returId = await denganTransaksi(async (client) => {
      let total = 0;
      const detail = [];
      for (const it of items) {
        const { rows: pr } = await client.query('SELECT * FROM produk WHERE id = $1', [it.produk_id]);
        const produk = pr[0];
        if (!produk) throw new Error(`Produk id ${it.produk_id} tidak ditemukan.`);
        const qty = Number(it.jumlah);
        if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Jumlah tidak valid untuk ${produk.nama}.`);

        const harga = Number(produk.harga_jual);
        const sub = harga * qty;
        total += sub;
        detail.push({ produk, qty, harga, sub });
      }

      const nomor = await nomorReturBaru(client, cabangId);
      const { rows: rr } = await client.query(
        'INSERT INTO retur (nomor, invoice_id, cabang_id, user_id, alasan, total) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
        [nomor, invoice_id || null, cabangId, req.user.id, alasan || null, total]
      );
      const id = rr[0].id;

      for (const d of detail) {
        // Kembalikan stok (kecuali Jasa yang tak punya stok fisik).
        const isJasa = (d.produk.kategori || '').toLowerCase() === 'jasa';
        if (!isJasa) {
          await client.query(
            'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES ($1,$2,0) ON CONFLICT (produk_id, cabang_id) DO NOTHING',
            [d.produk.id, cabangId]
          );
          await client.query(
            'UPDATE stok SET jumlah = jumlah + $1 WHERE produk_id = $2 AND cabang_id = $3',
            [d.qty, d.produk.id, cabangId]
          );
          await client.query(
            'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id) VALUES ($1,$2,$3,$4,$5,$6)',
            [d.produk.id, cabangId, 'masuk', d.qty, `Retur ${nomor}`, req.user.id]
          );
        }
        await client.query(
          'INSERT INTO retur_item (retur_id, produk_id, nama_produk, sku, harga, jumlah, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, d.produk.id, d.produk.nama, d.produk.sku, d.harga, d.qty, d.sub]
        );
      }
      return id;
    });

    res.status(201).json(await getReturLengkap(returId));
  } catch (e) {
    if (e.message && (e.message.includes('tidak ditemukan') || e.message.includes('tidak valid'))) {
      return res.status(400).json({ pesan: e.message });
    }
    next(e);
  }
});

async function getReturLengkap(id) {
  const r = await satu(
    `SELECT r.*, c.nama AS cabang_nama, u.nama AS user_nama, i.nomor AS invoice_nomor
     FROM retur r
     JOIN cabang c ON c.id = r.cabang_id
     LEFT JOIN users u ON u.id = r.user_id
     LEFT JOIN invoice i ON i.id = r.invoice_id
     WHERE r.id = $1`,
    [id]
  );
  if (!r) return null;
  r.items = await semua('SELECT * FROM retur_item WHERE retur_id = $1', [id]);
  return r;
}

router.get('/', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req, req.query.cabang_id);
    const params = [];
    let where = '';
    if (cabangId) { where = 'WHERE r.cabang_id = $1'; params.push(cabangId); }
    const rows = await semua(
      `SELECT r.id, r.nomor, r.alasan, r.total, r.dibuat_pada,
              c.nama AS cabang_nama, u.nama AS user_nama, i.nomor AS invoice_nomor
       FROM retur r
       JOIN cabang c ON c.id = r.cabang_id
       LEFT JOIN users u ON u.id = r.user_id
       LEFT JOIN invoice i ON i.id = r.invoice_id
       ${where}
       ORDER BY r.id DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await getReturLengkap(req.params.id);
    if (!r) return res.status(404).json({ pesan: 'Retur tidak ditemukan.' });
    if (req.user.role === 'kasir' && r.cabang_id !== req.user.cabang_id) {
      return res.status(403).json({ pesan: 'Tidak boleh mengakses retur cabang lain.' });
    }
    res.json(r);
  } catch (e) { next(e); }
});

export default router;
