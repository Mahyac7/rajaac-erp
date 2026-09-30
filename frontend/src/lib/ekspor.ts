// Utilitas ekspor data ke Excel (.xlsx) dan PDF.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ekspor array objek ke file Excel.
// kolom: [{ key, label }] menentukan urutan & judul kolom.
export function eksporExcel(
  namaFile: string,
  namaSheet: string,
  kolom: { key: string; label: string }[],
  data: Record<string, any>[]
) {
  const baris = data.map((d) => {
    const o: Record<string, any> = {};
    for (const k of kolom) o[k.label] = d[k.key];
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(baris, { header: kolom.map((k) => k.label) });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, namaSheet.slice(0, 31));
  XLSX.writeFile(wb, `${namaFile}.xlsx`);
}

// Ekspor array objek ke file PDF (tabel).
export function eksporPDF(
  namaFile: string,
  judul: string,
  kolom: { key: string; label: string }[],
  data: Record<string, any>[],
  subjudul?: string
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(judul, 14, 16);
  if (subjudul) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subjudul, 14, 22);
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: subjudul ? 26 : 20,
    head: [kolom.map((k) => k.label)],
    body: data.map((d) => kolom.map((k) => String(d[k.key] ?? ''))),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`${namaFile}.pdf`);
}
