'use client';

import { useState } from 'react';
import PortfolioSummaryCards from '@/components/PortfolioSummary';
import HoldingsTable from '@/components/HoldingsTable';
import AllocationChart from '@/components/AllocationChart';

import AddAssetModal from '@/components/AddAssetModal';
import PortfolioSelector from '@/components/PortfolioSelector';
import { Plus, RefreshCw } from 'lucide-react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { refreshData, loading } = usePortfolio();
  const { t } = useLanguage();

  return (
    <div className="page-content" id="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">{t('dashboard.subtitle')}</p>
        </div>
        <div className="page-actions">
          <button onClick={() => refreshData()} className="btn-ghost" disabled={loading} id="refresh-btn">
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary" id="add-asset-btn">
            <Plus size={16} />
            <span>{t('dashboard.addAsset')}</span>
          </button>
        </div>
      </div>

      <PortfolioSelector />



      {/* Summary Cards */}
      <PortfolioSummaryCards />

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <HoldingsTable />
        </div>
        <div className="dashboard-sidebar">

          <AllocationChart />
        </div>
      </div>

      <AddAssetModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

