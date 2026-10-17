'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'demo@portofin.app',
  app_metadata: {},
  user_metadata: { full_name: 'Demo User' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as User;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  isDemo: boolean;
  isAuthModalOpen: boolean;
  authModalReason: string | null;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(isDemo ? DEMO_USER : null);
  const [loading, setLoading] = useState(!isDemo);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const openAuthModal = useCallback((reason?: string) => {
    setAuthModalReason(reason || null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthModalReason(null);
  }, []);

  useEffect(() => {
    if (isDemo) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        setIsAuthModalOpen(false);
        setAuthModalReason(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || isDemo) return;
    const isLoginPage = pathname === '/login';
    if (user && isLoginPage) {
      router.replace('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    if (isDemo) return;
    await supabase.auth.signOut();
    setUser(null);
    router.push('/dashboard');
  };

  const isGuest = !loading && !user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest,
        isDemo,
        isAuthModalOpen,
        authModalReason,
        openAuthModal,
        closeAuthModal,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
