import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dasbor from './pages/Dasbor';
import Produk from './pages/Produk';
import Stok from './pages/Stok';
import ScanQR from './pages/ScanQR';
import InvoiceList from './pages/InvoiceList';
import InvoiceBaru from './pages/InvoiceBaru';
import InvoiceDetail from './pages/InvoiceDetail';
import Pengaturan from './pages/Pengaturan';
import Pengguna from './pages/Pengguna';
import type { Role } from './lib/types';

function Terlindungi({ children, role }: { children: ReactElement; role?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-slate-400">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && !role.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Terlindungi>
                <Layout />
              </Terlindungi>
            }
          >
            <Route path="/" element={<Dasbor />} />
            <Route path="/produk" element={<Produk />} />
            <Route path="/stok" element={<Stok />} />
            <Route path="/scan" element={<ScanQR />} />
            <Route path="/invoice" element={<InvoiceList />} />
            <Route path="/invoice/baru" element={<InvoiceBaru />} />
            <Route path="/invoice/:id" element={<InvoiceDetail />} />
            <Route
              path="/pengaturan"
              element={
                <Terlindungi role={['admin']}>
                  <Pengaturan />
                </Terlindungi>
              }
            />
            <Route
              path="/pengguna"
              element={
                <Terlindungi role={['admin']}>
                  <Pengguna />
                </Terlindungi>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
