// Route invoice: buat invoice (kurangi stok otomatis), lihat daftar & detail.
import { Router } from 'express';
import { satu, semua, denganTransaksi } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req, cabangIdInput) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return cabangIdInput ? Number(cabangIdInput) : null;
}

// Hitung nomor invoice berikutnya dalam transaksi (pakai client agar konsisten).
async function nomorInvoiceBaru(client, cabangId) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${cabangId}-${ym}-`;
  const { rows } = await client.query(
    'SELECT nomor FROM invoice WHERE nomor LIKE $1 ORDER BY id DESC LIMIT 1',
    [prefix + '%']
  );
  let urut = 1;
  if (rows[0]) urut = parseInt(rows[0].nomor.slice(prefix.length), 10) + 1;
  return prefix + String(urut).padStart(4, '0');
}

// Buat invoice. Body: { cabang_id?, nama_pembeli?, persen_ppn?, items:[{produk_id, jumlah}] }
router.post('/', async (req, res, next) => {
  try {
    const { nama_pembeli, items, pelanggan_id } = req.body || {};
    const metodeBayar = ['tunai', 'transfer', 'qris'].includes(req.body.metode_bayar) ? req.body.metode_bayar : 'tunai';
    const cabangId = resolveCabang(req, req.body.cabang_id);
    if (!cabangId) return res.status(400).json({ pesan: 'Cabang wajib dipilih.' });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ pesan: 'Minimal 1 item pada invoice.' });
    }

    const pengaturan = await satu('SELECT persen_ppn FROM pengaturan WHERE id = 1');
    const persenPpn = req.body.persen_ppn ?? (pengaturan ? pengaturan.persen_ppn : 11);

    const invoiceId = await denganTransaksi(async (client) => {
      let subtotal = 0;
      const detail = [];
      for (const it of items) {
        const { rows: pr } = await client.query('SELECT * FROM produk WHERE id = $1', [it.produk_id]);
        const produk = pr[0];
        if (!produk) throw new Error(`Produk id ${it.produk_id} tidak ditemukan.`);
        const qty = Number(it.jumlah);
        if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Jumlah tidak valid untuk ${produk.nama}.`);

        // Kurangi stok (kecuali kategori Jasa yang tidak punya stok fisik)
        const isJasa = (produk.kategori || '').toLowerCase() === 'jasa';
        if (!isJasa) {
          await client.query(
            'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES ($1,$2,0) ON CONFLICT (produk_id, cabang_id) DO NOTHING',
            [produk.id, cabangId]
          );
          const { rows: sr } = await client.query(
            'SELECT jumlah FROM stok WHERE produk_id = $1 AND cabang_id = $2 FOR UPDATE',
            [produk.id, cabangId]
          );
          if (sr[0].jumlah < qty) throw new Error(`Stok ${produk.nama} tidak cukup (tersisa ${sr[0].jumlah}).`);
          await client.query(
            'UPDATE stok SET jumlah = jumlah - $1 WHERE produk_id = $2 AND cabang_id = $3',
            [qty, produk.id, cabangId]
          );
        }

        const hargaSatuan = Number(produk.harga_jual);
        const sub = hargaSatuan * qty;
        subtotal += sub;
        detail.push({ produk, qty, hargaSatuan, sub, isJasa });
      }

      const nilaiPpn = Math.round((subtotal * persenPpn) / 100);
      const total = subtotal + nilaiPpn;
      const nomor = await nomorInvoiceBaru(client, cabangId);

      const { rows: ir } = await client.query(
        `INSERT INTO invoice (nomor, cabang_id, user_id, nama_pembeli, subtotal, persen_ppn, nilai_ppn, total, metode_bayar, pelanggan_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [nomor, cabangId, req.user.id, nama_pembeli || null, subtotal, persenPpn, nilaiPpn, total, metodeBayar, pelanggan_id || null]
      );
      const id = ir[0].id;

      for (const d of detail) {
        await client.query(
          'INSERT INTO invoice_item (invoice_id, produk_id, nama_produk, sku, harga, jumlah, subtotal) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [id, d.produk.id, d.produk.nama, d.produk.sku, d.hargaSatuan, d.qty, d.sub]
        );
        if (!d.isJasa) {
          await client.query(
            'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id, invoice_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [d.produk.id, cabangId, 'keluar', d.qty, `Penjualan ${nomor}`, req.user.id, id]
          );
        }
        // Buat garansi otomatis untuk produk yang punya masa garansi — 1 record per unit terjual.
        const bulan = Number(d.produk.garansi_bulan || 0);
        if (bulan > 0) {
          for (let u = 0; u < d.qty; u++) {
            await client.query(
              `INSERT INTO garansi (invoice_id, produk_id, nama_produk, sku, pelanggan_id, nama_pembeli, cabang_id, mulai, habis)
               VALUES ($1,$2,$3,$4,$5,$6,$7, CURRENT_DATE, CURRENT_DATE + ($8 || ' months')::interval)`,
              [id, d.produk.id, d.produk.nama, d.produk.sku, pelanggan_id || null, nama_pembeli || null, cabangId, String(bulan)]
            );
          }
        }
      }
      return id;
    });

    res.status(201).json(await getInvoiceLengkap(invoiceId));
  } catch (e) {
    // Error validasi bisnis (stok kurang, produk tak ada) -> 400
    if (e.message && (e.message.includes('tidak cukup') || e.message.includes('tidak ditemukan') || e.message.includes('tidak valid'))) {
      return res.status(400).json({ pesan: e.message });
    }
    next(e);
  }
});

async function getInvoiceLengkap(id) {
  const inv = await satu(
    `SELECT i.*, c.nama AS cabang_nama, c.alamat AS cabang_alamat, u.nama AS kasir_nama,
            pl.nama AS pelanggan_nama, pl.telepon AS pelanggan_telepon
     FROM invoice i
     JOIN cabang c ON c.id = i.cabang_id
     LEFT JOIN users u ON u.id = i.user_id
     LEFT JOIN pelanggan pl ON pl.id = i.pelanggan_id
     WHERE i.id = $1`,
    [id]
  );
  if (!inv) return null;
  inv.items = await semua('SELECT * FROM invoice_item WHERE invoice_id = $1', [id]);
  inv.pengaturan = await satu('SELECT nama_toko, alamat, telepon, logo FROM pengaturan WHERE id = 1');
  return inv;
}

router.get('/', async (req, res, next) => {
  try {
    const cabangId = resolveCabang(req, req.query.cabang_id);
    const params = [];
    let where = '';
    if (cabangId) { where = 'WHERE i.cabang_id = $1'; params.push(cabangId); }
    const rows = await semua(
      `SELECT i.id, i.nomor, i.nama_pembeli, i.total, i.dibuat_pada, c.nama AS cabang_nama, u.nama AS kasir_nama
       FROM invoice i
       JOIN cabang c ON c.id = i.cabang_id
       LEFT JOIN users u ON u.id = i.user_id
       ${where}
       ORDER BY i.id DESC LIMIT 200`,
      params
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const inv = await getInvoiceLengkap(req.params.id);
    if (!inv) return res.status(404).json({ pesan: 'Invoice tidak ditemukan.' });
    if (req.user.role === 'kasir' && inv.cabang_id !== req.user.cabang_id) {
      return res.status(403).json({ pesan: 'Tidak boleh mengakses invoice cabang lain.' });
    }
    res.json(inv);
  } catch (e) { next(e); }
});

export default router;
