import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthUser = {
  email: string;
  name: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResult = {
  ok: boolean;
  error?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<LoginResult>;
  logout: () => void;
};

const AUTH_STORAGE_KEY = "obera_eventos_auth";

const DEMO_USER = {
  email: "admin@oberaeventos.com",
  password: "1234",
  name: "Administrador",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AuthUser;

      if (parsed && typeof parsed.email === "string" && parsed.email.trim()) {
        setUser(parsed);
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = async ({ email, password }: LoginPayload): Promise<LoginResult> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (
      normalizedEmail === DEMO_USER.email.toLowerCase() &&
      normalizedPassword === DEMO_USER.password
    ) {
      const loggedUser: AuthUser = {
        email: DEMO_USER.email,
        name: DEMO_USER.name,
      };

      setUser(loggedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));

      return { ok: true };
    }

    return {
      ok: false,
      error: "Email o contraseña incorrectos.",
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}