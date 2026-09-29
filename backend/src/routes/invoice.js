// Route invoice: buat invoice (kurangi stok otomatis), lihat daftar & detail.
import { Router } from 'express';
import db, { buatTransaksi } from '../db.js';
import { autentikasi } from '../middleware/auth.js';

const router = Router();
router.use(autentikasi);

function resolveCabang(req, cabangIdInput) {
  if (req.user.role === 'kasir') return req.user.cabang_id;
  return cabangIdInput ? Number(cabangIdInput) : null;
}

function nomorInvoiceBaru(cabangId) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `INV-${cabangId}-${ym}-`;
  const last = db
    .prepare("SELECT nomor FROM invoice WHERE nomor LIKE ? ORDER BY id DESC LIMIT 1")
    .get(prefix + '%');
  let urut = 1;
  if (last) urut = parseInt(last.nomor.slice(prefix.length), 10) + 1;
  return prefix + String(urut).padStart(4, '0');
}

// Buat invoice. Body: { cabang_id?, nama_pembeli?, persen_ppn?, items:[{produk_id, jumlah}] }
router.post('/', (req, res) => {
  const { nama_pembeli, items } = req.body || {};
  const cabangId = resolveCabang(req, req.body.cabang_id);
  if (!cabangId) return res.status(400).json({ pesan: 'Cabang wajib dipilih.' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ pesan: 'Minimal 1 item pada invoice.' });
  }

  const pengaturan = db.prepare('SELECT persen_ppn FROM pengaturan WHERE id = 1').get();
  const persenPpn = req.body.persen_ppn ?? (pengaturan ? pengaturan.persen_ppn : 11);

  const trx = buatTransaksi(() => {
    let subtotal = 0;
    const detail = [];
    for (const it of items) {
      const produk = db.prepare('SELECT * FROM produk WHERE id = ?').get(it.produk_id);
      if (!produk) throw new Error(`Produk id ${it.produk_id} tidak ditemukan.`);
      const qty = Number(it.jumlah);
      if (!Number.isInteger(qty) || qty <= 0) throw new Error(`Jumlah tidak valid untuk ${produk.nama}.`);

      // Kurangi stok (kecuali kategori Jasa yang tidak punya stok fisik)
      const isJasa = (produk.kategori || '').toLowerCase() === 'jasa';
      if (!isJasa) {
        db.prepare('INSERT OR IGNORE INTO stok (produk_id, cabang_id, jumlah) VALUES (?,?,0)').run(produk.id, cabangId);
        const stok = db.prepare('SELECT jumlah FROM stok WHERE produk_id = ? AND cabang_id = ?').get(produk.id, cabangId);
        if (stok.jumlah < qty) throw new Error(`Stok ${produk.nama} tidak cukup (tersisa ${stok.jumlah}).`);
        db.prepare('UPDATE stok SET jumlah = jumlah - ? WHERE produk_id = ? AND cabang_id = ?').run(qty, produk.id, cabangId);
      }

      const hargaSatuan = produk.harga_jual;
      const sub = hargaSatuan * qty;
      subtotal += sub;
      detail.push({ produk, qty, hargaSatuan, sub, isJasa });
    }

    const nilaiPpn = Math.round((subtotal * persenPpn) / 100);
    const total = subtotal + nilaiPpn;
    const nomor = nomorInvoiceBaru(cabangId);

    const info = db
      .prepare(
        `INSERT INTO invoice (nomor, cabang_id, user_id, nama_pembeli, subtotal, persen_ppn, nilai_ppn, total)
         VALUES (?,?,?,?,?,?,?,?)`
      )
      .run(nomor, cabangId, req.user.id, nama_pembeli || null, subtotal, persenPpn, nilaiPpn, total);
    const invoiceId = info.lastInsertRowid;

    const insItem = db.prepare(
      'INSERT INTO invoice_item (invoice_id, produk_id, nama_produk, sku, harga, jumlah, subtotal) VALUES (?,?,?,?,?,?,?)'
    );
    const insGerak = db.prepare(
      'INSERT INTO pergerakan_stok (produk_id, cabang_id, tipe, jumlah, keterangan, user_id, invoice_id) VALUES (?,?,?,?,?,?,?)'
    );
    for (const d of detail) {
      insItem.run(invoiceId, d.produk.id, d.produk.nama, d.produk.sku, d.hargaSatuan, d.qty, d.sub);
      if (!d.isJasa) insGerak.run(d.produk.id, cabangId, 'keluar', d.qty, `Penjualan ${nomor}`, req.user.id, invoiceId);
    }
    return invoiceId;
  });

  try {
    const id = trx();
    res.status(201).json(getInvoiceLengkap(id));
  } catch (e) {
    res.status(400).json({ pesan: e.message });
  }
});

function getInvoiceLengkap(id) {
  const inv = db
    .prepare(
      `SELECT i.*, c.nama AS cabang_nama, c.alamat AS cabang_alamat, u.nama AS kasir_nama
       FROM invoice i
       JOIN cabang c ON c.id = i.cabang_id
       LEFT JOIN users u ON u.id = i.user_id
       WHERE i.id = ?`
    )
    .get(id);
  if (!inv) return null;
  inv.items = db.prepare('SELECT * FROM invoice_item WHERE invoice_id = ?').all(id);
  inv.pengaturan = db.prepare('SELECT nama_toko, alamat, telepon, logo FROM pengaturan WHERE id = 1').get();
  return inv;
}

router.get('/', (req, res) => {
  const cabangId = resolveCabang(req, req.query.cabang_id);
  const params = [];
  let where = '';
  if (cabangId) { where = 'WHERE i.cabang_id = ?'; params.push(cabangId); }
  const rows = db
    .prepare(
      `SELECT i.id, i.nomor, i.nama_pembeli, i.total, i.dibuat_pada, c.nama AS cabang_nama, u.nama AS kasir_nama
       FROM invoice i
       JOIN cabang c ON c.id = i.cabang_id
       LEFT JOIN users u ON u.id = i.user_id
       ${where}
       ORDER BY i.id DESC LIMIT 200`
    )
    .all(...params);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const inv = getInvoiceLengkap(req.params.id);
  if (!inv) return res.status(404).json({ pesan: 'Invoice tidak ditemukan.' });
  if (req.user.role === 'kasir' && inv.cabang_id !== req.user.cabang_id) {
    return res.status(403).json({ pesan: 'Tidak boleh mengakses invoice cabang lain.' });
  }
  res.json(inv);
});

export default router;
