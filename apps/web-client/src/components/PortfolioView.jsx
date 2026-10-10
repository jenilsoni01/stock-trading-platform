import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  DollarSign, 
  Award,
  BarChart3
} from 'lucide-react';

export function PortfolioView({ onSelectStockForOrder }) {
  const { user, openAuthModal } = useAuth();
  const [summary, setSummary] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolioData = async () => {
    if (!user) return;
    try {
      const [sumRes, holdRes, perfRes] = await Promise.all([
        api.getPortfolio(),
        api.getHoldings(),
        api.getPerformance(),
      ]);
      setSummary(sumRes);
      setHoldings(holdRes || []);
      setPerformance(perfRes);
    } catch (err) {
      console.error('Failed to load portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
      const interval = setInterval(fetchPortfolioData, 6000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <PieChart size={48} color="#38bdf8" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Login to View Your Portfolio</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Connect with your account to track real-time valuations, average cost basis, and P&L analytics.
        </p>
        <button onClick={() => openAuthModal('login')} className="btn btn-primary">
          Login to Continue
        </button>
      </div>
    );
  }

  const formatInr = (paise) => {
    if (!paise && paise !== 0) return '0.00';
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isUnrealizedPos = (summary?.totalUnrealizedPnlPaise || 0) >= 0;
  const isRealizedPos = (summary?.totalRealizedPnlPaise || 0) >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Portfolio Header Bar */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Portfolio & Holdings Overview</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            CQRS Read-Side Materialized View computed by Python/FastAPI service with Redis caching
          </p>
        </div>
        <button onClick={fetchPortfolioData} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sync Projection
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {/* Total Valuation */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            CURRENT VALUATION
          </span>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
            ₹{formatInr(summary?.currentValuationPaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Invested: ₹{formatInr(summary?.totalInvestedPaise)}
          </span>
        </div>

        {/* Unrealized P&L */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            UNREALIZED P&L
          </span>
          <div className="mono" style={{
            fontSize: '24px',
            fontWeight: 800,
            color: isUnrealizedPos ? 'var(--success)' : 'var(--danger)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            {isUnrealizedPos ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
            ₹{formatInr(summary?.totalUnrealizedPnlPaise)}
          </div>
          <span style={{ fontSize: '12px', color: isUnrealizedPos ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {isUnrealizedPos ? '+' : ''}{summary?.totalUnrealizedPnlPercentage?.toFixed(2)}% on active positions
          </span>
        </div>

        {/* Realized P&L */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            TOTAL REALIZED P&L
          </span>
          <div className="mono" style={{
            fontSize: '24px',
            fontWeight: 800,
            color: isRealizedPos ? 'var(--success)' : 'var(--danger)',
            marginBottom: '6px',
          }}>
            {isRealizedPos ? '+' : ''}₹{formatInr(summary?.totalRealizedPnlPaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Closed trade profits credited to wallet
          </span>
        </div>

        {/* Performance Win Rate */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            WIN RATE & ACTIVITY
          </span>
          <div className="mono" style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginBottom: '6px' }}>
            {performance?.winRatePercentage || 0}%
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {performance?.totalTradesCount || 0} Total Executed Trades
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Active Stock Positions ({holdings.length})</h2>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>HOLDING</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>SHARES</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>AVG COST</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>CURRENT PRICE</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TOTAL VALUE</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>UNREALIZED P&L</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {holdings.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No open positions found. Go to the Market tab to place your first simulated BUY order!
                </td>
              </tr>
            ) : (
              holdings.map((h) => {
                const isPos = h.unrealizedPnlPaise >= 0;
                return (
                  <tr key={h.symbol} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '16px 18px' }}>
                      <span style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>{h.symbol}</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{h.quantity}</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>₹{formatInr(h.averageCostPaise)}</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>₹{formatInr(h.currentPricePaise)}</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>₹{formatInr(h.currentValuationPaise)}</span>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{
                        color: isPos ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600,
                      }}>
                        <span className="mono">{isPos ? '+' : ''}₹{formatInr(h.unrealizedPnlPaise)}</span>
                        <div style={{ fontSize: '11px' }}>
                          ({isPos ? '+' : ''}{h.unrealizedPnlPercentage.toFixed(2)}%)
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => onSelectStockForOrder({ stock: { symbol: h.symbol, currentPricePaise: h.currentPricePaise, name: h.symbol }, initialSide: 'BUY' })}
                          className="btn btn-buy"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          BUY+
                        </button>
                        <button
                          onClick={() => onSelectStockForOrder({ stock: { symbol: h.symbol, currentPricePaise: h.currentPricePaise, name: h.symbol }, initialSide: 'SELL' })}
                          className="btn btn-sell"
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          SELL
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
