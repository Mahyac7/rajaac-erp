# ERP Toko AC ❄️

Sistem ERP sederhana untuk toko AC dengan dukungan **multi-cabang** dan **multi-user**. Dibuat dengan Node.js/Express + SQLite (backend) dan React + Vite + TypeScript + Tailwind (frontend).

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

## 📁 Struktur Project

```
sandbox/
├── backend/          # API Express + SQLite
│   ├── src/
│   │   ├── server.js       # entry point
│   │   ├── db.js           # koneksi & skema SQLite
│   │   ├── seed.js         # data awal
│   │   ├── middleware/     # auth JWT & otorisasi role
│   │   └── routes/         # auth, cabang, users, produk, stok, invoice, pengaturan
│   └── data/erp.db         # file database (dibuat otomatis)
└── frontend/         # Aplikasi React
    └── src/
        ├── pages/          # halaman (Login, Dasbor, Produk, Stok, ScanQR, Invoice, dst)
        ├── components/     # Layout, Modal
        └── lib/            # api client, auth context, tipe, format
```

## 🚀 Cara Menjalankan

Butuh **Node.js 18+** (diuji pada Node 22).

### 1. Backend

```bash
cd backend
npm install
npm run seed      # buat database + data contoh (cukup sekali)
npm start         # jalan di http://localhost:4000
```

### 2. Frontend (terminal terpisah)

```bash
cd frontend
npm install
npm run dev       # jalan di http://localhost:5173
```

Buka **http://localhost:5173** di browser.

> Saat `npm run dev`, request ke `/api` otomatis diteruskan ke backend port 4000 (lihat `vite.config.ts`).

### Akun Demo

| Role  | Username | Password  | Akses           |
|-------|----------|-----------|-----------------|
| Admin | `admin`  | `admin123`  | Semua cabang    |
| Kasir | `kasir1` | `kasir123`  | Cabang Pusat    |
| Kasir | `kasir2` | `kasir123`  | Cabang Bandung  |
| Kasir | `kasir3` | `kasir123`  | Cabang Surabaya |

> ⚠️ Ganti password default ini sebelum dipakai sungguhan.

## 📷 Catatan tentang Scan QR

Fitur scan menggunakan kamera perangkat. Browser hanya mengizinkan akses kamera pada **HTTPS** atau **localhost**. Saat deploy online, pastikan pakai HTTPS agar scan berfungsi. Jika kamera tidak tersedia, gunakan input **SKU manual** di halaman Scan.

## 🔐 Konfigurasi (opsional)

Backend membaca environment variable berikut:

| Variabel     | Default                         | Keterangan                     |
|--------------|---------------------------------|--------------------------------|
| `PORT`       | `4000`                          | Port server                    |
| `JWT_SECRET` | `ganti-secret-ini-di-produksi`  | **Wajib diganti** di produksi  |
| `DB_PATH`    | `backend/data/erp.db`           | Lokasi file database SQLite    |

## 🐘 Migrasi ke PostgreSQL (untuk online / 3 cabang)

Saat ini pakai SQLite agar mudah dijalankan tanpa server database. Untuk produksi online yang diakses beberapa cabang sekaligus, PostgreSQL lebih cocok. Arsitektur sudah disiapkan agar migrasi relatif mudah:

1. **Semua akses DB terpusat di `backend/src/db.js`** dan query ada di folder `routes/`. Ganti driver `better-sqlite3` dengan `pg` (node-postgres).
2. **Sesuaikan sintaks skema**:
   - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY` (atau `GENERATED ALWAYS AS IDENTITY`).
   - `datetime('now','localtime')` → `NOW()`.
   - Query `better-sqlite3` yang sinkron (`.get()`, `.all()`, `.run()`) diubah ke query async `pg` (`await pool.query(...)`), sehingga handler route menjadi `async`.
3. **Pindahkan data** dengan mengekspor dari SQLite lalu impor ke PostgreSQL, atau jalankan ulang `seed.js` versi PostgreSQL.
4. **Hosting PostgreSQL**: bisa mulai gratis di **Supabase** atau **Neon**, atau berbayar mulai ~$5–25/bulan (Railway, Aiven, atau VPS sendiri). Harga dapat berubah — cek situs provider untuk info terkini.

Karena logika bisnis (perhitungan PPN, pengurangan stok, penomoran invoice) sudah dipisah rapi di route, migrasi utamanya menyentuh lapisan query, bukan aturan bisnis.

## 📝 Lisensi

Bebas dipakai dan dimodifikasi untuk kebutuhan toko Anda.
