import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const saved = (() => {
  try {
    const raw = localStorage.getItem('tf_auth');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
})();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: saved?.user || null,
  token: saved?.token || null,
  login(user, token) {
    localStorage.setItem('tf_auth', JSON.stringify({ user, token }));
    set({ user, token });
  },
  logout() {
    localStorage.removeItem('tf_auth');
    set({ user: null, token: null });
  },
  isAuthenticated: () => !!get().token && !!get().user,
}));
