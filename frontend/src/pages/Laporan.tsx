import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { rupiah } from '../lib/format';
import { eksporExcel, eksporPDF } from '../lib/ekspor';
import type { Cabang, PenjualanCabang, PenjualanHarian, ProdukTerlaris, RingkasanLaporan } from '../lib/types';

// Default: awal bulan ini s/d hari ini.
function awalBulan() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function hariIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Laporan() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [cabang, setCabang] = useState<Cabang[]>([]);
  const [cabangId, setCabangId] = useState<number | null>(user?.cabang_id ?? null);
  const [dari, setDari] = useState(awalBulan());
  const [sampai, setSampai] = useState(hariIni());

  const [ringkasan, setRingkasan] = useState<RingkasanLaporan | null>(null);
  const [harian, setHarian] = useState<PenjualanHarian[]>([]);
  const [terlaris, setTerlaris] = useState<ProdukTerlaris[]>([]);
  const [perCabang, setPerCabang] = useState<PenjualanCabang[]>([]);

  useEffect(() => {
    if (isAdmin) api<Cabang[]>('/cabang').then(setCabang);
  }, []);

  function muat() {
    const q = new URLSearchParams();
    if (cabangId) q.set('cabang_id', String(cabangId));
    if (dari) q.set('dari', dari);
    if (sampai) q.set('sampai', sampai);
    const qs = q.toString() ? `?${q}` : '';
    api<RingkasanLaporan>(`/laporan/ringkasan${qs}`).then(setRingkasan);
    api<PenjualanHarian[]>(`/laporan/harian${qs}`).then(setHarian);
    api<ProdukTerlaris[]>(`/laporan/produk-terlaris${qs}`).then(setTerlaris);
    if (isAdmin) api<PenjualanCabang[]>(`/laporan/per-cabang${qs}`).then(setPerCabang);
  }
  useEffect(muat, [cabangId, dari, sampai]);

  const periodeLabel = `Periode ${dari} s/d ${sampai}`;

  function eksporRingkasanExcel() {
    const data = harian.map((h) => ({ tanggal: h.tanggal, jumlah: h.jumlah, total: h.total }));
    eksporExcel('laporan-penjualan', 'Penjualan Harian',
      [{ key: 'tanggal', label: 'Tanggal' }, { key: 'jumlah', label: 'Jumlah Transaksi' }, { key: 'total', label: 'Total (Rp)' }],
      data
    );
  }
  function eksporRingkasanPDF() {
    const data = harian.map((h) => ({ tanggal: h.tanggal, jumlah: h.jumlah, total: rupiah(h.total) }));
    eksporPDF('laporan-penjualan', 'Laporan Penjualan Harian',
      [{ key: 'tanggal', label: 'Tanggal' }, { key: 'jumlah', label: 'Transaksi' }, { key: 'total', label: 'Total' }],
      data, periodeLabel
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Laporan Penjualan</h1>
          <p className="text-sm text-slate-500">Grafik & ringkasan penjualan per periode</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {isAdmin && (
            <div>
              <label className="label">Cabang</label>
              <select className="input w-auto" value={cabangId ?? ''} onChange={(e) => setCabangId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Semua Cabang</option>
                {cabang.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="label">Dari</label>
            <input type="date" className="input w-auto" value={dari} onChange={(e) => setDari(e.target.value)} />
          </div>
          <div>
            <label className="label">Sampai</label>
            <input type="date" className="input w-auto" value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Kartu ringkasan */}
      {ringkasan && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kartu label="Total Penjualan" nilai={rupiah(ringkasan.total_penjualan)} warna="text-blue-600" />
          <Kartu label="Penjualan Bersih" nilai={rupiah(ringkasan.penjualan_bersih)} warna="text-emerald-600" sub={`${ringkasan.jumlah_invoice} invoice`} />
          <Kartu label="Total Retur" nilai={rupiah(ringkasan.total_retur)} warna="text-red-600" sub={`${ringkasan.jumlah_retur} retur`} />
          <Kartu label="Estimasi Laba" nilai={rupiah(ringkasan.estimasi_laba)} warna="text-purple-600" />
        </div>
      )}

      <div className="mb-3 flex justify-end gap-2">
        <button className="btn-secondary" onClick={eksporRingkasanExcel}>⬇ Excel</button>
        <button className="btn-secondary" onClick={eksporRingkasanPDF}>⬇ PDF</button>
      </div>

      {/* Grafik penjualan harian */}
      <div className="card mb-6">
        <h2 className="mb-3 font-semibold text-slate-800">Penjualan Harian</h2>
        {harian.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Belum ada data penjualan pada periode ini.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={harian} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="tanggal" fontSize={12} />
              <YAxis tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}jt` : v)} fontSize={12} />
              <Tooltip formatter={(v) => rupiah(Number(v))} />
              <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} name="Penjualan" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Produk terlaris */}
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-800">Produk Terlaris</h2>
          {terlaris.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Belum ada data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={terlaris} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="sku" width={90} fontSize={11} />
                <Tooltip />
                <Bar dataKey="total_qty" fill="#10b981" name="Qty Terjual" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Perbandingan cabang (admin) */}
        {isAdmin && (
          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-800">Penjualan per Cabang</h2>
            {perCabang.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Belum ada data.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={perCabang} margin={{ top: 5, right: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="cabang_nama" fontSize={11} />
                  <YAxis tickFormatter={(v) => (v >= 1e6 ? `${v / 1e6}jt` : v)} fontSize={12} />
                  <Tooltip formatter={(v) => rupiah(Number(v))} />
                  <Legend />
                  <Bar dataKey="total" fill="#2563eb" name="Total Penjualan" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Kartu({ label, nilai, warna, sub }: { label: string; nilai: string; warna: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold ${warna}`}>{nilai}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
