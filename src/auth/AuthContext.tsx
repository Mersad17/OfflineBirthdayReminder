import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "./api";
import { saveTokens, loadTokens, clearTokens } from "../lib/storage";
import { registerLogoutHandler } from "../lib/authEvents";

type AuthState = {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = useState(false);
  const [loading, setLoading] = useState(false);

  // On mount, check stored tokens
  useEffect(() => {
    (async () => {
      const { access } = await loadTokens();
      setAuth(!!access);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const tokens = await apiLogin({ email, password });
      await saveTokens(tokens.access, tokens.refresh);
      setAuth(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await apiRegister({ email, password });
      const tokens = await apiLogin({ email, password });
      await saveTokens(tokens.access, tokens.refresh);
      setAuth(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const { refresh } = await loadTokens();
      if (refresh) await apiLogout(refresh);
    } catch {
      // ignore error
    } finally {
      await clearTokens();
      setAuth(false);
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      loading,
      login,
      register,
      logout,
    }),
    [isAuthenticated, loading, login, register, logout]
  );

  useEffect(() => {
    registerLogoutHandler(logout);
  }, [logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
