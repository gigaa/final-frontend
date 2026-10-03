'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { authApi } from '@/lib/api';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import axios from 'axios';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('access_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
        // Restore socket connection on page refresh
        connectSocket();
      } catch {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const persist = (user: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('access_token', token);
    setUser(user);
    // Connect socket immediately when user authenticates
    connectSocket();
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await authApi.login({ email, password });
      persist(res.user, res.access_token);
      router.push('/gallery');
    } catch (err) {
      // 403 = email not verified — redirect to pending-verification with email
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 403 &&
        err.response.data?.code === 'EMAIL_NOT_VERIFIED'
      ) {
        const unverifiedEmail: string =
          err.response.data.email ?? email;
        router.push(
          `/pending-verification?email=${encodeURIComponent(unverifiedEmail)}`,
        );
        return;
      }
      throw err; // re-throw so login page can show its own error toast
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    await authApi.register({ email, password, name });
    router.push('/check-email');
  };

  const verifyEmail = async (token: string) => {
    const res = await authApi.verifyEmail(token);
    persist(res.user, res.access_token);
    router.push('/gallery');
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('access_token');
    setUser(null);
    // Disconnect socket on logout
    disconnectSocket();
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, verifyEmail, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
