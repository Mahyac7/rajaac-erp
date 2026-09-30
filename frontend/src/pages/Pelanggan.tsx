import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { rupiah, tanggalID } from '../lib/format';
import type { Pelanggan } from '../lib/types';
import Modal from '../components/Modal';

const kosong = { nama: '', telepon: '', alamat: '', catatan: '' };

export default function PelangganPage() {
  const [list, setList] = useState<Pelanggan[]>([]);
  const [cari, setCari] = useState('');
  const [form, setForm] = useState<any>(null);
  const [detail, setDetail] = useState<Pelanggan | null>(null);
  const [error, setError] = useState('');

  function muat() {
    const qs = cari ? `?cari=${encodeURIComponent(cari)}` : '';
    api<Pelanggan[]>(`/pelanggan${qs}`).then(setList);
  }
  useEffect(() => { const t = setTimeout(muat, 250); return () => clearTimeout(t); }, [cari]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (form.id) await api(`/pelanggan/${form.id}`, { method: 'PUT', body: form });
      else await api('/pelanggan', { method: 'POST', body: form });
      setForm(null);
      muat();
    } catch (err) { setError((err as Error).message); }
  }

  async function hapus(id: number) {
    if (!confirm('Hapus pelanggan ini?')) return;
    try { await api(`/pelanggan/${id}`, { method: 'DELETE' }); muat(); }
    catch (err) { alert((err as Error).message); }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pelanggan</h1>
          <p className="text-sm text-slate-500">Data pelanggan & riwayat pembelian</p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ ...kosong })}>+ Tambah Pelanggan</button>
      </div>

      <div className="card mb-4">
        <input className="input" placeholder="Cari nama / telepon..." value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Nama</th>
              <th className="th">Telepon</th>
              <th className="th">Alamat</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((p) => (
              <tr key={p.id}>
                <td className="td font-medium">{p.nama}</td>
                <td className="td">{p.telepon || '-'}</td>
                <td className="td">{p.alamat || '-'}</td>
                <td className="td text-center">
                  <div className="flex justify-center gap-2">
                    <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => api<Pelanggan>(`/pelanggan/${p.id}`).then(setDetail)}>Detail</button>
                    <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setForm({ ...p })}>Edit</button>
                    <button className="btn-danger !px-2 !py-1 text-xs" onClick={() => hapus(p.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={4}>Belum ada pelanggan.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal judul={form.id ? 'Edit Pelanggan' : 'Tambah Pelanggan'} onTutup={() => setForm(null)}>
          <form onSubmit={simpan} className="space-y-3">
            <div><label className="label">Nama</label><input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required /></div>
            <div><label className="label">Telepon</label><input className="input" value={form.telepon || ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} /></div>
            <div><label className="label">Alamat</label><input className="input" value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
            <div><label className="label">Catatan</label><input className="input" value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setForm(null)}>Batal</button><button type="submit" className="btn-primary">Simpan</button></div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal judul={`Pelanggan: ${detail.nama}`} onTutup={() => setDetail(null)} lebar="max-w-2xl">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-slate-400">Telepon:</span> {detail.telepon || '-'}</div>
              <div><span className="text-slate-400">Alamat:</span> {detail.alamat || '-'}</div>
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Riwayat Pembelian</h3>
              {detail.invoice && detail.invoice.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detail.invoice.map((i) => (
                    <li key={i.id} className="flex justify-between px-3 py-1.5"><span className="font-mono text-xs">{i.nomor} · {tanggalID(i.dibuat_pada)}</span><span className="font-medium">{rupiah(i.total)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-slate-400">Belum ada pembelian.</p>}
            </div>
            <div>
              <h3 className="mb-1 font-semibold">Garansi</h3>
              {detail.garansi && detail.garansi.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detail.garansi.map((g) => (
                    <li key={g.id} className="flex justify-between px-3 py-1.5"><span>{g.nama_produk} <span className="text-slate-400">({g.sku})</span></span><span className="text-xs">s/d {g.habis?.slice(0, 10)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-slate-400">Tidak ada garansi.</p>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
