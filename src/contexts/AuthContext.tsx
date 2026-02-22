import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '../services/api';
import { setStoredToken, getStoredToken } from '../services/api';

const STORAGE_KEY = 'hero_memorial_user';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const u = JSON.parse(raw) as AuthUser;
        if (u?.id && u?.email && u?.role) setUser(u);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { authApi } = await import('../services/api');
    const res = await authApi.login(email.trim(), password);
    if (res.error) return { error: res.error };
    const payload = (res as { data?: { user?: AuthUser; token?: string } }).data;
    if (payload?.user && payload?.token) {
      setUser(payload.user);
      setStoredToken(payload.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.user));
      return {};
    }
    return { error: 'Неизвестная ошибка' };
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string, phone?: string) => {
    const { authApi } = await import('../services/api');
    const res = await authApi.register(email.trim(), password, name?.trim(), phone?.trim());
    if (res.error) return { error: res.error };
    const payload = (res as { data?: { user?: AuthUser; token?: string } }).data;
    if (payload?.user && payload?.token) {
      setUser(payload.user);
      setStoredToken(payload.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload.user));
      return {};
    }
    return { error: 'Неизвестная ошибка' };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setStoredToken(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth used outside AuthProvider');
  return ctx;
}
