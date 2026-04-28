'use client';

import { useState } from 'react';
import { usePortfolio } from '@/contexts/PortfolioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, Plus, Pencil, Trash2, Check, X, FolderOpen } from 'lucide-react';

export default function PortfolioSelector() {
  const {
    portfolios,
    activePortfolio,
    setActivePortfolioId,
    createPortfolio,
    updatePortfolio,
    deletePortfolio,
  } = usePortfolio();
  const { t } = useLanguage();

  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputName, setInputName] = useState('');

  const handleCreate = async () => {
    if (!inputName.trim()) return;
    await createPortfolio(inputName.trim());
    setInputName('');
    setShowCreate(false);
  };

  const handleRename = async (id: string) => {
    if (!inputName.trim()) return;
    await updatePortfolio(id, { name: inputName.trim() });
    setEditingId(null);
    setInputName('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePortfolio(id);
    } catch {
      // Can't delete default
    }
  };

  const activeLabel = activePortfolio?.name || t('portfolio.all');

  return (
    <div className="portfolio-selector" id="portfolio-selector">
      <button
        className="portfolio-selector-btn"
        onClick={() => setOpen(!open)}
        id="portfolio-selector-toggle"
      >
        <FolderOpen size={16} />
        <span className="portfolio-selector-label">{activeLabel}</span>
        <ChevronDown size={14} className={`portfolio-chevron ${open ? 'open' : ''}`} />
      </button>

      {open && (
        <>
          <div className="portfolio-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="portfolio-dropdown" id="portfolio-dropdown">
            {/* "All" option */}
            <button
              className={`portfolio-option ${!activePortfolio ? 'active' : ''}`}
              onClick={() => { setActivePortfolioId(null); setOpen(false); }}
            >
              <span>{t('portfolio.all')}</span>
              {!activePortfolio && <Check size={14} />}
            </button>

            <div className="portfolio-divider" />

            {/* Portfolio list */}
            {portfolios.map((p) => (
              <div key={p.id} className="portfolio-option-row">
                {editingId === p.id ? (
                  <div className="portfolio-edit-row">
                    <input
                      className="portfolio-edit-input"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(p.id)}
                      autoFocus
                    />
                    <button className="portfolio-icon-btn" onClick={() => handleRename(p.id)}>
                      <Check size={14} />
                    </button>
                    <button className="portfolio-icon-btn" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className={`portfolio-option ${activePortfolio?.id === p.id ? 'active' : ''}`}
                      onClick={() => { setActivePortfolioId(p.id); setOpen(false); }}
                    >
                      <span>{p.name}</span>
                      {activePortfolio?.id === p.id && <Check size={14} />}
                    </button>
                    <div className="portfolio-option-actions">
                      <button
                        className="portfolio-icon-btn"
                        onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setInputName(p.name); }}
                        title={t('action.edit')}
                      >
                        <Pencil size={12} />
                      </button>
                      {!p.is_default && (
                        <button
                          className="portfolio-icon-btn danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                          title={t('action.delete')}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            <div className="portfolio-divider" />

            {/* Create new */}
            {showCreate ? (
              <div className="portfolio-create-row">
                <input
                  className="portfolio-edit-input"
                  placeholder={t('portfolio.namePlaceholder')}
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  autoFocus
                />
                <button className="portfolio-icon-btn" onClick={handleCreate}>
                  <Check size={14} />
                </button>
                <button className="portfolio-icon-btn" onClick={() => { setShowCreate(false); setInputName(''); }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="portfolio-option create"
                onClick={() => { setShowCreate(true); setInputName(''); }}
                id="portfolio-create-btn"
              >
                <Plus size={14} />
                <span>{t('portfolio.create')}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
