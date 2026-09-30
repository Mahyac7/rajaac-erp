// Seed data awal: cabang, user admin & kasir, produk contoh, pengaturan toko.
// Jalankan: npm run seed
import bcrypt from 'bcryptjs';
import pool, { initSchema, denganTransaksi } from './db.js';

const hash = (pw) => bcrypt.hashSync(pw, 10);

async function seed() {
  await initSchema();

  await denganTransaksi(async (client) => {
    // Cabang
    const { rows: cRows } = await client.query('SELECT COUNT(*)::int AS c FROM cabang');
    if (cRows[0].c === 0) {
      const data = [
        ['Cabang Pusat', 'Jl. Merdeka No. 1, Jakarta', '021-1111111'],
        ['Cabang Bandung', 'Jl. Asia Afrika No. 10, Bandung', '022-2222222'],
        ['Cabang Surabaya', 'Jl. Pemuda No. 5, Surabaya', '031-3333333'],
      ];
      for (const d of data) {
        await client.query('INSERT INTO cabang (nama, alamat, telepon) VALUES ($1,$2,$3)', d);
      }
      console.log('✓ 3 cabang dibuat');
    }

    // Users
    const { rows: uRows } = await client.query('SELECT COUNT(*)::int AS c FROM users');
    if (uRows[0].c === 0) {
      const data = [
        ['Administrator', 'admin', hash('admin123'), 'admin', null],
        ['Kasir Pusat', 'kasir1', hash('kasir123'), 'kasir', 1],
        ['Kasir Bandung', 'kasir2', hash('kasir123'), 'kasir', 2],
        ['Kasir Surabaya', 'kasir3', hash('kasir123'), 'kasir', 3],
      ];
      for (const d of data) {
        await client.query(
          'INSERT INTO users (nama, username, password, role, cabang_id) VALUES ($1,$2,$3,$4,$5)',
          d
        );
      }
      console.log('✓ User admin & kasir dibuat');
    }

    // Produk contoh + stok awal
    const { rows: pRows } = await client.query('SELECT COUNT(*)::int AS c FROM produk');
    if (pRows[0].c === 0) {
      // Kolom terakhir = garansi_bulan (AC 12 bln, sparepart/jasa 0).
      const produkList = [
        ['AC-SPT-05', 'AC Split 1/2 PK Standar', 'AC Split', 'unit', 2500000, 3200000, 12],
        ['AC-SPT-10', 'AC Split 1 PK Inverter', 'AC Split', 'unit', 3800000, 4900000, 12],
        ['AC-SPT-15', 'AC Split 1.5 PK Inverter', 'AC Split', 'unit', 5200000, 6500000, 12],
        ['AC-CST-20', 'AC Cassette 2 PK', 'AC Cassette', 'unit', 8500000, 10500000, 24],
        ['SP-FRE-01', 'Freon R32 (per kg)', 'Sparepart', 'kg', 90000, 150000, 0],
        ['SP-PIP-01', 'Pipa Tembaga 1/4 (per meter)', 'Sparepart', 'meter', 35000, 55000, 0],
        ['SP-BRK-01', 'Bracket Outdoor', 'Sparepart', 'set', 45000, 80000, 0],
        ['JS-PSG-01', 'Jasa Pasang AC Split', 'Jasa', 'unit', 0, 350000, 0],
      ];
      for (const p of produkList) {
        await client.query(
          'INSERT INTO produk (sku, nama, kategori, satuan, harga_beli, harga_jual, garansi_bulan) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          p
        );
      }
      console.log('✓ 8 produk contoh dibuat');

      // Stok awal 10 untuk tiap produk di tiap cabang
      await client.query(
        `INSERT INTO stok (produk_id, cabang_id, jumlah)
         SELECT p.id, c.id, 10 FROM produk p CROSS JOIN cabang c
         ON CONFLICT (produk_id, cabang_id) DO NOTHING`
      );
      console.log('✓ Stok awal 10 per produk per cabang dibuat');
    }

    // Pengaturan toko
    const { rows: sRows } = await client.query('SELECT COUNT(*)::int AS c FROM pengaturan');
    if (sRows[0].c === 0) {
      await client.query(
        'INSERT INTO pengaturan (id, nama_toko, alamat, telepon, logo, persen_ppn) VALUES (1,$1,$2,$3,$4,$5)',
        ['Toko AC Sejahtera', 'Jl. Merdeka No. 1, Jakarta Pusat', '021-1111111', null, 11]
      );
      console.log('✓ Pengaturan toko dibuat');
    }
  });

  console.log('\nSeed selesai! Login default:');
  console.log('  Admin  -> username: admin   password: admin123');
  console.log('  Kasir  -> username: kasir1  password: kasir123');
  await pool.end();
}

seed().catch((e) => {
  console.error('Seed gagal:', e.message);
  process.exit(1);
});
