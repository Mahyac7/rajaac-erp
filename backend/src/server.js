// Server Express untuk ERP Toko AC.
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

initSchema();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' })); // limit besar untuk logo base64

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/cabang', cabangRoutes);
app.use('/api/users', userRoutes);
app.use('/api/produk', produkRoutes);
app.use('/api/stok', stokRoutes);
app.use('/api/invoice', invoiceRoutes);
app.use('/api/pengaturan', pengaturanRoutes);

// Handler error umum
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server ERP Toko AC berjalan di http://localhost:${PORT}`);
});
