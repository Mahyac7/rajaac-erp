import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { eksporExcel, eksporPDF } from '../lib/ekspor';
import type { Cabang, Garansi, StatusGaransi } from '../lib/types';

const labelStatus: Record<StatusGaransi, { teks: string; kelas: string }> = {
  aktif: { teks: 'Aktif', kelas: 'bg-emerald-100 text-emerald-700' },
  hampir_habis: { teks: 'Hampir Habis', kelas: 'bg-amber-100 text-amber-700' },
  kadaluarsa: { teks: 'Kadaluarsa', kelas: 'bg-red-100 text-red-700' },
};

export default function GaransiPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [list, setList] = useState<Garansi[]>([]);
  const [cari, setCari] = useState('');
  const [filter, setFilter] = useState<'' | StatusGaransi>('');

  useEffect(() => { if (isAdmin) api<Cabang[]>('/cabang').then(setCabang); }, []);

  function muat() {
    const q = new URLSearchParams();
    if (cabangId) q.set('cabang_id', String(cabangId));
    if (cari) q.set('cari', cari);
    api<Garansi[]>(`/garansi?${q}`).then(setList);
  }
  useEffect(() => { const t = setTimeout(muat, 250); return () => clearTimeout(t); }, [cabangId, cari]);

  const tampil = filter ? list.filter((g) => g.status === filter) : list;
  const hitung = (s: StatusGaransi) => list.filter((g) => g.status === s).length;

  const kolom = [
    { key: 'nama_produk', label: 'Produk' }, { key: 'sku', label: 'SKU' },
    { key: 'nama_pembeli', label: 'Pembeli' }, { key: 'invoice_nomor', label: 'Invoice' },
    { key: 'mulai', label: 'Mulai' }, { key: 'habis', label: 'Habis' }, { key: 'status', label: 'Status' },
  ];
  const dataEkspor = () => tampil.map((g) => ({ ...g, mulai: g.mulai?.slice(0, 10), habis: g.habis?.slice(0, 10) }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Garansi</h1>
          <p className="text-sm text-slate-500">Lacak masa garansi unit terjual</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Semua Cabang</option>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          )}
          <button className="btn-secondary" onClick={() => eksporExcel('garansi', 'Garansi', kolom, dataEkspor())}>⬇ Excel</button>
          <button className="btn-secondary" onClick={() => eksporPDF('garansi', 'Daftar Garansi', kolom, dataEkspor())}>⬇ PDF</button>
        </div>
      </div>

      {/* Ringkasan status (klik untuk filter) */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {(['aktif', 'hampir_habis', 'kadaluarsa'] as StatusGaransi[]).map((s) => (
          <button key={s} onClick={() => setFilter(filter === s ? '' : s)}
            className={`card text-left ${filter === s ? 'ring-2 ring-merek-500' : ''}`}>
            <div className="text-xs text-slate-500">{labelStatus[s].teks}</div>
            <div className="text-2xl font-bold text-slate-800">{hitung(s)}</div>
          </button>
        ))}
      </div>

      <div className="card mb-4">
        <input className="input" placeholder="Cari produk / SKU / pembeli..." value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Produk</th><th className="th">Pembeli</th><th className="th">Invoice</th>
              <th className="th">Mulai</th><th className="th">Habis</th><th className="th">Sisa</th><th className="th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tampil.map((g) => (
              <tr key={g.id}>
                <td className="td"><div className="font-medium">{g.nama_produk}</div><div className="font-mono text-xs text-slate-400">{g.sku}</div></td>
                <td className="td">{g.pelanggan_nama || g.nama_pembeli || '-'}</td>
                <td className="td font-mono text-xs">{g.invoice_nomor || '-'}</td>
                <td className="td">{g.mulai?.slice(0, 10)}</td>
                <td className="td">{g.habis?.slice(0, 10)}</td>
                <td className="td">{g.sisa_hari < 0 ? '-' : `${g.sisa_hari} hari`}</td>
                <td className="td"><span className={`badge ${labelStatus[g.status].kelas}`}>{labelStatus[g.status].teks}</span></td>
              </tr>
            ))}
            {tampil.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={7}>Tidak ada data garansi.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
