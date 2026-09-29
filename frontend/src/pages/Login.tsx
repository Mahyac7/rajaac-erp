import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      nav('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="text-5xl">❄️</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">ERP Toko AC</h1>
          <p className="text-sm text-slate-500">Silakan masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={submit} className="card space-y-4">
          <div>
            <label className="label">Username</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <div className="font-medium text-slate-600">Akun demo:</div>
            <div>Admin — <b>admin</b> / <b>admin123</b></div>
            <div>Kasir — <b>kasir1</b> / <b>kasir123</b></div>
          </div>
        </form>
      </div>
    </div>
  );
}
