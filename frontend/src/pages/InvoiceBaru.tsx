import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah } from '../lib/format';
import type { Cabang, Pengaturan, Produk } from '../lib/types';

interface Baris {
  produk: Produk;
  jumlah: number;
}

export default function InvoiceBaru() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const nav = useNavigate();
  const location = useLocation();
  const skuAwal = (location.state as { sku?: string } | null)?.sku;

  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [namaPembeli, setNamaPembeli] = useState('');
  const [persenPpn, setPersenPpn] = useState(11);
  const [cari, setCari] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) api<Cabang[]>('/cabang').then((c) => {
      setCabang(c);
      if (!cabangId && c.length) setCabangId(c[0].id);
    });
    api<Pengaturan>('/pengaturan').then((p) => setPersenPpn(p.persen_ppn ?? 11));
    api<Produk[]>('/produk').then((p) => {
      setProduk(p);
      if (skuAwal) {
        const found = p.find((x) => x.sku === skuAwal);
        if (found) setBaris([{ produk: found, jumlah: 1 }]);
      }
    });
  }, []);

  function tambah(p: Produk) {
    setBaris((b) => {
      const ada = b.find((x) => x.produk.id === p.id);
      if (ada) return b.map((x) => (x.produk.id === p.id ? { ...x, jumlah: x.jumlah + 1 } : x));
      return [...b, { produk: p, jumlah: 1 }];
    });
  }
  function ubahJumlah(id: number, jumlah: number) {
    setBaris((b) => b.map((x) => (x.produk.id === id ? { ...x, jumlah: Math.max(1, jumlah) } : x)));
  }
  function hapus(id: number) {
    setBaris((b) => b.filter((x) => x.produk.id !== id));
  }

  const subtotal = baris.reduce((a, x) => a + x.produk.harga_jual * x.jumlah, 0);
  const nilaiPpn = Math.round((subtotal * persenPpn) / 100);
  const total = subtotal + nilaiPpn;

  const terfilter = produk.filter(
    (p) => p.nama.toLowerCase().includes(cari.toLowerCase()) || p.sku.toLowerCase().includes(cari.toLowerCase())
  );

  async function simpan() {
    setError('');
    if (baris.length === 0) { setError('Tambahkan minimal 1 produk.'); return; }
    setLoading(true);
    try {
      const inv = await api<{ id: number }>('/invoice', {
        method: 'POST',
        body: {
          cabang_id: cabangId,
          nama_pembeli: namaPembeli,
          persen_ppn: persenPpn,
          items: baris.map((x) => ({ produk_id: x.produk.id, jumlah: x.jumlah })),
        },
      });
      nav(`/invoice/${inv.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Invoice Baru</h1>
        <p className="text-sm text-slate-500">Pilih produk, atur jumlah, lalu simpan. Stok otomatis berkurang.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Katalog produk */}
        <div className="card lg:col-span-1">
          <input className="input mb-3" placeholder="Cari produk..." value={cari} onChange={(e) => setCari(e.target.value)} />
          <div className="max-h-[420px] space-y-1 overflow-auto">
            {terfilter.map((p) => (
              <button key={p.id} onClick={() => tambah(p)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span>
                  <span className="font-medium">{p.nama}</span>
                  <span className="block font-mono text-xs text-slate-400">{p.sku} · stok {p.stok ?? 0}</span>
                </span>
                <span className="text-merek-600">{rupiah(p.harga_jual)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Keranjang */}
        <div className="card lg:col-span-2">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Nama Pembeli</label>
              <input className="input" value={namaPembeli} onChange={(e) => setNamaPembeli(e.target.value)} placeholder="Umum / nama pelanggan" />
            </div>
            {isAdmin && (
              <div>
                <label className="label">Cabang</label>
                <select className="input" value={cabangId ?? ''} onChange={(e) => setCabangId(Number(e.target.value))}>
                  {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                </select>
              </div>
            )}
          </div>

          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="th">Produk</th>
                <th className="th text-right">Harga</th>
                <th className="th text-center">Jumlah</th>
                <th className="th text-right">Subtotal</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baris.map((x) => (
                <tr key={x.produk.id}>
                  <td className="td">{x.produk.nama}</td>
                  <td className="td text-right">{rupiah(x.produk.harga_jual)}</td>
                  <td className="td text-center">
                    <input type="number" min={1} className="input w-20 text-center" value={x.jumlah} onChange={(e) => ubahJumlah(x.produk.id, Number(e.target.value))} />
                  </td>
                  <td className="td text-right font-medium">{rupiah(x.produk.harga_jual * x.jumlah)}</td>
                  <td className="td text-center">
                    <button className="text-red-500 hover:text-red-700" onClick={() => hapus(x.produk.id)}>✕</button>
                  </td>
                </tr>
              ))}
              {baris.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={5}>Klik produk di kiri untuk menambah.</td></tr>}
            </tbody>
          </table>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{rupiah(subtotal)}</span></div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">PPN
                <input type="number" className="input ml-2 inline-block w-16 !py-1 text-center" value={persenPpn} onChange={(e) => setPersenPpn(Number(e.target.value))} />%
              </span>
              <span>{rupiah(nilaiPpn)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold"><span>Total</span><span>{rupiah(total)}</span></div>
          </div>

          {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => nav('/invoice')}>Batal</button>
            <button className="btn-primary" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan & Cetak'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
