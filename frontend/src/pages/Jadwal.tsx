import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Cabang, Jadwal, StatusJadwal } from '../lib/types';
import Modal from '../components/Modal';

const labelStatus: Record<StatusJadwal, { teks: string; kelas: string }> = {
  dijadwalkan: { teks: 'Dijadwalkan', kelas: 'bg-blue-100 text-blue-700' },
  selesai: { teks: 'Selesai', kelas: 'bg-emerald-100 text-emerald-700' },
  batal: { teks: 'Batal', kelas: 'bg-slate-100 text-slate-500' },
};

function tglHariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const kosong = () => ({ tanggal: tglHariIni(), jenis: 'pasang', nama_pelanggan: '', telepon: '', alamat: '', teknisi: '', catatan: '' });

export default function JadwalPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [list, setList] = useState<Jadwal[]>([]);
  const [filter, setFilter] = useState<'' | StatusJadwal>('');
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { if (isAdmin) api<Cabang[]>('/cabang').then((c) => { setCabang(c); if (!cabangId && c.length) setCabangId(c[0].id); }); }, []);

  function muat() {
    const q = new URLSearchParams();
    if (cabangId) q.set('cabang_id', String(cabangId));
    if (filter) q.set('status', filter);
    api<Jadwal[]>(`/jadwal?${q}`).then(setList);
  }
  useEffect(muat, [cabangId, filter]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const body = { ...form, cabang_id: cabangId };
      if (form.id) await api(`/jadwal/${form.id}`, { method: 'PUT', body });
      else await api('/jadwal', { method: 'POST', body });
      setForm(null); muat();
    } catch (err) { setError((err as Error).message); }
  }

  async function ubahStatus(j: Jadwal, status: StatusJadwal) {
    await api(`/jadwal/${j.id}`, { method: 'PUT', body: { status } });
    muat();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Servis & Pemasangan</h1>
          <p className="text-sm text-slate-500">Kelola jadwal teknisi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(Number(e.target.value))}>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          )}
          <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="">Semua Status</option>
            <option value="dijadwalkan">Dijadwalkan</option>
            <option value="selesai">Selesai</option>
            <option value="batal">Batal</option>
          </select>
          <button className="btn-primary" onClick={() => setForm(kosong())}>+ Jadwal Baru</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Tanggal</th><th className="th">Jenis</th><th className="th">Pelanggan</th>
              <th className="th">Teknisi</th><th className="th">Status</th><th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((j) => (
              <tr key={j.id}>
                <td className="td">{j.tanggal?.slice(0, 10)}</td>
                <td className="td"><span className="badge bg-slate-100 text-slate-600">{j.jenis === 'pasang' ? 'Pemasangan' : 'Servis'}</span></td>
                <td className="td">
                  <div className="font-medium">{j.nama_pelanggan || j.pelanggan_nama_ref || '-'}</div>
                  {j.alamat && <div className="text-xs text-slate-400">{j.alamat}</div>}
                </td>
                <td className="td">{j.teknisi || '-'}</td>
                <td className="td"><span className={`badge ${labelStatus[j.status].kelas}`}>{labelStatus[j.status].teks}</span></td>
                <td className="td text-center">
                  <div className="flex justify-center gap-1">
                    <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setForm({ ...j, tanggal: j.tanggal?.slice(0, 10) })}>Edit</button>
                    {j.status === 'dijadwalkan' && (
                      <>
                        <button className="btn !bg-emerald-100 !text-emerald-700 !px-2 !py-1 text-xs" onClick={() => ubahStatus(j, 'selesai')}>Selesai</button>
                        <button className="btn !bg-slate-100 !text-slate-600 !px-2 !py-1 text-xs" onClick={() => ubahStatus(j, 'batal')}>Batal</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={6}>Belum ada jadwal.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal judul={form.id ? 'Edit Jadwal' : 'Jadwal Baru'} onTutup={() => setForm(null)}>
          <form onSubmit={simpan} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Tanggal</label><input type="date" className="input" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} required /></div>
              <div><label className="label">Jenis</label>
                <select className="input" value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })}>
                  <option value="pasang">Pemasangan</option>
                  <option value="servis">Servis</option>
                </select>
              </div>
            </div>
            <div><label className="label">Nama Pelanggan</label><input className="input" value={form.nama_pelanggan || ''} onChange={(e) => setForm({ ...form, nama_pelanggan: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Telepon</label><input className="input" value={form.telepon || ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} /></div>
              <div><label className="label">Teknisi</label><input className="input" value={form.teknisi || ''} onChange={(e) => setForm({ ...form, teknisi: e.target.value })} placeholder="Nama teknisi" /></div>
            </div>
            <div><label className="label">Alamat</label><input className="input" value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} /></div>
            <div><label className="label">Catatan</label><input className="input" value={form.catatan || ''} onChange={(e) => setForm({ ...form, catatan: e.target.value })} /></div>
            {form.id && (
              <div><label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="dijadwalkan">Dijadwalkan</option>
                  <option value="selesai">Selesai</option>
                  <option value="batal">Batal</option>
                </select>
              </div>
            )}
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={() => setForm(null)}>Batal</button><button type="submit" className="btn-primary">Simpan</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
