// Cetak struk thermal 80mm dari data invoice.
// Membuka window baru berisi HTML struk dengan lebar 80mm lalu memanggil print.
import type { Invoice } from './types';

function rp(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
}

export function cetakStrukThermal(inv: Invoice) {
  const p = inv.pengaturan || {};
  const tgl = new Date((inv.dibuat_pada || '').replace(' ', 'T'));
  const tglStr = isNaN(tgl.getTime())
    ? inv.dibuat_pada
    : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(tgl);

  const barisItem = (inv.items || [])
    .map(
      (it) => `
      <div class="item">
        <div class="nm">${it.nama_produk}</div>
        <div class="ln">
          <span>${it.jumlah} x ${rp(it.harga)}</span>
          <span>${rp(it.subtotal)}</span>
        </div>
      </div>`
    )
    .join('');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Struk ${inv.nomor}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 80mm; margin: 0; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
  .center { text-align: center; }
  .toko { font-size: 15px; font-weight: bold; }
  .kecil { font-size: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .ln { display: flex; justify-content: space-between; }
  .item { margin-bottom: 3px; }
  .item .nm { font-weight: bold; }
  .total .ln { font-size: 14px; font-weight: bold; }
  .footer { margin-top: 8px; text-align: center; font-size: 10px; }
</style></head>
<body>
  <div class="center">
    <div class="toko">${p.nama_toko || 'Toko AC'}</div>
    ${p.alamat ? `<div class="kecil">${p.alamat}</div>` : ''}
    ${p.telepon ? `<div class="kecil">Telp: ${p.telepon}</div>` : ''}
  </div>
  <hr>
  <div class="ln kecil"><span>No</span><span>${inv.nomor}</span></div>
  <div class="ln kecil"><span>Tanggal</span><span>${tglStr}</span></div>
  <div class="ln kecil"><span>Kasir</span><span>${inv.kasir_nama || '-'}</span></div>
  <div class="ln kecil"><span>Pembeli</span><span>${inv.pelanggan_nama || inv.nama_pembeli || 'Umum'}</span></div>
  <div class="ln kecil"><span>Bayar</span><span>${(inv.metode_bayar || 'tunai').toUpperCase()}</span></div>
  <hr>
  ${barisItem}
  <hr>
  <div class="ln"><span>Subtotal</span><span>${rp(inv.subtotal)}</span></div>
  <div class="ln"><span>PPN (${inv.persen_ppn}%)</span><span>${rp(inv.nilai_ppn)}</span></div>
  <div class="total"><div class="ln"><span>TOTAL</span><span>Rp ${rp(inv.total)}</span></div></div>
  <hr>
  <div class="footer">
    Terima kasih atas kepercayaan Anda 🙏<br>
    Barang yang sudah dibeli dapat diretur sesuai ketentuan toko.
  </div>
  <script>window.onload = function(){ window.print(); setTimeout(function(){ window.close(); }, 300); };</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=380,height=600');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
