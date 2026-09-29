import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { tanggalID } from '../lib/format';
import type { Cabang, StokRow } from '../lib/types';
import Modal from '../components/Modal';

interface Riwayat {
  id: number;
  tipe: 'masuk' | 'keluar';
  jumlah: number;
  keterangan?: string;
  produk_nama: string;
  sku: string;
  cabang_nama: string;
  user_nama?: string;
  dibuat_pada: string;
}

export default function StokPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [stok, setStok] = useState<StokRow[]>([]);
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [cari, setCari] = useState('');
  const [form, setForm] = useState<{ produk: StokRow; tipe: 'masuk' | 'keluar' } | null>(null);

  useEffect(() => {
    api<Cabang[]>('/cabang').then((c) => {
      setCabang(c);
      if (isAdmin && !cabangId && c.length) setCabangId(c[0].id);
    });
  }, []);

  function muat() {
    if (!cabangId) return;
    api<StokRow[]>(`/stok?cabang_id=${cabangId}`).then(setStok);
    api<Riwayat[]>(`/stok/riwayat?cabang_id=${cabangId}`).then(setRiwayat);
  }
  useEffect(muat, [cabangId]);

  const terfilter = stok.filter(
    (s) => s.nama.toLowerCase().includes(cari.toLowerCase()) || s.sku.toLowerCase().includes(cari.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Keluar / Masuk Barang</h1>
          <p className="text-sm text-slate-500">Catat barang masuk (restock) dan keluar (penyesuaian)</p>
        </div>
        {isAdmin && (
          <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(Number(e.target.value))}>
            {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
        )}
      </div>

      <div className="card mb-4">
        <input className="input" placeholder="Cari produk..." value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-x-auto p-0">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Produk</th>
                <th className="th text-right">Stok</th>
                <th className="th text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terfilter.map((s) => (
                <tr key={s.produk_id}>
                  <td className="td">
                    <div className="font-medium">{s.nama}</div>
                    <div className="font-mono text-xs text-slate-400">{s.sku}</div>
                  </td>
                  <td className="td text-right">
                    <span className={`font-semibold ${s.jumlah <= 3 ? 'text-amber-600' : 'text-slate-700'}`}>
                      {s.jumlah} {s.satuan}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex justify-center gap-1">
                      <button className="btn !bg-emerald-100 !text-emerald-700 !px-2 !py-1 text-xs" onClick={() => setForm({ produk: s, tipe: 'masuk' })}>+ Masuk</button>
                      <button className="btn !bg-red-100 !text-red-700 !px-2 !py-1 text-xs" onClick={() => setForm({ produk: s, tipe: 'keluar' })}>− Keluar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {terfilter.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={3}>Tidak ada produk.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="card p-0">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-800">Riwayat Pergerakan</h2>
          <div className="max-h-[500px] overflow-auto">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                {riwayat.map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${r.tipe === 'masuk' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {r.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                        </span>
                        <span className="font-medium">{r.produk_nama}</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {tanggalID(r.dibuat_pada)} · {r.user_nama || '-'}{r.keterangan ? ` · ${r.keterangan}` : ''}
                      </div>
                    </td>
                    <td className="td text-right font-semibold">
                      {r.tipe === 'masuk' ? '+' : '−'}{r.jumlah}
                    </td>
                  </tr>
                ))}
                {riwayat.length === 0 && <tr><td className="td text-center text-slate-400">Belum ada pergerakan.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {form && (
        <FormPergerakan
          produk={form.produk}
          tipe={form.tipe}
          cabangId={cabangId!}
          onTutup={() => setForm(null)}
          onSukses={() => { setForm(null); muat(); }}
        />
      )}
    </div>
  );
}

function FormPergerakan({
  produk, tipe, cabangId, onTutup, onSukses,
}: {
  produk: StokRow; tipe: 'masuk' | 'keluar'; cabangId: number; onTutup: () => void; onSukses: () => void;
}) {
  const [jumlah, setJumlah] = useState(1);
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api('/stok/pergerakan', {
        method: 'POST',
        body: { produk_id: produk.produk_id, cabang_id: cabangId, tipe, jumlah, keterangan },
      });
      onSukses();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal judul={`Barang ${tipe === 'masuk' ? 'Masuk' : 'Keluar'}`} onTutup={onTutup} lebar="max-w-md">
      <form onSubmit={submit} className="space-y-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="font-medium">{produk.nama}</div>
          <div className="font-mono text-xs text-slate-400">{produk.sku} · Stok saat ini: {produk.jumlah}</div>
        </div>
        <div>
          <label className="label">Jumlah</label>
          <input type="number" min={1} className="input" value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))} required />
        </div>
        <div>
          <label className="label">Keterangan (opsional)</label>
          <input className="input" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder={tipe === 'masuk' ? 'Restock dari supplier' : 'Penyesuaian / retur'} />
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onTutup}>Batal</button>
          <button type="submit" className={tipe === 'masuk' ? 'btn-primary' : 'btn-danger'} disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
