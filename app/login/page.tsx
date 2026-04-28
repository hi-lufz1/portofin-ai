'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, User } from 'lucide-react';

export default function LoginPage() {
  const { signIn, signUp, signInWithGoogle, isDemo } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Mohon isi semua field yang diperlukan');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) setError(err);
      } else {
        const { error: err } = await signUp(email, password);
        if (err) {
          setError(err);
        } else {
          setSuccess('Akun berhasil dibuat! Cek email kamu untuk verifikasi.');
          setMode('login');
        }
      }
    } catch {
      setError('Terjadi kesalahan yang tidak terduga');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err);
    } catch {
      setError('Gagal masuk dengan Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-page" id="login-page">
      {/* Left Panel - Branding */}
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-logo">
            <img src="/logo.png" alt="Portofin" width={32} height={32} style={{ borderRadius: 6 }} />
          </div>
          <h1 className="login-brand-title">Portofin</h1>
          <p className="login-brand-subtitle">
            Pantau portofolio saham &amp; crypto kamu dengan AI-powered insights dan harga real-time
          </p>

          <div className="login-features">
            <div className="login-feature">
              <div className="login-feature-dot ai" />
              <span>AI Portfolio Advisor — analisis cerdas</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Harga saham &amp; crypto real-time</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Multi mata uang (IDR &amp; USD)</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot" />
              <span>Analitik portofolio &amp; P/L</span>
            </div>
          </div>
        </div>

        <div className="login-brand-footer">
          <span>© 2026 Portofin. Built by Latif Fauzi.</span>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="login-form-panel">
        <div className="login-form-container">
          {/* Mobile Branding Header — only visible on mobile */}
          <div className="login-mobile-brand" id="login-mobile-brand">
            <div className="login-mobile-logo">
              <img src="/logo.png" alt="Portofin" width={22} height={22} style={{ borderRadius: 4 }} />
            </div>
            <span className="login-mobile-brand-text">Portofin</span>
          </div>

          <div className="login-form-content">
            {isDemo && (
            <div className="login-demo-banner" id="demo-banner">
              <strong>Mode Demo</strong>
              <p>Supabase belum dikonfigurasi. Login dinonaktifkan — kamu langsung masuk ke dashboard dengan data demo.</p>
              <a href="/dashboard" className="btn-primary login-demo-btn">
                Masuk ke Dashboard
                <ArrowRight size={16} />
              </a>
            </div>
          )}

          <div className="login-form-header">
            <h2 className="login-form-title">
              {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h2>
            <p className="login-form-subtitle">
              {mode === 'login'
                ? 'Masuk untuk mengakses portofolio kamu'
                : 'Daftar untuk mulai tracking investasi kamu'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" id="auth-form">
            {error && (
              <div className="login-error" id="auth-error">{error}</div>
            )}
            {success && (
              <div className="login-success" id="auth-success">{success}</div>
            )}

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="name" className="form-label">Nama Lengkap</label>
                <div className="login-input-wrap">
                  <User size={16} className="login-input-icon" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="form-input login-input"
                    disabled={isDemo}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="login-input-wrap">
                <Mail size={16} className="login-input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="form-input login-input"
                  disabled={isDemo}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="login-input-wrap">
                <Lock size={16} className="login-input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="form-input login-input"
                  disabled={isDemo}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="confirm-password" className="form-label">Konfirmasi Password</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="form-input login-input"
                    disabled={isDemo}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || isDemo}
              className="btn-primary login-submit-btn"
              id="auth-submit"
            >
              {loading ? (
                <><Loader2 size={16} className="spin" /> Memproses...</>
              ) : mode === 'login' ? (
                <>Masuk <ArrowRight size={16} /></>
              ) : (
                <>Buat Akun <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || isDemo}
            className="login-google-btn"
            id="google-signin"
          >
            {googleLoading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            Lanjutkan dengan Google
          </button>

          <div className="login-toggle">
            {mode === 'login' ? (
              <p>
                Belum punya akun?{' '}
                <button onClick={() => { setMode('register'); setError(null); setSuccess(null); }} className="login-toggle-link" id="switch-to-register">
                  Daftar
                </button>
              </p>
            ) : (
              <p>
                Sudah punya akun?{' '}
                <button onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="login-toggle-link" id="switch-to-login">
                  Masuk
                </button>
              </p>
            )}
          </div>
          </div>

          {/* Mobile Footer — only visible on mobile */}
          <div className="login-mobile-footer" id="login-mobile-footer">
            <span>© 2026 Portofin. Built by Latif Fauzi.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
