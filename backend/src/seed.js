// Seed data awal: cabang, user admin & kasir, produk contoh, pengaturan toko.
// Jalankan: npm run seed
import bcrypt from 'bcryptjs';
import db, { initSchema, buatTransaksi } from './db.js';

initSchema();

const hash = (pw) => bcrypt.hashSync(pw, 10);

const seed = buatTransaksi(() => {
  // Cabang
  const cabangCount = db.prepare('SELECT COUNT(*) c FROM cabang').get().c;
  if (cabangCount === 0) {
    const insCabang = db.prepare('INSERT INTO cabang (nama, alamat, telepon) VALUES (?,?,?)');
    insCabang.run('Cabang Pusat', 'Jl. Merdeka No. 1, Jakarta', '021-1111111');
    insCabang.run('Cabang Bandung', 'Jl. Asia Afrika No. 10, Bandung', '022-2222222');
    insCabang.run('Cabang Surabaya', 'Jl. Pemuda No. 5, Surabaya', '031-3333333');
    console.log('✓ 3 cabang dibuat');
  }

  // Users
  const userCount = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  if (userCount === 0) {
    const insUser = db.prepare(
      'INSERT INTO users (nama, username, password, role, cabang_id) VALUES (?,?,?,?,?)'
    );
    insUser.run('Administrator', 'admin', hash('admin123'), 'admin', null);
    insUser.run('Kasir Pusat', 'kasir1', hash('kasir123'), 'kasir', 1);
    insUser.run('Kasir Bandung', 'kasir2', hash('kasir123'), 'kasir', 2);
    insUser.run('Kasir Surabaya', 'kasir3', hash('kasir123'), 'kasir', 3);
    console.log('✓ User admin & kasir dibuat');
  }

  // Produk contoh
  const produkCount = db.prepare('SELECT COUNT(*) c FROM produk').get().c;
  if (produkCount === 0) {
    const insProduk = db.prepare(
      'INSERT INTO produk (sku, nama, kategori, satuan, harga_beli, harga_jual) VALUES (?,?,?,?,?,?)'
    );
    const produkList = [
      ['AC-SPT-05', 'AC Split 1/2 PK Standar', 'AC Split', 'unit', 2500000, 3200000],
      ['AC-SPT-10', 'AC Split 1 PK Inverter', 'AC Split', 'unit', 3800000, 4900000],
      ['AC-SPT-15', 'AC Split 1.5 PK Inverter', 'AC Split', 'unit', 5200000, 6500000],
      ['AC-CST-20', 'AC Cassette 2 PK', 'AC Cassette', 'unit', 8500000, 10500000],
      ['SP-FRE-01', 'Freon R32 (per kg)', 'Sparepart', 'kg', 90000, 150000],
      ['SP-PIP-01', 'Pipa Tembaga 1/4 (per meter)', 'Sparepart', 'meter', 35000, 55000],
      ['SP-BRK-01', 'Bracket Outdoor', 'Sparepart', 'set', 45000, 80000],
      ['JS-PSG-01', 'Jasa Pasang AC Split', 'Jasa', 'unit', 0, 350000],
    ];
    for (const p of produkList) insProduk.run(...p);
    console.log('✓ 8 produk contoh dibuat');

    // Stok awal untuk tiap cabang
    const produkIds = db.prepare('SELECT id FROM produk').all().map((r) => r.id);
    const cabangIds = db.prepare('SELECT id FROM cabang').all().map((r) => r.id);
    const insStok = db.prepare(
      'INSERT INTO stok (produk_id, cabang_id, jumlah) VALUES (?,?,?)'
    );
    for (const pid of produkIds) {
      for (const cid of cabangIds) {
        insStok.run(pid, cid, 10);
      }
    }
    console.log('✓ Stok awal 10 per produk per cabang dibuat');
  }

  // Pengaturan toko
  const setCount = db.prepare('SELECT COUNT(*) c FROM pengaturan').get().c;
  if (setCount === 0) {
    db.prepare(
      'INSERT INTO pengaturan (id, nama_toko, alamat, telepon, logo, persen_ppn) VALUES (1,?,?,?,?,?)'
    ).run(
      'Toko AC Sejahtera',
      'Jl. Merdeka No. 1, Jakarta Pusat',
      '021-1111111',
      null,
      11
    );
    console.log('✓ Pengaturan toko dibuat');
  }
});

seed();
console.log('\nSeed selesai! Login default:');
console.log('  Admin  -> username: admin   password: admin123');
console.log('  Kasir  -> username: kasir1  password: kasir123');
