import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { tanggalID } from '../lib/format';
import type { Cabang, Produk, Transfer } from '../lib/types';
import Modal from '../components/Modal';

export default function TransferPage() {
  const [list, setList] = useState<Transfer[]>([]);
  const [form, setForm] = useState(false);

  function muat() { api<Transfer[]>('/transfer').then(setList); }
  useEffect(muat, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transfer Stok Antar Cabang</h1>
          <p className="text-sm text-slate-500">Pindahkan stok dari satu cabang ke cabang lain (khusus admin)</p>
        </div>
        <button className="btn-primary" onClick={() => setForm(true)}>+ Transfer Baru</button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Nomor</th>
              <th className="th">Tanggal</th>
              <th className="th">Produk</th>
              <th className="th">Dari → Ke</th>
              <th className="th text-right">Jumlah</th>
              <th className="th">Oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((t) => (
              <tr key={t.id}>
                <td className="td font-mono text-xs">{t.nomor}</td>
                <td className="td">{tanggalID(t.dibuat_pada)}</td>
                <td className="td">{t.produk_nama} <span className="font-mono text-xs text-slate-400">{t.sku}</span></td>
                <td className="td">{t.asal_nama} → <b>{t.tujuan_nama}</b></td>
                <td className="td text-right font-semibold">{t.jumlah}</td>
                <td className="td">{t.user_nama || '-'}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td className="td text-center text-slate-400" colSpan={6}>Belum ada transfer.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && <FormTransfer onTutup={() => setForm(false)} onSukses={() => { setForm(false); muat(); }} />}
    </div>
  );
}

function FormTransfer({ onTutup, onSukses }: { onTutup: () => void; onSukses: () => void }) {
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [produkId, setProdukId] = useState<number | ''>('');
  const [asal, setAsal] = useState<number | ''>('');
  const [tujuan, setTujuan] = useState<number | ''>('');
  const [jumlah, setJumlah] = useState(1);
  const [keterangan, setKeterangan] = useState('');
  const [stokAsal, setStokAsal] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<Cabang[]>('/cabang').then(setCabang);
    api<Produk[]>('/produk').then(setProduk);
  }, []);

  // Cek stok di cabang asal saat produk/asal berubah.
  useEffect(() => {
    if (produkId && asal) {
      api<Produk>(`/produk/sku/${produk.find((p) => p.id === produkId)?.sku}?cabang_id=${asal}`)
        .then((p) => setStokAsal(p.stok ?? 0))
        .catch(() => setStokAsal(null));
    } else setStokAsal(null);
  }, [produkId, asal]);

  async function simpan() {
    setError('');
    if (!produkId || !asal || !tujuan) { setError('Produk, cabang asal, dan tujuan wajib dipilih.'); return; }
    if (asal === tujuan) { setError('Cabang asal dan tujuan tidak boleh sama.'); return; }
    setLoading(true);
    try {
      await api('/transfer', {
        method: 'POST',
        body: { produk_id: produkId, cabang_asal: asal, cabang_tujuan: tujuan, jumlah, keterangan },
      });
      onSukses();
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }

  return (
    <Modal judul="Transfer Stok Baru" onTutup={onTutup} lebar="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="label">Produk</label>
          <select className="input" value={produkId} onChange={(e) => setProdukId(Number(e.target.value))}>
            <option value="">Pilih produk</option>
            {produk.map((p) => <option key={p.id} value={p.id}>{p.nama} ({p.sku})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Dari Cabang</label>
            <select className="input" value={asal} onChange={(e) => setAsal(Number(e.target.value))}>
              <option value="">Pilih</option>
              {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
            {stokAsal !== null && <p className="mt-1 text-xs text-slate-500">Stok tersedia: <b>{stokAsal}</b></p>}
          </div>
          <div>
            <label className="label">Ke Cabang</label>
            <select className="input" value={tujuan} onChange={(e) => setTujuan(Number(e.target.value))}>
              <option value="">Pilih</option>
              {cabang.filter((c) => c.id !== asal).map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Jumlah</label>
          <input type="number" min={1} className="input" value={jumlah} onChange={(e) => setJumlah(Math.max(1, Number(e.target.value)))} />
        </div>
        <div>
          <label className="label">Keterangan (opsional)</label>
          <input className="input" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="mis. Pemerataan stok" />
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onTutup}>Batal</button>
          <button className="btn-primary" onClick={simpan} disabled={loading}>{loading ? 'Memproses...' : 'Transfer'}</button>
        </div>
      </div>
    </Modal>
  );
}
