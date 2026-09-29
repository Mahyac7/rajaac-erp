import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah, tanggalID } from '../lib/format';
import type { Cabang, Invoice } from '../lib/types';

export default function InvoiceList() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [list, setList] = useState<Invoice[]>([]);

  useEffect(() => {
    if (isAdmin) api<Cabang[]>('/cabang').then(setCabang);
  }, []);

  useEffect(() => {
    const q = cabangId ? `?cabang_id=${cabangId}` : '';
    api<Invoice[]>(`/invoice${q}`).then(setList);
  }, [cabangId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoice</h1>
          <p className="text-sm text-slate-500">Daftar transaksi penjualan</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">Semua Cabang</option>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          )}
          <Link to="/invoice/baru" className="btn-primary">+ Invoice Baru</Link>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Nomor</th>
              <th className="th">Tanggal</th>
              <th className="th">Pembeli</th>
              <th className="th">Cabang</th>
              <th className="th text-right">Total</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((i) => (
              <tr key={i.id}>
                <td className="td font-mono text-xs">{i.nomor}</td>
                <td className="td">{tanggalID(i.dibuat_pada)}</td>
                <td className="td">{i.nama_pembeli || '-'}</td>
                <td className="td">{i.cabang_nama}</td>
                <td className="td text-right font-semibold">{rupiah(i.total)}</td>
                <td className="td text-center">
                  <Link to={`/invoice/${i.id}`} className="btn-secondary !px-2 !py-1 text-xs">Lihat</Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={6}>Belum ada invoice.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
