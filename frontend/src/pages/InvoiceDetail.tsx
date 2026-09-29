import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { rupiah, tanggalID } from '../lib/format';
import type { Invoice } from '../lib/types';

export default function InvoiceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Invoice>(`/invoice/${id}`).then(setInv).catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) return <div className="rounded-lg bg-red-50 px-4 py-3 text-red-700">{error}</div>;
  if (!inv) return <div className="text-slate-400">Memuat...</div>;

  const p = inv.pengaturan || {};

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between">
        <button className="btn-secondary" onClick={() => nav('/invoice')}>← Kembali</button>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</button>
        </div>
      </div>

      {/* Area yang dicetak */}
      <div className="card mx-auto max-w-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            {p.logo ? (
              <img src={p.logo} alt="logo" className="h-16 w-16 rounded object-contain" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-merek-50 text-3xl">❄️</div>
            )}
            <div>
              <div className="text-xl font-bold text-slate-800">{p.nama_toko || 'Toko AC'}</div>
              <div className="text-sm text-slate-500">{p.alamat || '-'}</div>
              {p.telepon && <div className="text-sm text-slate-500">Telp: {p.telepon}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-800">INVOICE</div>
            <div className="font-mono text-sm text-slate-500">{inv.nomor}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 text-sm">
          <div>
            <div className="text-slate-400">Pembeli</div>
            <div className="font-medium">{inv.nama_pembeli || 'Umum'}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-400">Tanggal</div>
            <div className="font-medium">{tanggalID(inv.dibuat_pada)}</div>
            <div className="mt-1 text-slate-400">Cabang</div>
            <div className="font-medium">{inv.cabang_nama}</div>
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="border-y border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Produk</th>
              <th className="th text-right">Harga</th>
              <th className="th text-center">Qty</th>
              <th className="th text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {inv.items?.map((it) => (
              <tr key={it.id}>
                <td className="td">
                  <div className="font-medium">{it.nama_produk}</div>
                  <div className="font-mono text-xs text-slate-400">{it.sku}</div>
                </td>
                <td className="td text-right">{rupiah(it.harga)}</td>
                <td className="td text-center">{it.jumlah}</td>
                <td className="td text-right">{rupiah(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{rupiah(inv.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">PPN ({inv.persen_ppn}%)</span><span>{rupiah(inv.nilai_ppn)}</span></div>
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-bold"><span>Total</span><span>{rupiah(inv.total)}</span></div>
        </div>

        <div className="mt-8 flex justify-between text-sm text-slate-500">
          <div>Kasir: {inv.kasir_nama || '-'}</div>
          <div className="text-center">
            <div className="mb-10">Hormat kami,</div>
            <div className="border-t border-slate-300 pt-1">{p.nama_toko || 'Toko AC'}</div>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-slate-400">Terima kasih atas kepercayaan Anda 🙏</div>
      </div>
    </div>
  );
}
