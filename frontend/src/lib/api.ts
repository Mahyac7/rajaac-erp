// Klien API sederhana dengan penyisipan token JWT otomatis.
const TOKEN_KEY = 'erp_token';

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
  const res = await fetch(`/api${path}`, {
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
