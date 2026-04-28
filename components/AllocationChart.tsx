'use client';

import { usePortfolio } from '@/contexts/PortfolioContext';
import { useCurrency } from '@/contexts/CurrencyContext';

export default function AllocationChart() {
  const { holdings, summary } = usePortfolio();
  const { formatCurrency } = useCurrency();

  // Calculate allocation by asset type
  const cryptoValue = holdings
    .filter((h) => h.type === 'crypto')
    .reduce((sum, h) => sum + h.current_value, 0);
  const stockValue = holdings
    .filter((h) => h.type === 'stock')
    .reduce((sum, h) => sum + h.current_value, 0);
  const totalValue = cryptoValue + stockValue;

  const cryptoPct = totalValue > 0 ? (cryptoValue / totalValue) * 100 : 0;
  const stockPct = totalValue > 0 ? (stockValue / totalValue) * 100 : 0;

  // Individual allocations sorted by value
  const allocations = [...holdings]
    .sort((a, b) => b.current_value - a.current_value)
    .slice(0, 6)
    .map((h) => ({
      id: h.id,
      name: h.name,
      ticker: h.ticker,
      type: h.type,
      value: h.current_value,
      pct: totalValue > 0 ? (h.current_value / totalValue) * 100 : 0,
    }));

  // SVG donut chart parameters
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { pct: cryptoPct, color: '#6366f1', label: 'Crypto' },
    { pct: stockPct, color: '#0F172A', label: 'Stocks (IDX)' },
  ];

  let accumulatedPct = 0;

  return (
    <div className="allocation-card" id="allocation-card">
      <h3 className="section-title">Asset Allocation</h3>

      <div className="allocation-content">
        {/* Donut chart */}
        <div className="donut-wrap">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
            />
            {/* Data segments */}
            {segments.map((seg, i) => {
              const dashArray = (seg.pct / 100) * circumference;
              const dashOffset = circumference - (accumulatedPct / 100) * circumference;
              accumulatedPct += seg.pct;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashArray} ${circumference - dashArray}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  className="donut-segment"
                />
              );
            })}
          </svg>
          <div className="donut-center">
            <span className="donut-center-label">Total</span>
            <span className="donut-center-value">{formatCurrency(totalValue)}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="allocation-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#6366f1' }} />
            <div className="legend-info">
              <span className="legend-label">Crypto</span>
              <span className="legend-value">{formatCurrency(cryptoValue)}</span>
            </div>
            <span className="legend-pct">{cryptoPct.toFixed(1)}%</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#0F172A' }} />
            <div className="legend-info">
              <span className="legend-label">Stocks (IDX)</span>
              <span className="legend-value">{formatCurrency(stockValue)}</span>
            </div>
            <span className="legend-pct">{stockPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Top Holdings bar chart */}
      {allocations.length > 0 && (
        <div className="allocation-bars">
          <span className="allocation-bars-title">Top Holdings</span>
          {allocations.map((a) => (
            <div key={a.id} className="allocation-bar-item">
              <div className="allocation-bar-label">
                <span className="allocation-bar-name">{a.name}</span>
                <span className="allocation-bar-pct">{a.pct.toFixed(1)}%</span>
              </div>
              <div className="allocation-bar-track">
                <div
                  className="allocation-bar-fill"
                  style={{
                    width: `${a.pct}%`,
                    backgroundColor: a.type === 'crypto' ? '#6366f1' : '#0F172A',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
