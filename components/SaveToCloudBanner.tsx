'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CloudUpload, Database, Sparkles } from 'lucide-react';

export default function SaveToCloudBanner() {
  const { isGuest, isDemo, openAuthModal } = useAuth();
  const { guestAssetCount, isSyncingGuest, seedSamplePortfolio } = usePortfolio();
  const { t } = useLanguage();
  const [seeding, setSeeding] = useState(false);

  if (isDemo) return null;

  if (isSyncingGuest) {
    return (
      <div className="save-cloud-banner" role="status" aria-live="polite">
        <div className="save-cloud-left">
          <div className="save-cloud-icon">
            <CloudUpload size={18} />
          </div>
          <div className="save-cloud-text">
            <div className="save-cloud-title">{t('guest.syncing')}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!isGuest) return null;

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedSamplePortfolio();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="save-cloud-banner">
      <div className="save-cloud-left">
        <div className="save-cloud-icon">
          {guestAssetCount > 0 ? <CloudUpload size={18} /> : <Database size={18} />}
        </div>
        <div className="save-cloud-text">
          <div className="save-cloud-title">
            <span className="save-cloud-badge">{t('guest.badge')}</span>
            <span>
              {guestAssetCount > 0
                ? t('guest.bannerTitleWithData').replace('{count}', String(guestAssetCount))
                : t('guest.bannerTitleEmpty')}
            </span>
          </div>
          <p className="save-cloud-desc">
            {guestAssetCount > 0 ? t('guest.bannerDescWithData') : t('guest.bannerDescEmpty')}
          </p>
        </div>
      </div>

      <div className="save-cloud-actions">
        {guestAssetCount === 0 && (
          <button
            type="button"
            className="save-cloud-btn-secondary"
            onClick={handleSeed}
            disabled={seeding}
          >
            <Sparkles size={14} />
            <span>{t('guest.loadSample')}</span>
          </button>
        )}
        <button
          type="button"
          className="save-cloud-btn-primary"
          onClick={() => openAuthModal()}
        >
          <CloudUpload size={14} />
          <span>{guestAssetCount > 0 ? t('guest.saveToCloud') : t('guest.signInOrUp')}</span>
        </button>
      </div>
    </div>
  );
}
