// src/contexts/AuthContext.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { apiClient, AUTH_TOKEN_KEY, setAuthToken } from "@/lib/apiClient";

interface AuthUser {
  id: string | number;
  email: string;
  name?: string | null;
  roles?: Array<{ role: string } | string>;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
  password_confirmation?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Load profile from backend using current token
   */
  const fetchProfile = useCallback(async () => {
    try {
      const response = await apiClient.get("/auth/profile");
      // Because apiClient interceptor returns full AxiosResponse,
      // the payload is in `response.data`
      setUser(response.data.user);
    } catch {
      // Token invalid / expired → clear it
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * On first app load: restore token from localStorage
   * and try to fetch profile.
   */
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    // Re-apply token to axios and fetch profile
    setAuthToken(token);
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Login: call /auth/login and save token + user
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    const { token, user: loggedInUser } = response.data;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    setUser(loggedInUser);
  }, []);

  /**
   * Register: call /auth/register and save token + user
   */
  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await apiClient.post("/auth/register", payload);
    const { token, user: createdUser } = response.data;

    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setAuthToken(token);
    setUser(createdUser);
  }, []);

  /**
   * Logout: hit API (optional) then clear local state
   */
  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // ignore API error during logout
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setAuthToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
