'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, ArrowLeftRight, Compass, Sparkles, RefreshCw, TrendingUp, LogOut, Globe, Menu, X, CloudUpload } from 'lucide-react';
import PortfolioSelector from '@/components/PortfolioSelector';

export default function Navbar() {
  const pathname = usePathname();
  const { currency, setCurrency, exchangeRate } = useCurrency();
  const { lang, setLang, t } = useLanguage();
  const { refreshData, loading, guestAssetCount } = usePortfolio();
  const { user, isGuest, openAuthModal, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setTimeout(() => setRefreshing(false), 600);
  };

  const navItems = [
    { href: '/dashboard', label: t('nav.portfolio'), icon: LayoutDashboard },
    { href: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { href: '/explore', label: t('nav.explore'), icon: Compass },
    { href: '/ai-advisor', label: t('nav.aiAdvisor'), icon: Sparkles },
  ];

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <TrendingUp size={20} strokeWidth={2.5} />
          </div>
          <span className="brand-text">Portofin</span>
        </div>

        <PortfolioSelector />

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard' && pathname.startsWith('/dashboard'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="currency-switcher">
            <span className="currency-label">{t('nav.currency')}</span>
            <div className="currency-toggle" role="group" aria-label={t('nav.currency')}>
              <button
                type="button"
                className={`currency-option ${currency === 'IDR' ? 'active' : ''}`}
                onClick={() => setCurrency('IDR')}
              >
                IDR
              </button>
              <button
                type="button"
                className={`currency-option ${currency === 'USD' ? 'active' : ''}`}
                onClick={() => setCurrency('USD')}
              >
                USD
              </button>
            </div>
          </div>

          <div className="rate-info">
            <span>1 USD = Rp{exchangeRate.toLocaleString('id-ID')}</span>
            <button
              type="button"
              className="btn-icon"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              title={t('nav.refreshPrice')}
              aria-label={t('nav.refreshPrice')}
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            </button>
          </div>

          <div className="lang-switcher">
            <Globe size={14} className="lang-icon" />
            <div className="currency-toggle" role="group" aria-label="Language">
              <button
                type="button"
                className={`currency-option ${lang === 'id' ? 'active' : ''}`}
                onClick={() => setLang('id')}
              >
                ID
              </button>
              <button
                type="button"
                className={`currency-option ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
            </div>
          </div>

          {user ? (
            <div className="sidebar-user">
              <div className="sidebar-user-info">
                <div className="sidebar-user-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-detail">
                  <span className="sidebar-user-name">{displayName}</span>
                  <span className="sidebar-user-email">{user.email}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon sidebar-logout"
                onClick={signOut}
                title={t('nav.signOut')}
                aria-label={t('nav.signOut')}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : isGuest ? (
            <div className="sidebar-guest-box">
              <div className="sidebar-guest-status">
                <span className="sidebar-guest-dot" aria-hidden="true" />
                <span>{t('guest.badge')}: {t('guest.localStatus')}</span>
              </div>
              <button
                type="button"
                className="sidebar-guest-btn"
                onClick={() => openAuthModal()}
              >
                <CloudUpload size={14} />
                <span>{guestAssetCount > 0 ? t('guest.saveToCloud') : t('guest.signInOrUp')}</span>
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <div className="brand-logo mobile-brand-logo">
            <TrendingUp size={16} strokeWidth={2.5} />
          </div>
          <span className="mobile-brand-text">Portofin</span>
        </div>

        <div className="mobile-header-right">
          <div className="currency-toggle mobile-currency-toggle" role="group" aria-label={t('nav.currency')}>
            <button
              type="button"
              className={`currency-option ${currency === 'IDR' ? 'active' : ''}`}
              onClick={() => setCurrency('IDR')}
            >
              IDR
            </button>
            <button
              type="button"
              className={`currency-option ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => setCurrency('USD')}
            >
              USD
            </button>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title={t('nav.refreshPrice')}
            aria-label={t('nav.refreshPrice')}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
          <button
            type="button"
            className="btn-icon mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* ===== MOBILE SLIDE-DOWN MENU ===== */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={e => e.stopPropagation()}>
            <PortfolioSelector />

            <nav className="mobile-menu-nav" aria-label="Mobile navigation">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard' && pathname.startsWith('/dashboard'));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mobile-menu-footer">
              <div className="mobile-menu-controls">
                <div className="mobile-rate-info">
                  <span>1 USD = Rp{exchangeRate.toLocaleString('id-ID')}</span>
                </div>
                <div className="currency-toggle" role="group" aria-label="Language">
                  <button
                    type="button"
                    className={`currency-option ${lang === 'id' ? 'active' : ''}`}
                    onClick={() => setLang('id')}
                  >
                    ID
                  </button>
                  <button
                    type="button"
                    className={`currency-option ${lang === 'en' ? 'active' : ''}`}
                    onClick={() => setLang('en')}
                  >
                    EN
                  </button>
                </div>
              </div>

              {user ? (
                <div className="mobile-menu-user">
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-avatar">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="sidebar-user-detail">
                      <span className="sidebar-user-name">{displayName}</span>
                      <span className="sidebar-user-email">{user.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-icon sidebar-logout"
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    title={t('nav.signOut')}
                    aria-label={t('nav.signOut')}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              ) : isGuest ? (
                <button
                  type="button"
                  className="sidebar-guest-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuthModal();
                  }}
                >
                  <CloudUpload size={14} />
                  <span>{guestAssetCount > 0 ? t('guest.saveToCloud') : t('guest.signInOrUp')}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
