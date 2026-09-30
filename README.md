# ERP Toko AC ❄️

Sistem ERP sederhana untuk toko AC dengan dukungan **multi-cabang** dan **multi-user**. Dibuat dengan Node.js/Express + PostgreSQL (backend) dan React + Vite + TypeScript + Tailwind (frontend).

## ✨ Fitur

- **Login & Role** — Admin dan Kasir dengan autentikasi JWT.
  - **Admin**: kelola produk, pengguna, semua cabang, pengaturan toko, lihat semua invoice.
  - **Kasir**: hanya mengakses cabangnya sendiri (stok, transaksi, invoice).
- **Multi-cabang** — stok dan transaksi terpisah per cabang.
- **Manajemen Produk** — AC & sparepart, dengan SKU, harga beli/jual, kategori.
- **QR Code**
  - Generate QR per produk (berisi **SKU, nama, harga**), bisa diunduh PNG atau dicetak.
  - Scan QR via kamera untuk cek info & stok produk (dengan fallback input SKU manual).
- **Keluar/Masuk Barang** — catat barang masuk (restock) & keluar (penyesuaian), lengkap dengan riwayat pergerakan.
- **Invoice** — buat invoice penjualan, stok otomatis berkurang, hitung **PPN** otomatis, cetak/simpan PDF dengan **logo + nama + alamat toko**.
- **Pengaturan Toko** — nama, alamat, telepon, logo, dan persentase PPN default.
- **Laporan & Grafik** — ringkasan penjualan, penjualan bersih, retur, estimasi laba; grafik penjualan harian, produk terlaris, dan perbandingan antar cabang. Filter per periode & cabang.
- **Ekspor Excel & PDF** — ekspor daftar produk, riwayat stok, dan laporan penjualan.
- **Retur Barang** — catat barang yang dikembalikan pelanggan; stok otomatis kembali dan penjualan bersih pada laporan ikut menyesuaikan.
- **Transfer Stok Antar Cabang** — pindahkan stok dari satu cabang ke cabang lain dalam satu transaksi (**khusus admin**).
- **Struk Thermal 80mm** — cetak struk ringkas untuk printer kasir, selain invoice A4.

## 🧱 Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express |
| Database | PostgreSQL (driver `pg`) |
| Auth | JWT |

## 📁 Struktur Project

```
.
├── backend/          # API Express + PostgreSQL
│   ├── src/
│   │   ├── server.js       # entry point
│   │   ├── db.js           # koneksi PostgreSQL (pool) + skema + helper query/transaksi
│   │   ├── seed.js         # data awal
│   │   ├── middleware/     # auth JWT & otorisasi role
│   │   └── routes/         # auth, cabang, users, produk, stok, invoice, pengaturan
│   └── .env.example        # contoh konfigurasi
└── frontend/         # Aplikasi React
    ├── vercel.json         # konfigurasi deploy Vercel
    ├── .env.example        # contoh konfigurasi
    └── src/
        ├── pages/          # halaman (Login, Dasbor, Produk, Stok, ScanQR, Invoice, dst)
        ├── components/     # Layout, Modal
        └── lib/            # api client, auth context, tipe, format
```

---

## 🚀 Menjalankan Secara Lokal

Butuh **Node.js 18+** dan sebuah **database PostgreSQL** (lihat opsi database di bawah).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env          # lalu isi DATABASE_URL & JWT_SECRET
npm run seed                  # buat tabel + data contoh (cukup sekali)
npm start                     # jalan di http://localhost:4000
```

Isi `.env` minimal:
```
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/postgres
JWT_SECRET=string-acak-yang-panjang
PORT=4000
CORS_ORIGIN=
```

> **Belum punya PostgreSQL lokal?** Cara termudah: pakai database Supabase (gratis) langsung dari lokal — tinggal salin `DATABASE_URL` dari Supabase ke `.env`. Lihat panduan deploy di bawah untuk cara mengambilnya.

### 2. Frontend (terminal terpisah)

```bash
cd frontend
npm install
npm run dev                   # jalan di http://localhost:5173
```

Buka **http://localhost:5173**. Saat `npm run dev`, request `/api` otomatis diteruskan ke backend port 4000 (proxy di `vite.config.ts`), jadi `VITE_API_URL` boleh dikosongkan untuk lokal.

### Akun Demo

| Role  | Username | Password  | Akses           |
|-------|----------|-----------|-----------------|
| Admin | `admin`  | `admin123`  | Semua cabang    |
| Kasir | `kasir1` | `kasir123`  | Cabang Pusat    |
| Kasir | `kasir2` | `kasir123`  | Cabang Bandung  |
| Kasir | `kasir3` | `kasir123`  | Cabang Surabaya |

> ⚠️ Ganti password default ini sebelum dipakai sungguhan.

---

## ☁️ Deploy Online: Supabase + Railway + Vercel

Arsitektur produksi:

```
[ Browser ] → [ Vercel: Frontend React ] → [ Railway: Backend Express ] → [ Supabase: PostgreSQL ]
```

### Langkah 1 — Database di Supabase

1. Masuk ke [supabase.com](https://supabase.com) → **New project**. Beri nama (mis. `rajaac-erp`), atur password database (catat!), pilih region terdekat (Singapore untuk Indonesia).
2. Tunggu project selesai dibuat (±2 menit).
3. Buka **Project Settings → Database → Connection string → URI**.
4. Pilih tab **Connection pooling** (port **6543**) — ini yang cocok untuk aplikasi. Salin URI-nya, bentuknya kira-kira:
   ```
   postgresql://postgres.abcxyz:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. Ganti `[PASSWORD]` dengan password database yang tadi kamu buat. Simpan string ini — akan dipakai sebagai `DATABASE_URL`.

