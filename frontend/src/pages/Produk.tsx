import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah } from '../lib/format';
import type { Produk } from '../lib/types';
import Modal from '../components/Modal';

// Isi QR: SKU, nama, harga (format JSON ringkas agar mudah dibaca ulang saat scan)
export function qrPayload(p: Produk) {
  return JSON.stringify({ sku: p.sku, nama: p.nama, harga: p.harga_jual });
}

const kosong = { sku: '', nama: '', kategori: '', satuan: 'unit', harga_beli: 0, harga_jual: 0 };

export default function ProdukPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cari, setCari] = useState('');
  const [form, setForm] = useState<any>(null); // null = tutup, object = edit/tambah
  const [qrProduk, setQrProduk] = useState<Produk | null>(null);
  const [error, setError] = useState('');

  function muat() {
    api<Produk[]>('/produk').then(setProduk);
  }
  useEffect(muat, []);

  const terfilter = produk.filter(
    (p) => p.nama.toLowerCase().includes(cari.toLowerCase()) || p.sku.toLowerCase().includes(cari.toLowerCase())
  );

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (form.id) {
        await api(`/produk/${form.id}`, { method: 'PUT', body: form });
      } else {
        await api('/produk', { method: 'POST', body: form });
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
          <h1 className="text-2xl font-bold text-slate-800">Produk & QR Code</h1>
          <p className="text-sm text-slate-500">Kelola daftar barang dan cetak QR code</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setForm({ ...kosong })}>+ Tambah Produk</button>
        )}
      </div>

      <div className="card mb-4">
        <input
          className="input"
          placeholder="Cari nama atau SKU..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">SKU</th>
              <th className="th">Nama</th>
              <th className="th">Kategori</th>
              <th className="th text-right">Harga Jual</th>
              <th className="th text-right">Total Stok</th>
              <th className="th text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {terfilter.map((p) => (
              <tr key={p.id}>
                <td className="td font-mono text-xs">{p.sku}</td>
                <td className="td font-medium">{p.nama}</td>
                <td className="td">{p.kategori || '-'}</td>
                <td className="td text-right">{rupiah(p.harga_jual)}</td>
                <td className="td text-right">{p.stok ?? 0}</td>
                <td className="td text-center">
                  <div className="flex justify-center gap-2">
                    <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setQrProduk(p)}>QR</button>
                    {isAdmin && (
                      <button className="btn-secondary !px-2 !py-1 text-xs" onClick={() => setForm({ ...p })}>Edit</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {terfilter.length === 0 && (
              <tr><td className="td text-center text-slate-400" colSpan={6}>Tidak ada produk.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal judul={form.id ? 'Edit Produk' : 'Tambah Produk'} onTutup={() => setForm(null)}>
          <form onSubmit={simpan} className="space-y-3">
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
            </div>
            <div>
              <label className="label">Nama Produk</label>
              <input className="input" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Kategori</label>
                <input className="input" value={form.kategori || ''} onChange={(e) => setForm({ ...form, kategori: e.target.value })} placeholder="AC Split / Sparepart / Jasa" />
              </div>
              <div>
                <label className="label">Satuan</label>
                <input className="input" value={form.satuan || ''} onChange={(e) => setForm({ ...form, satuan: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Harga Beli</label>
                <input type="number" className="input" value={form.harga_beli} onChange={(e) => setForm({ ...form, harga_beli: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Harga Jual</label>
                <input type="number" className="input" value={form.harga_jual} onChange={(e) => setForm({ ...form, harga_jual: Number(e.target.value) })} />
              </div>
            </div>
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className="btn-primary">Simpan</button>
            </div>
          </form>
        </Modal>
      )}

      {qrProduk && <QRModal produk={qrProduk} onTutup={() => setQrProduk(null)} />}
    </div>
  );
}

function QRModal({ produk, onTutup }: { produk: Produk; onTutup: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    const payload = qrPayload(produk);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, payload, { width: 220, margin: 1 });
    }
    QRCode.toDataURL(payload, { width: 400, margin: 1 }).then(setDataUrl);
  }, [produk]);

  function cetak() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${produk.sku}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:20px}img{width:250px}</style>
      </head><body>
      <img src="${dataUrl}" />
      <div style="font-weight:bold;font-size:18px;margin-top:8px">${produk.nama}</div>
      <div style="font-family:monospace">${produk.sku}</div>
      <div style="font-size:18px;margin-top:4px">${rupiah(produk.harga_jual)}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <Modal judul="QR Code Produk" onTutup={onTutup} lebar="max-w-sm">
      <div className="text-center">
        <canvas ref={canvasRef} className="mx-auto rounded-lg border border-slate-200 p-2" />
        <div className="mt-3 font-semibold text-slate-800">{produk.nama}</div>
        <div className="font-mono text-sm text-slate-500">{produk.sku}</div>
        <div className="text-lg font-bold text-merek-600">{rupiah(produk.harga_jual)}</div>
        <p className="mt-2 text-xs text-slate-400">QR berisi: SKU, nama, dan harga.</p>
        <div className="mt-4 flex justify-center gap-2">
          {dataUrl && <a href={dataUrl} download={`qr-${produk.sku}.png`} className="btn-secondary">Unduh PNG</a>}
          <button className="btn-primary" onClick={cetak}>Cetak</button>
        </div>
      </div>
    </Modal>
  );
}
