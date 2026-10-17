'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import AuthModal from '@/components/AuthModal';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading } = useAuth();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-spinner" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        {children}
      </main>
      <AuthModal />
    </div>
  );
}
