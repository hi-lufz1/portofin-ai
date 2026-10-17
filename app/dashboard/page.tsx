'use client';

import React, { useState } from 'react';
import PortfolioSummary from '@/components/PortfolioSummary';
import HoldingsTable from '@/components/HoldingsTable';
import AllocationChart from '@/components/AllocationChart';
import AddAssetModal from '@/components/AddAssetModal';
import SaveToCloudBanner from '@/components/SaveToCloudBanner';
import { useLanguage } from '@/contexts/LanguageContext';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} strokeWidth={2.5} />
            <span>{t('dashboard.addAsset')}</span>
          </button>
        </div>
      </div>

      {/* Guest Mode Cloud Backup & Sample Data Banner */}
      <SaveToCloudBanner />

      {/* Summary Cards */}
      <PortfolioSummary />

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <HoldingsTable onAddClick={() => setShowAddModal(true)} />
        </div>
        <div className="dashboard-sidebar">
          <AllocationChart />
        </div>
      </div>

      {/* Add Asset Modal */}
      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
