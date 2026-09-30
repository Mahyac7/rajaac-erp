// Server Express untuk ERP Toko AC.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initSchema } from './db.js';
import authRoutes from './routes/auth.js';
import cabangRoutes from './routes/cabang.js';
import userRoutes from './routes/users.js';
import produkRoutes from './routes/produk.js';
import stokRoutes from './routes/stok.js';
import invoiceRoutes from './routes/invoice.js';
import pengaturanRoutes from './routes/pengaturan.js';
import laporanRoutes from './routes/laporan.js';
import returRoutes from './routes/retur.js';
import transferRoutes from './routes/transfer.js';
import pelangganRoutes from './routes/pelanggan.js';
import garansiRoutes from './routes/garansi.js';
import jadwalRoutes from './routes/jadwal.js';

const app = express();

// CORS: izinkan domain frontend. Set env CORS_ORIGIN (pisahkan koma untuk banyak domain),
// mis. "https://rajaac-erp.vercel.app". Kalau kosong, izinkan semua (praktis untuk dev).
const origins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors(origins.length ? { origin: origins } : {}));
app.use(express.json({ limit: '5mb' })); // limit besar untuk logo base64

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/cabang', cabangRoutes);
app.use('/api/users', userRoutes);
app.use('/api/produk', produkRoutes);
app.use('/api/stok', stokRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/pengaturan', pengaturanRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/retur', returRoutes);
app.use('/api/transfer', transferRoutes);
app.use('/api/pelanggan', pelangganRoutes);
app.use('/api/garansi', garansiRoutes);
app.use('/api/jadwal', jadwalRoutes);

// Handler error umum
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 4000;

// Pastikan skema tabel ada sebelum menerima request.
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server ERP Toko AC berjalan di port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error('Gagal inisialisasi database:', e.message);
    process.exit(1);
  });
