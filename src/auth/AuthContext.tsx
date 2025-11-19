// src/auth/AuthContext.tsx
import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
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

  // optional: on mount, check stored tokens
  useEffect(() => {
    (async () => {
      const { access } = await loadTokens();
      setAuth(!!access);
    })();
  }, []);

  const value = useMemo<AuthState>(() => ({
    isAuthenticated,
    loading,
    login: async (email, password) => {
      setLoading(true);
      try {
        const tokens = await apiLogin({ email, password });
        await saveTokens(tokens.access, tokens.refresh);
        setAuth(true);
      } finally {
        setLoading(false);
      }
    },
    register: async (email, password) => {
      setLoading(true);
      try {
        await apiRegister({ email, password });
        // immediately login after register (optional)
        const tokens = await apiLogin({ email, password });
        await saveTokens(tokens.access, tokens.refresh);
        setAuth(true);
      } finally {
        setLoading(false);
      }
    },
    logout: async () => {
      setLoading(true);
      try {
        const { refresh } = await loadTokens();
        if (refresh) await apiLogout(refresh);
      } catch {}
      finally {
        await clearTokens();
        setAuth(false);
        setLoading(false);
      }
    },
  }), [isAuthenticated, loading]);
  useEffect(() => {
    registerLogoutHandler(() => {
      value.logout(); // We're safe to call it here now
    });
  }, [value]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
