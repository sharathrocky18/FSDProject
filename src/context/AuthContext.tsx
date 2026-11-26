import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  updateUser: (updated: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('studysync_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data);
    } catch (err) {
      console.warn('Session invalid or expired, returning to login:', err);
      localStorage.removeItem('studysync_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('studysync:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('studysync:unauthorized', handleUnauthorized);
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await api.login({ identifier, password: pass });
    if (res.token) {
      localStorage.setItem('studysync_token', res.token);
    }
    setUser(res.user);
  };

  const register = async (payload: any) => {
    const res = await api.register(payload);
    if (res.token) {
      localStorage.setItem('studysync_token', res.token);
    }
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem('studysync_token');
    setUser(null);
  };

  const updateUser = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated });
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
