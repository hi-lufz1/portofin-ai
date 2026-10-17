'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, Mail, Lock, ArrowRight, Eye, EyeOff, CloudUpload } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, authModalReason, closeAuthModal } = useAuth();
  const { guestAssetCount } = usePortfolio();
  const { t, lang } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        closeAuthModal();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          closeAuthModal();
        } else {
          setMessage(
            lang === 'id'
              ? 'Cek email kamu untuk konfirmasi akun. Data sesi tamu tetap tersimpan di browser ini hingga kamu masuk.'
              : 'Check your email to confirm your account. Your guest data remains safely stored in this browser until you sign in.'
          );
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : lang === 'id'
            ? 'Terjadi kesalahan saat autentikasi'
            : 'Authentication failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const reasonText =
    authModalReason ||
    (guestAssetCount > 0 ? t('authModal.defaultReason') : null);

  return (
    <div className="modal-overlay" onClick={closeAuthModal} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
      <div className="modal-content auth-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 id="auth-modal-title" className="modal-title">
            {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
          </h2>
          <button
            type="button"
            className="btn-icon modal-close"
            onClick={closeAuthModal}
            aria-label={t('modal.cancel')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="auth-modal-body">
          {reasonText && (
            <div className="auth-modal-reason">
              <CloudUpload size={16} />
              <span>{reasonText}</span>
            </div>
          )}

          {error && <div className="login-alert error">{error}</div>}
          {message && <div className="login-alert success">{message}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="auth-modal-email" className="login-label">
                {t('login.email')}
              </label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  id="auth-modal-email"
                  type="email"
                  className="login-input"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="auth-modal-password" className="login-label">
                {t('login.password')}
              </label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="auth-modal-password"
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? (
                <span>{t('login.processing')}</span>
              ) : (
                <>
                  <span>{mode === 'login' ? t('login.signIn') : t('login.createAccountBtn')}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>{lang === 'id' ? 'atau' : 'or'}</span>
          </div>

          <button
            type="button"
            className="login-google-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{t('login.continueGoogle')}</span>
          </button>

          <p className="login-switch" style={{ marginTop: 4 }}>
            {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
                setMessage(null);
              }}
            >
              {mode === 'login' ? t('login.register') : t('login.signIn')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
