// Tipe data bersama.
export type Role = 'admin' | 'kasir';

export interface User {
  id: number;
  nama: string;
  username: string;
  role: Role;
  cabang_id: number | null;
}

export interface Cabang {
  id: number;
  nama: string;
  alamat?: string;
  telepon?: string;
}

export interface Produk {
  id: number;
  sku: string;
  nama: string;
  kategori?: string;
  satuan?: string;
  harga_beli: number;
  harga_jual: number;
  stok?: number;
}

export interface StokRow {
  produk_id: number;
  sku: string;
  nama: string;
  kategori?: string;
  satuan?: string;
  harga_jual: number;
  jumlah: number;
}

export interface Pengaturan {
  nama_toko?: string;
  alamat?: string;
  telepon?: string;
  logo?: string | null;
  persen_ppn?: number;
}

export interface InvoiceItem {
  id: number;
  produk_id: number;
  nama_produk: string;
  sku: string;
  harga: number;
  jumlah: number;
  subtotal: number;
}

export interface Invoice {
  id: number;
  nomor: string;
  cabang_id: number;
  nama_pembeli?: string;
  subtotal: number;
  persen_ppn: number;
  nilai_ppn: number;
  total: number;
  dibuat_pada: string;
  cabang_nama?: string;
  cabang_alamat?: string;
  kasir_nama?: string;
  items?: InvoiceItem[];
  pengaturan?: Pengaturan;
}
