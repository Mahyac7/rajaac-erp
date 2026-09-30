import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah, tanggalID } from '../lib/format';
import type { Cabang, Produk, Retur } from '../lib/types';
import Modal from '../components/Modal';

interface Baris { produk: Produk; jumlah: number; }

export default function ReturPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [list, setList] = useState<Retur[]>([]);
  const [form, setForm] = useState(false);
  const [detail, setDetail] = useState<Retur | null>(null);

  useEffect(() => {
    if (isAdmin) api<Cabang[]>('/cabang').then((c) => { setCabang(c); if (!cabangId && c.length) setCabangId(c[0].id); });
  }, []);

  function muat() {
    const qs = cabangId ? `?cabang_id=${cabangId}` : '';
    api<Retur[]>(`/retur${qs}`).then(setList);
  }
  useEffect(muat, [cabangId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Retur Barang</h1>
          <p className="text-sm text-slate-500">Catat barang yang dikembalikan pelanggan — stok otomatis kembali</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(Number(e.target.value))}>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          )}
          <button className="btn-primary" onClick={() => setForm(true)}>+ Retur Baru</button>
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Nomor</th>
              <th className="th">Tanggal</th>
              <th className="th">Invoice Asal</th>
              <th className="th">Alasan</th>
              <th className="th text-right">Total</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id}>
                <td className="td font-mono text-xs">{r.nomor}</td>
                <td className="td">{tanggalID(r.dibuat_pada)}</td>
                <td className="td font-mono text-xs">{r.invoice_nomor || '-'}</td>
                <td className="td">{r.alasan || '-'}</td>
                <td className="td text-right font-semibold">{rupiah(r.total)}</td>
                <td className="td text-center">
                  <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => api<Retur>(`/retur/${r.id}`).then(setDetail)}>Lihat</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={6}>Belum ada retur.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <FormRetur
          cabangId={cabangId!}
          onTutup={() => setForm(false)}
          onSukses={() => { setForm(false); muat(); }}
        />
      )}

      {detail && (
        <Modal judul={`Detail Retur ${detail.nomor}`} onTutup={() => setDetail(null)}>
          <div className="space-y-2 text-sm">
            <div><b>Tanggal:</b> {tanggalID(detail.dibuat_pada)}</div>
            <div><b>Cabang:</b> {detail.cabang_nama}</div>
            <div><b>Invoice asal:</b> {detail.invoice_nomor || '-'}</div>
            <div><b>Alasan:</b> {detail.alasan || '-'}</div>
            <table className="mt-2 w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr><th className="th">Produk</th><th className="th text-center">Qty</th><th className="th text-right">Subtotal</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items?.map((it) => (
                  <tr key={it.id}>
                    <td className="td">{it.nama_produk} <span className="text-slate-400">({it.sku})</span></td>
                    <td className="td text-center">{it.jumlah}</td>
                    <td className="td text-right">{rupiah(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-bold">Total: {rupiah(detail.total)}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FormRetur({ cabangId, onTutup, onSukses }: { cabangId: number; onTutup: () => void; onSukses: () => void }) {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [baris, setBaris] = useState<Baris[]>([]);
  const [alasan, setAlasan] = useState('');
  const [cari, setCari] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api<Produk[]>('/produk').then(setProduk); }, []);

  function tambah(p: Produk) {
    setBaris((b) => {
      const ada = b.find((x) => x.produk.id === p.id);
      if (ada) return b.map((x) => x.produk.id === p.id ? { ...x, jumlah: x.jumlah + 1 } : x);
      return [...b, { produk: p, jumlah: 1 }];
    });
  }

  const total = baris.reduce((a, x) => a + x.produk.harga_jual * x.jumlah, 0);
  const terfilter = produk.filter((p) => p.nama.toLowerCase().includes(cari.toLowerCase()) || p.sku.toLowerCase().includes(cari.toLowerCase()));

  async function simpan() {
    setError('');
    if (baris.length === 0) { setError('Tambahkan minimal 1 produk.'); return; }
    if (!alasan.trim()) { setError('Alasan retur wajib diisi.'); return; }
    setLoading(true);
    try {
      await api('/retur', {
        method: 'POST',
        body: {
          cabang_id: cabangId,
          alasan,
          items: baris.map((x) => ({ produk_id: x.produk.id, jumlah: x.jumlah })),
        },
      });
      onSukses();
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <Modal judul="Retur Barang Baru" onTutup={onTutup} lebar="max-w-2xl">
      <div className="space-y-3">
        <div>
          <label className="label">Alasan Retur</label>
          <input className="input" value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="mis. Unit rusak / salah tipe / dikembalikan pelanggan" />
        </div>
        <div>
          <label className="label">Cari & tambah produk</label>
          <input className="input" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama/SKU..." />
          {cari && (
            <div className="mt-1 max-h-40 overflow-auto rounded-lg border border-slate-200">
              {terfilter.slice(0, 8).map((p) => (
                <button key={p.id} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { tambah(p); setCari(''); }}>
                  <span>{p.nama} <span className="font-mono text-xs text-slate-400">{p.sku}</span></span>
                  <span className="text-merek-600">{rupiah(p.harga_jual)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <table className="w-full">
          <thead className="border-b border-slate-200"><tr><th className="th">Produk</th><th className="th text-center">Qty</th><th className="th text-right">Subtotal</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {baris.map((x) => (
              <tr key={x.produk.id}>
                <td className="td">{x.produk.nama}</td>
                <td className="td text-center">
                  <input type="number" min={1} className="input w-20 text-center" value={x.jumlah}
                    onChange={(e) => setBaris((b) => b.map((y) => y.produk.id === x.produk.id ? { ...y, jumlah: Math.max(1, Number(e.target.value)) } : y))} />
                </td>
                <td className="td text-right">{rupiah(x.produk.harga_jual * x.jumlah)}</td>
                <td className="td text-center"><button className="text-red-500" onClick={() => setBaris((b) => b.filter((y) => y.produk.id !== x.produk.id))}>✕</button></td>
              </tr>
            ))}
            {baris.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={4}>Belum ada produk.</td></tr>}
          </tbody>
        </table>
        <div className="text-right font-bold">Total Retur: {rupiah(total)}</div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onTutup}>Batal</button>
          <button className="btn-primary" onClick={simpan} disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Retur'}</button>
        </div>
      </div>
    </Modal>
  );
}
