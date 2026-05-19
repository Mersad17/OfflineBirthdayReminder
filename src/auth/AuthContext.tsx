import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout,getMe,   googleLogin as apiGoogleLogin, } from "./api";
import { saveTokens, loadTokens, clearTokens } from "../lib/storage";
import { registerLogoutHandler } from "../lib/authEvents";
import { User } from "./types";


type AuthState = {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    timezone: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User|null>(null);
  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
    } catch (e) {
      // optional: handle error, but we can keep it simple for now
      console.log("Failed to refresh user", e);
    }
  }, []);
  // On mount, check stored tokens
  useEffect(() => {
    (async () => {
      const { access } = await loadTokens();
      if (access) {
        setAuth(true);
        try {
          const me = await getMe(); // GET /api/me/
          setUser(me);
        } catch {
          // if /me fails, force logout
          await clearTokens();
          setAuth(false);
          setUser(null);
        }
      } else {
        setAuth(false);
        setUser(null);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const tokens = await apiLogin({ email, password });
      await saveTokens(tokens.access, tokens.refresh);
      const me = await getMe();
      setUser(me);
      setAuth(true);
    } finally {
      setLoading(false);
    }
  }, []);
const loginWithGoogle = useCallback(async (idToken: string) => {
  setLoading(true);

  try {
    const tokens = await apiGoogleLogin(idToken);

    await saveTokens(tokens.access, tokens.refresh);

    const me = await getMe();

    setUser(me);
    setAuth(true);
  } finally {
    setLoading(false);
  }
}, []);
  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      timezone: string
    ) => {
      setLoading(true);
      try {
        // 1) Create the user
        await apiRegister({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          timezone,
        });
  
        // 2) Immediately log them in
        const tokens = await apiLogin({ email, password });
        await saveTokens(tokens.access, tokens.refresh);
  
        // 3) Load user profile
        const me = await getMe();
        setUser(me);
        setAuth(true);
      } finally {
        setLoading(false);
      }
    },
    []
  );
  
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
      setUser(null); 
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isAuthenticated,
      loading,
      user,
      login,
      loginWithGoogle,
      register,
      logout,
      refreshUser, 
    }),
    [isAuthenticated, loading, user, login, loginWithGoogle, register, logout, refreshUser]
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
