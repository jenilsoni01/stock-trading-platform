import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw, ShoppingCart } from 'lucide-react';

export function MarketWatch({ onSelectStockForOrder }) {
  const { user, openAuthModal } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedStockHistory, setSelectedStockHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStocks = async () => {
    try {
      const res = await api.getStocks();
      if (res && res.stocks) {
        setStocks(res.stocks);
      }
    } catch (err) {
      console.error('Failed to load market stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadHistory = async (stock) => {
    setHistoryLoading(true);
    try {
      const res = await api.getStockHistory(stock.symbol, '1d');
      setSelectedStockHistory({ stock, points: res.points || [] });
    } catch (e) {
      console.error('Error fetching stock history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const sectors = ['ALL', ...new Set(stocks.map(s => s.sector).filter(Boolean))];

  const filteredStocks = stocks.filter(s => {
    const matchesSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
                          s.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const formatInr = (paise) => {
    if (!paise && paise !== 0) return '0.00';
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleOrderClick = (stock, side) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    onSelectStockForOrder({ stock, initialSide: side });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>
              Simulated Indian Equity Market (NSE/BSE)
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Live real-time prices computed deterministically with realistic brownian motion every 30s. Zero financial risk.
            </p>
          </div>
          <button 
            onClick={fetchStocks} 
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '12px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Ticker
          </button>
        </div>
      </div>

      {/* Controls Bar: Search & Sector Filters */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by Symbol or Company Name (e.g. RELIANCE, TCS)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        {/* Sector Filter Chips */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {sectors.map(sector => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              style={{
                background: selectedSector === sector ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedSector === sector ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: selectedSector === sector ? 'transparent' : 'var(--border-color)',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {sector}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>INSTRUMENT</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SECTOR</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>LAST PRICE (₹)</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>24H CHANGE</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>DAY HIGH / LOW</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>TRADE ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading live stock feeds from MongoDB & Simulator...' : 'No instruments found matching criteria.'}
                </td>
              </tr>
            ) : (
              filteredStocks.map((stock) => {
                const isPositive = (stock.changePaise || 0) >= 0;
                const changePct = stock.changePercent || 0;

                return (
                  <tr 
                    key={stock.symbol}
                    className="glass-card-hover"
                    style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', cursor: 'pointer' }}
                    onClick={() => loadHistory(stock)}
                  >
                    {/* Instrument Symbol & Name */}
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                          color: '#38bdf8',
                        }}>
                          {stock.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff', display: 'block' }}>
                            {stock.symbol}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {stock.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sector Badge */}
                    <td style={{ padding: '16px 18px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {stock.sector || 'Equities'}
                      </span>
                    </td>

                    {/* Price */}
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontSize: '15px', fontWeight: 700 }}>
                        ₹{formatInr(stock.currentPricePaise)}
                      </span>
                    </td>

                    {/* Change */}
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: isPositive ? 'var(--success)' : 'var(--danger)',
                        fontWeight: 600,
                      }}>
                        {isPositive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                        <span className="mono">
                          {isPositive ? '+' : ''}{formatInr(stock.changePaise)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    {/* Day High / Low */}
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--success)' }}>H: ₹{formatInr(stock.dayHighPaise || stock.currentPricePaise)}</span>
                        <span style={{ margin: '0 6px' }}>/</span>
                        <span style={{ color: 'var(--danger)' }}>L: ₹{formatInr(stock.dayLowPaise || stock.currentPricePaise)}</span>
                      </div>
                    </td>

                    {/* Quick Trade Buttons */}
                    <td style={{ padding: '16px 18px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOrderClick(stock, 'BUY')}
                          className="btn btn-buy"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
                        >
                          BUY
                        </button>
                        <button
                          onClick={() => handleOrderClick(stock, 'SELL')}
                          className="btn btn-sell"
                          style={{ padding: '6px 14px', fontSize: '12px' }}
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

      {/* Stock History Detail Modal */}
      {selectedStockHistory && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }} onClick={() => setSelectedStockHistory(null)}>
          <div 
            className="glass-card" 
            style={{ width: '100%', maxWidth: '640px', padding: '28px', background: '#121826' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span className="badge badge-neutral" style={{ marginBottom: '8px' }}>{selectedStockHistory.stock.sector}</span>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{selectedStockHistory.stock.symbol}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{selectedStockHistory.stock.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: '24px', fontWeight: 800 }}>
                  ₹{formatInr(selectedStockHistory.stock.currentPricePaise)}
                </div>
                <div style={{
                  color: (selectedStockHistory.stock.changePaise || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600,
                }}>
                  {(selectedStockHistory.stock.changePaise || 0) >= 0 ? '+' : ''}
                  {formatInr(selectedStockHistory.stock.changePaise)} ({selectedStockHistory.stock.changePercent?.toFixed(2)}%)
                </div>
              </div>
            </div>

            {/* Price Chart Visualizer (SVG Sparkline) */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>
                <span>Price Timeline</span>
                <span>Simulated Intraday Feed</span>
              </div>
              
              <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                {(selectedStockHistory.points.length > 0 ? selectedStockHistory.points : [
                  { pricePaise: selectedStockHistory.stock.currentPricePaise * 0.98 },
                  { pricePaise: selectedStockHistory.stock.currentPricePaise * 0.99 },
                  { pricePaise: selectedStockHistory.stock.currentPricePaise * 1.01 },
                  { pricePaise: selectedStockHistory.stock.currentPricePaise },
                ]).map((pt, idx, arr) => {
                  const min = Math.min(...arr.map(p => p.pricePaise));
                  const max = Math.max(...arr.map(p => p.pricePaise));
                  const range = max - min || 1;
                  const heightPct = Math.max(10, Math.min(100, ((pt.pricePaise - min) / range) * 90 + 10));
                  return (
                    <div 
                      key={idx}
                      title={`₹${formatInr(pt.pricePaise)}`}
                      style={{
                        flex: 1,
                        height: `${heightPct}%`,
                        background: 'linear-gradient(to top, rgba(56, 189, 248, 0.2), #38bdf8)',
                        borderRadius: '2px',
                        transition: 'height 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  const s = selectedStockHistory.stock;
                  setSelectedStockHistory(null);
                  handleOrderClick(s, 'BUY');
                }}
                className="btn btn-buy"
                style={{ flex: 1, padding: '12px' }}
              >
                Place BUY Order
              </button>
              <button
                onClick={() => {
                  const s = selectedStockHistory.stock;
                  setSelectedStockHistory(null);
                  handleOrderClick(s, 'SELL');
                }}
                className="btn btn-sell"
                style={{ flex: 1, padding: '12px' }}
              >
                Place SELL Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
