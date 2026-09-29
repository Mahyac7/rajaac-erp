import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Cabang } from '../lib/types';
import Modal from '../components/Modal';

interface UserRow {
  id: number;
  nama: string;
  username: string;
  role: 'admin' | 'kasir';
  cabang_id: number | null;
  cabang_nama?: string;
  aktif: number;
}

const kosong = { nama: '', username: '', password: '', role: 'kasir', cabang_id: null as number | null, aktif: 1 };

export default function Pengguna() {
  const [list, setList] = useState<UserRow[]>([]);
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState('');

  function muat() {
    api<UserRow[]>('/users').then(setList);
  }
  useEffect(() => {
    muat();
    api<Cabang[]>('/cabang').then(setCabang);
  }, []);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await api(`/users/${form.id}`, { method: 'PUT', body: form });
      } else {
        await api('/users', { method: 'POST', body: form });
      }
      setForm(null);
      muat();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengguna</h1>
          <p className="text-sm text-slate-500">Kelola akun admin & kasir</p>
        </div>
        <button className="btn-primary" onClick={() => setForm({ ...kosong })}>+ Tambah Pengguna</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Nama</th>
              <th className="th">Username</th>
              <th className="th">Role</th>
              <th className="th">Cabang</th>
              <th className="th">Status</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.id}>
                <td className="td font-medium">{u.nama}</td>
                <td className="td font-mono text-xs">{u.username}</td>
                <td className="td">
                  <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Kasir'}
                  </span>
                </td>
                <td className="td">{u.cabang_nama || '-'}</td>
                <td className="td">
                  <span className={`badge ${u.aktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.aktif ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="td text-center">
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setForm({ ...u, password: '' })}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal judul={form.id ? 'Edit Pengguna' : 'Tambah Pengguna'} onTutup={() => setForm(null)}>
          <form onSubmit={simpan} className="space-y-3">
            <div>
              <label className="label">Nama</label>
              <input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            {!form.id && (
              <div>
                <label className="label">Username</label>
                <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="label">{form.id ? 'Password baru (kosongkan jika tidak diubah)' : 'Password'}</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!form.id} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="kasir">Kasir</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {form.role === 'kasir' && (
                <div>
                  <label className="label">Cabang</label>
                  <select className="input" value={form.cabang_id ?? ''} onChange={(e) => setForm({ ...form, cabang_id: Number(e.target.value) })} required>
                    <option value="">Pilih cabang</option>
                    {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
                  </select>
                </div>
              )}
            </div>
            {form.id && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.aktif} onChange={(e) => setForm({ ...form, aktif: e.target.checked ? 1 : 0 })} />
                Akun aktif
              </label>
            )}
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className="btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
