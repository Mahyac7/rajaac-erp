// Context autentikasi: menyimpan user login & fungsi login/logout.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, simpanToken, hapusToken, ambilToken } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = ambilToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/auth/saya')
      .then((d) => setUser(d.user))
      .catch(() => hapusToken())
      .finally(() => setLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const d = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    simpanToken(d.token);
    setUser(d.user);
  }

  function logout() {
    hapusToken();
    setUser(null);
    location.href = '/login';
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
