"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";

interface User {
  id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: () => undefined,
  logout: () => undefined,
});

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

const SESSION_KEY = "casefy_session";

export const AuthContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    // Only fetch current user if an active session indicator exists
    const hasSession =
      typeof window !== "undefined" &&
      localStorage.getItem(SESSION_KEY) === "true";

    if (!hasSession) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(
          `${API_URL}/users/current`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(SESSION_KEY);
          }
          setUser(null);
          return;
        }

        const data = await res.json();

        // backend returns { user: { ... } }
        setUser(data?.user ?? data ?? null);
      } catch (error) {
        if (typeof window !== "undefined") {
          localStorage.removeItem(SESSION_KEY);
        }
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = (userData?: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, "true");
    }
    if (userData) {
      setUser(userData);
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
    }
    setUser(null);
    setLoading(false);
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthContext.Provider
        value={{
          user,
          loading,
          isAuthenticated: !!user,
          login,
          logout,
        }}
      >
        {children}
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);