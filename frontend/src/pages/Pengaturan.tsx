import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Pengaturan } from '../lib/types';

export default function PengaturanPage() {
  const [form, setForm] = useState<Pengaturan>({});
  const [pesan, setPesan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Pengaturan>('/pengaturan').then(setForm);
  }, []);

  function pilihLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { setError('Ukuran logo maksimal 1MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logo: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(''); setError(''); setLoading(true);
    try {
      await api('/pengaturan', { method: 'PUT', body: form });
      setPesan('Pengaturan berhasil disimpan.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Toko</h1>
        <p className="text-sm text-slate-500">Data ini tampil di header invoice</p>
      </div>

      <form onSubmit={simpan} className="card max-w-xl space-y-4">
        <div className="flex items-center gap-4">
          {form.logo ? (
            <img src={form.logo} alt="logo" className="h-20 w-20 rounded-lg border border-slate-200 object-contain" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-merek-50 text-3xl">❄️</div>
          )}
          <div>
            <label className="label">Logo Toko</label>
            <input type="file" accept="image/*" onChange={pilihLogo} className="text-sm" />
            {form.logo && (
              <button type="button" className="mt-1 block text-xs text-red-600" onClick={() => setForm({ ...form, logo: null })}>Hapus logo</button>
            )}
          </div>
        </div>
        <div>
          <label className="label">Nama Toko</label>
          <input className="input" value={form.nama_toko || ''} onChange={(e) => setForm({ ...form, nama_toko: e.target.value })} />
        </div>
        <div>
          <label className="label">Alamat</label>
          <input className="input" value={form.alamat || ''} onChange={(e) => setForm({ ...form, alamat: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Telepon</label>
            <input className="input" value={form.telepon || ''} onChange={(e) => setForm({ ...form, telepon: e.target.value })} />
          </div>
          <div>
            <label className="label">PPN Default (%)</label>
            <input type="number" className="input" value={form.persen_ppn ?? 11} onChange={(e) => setForm({ ...form, persen_ppn: Number(e.target.value) })} />
          </div>
        </div>
        <div>
          <label className="label">Batas Stok Menipis</label>
          <input type="number" className="input" value={form.batas_stok ?? 5} onChange={(e) => setForm({ ...form, batas_stok: Number(e.target.value) })} />
          <p className="mt-1 text-xs text-slate-400">Produk dengan stok ≤ angka ini akan muncul di notifikasi stok menipis.</p>
        </div>
        {pesan && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{pesan}</div>}
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
        </div>
      </form>
    </div>
  );
}
