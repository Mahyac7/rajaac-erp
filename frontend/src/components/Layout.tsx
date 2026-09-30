// Layout utama dengan sidebar navigasi (bahasa Indonesia).
import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const menu = [
  { ke: '/', label: 'Dasbor', icon: '📊', role: ['admin', 'kasir'] },
  { ke: '/produk', label: 'Produk & QR', icon: '📦', role: ['admin', 'kasir'], badge: 'stok' },
  { ke: '/stok', label: 'Keluar/Masuk Barang', icon: '🔄', role: ['admin', 'kasir'] },
  { ke: '/scan', label: 'Scan QR', icon: '📷', role: ['admin', 'kasir'] },
  { ke: '/invoice', label: 'Invoice', icon: '🧾', role: ['admin', 'kasir'] },
  { ke: '/retur', label: 'Retur Barang', icon: '↩️', role: ['admin', 'kasir'] },
  { ke: '/transfer', label: 'Transfer Stok', icon: '🔀', role: ['admin'] },
  { ke: '/pelanggan', label: 'Pelanggan', icon: '👥', role: ['admin', 'kasir'] },
  { ke: '/garansi', label: 'Garansi', icon: '🛡️', role: ['admin', 'kasir'] },
  { ke: '/jadwal', label: 'Jadwal Servis', icon: '🔧', role: ['admin', 'kasir'] },
  { ke: '/laporan', label: 'Laporan', icon: '📈', role: ['admin', 'kasir'] },
  { ke: '/pengaturan', label: 'Pengaturan Toko', icon: '⚙️', role: ['admin'] },
  { ke: '/pengguna', label: 'Pengguna', icon: '👤', role: ['admin'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [stokMenipis, setStokMenipis] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ produk: unknown[] }>('/produk/stok-menipis')
      .then((d) => setStokMenipis(d.produk.length))
      .catch(() => {});
  }, [user]);

  if (!user) return null;
  const menuTampil = menu.filter((m) => m.role.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="no-print flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="text-2xl">❄️</span>
          <div>
            <div className="font-bold text-slate-800">ERP Toko AC</div>
            <div className="text-xs text-slate-400">Sistem Manajemen</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuTampil.map((m) => (
            <NavLink
              key={m.ke}
              to={m.ke}
              end={m.ke === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-merek-50 text-merek-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span>{m.icon}</span>
              <span className="flex-1">{m.label}</span>
              {m.badge === 'stok' && stokMenipis > 0 && (
                <span className="badge bg-amber-100 text-amber-700" title="Produk stok menipis">{stokMenipis}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="text-sm font-medium text-slate-800">{user.nama}</div>
          <div className="mb-3">
            <span className={`badge ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {user.role === 'admin' ? 'Administrator' : 'Kasir'}
            </span>
          </div>
          <button onClick={logout} className="btn-secondary w-full">
            Keluar
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
