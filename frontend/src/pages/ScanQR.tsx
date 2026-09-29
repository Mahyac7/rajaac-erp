import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { rupiah } from '../lib/format';
import type { Produk } from '../lib/types';

// Parse isi QR: bisa berupa JSON {sku,nama,harga} atau sekadar teks SKU.
function bacaSku(teks: string): string | null {
  try {
    const obj = JSON.parse(teks);
    if (obj && obj.sku) return String(obj.sku);
  } catch {
    /* bukan JSON, anggap teks SKU langsung */
  }
  return teks.trim() || null;
}

export default function ScanQR() {
  const nav = useNavigate();
  const elId = 'qr-reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [aktif, setAktif] = useState(false);
  const [hasil, setHasil] = useState<Produk | null>(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');

  async function mulai() {
    setError('');
    setHasil(null);
    try {
      const scanner = new Html5Qrcode(elId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (teks) => {
          await hentikan();
          cariProduk(bacaSku(teks));
        },
        () => { /* abaikan frame gagal */ }
      );
      setAktif(true);
    } catch (err) {
      setError('Tidak bisa mengakses kamera. Pastikan izin kamera diberikan, atau gunakan input SKU manual di bawah.');
    }
  }

  async function hentikan() {
    const s = scannerRef.current;
    if (s) {
      try { await s.stop(); s.clear(); } catch { /* noop */ }
      scannerRef.current = null;
    }
    setAktif(false);
  }

  useEffect(() => () => { hentikan(); }, []);

  async function cariProduk(sku: string | null) {
    if (!sku) { setError('QR tidak berisi SKU yang valid.'); return; }
    try {
      const p = await api<Produk>(`/produk/sku/${encodeURIComponent(sku)}`);
      setHasil(p);
      setError('');
    } catch (err) {
      setError((err as Error).message);
      setHasil(null);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Scan QR Code</h1>
        <p className="text-sm text-slate-500">Arahkan kamera ke QR code produk untuk melihat info & stok</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div id={elId} className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-slate-100" style={{ minHeight: 260 }} />
          <div className="mt-4 flex justify-center gap-2">
            {!aktif ? (
              <button className="btn-primary" onClick={mulai}>📷 Mulai Scan</button>
            ) : (
              <button className="btn-danger" onClick={hentikan}>Hentikan</button>
            )}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            <label className="label">Atau ketik SKU manual</label>
            <div className="flex gap-2">
              <input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="mis. AC-SPT-10" />
              <button className="btn-secondary" onClick={() => cariProduk(manual)}>Cari</button>
            </div>
          </div>

          {error && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-800">Hasil</h2>
          {!hasil ? (
            <p className="text-sm text-slate-400">Belum ada produk terpindai.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-lg font-bold text-slate-800">{hasil.nama}</div>
              <div className="font-mono text-sm text-slate-500">{hasil.sku}</div>
              <div className="flex gap-6">
                <div>
                  <div className="text-xs text-slate-400">Harga Jual</div>
                  <div className="text-lg font-bold text-merek-600">{rupiah(hasil.harga_jual)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Stok (cabang Anda)</div>
                  <div className="text-lg font-bold text-slate-800">{hasil.stok ?? 0}</div>
                </div>
              </div>
              {hasil.kategori && <div className="text-sm text-slate-500">Kategori: {hasil.kategori}</div>}
              <button className="btn-primary mt-2" onClick={() => nav('/invoice/baru', { state: { sku: hasil.sku } })}>
                🧾 Buat Invoice dengan produk ini
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