### Langkah 2 — Backend di Railway

1. Masuk ke [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo** → pilih repo ini.
2. Setelah project dibuat, buka service → **Settings**:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start` (biasanya terdeteksi otomatis)
3. Buka tab **Variables**, tambahkan:
   | Variabel | Nilai |
   |----------|-------|
   | `DATABASE_URL` | (URI Supabase dari Langkah 1) |
   | `JWT_SECRET` | string acak panjang (mis. hasil `openssl rand -hex 32`) |
   | `CORS_ORIGIN` | (isi nanti setelah tahu domain Vercel, mis. `https://rajaac-erp.vercel.app`) |
4. Railway akan build & deploy. Setelah selesai, buka **Settings → Networking → Generate Domain** untuk mendapat URL publik backend, mis. `https://rajaac-erp-backend.up.railway.app`. Catat URL ini.
5. **Isi data awal (seed)** — sekali saja. Cara termudah lewat Railway: buka service → menu **⋯ → Run a command** (atau tab shell), jalankan:
   ```bash
   npm run seed
   ```
   Skema tabel juga otomatis dibuat saat server pertama kali start, tapi `seed` mengisi cabang, akun, dan produk contoh.
6. Cek backend hidup: buka `https://<url-railway>/api/health` di browser — harus muncul `{"status":"ok"}`.

### Langkah 3 — Frontend di Vercel

1. Masuk ke [vercel.com](https://vercel.com) → **Add New → Project** → import repo ini.
2. Saat konfigurasi:
   - **Root Directory**: `frontend`
   - Framework otomatis terdeteksi **Vite** (build command & output sudah diatur lewat `vercel.json`).
3. Buka **Environment Variables**, tambahkan:
   | Variabel | Nilai |
   |----------|-------|
   | `VITE_API_URL` | URL backend Railway (mis. `https://rajaac-erp-backend.up.railway.app`) |
4. Klik **Deploy**. Setelah selesai, kamu dapat domain, mis. `https://rajaac-erp.vercel.app`.

### Langkah 4 — Hubungkan CORS

1. Kembali ke Railway → **Variables** → set `CORS_ORIGIN` ke domain Vercel (mis. `https://rajaac-erp.vercel.app`). Bila lebih dari satu domain, pisahkan dengan koma.
2. Railway otomatis redeploy. Selesai! Buka domain Vercel dan login.

> **Catatan kamera QR:** Vercel & Railway sudah HTTPS, jadi fitur scan kamera akan berfungsi di perangkat yang mengizinkannya.

---

## 🔐 Environment Variables

**Backend** (`backend/.env`):

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL (Supabase) |
| `JWT_SECRET` | ✅ | Kunci rahasia untuk JWT — pakai string acak panjang |
| `PORT` | – | Port server (Railway mengisi otomatis) |
| `CORS_ORIGIN` | – | Domain frontend yang diizinkan; kosong = izinkan semua (dev) |

**Frontend** (`frontend/.env.local` atau env Vercel):

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `VITE_API_URL` | – (produksi ✅) | URL backend; kosong saat lokal (pakai proxy Vite) |

---

## 🔎 Catatan Teknis

- **Semua akses database terpusat di `backend/src/db.js`** yang mengekspor helper: `query`, `satu`, `semua`, dan `denganTransaksi`. Query berada di folder `routes/` dan seluruhnya `async`.
- Kolom `NUMERIC` PostgreSQL diparse otomatis menjadi `number` (bukan string) agar perhitungan PPN/total konsisten dengan frontend.
- Operasi kritis (pergerakan stok & pembuatan invoice) berjalan dalam **transaksi** dengan `SELECT ... FOR UPDATE` untuk mencegah race condition antar cabang/kasir.
- Skema tabel dibuat otomatis saat server start (`initSchema`), jadi database kosong pun langsung siap.

## 📝 Lisensi

Bebas dipakai dan dimodifikasi untuk kebutuhan toko Anda.
