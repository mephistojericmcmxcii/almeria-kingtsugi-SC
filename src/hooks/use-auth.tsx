"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

const mockUsers: Record<User['role'], User> = {
  admin: {
    name: 'Admin User',
    email: 'admin@kintsugi.com',
    role: 'admin',
    avatar: 'https://picsum.photos/seed/admin/40/40',
  },
  guest: {
    name: 'Guest User',
    email: 'guest@kintsugi.com',
    role: 'guest',
    avatar: 'https://picsum.photos/seed/guest/40/40',
  },
};

interface AuthContextType {
  user: User | null;
  login: (role: 'admin' | 'guest') => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = sessionStorage.getItem('kintsugi-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from sessionStorage", error);
      sessionStorage.removeItem('kintsugi-user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (role: 'admin' | 'guest') => {
    setIsLoading(true);
    const userToLogin = mockUsers[role];
    sessionStorage.setItem('kintsugi-user', JSON.stringify(userToLogin));
    setUser(userToLogin);
    router.push('/dashboard');
    setIsLoading(false);
  };

  const logout = () => {
    setIsLoading(true);
    sessionStorage.removeItem('kintsugi-user');
    setUser(null);
    router.push('/');
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
