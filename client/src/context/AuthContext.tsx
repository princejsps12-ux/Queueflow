import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AUTH_TOKEN_KEY } from "../api/client";
import { authApi } from "../api/endpoints";
import type { Manager } from "../api/types";

const MANAGER_STORAGE_KEY = "queueflow_manager";

interface AuthContextValue {
  manager: Manager | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [manager, setManager] = useState<Manager | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedManager = localStorage.getItem(MANAGER_STORAGE_KEY);
    if (token && storedManager) {
      try {
        setManager(JSON.parse(storedManager));
      } catch {
        localStorage.removeItem(MANAGER_STORAGE_KEY);
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
    setIsInitializing(false);
  }, []);

  function persistSession(token: string, manager: Manager) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(manager));
    setManager(manager);
  }

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password);
    persistSession(res.token, res.manager);
  }

  async function register(email: string, password: string, name: string) {
    const res = await authApi.register(email, password, name);
    persistSession(res.token, res.manager);
  }

  function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(MANAGER_STORAGE_KEY);
    setManager(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      manager,
      isAuthenticated: manager !== null,
      isInitializing,
      login,
      register,
      logout,
    }),
    [manager, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
