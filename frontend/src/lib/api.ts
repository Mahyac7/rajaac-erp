// Klien API sederhana dengan penyisipan token JWT otomatis.
const TOKEN_KEY = 'erp_token';

// Base URL backend. Saat development kosong -> pakai proxy Vite (/api -> localhost:4000).
// Saat produksi, set VITE_API_URL ke URL backend (mis. https://xxx.up.railway.app).
const BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function simpanToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function ambilToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function hapusToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type Opsi = {
  method?: string;
  body?: unknown;
};

export async function api<T = any>(path: string, opsi: Opsi = {}): Promise<T> {
  const token = ambilToken();
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: opsi.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opsi.body ? JSON.stringify(opsi.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      hapusToken();
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    throw new Error(data?.pesan || 'Terjadi kesalahan.');
  }
  return data as T;
}
