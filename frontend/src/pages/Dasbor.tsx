import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah, tanggalID } from '../lib/format';
import type { Cabang, Invoice, StokRow } from '../lib/types';

export default function Dasbor() {
  const { user } = useAuth();
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [stok, setStok] = useState<StokRow[]>([]);
  const [invoice, setInvoice] = useState<Invoice[]>([]);

  useEffect(() => {
    api<Cabang[]>('/cabang').then((c) => {
      setCabang(c);
      if (user?.role === 'admin' && !cabangId && c.length) setCabangId(c[0].id);
    });
  }, []);

  useEffect(() => {
    if (!cabangId) return;
    api<StokRow[]>(`/stok?cabang_id=${cabangId}`).then(setStok);
    api<Invoice[]>(`/invoice?cabang_id=${cabangId}`).then(setInvoice);
  }, [cabangId]);

  const totalProduk = stok.length;
  const totalStok = stok.reduce((a, s) => a + s.jumlah, 0);
  const stokRendah = stok.filter((s) => s.jumlah <= 3 && (s.kategori || '').toLowerCase() !== 'jasa');
  const totalPenjualan = invoice.reduce((a, i) => a + i.total, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dasbor</h1>
          <p className="text-sm text-slate-500">Ringkasan aktivitas toko</p>
        </div>
        {user?.role === 'admin' && (
          <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(Number(e.target.value))}>
            {cabang.map((c) => (
              <option key={c.id} value={c.id}>{c.nama}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kartu label="Jenis Produk" nilai={String(totalProduk)} icon="📦" warna="bg-blue-50 text-blue-600" />
        <Kartu label="Total Stok" nilai={String(totalStok)} icon="🔢" warna="bg-emerald-50 text-emerald-600" />
        <Kartu label="Stok Menipis" nilai={String(stokRendah.length)} icon="⚠️" warna="bg-amber-50 text-amber-600" />
        <Kartu label="Penjualan (total)" nilai={rupiah(totalPenjualan)} icon="💰" warna="bg-purple-50 text-purple-600" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-800">⚠️ Stok Menipis (≤ 3)</h2>
          {stokRendah.length === 0 ? (
            <p className="text-sm text-slate-400">Tidak ada stok menipis.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stokRendah.map((s) => (
                <li key={s.produk_id} className="flex justify-between py-2 text-sm">
                  <span>{s.nama} <span className="text-slate-400">({s.sku})</span></span>
                  <span className="font-semibold text-amber-600">{s.jumlah} {s.satuan}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-800">🧾 Invoice Terbaru</h2>
          {invoice.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada invoice.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {invoice.slice(0, 6).map((i) => (
                <li key={i.id} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{i.nomor}</span>
                    <span className="text-slate-400"> · {tanggalID(i.dibuat_pada)}</span>
                  </span>
                  <span className="font-semibold">{rupiah(i.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kartu({ label, nilai, icon, warna }: { label: string; nilai: string; icon: string; warna: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${warna}`}>{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-800">{nilai}</div>
      </div>
    </div>
  );
}
