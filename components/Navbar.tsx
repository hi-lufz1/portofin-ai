'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Sparkles,
  Menu,
  X,
  TrendingUp,
  LogOut,
  Globe,
  User,
} from 'lucide-react';

const navKeys = [
  { href: '/dashboard', labelKey: 'nav.portfolio', icon: LayoutDashboard },
  { href: '/ai-advisor', labelKey: 'nav.aiAdvisor', icon: Sparkles },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
];

export default function Navbar() {
  const pathname = usePathname();
  const { currency, toggleCurrency } = useCurrency();
  const { user, isDemo, signOut } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar" id="sidebar-nav">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="/logo.png" alt="Portofin" width={20} height={20} style={{ borderRadius: 4 }} />
          </div>
          <span className="sidebar-brand-text">Portofin</span>
        </div>

        <nav className="sidebar-nav">
          {navKeys.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                id={`nav-${item.labelKey}`}
              >
                <item.icon size={18} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {/* User Info */}
          {user && (
            <div className="sidebar-user" id="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.email?.charAt(0).toUpperCase() || <User size={14} />}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="sidebar-user-email">{user.email}</span>
              </div>
            </div>
          )}
          <button
            onClick={toggleCurrency}
            className="currency-toggle-btn"
            id="currency-toggle"
            title="Toggle currency"
          >
            <span className={`currency-option ${currency === 'IDR' ? 'active' : ''}`}>IDR</span>
            <span className={`currency-option ${currency === 'USD' ? 'active' : ''}`}>USD</span>
          </button>
          <button
            onClick={toggleLanguage}
            className="currency-toggle-btn"
            id="lang-toggle"
            title="Toggle language"
          >
            <span className={`currency-option ${lang === 'id' ? 'active' : ''}`}>ID</span>
            <span className={`currency-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
          </button>
          {!isDemo && user && (
            <button onClick={signOut} className="sidebar-logout" id="logout-btn">
              <LogOut size={16} />
              <span>{t('nav.signout')}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="mobile-header" id="mobile-header">
        <div className="mobile-header-left">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="mobile-brand">
            <div className="sidebar-logo small">
              <img src="/logo.png" alt="Portofin" width={16} height={16} style={{ borderRadius: 3 }} />
            </div>
            <span className="mobile-brand-text">Portofin</span>
          </div>
        </div>

        <div className="mobile-header-right">
          {user && (
            <div className="mobile-user-avatar" title={user.email || ''}>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <button
            onClick={toggleLanguage}
            className="currency-toggle-btn small"
            id="lang-toggle-mobile"
            title="Toggle language"
          >
            <span className={`currency-option ${lang === 'id' ? 'active' : ''}`}>ID</span>
            <span className={`currency-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
          </button>
          <button
            onClick={toggleCurrency}
            className="currency-toggle-btn small"
            id="currency-toggle-mobile"
          >
            <span className={`currency-option ${currency === 'IDR' ? 'active' : ''}`}>IDR</span>
            <span className={`currency-option ${currency === 'USD' ? 'active' : ''}`}>USD</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <nav className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {/* User Info */}
            {user && (
              <div className="mobile-menu-user">
                <div className="mobile-menu-avatar">
                  {user.email?.charAt(0).toUpperCase() || <User size={16} />}
                </div>
                <div className="mobile-menu-user-info">
                  <span className="mobile-menu-user-name">
                    {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
                  </span>
                  <span className="mobile-menu-user-email">{user.email}</span>
                </div>
              </div>
            )}

            <div className="mobile-menu-divider" />

            {/* Navigation */}
            {navKeys.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mobile-menu-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon size={18} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}

            <div className="mobile-menu-divider" />

            {/* Settings */}
            <div className="mobile-menu-settings">
              <span className="mobile-menu-settings-label">{t('nav.language')}</span>
              <button
                onClick={toggleLanguage}
                className="currency-toggle-btn"
                id="lang-toggle-menu"
              >
                <span className={`currency-option ${lang === 'id' ? 'active' : ''}`}>ID</span>
                <span className={`currency-option ${lang === 'en' ? 'active' : ''}`}>EN</span>
              </button>
            </div>
            <div className="mobile-menu-settings">
              <span className="mobile-menu-settings-label">{t('nav.currency')}</span>
              <button
                onClick={toggleCurrency}
                className="currency-toggle-btn"
                id="currency-toggle-menu"
              >
                <span className={`currency-option ${currency === 'IDR' ? 'active' : ''}`}>IDR</span>
                <span className={`currency-option ${currency === 'USD' ? 'active' : ''}`}>USD</span>
              </button>
            </div>

            {/* Spacer + Logout */}
            <div className="mobile-menu-spacer" />
            {!isDemo && user && (
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="mobile-menu-logout"
                id="logout-btn-mobile"
              >
                <LogOut size={16} />
                <span>{t('nav.signout')}</span>
              </button>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
