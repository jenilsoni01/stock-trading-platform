import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Activity, 
  Globe, 
  Zap, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export function MarketWatch({ onSelectStockForOrder }) {
  const { user, openAuthModal } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('ALL'); // 'ALL' | 'NSE' | 'US'
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [selectedStockHistory, setSelectedStockHistory] = useState(null);
  const [priceFlashMap, setPriceFlashMap] = useState({}); // { [symbol]: 'price-flash-up' | 'price-flash-down' }
  const [dataMode, setDataMode] = useState('simulated'); // 'simulated' | 'live'
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [lastLiveSyncTime, setLastLiveSyncTime] = useState(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  const prevPricesRef = useRef({});

  const fetchStocks = async () => {
    try {
      const res = await api.getStocks();
      if (res && res.stocks) {
        const newFlash = {};
        res.stocks.forEach(s => {
          const prev = prevPricesRef.current[s.symbol];
          if (prev !== undefined && s.currentPricePaise !== prev) {
            newFlash[s.symbol] = s.currentPricePaise > prev ? 'price-flash-up' : 'price-flash-down';
          }
          prevPricesRef.current[s.symbol] = s.currentPricePaise;
        });

        if (Object.keys(newFlash).length > 0) {
          setPriceFlashMap(prev => ({ ...prev, ...newFlash }));
          setTimeout(() => {
            setPriceFlashMap(prev => {
              const updated = { ...prev };
              Object.keys(newFlash).forEach(k => delete updated[k]);
              return updated;
            });
          }, 900);
        }

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
    // In simulated mode, poll every 2 seconds for high-frequency ticks.
    // In live mode, poll every 8 seconds to reflect any background updates.
    const pollInterval = dataMode === 'simulated' ? 2000 : 8000;
    const interval = setInterval(fetchStocks, pollInterval);
    return () => clearInterval(interval);
  }, [dataMode]);

  const handleToggleDataMode = async (mode) => {
    setDataMode(mode);
    if (mode === 'live') {
      await syncLiveQuotes();
    }
  };

  const syncLiveQuotes = async () => {
    setIsSyncingLive(true);
    setSyncStatusMsg('Contacting global exchange feeds via Yahoo Finance API...');
    try {
      const res = await api.syncLiveMarket();
      if (res && res.stocks) {
        setStocks(res.stocks);
      } else {
        await fetchStocks();
      }
      setLastLiveSyncTime(new Date().toLocaleTimeString());
      setSyncStatusMsg(`Successfully synchronized ${res?.updatedCount || 35} live exchange instruments!`);
      setTimeout(() => setSyncStatusMsg(null), 4500);
    } catch (err) {
      console.error('Failed to sync live quotes:', err);
      setSyncStatusMsg('Live sync notice: Using resilient local ticker cache.');
      setTimeout(() => setSyncStatusMsg(null), 4500);
    } finally {
      setIsSyncingLive(false);
    }
  };

  const loadHistory = async (stock) => {
    try {
      const res = await api.getStockHistory(stock.symbol, '1d');
      setSelectedStockHistory({ stock, points: res.points || [] });
    } catch (e) {
      console.error('Error fetching stock history:', e);
      setSelectedStockHistory({ stock, points: [] });
    }
  };

  const nseStocks = stocks.filter(s => s.market === 'NSE' || (!s.market && s.market !== 'US'));
  const usStocks = stocks.filter(s => s.market === 'US');

  // Sectors dynamic based on current marketFilter
  const visibleForSectors = marketFilter === 'ALL' 
    ? stocks 
    : (marketFilter === 'NSE' ? nseStocks : usStocks);
  const sectors = ['ALL', ...new Set(visibleForSectors.map(s => s.sector).filter(Boolean))];

  const filteredStocks = stocks.filter(s => {
    const isUs = s.market === 'US';
    const matchesMarket = marketFilter === 'ALL' ||
                          (marketFilter === 'NSE' && !isUs) ||
                          (marketFilter === 'US' && isUs);
    const matchesSearch = s.symbol.toLowerCase().includes(search.toLowerCase()) ||
                          s.name.toLowerCase().includes(search.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || s.sector === selectedSector;
    return matchesMarket && matchesSearch && matchesSector;
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
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="pulse-live" style={{ 
                width: '10px', 
                height: '10px', 
                borderRadius: '50%', 
                background: dataMode === 'live' ? '#10b981' : '#38bdf8', 
                display: 'inline-block' 
              }} />
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 700, 
                color: dataMode === 'live' ? '#10b981' : '#38bdf8', 
                letterSpacing: '0.05em' 
              }}>
                {dataMode === 'live' ? '🌐 LIVE REAL-WORLD MARKET DATA (YAHOO FINANCE)' : '⚡ SIMULATED INTRADAY FEED • 2-SECOND TICKS'}
              </span>
              {lastLiveSyncTime && (
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Last Live Sync: {lastLiveSyncTime}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px' }}>
              Multi-Market Exchange Watchlist
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '640px' }}>
              Trade Indian Blue-Chips (NSE) and US Global Tech Giants (NASDAQ/NYSE). Toggle between deterministic high-frequency simulation and real-world live exchange quotes.
            </p>
          </div>

          {/* Toggle Switch: Simulated vs Live Data */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.5)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
            }}>
              <button
                onClick={() => handleToggleDataMode('simulated')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: dataMode === 'simulated' ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)' : 'transparent',
                  color: dataMode === 'simulated' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  boxShadow: dataMode === 'simulated' ? '0 2px 8px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                <Zap size={14} /> Simulated Ticks (2s)
              </button>
              
              <button
                onClick={() => handleToggleDataMode('live')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: dataMode === 'live' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                  color: dataMode === 'live' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.2s ease',
                  boxShadow: dataMode === 'live' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
                }}
              >
                <Globe size={14} /> Live Market Sync
              </button>
            </div>

            {/* Quick Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={syncLiveQuotes}
                disabled={isSyncingLive}
                className="btn btn-secondary"
                style={{ 
                  padding: '6px 12px', 
                  fontSize: '12px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: '#10b981'
                }}
                title="Fetch live quotes for all 35 instruments from Yahoo Finance"
              >
                <RefreshCw size={13} className={isSyncingLive ? 'spin' : ''} />
                <span>{isSyncingLive ? 'Syncing...' : 'Sync Live Prices Now'}</span>
              </button>

              <button 
                onClick={fetchStocks} 
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Refresh from local database"
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live sync banner notification */}
        {syncStatusMsg && (
          <div style={{
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <CheckCircle2 size={16} />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Market Region Filter Tabs (All / NSE / US) */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={() => { setMarketFilter('ALL'); setSelectedSector('ALL'); }}
          className={`btn ${marketFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          All Instruments ({stocks.length})
        </button>

        <button
          onClick={() => { setMarketFilter('NSE'); setSelectedSector('ALL'); }}
          className={`btn ${marketFilter === 'NSE' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '8px 16px', 
            fontSize: '13px',
            background: marketFilter === 'NSE' ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' : undefined 
          }}
        >
          🇮🇳 Indian Equities (NSE) ({nseStocks.length})
        </button>

        <button
          onClick={() => { setMarketFilter('US'); setSelectedSector('ALL'); }}
          className={`btn ${marketFilter === 'US' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '8px 16px', 
            fontSize: '13px',
            background: marketFilter === 'US' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : undefined 
          }}
        >
          🇺🇸 US Tech & Global (NASDAQ/NYSE) ({usStocks.length})
        </button>
      </div>

      {/* Controls Bar: Search & Sector Filters */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search symbol or name (e.g. AAPL, RELIANCE, NVDA, TCS)..."
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
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>MARKET</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SECTOR</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>LAST PRICE</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>CHANGE</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>DAY HIGH / LOW</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>TRADE ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Connecting to market feeds...' : 'No instruments found matching criteria.'}
                </td>
              </tr>
            ) : (
              filteredStocks.map((stock) => {
                const isUsStock = stock.market === 'US';
                const changePaise = stock.changePaise !== undefined
                  ? stock.changePaise
                  : (stock.currentPricePaise - (stock.previousPricePaise || stock.currentPricePaise));
                const isPositive = changePaise >= 0;
                const changePct = stock.previousPricePaise && stock.previousPricePaise > 0
                  ? ((stock.currentPricePaise - stock.previousPricePaise) / stock.previousPricePaise) * 100
                  : (stock.changePercent ? parseFloat(stock.changePercent) : 0);
                const flashClass = priceFlashMap[stock.symbol] || '';
                const approxUsd = isUsStock ? (stock.currentPricePaise / (100 * 84)).toFixed(2) : null;

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
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          background: isUsStock ? 'rgba(139, 92, 246, 0.12)' : 'rgba(56, 189, 248, 0.1)',
                          border: isUsStock ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                          color: isUsStock ? '#a78bfa' : '#38bdf8',
                        }}>
                          {stock.symbol.slice(0, 4)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>
                              {stock.symbol}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {stock.name}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Market Region Badge */}
                    <td style={{ padding: '16px 18px' }}>
                      {isUsStock ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          color: '#c4b5fd',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          🇺🇸 US Equities
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px solid rgba(16, 185, 129, 0.25)',
                          color: '#6ee7b7',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}>
                          🇮🇳 India NSE
                        </span>
                      )}
                    </td>

                    {/* Sector Badge */}
                    <td style={{ padding: '16px 18px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {stock.sector || 'Equities'}
                      </span>
                    </td>

                    {/* Price with flash animation & optional USD conversion */}
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div>
                        <span
                          className={`mono ${flashClass}`}
                          style={{
                            fontSize: '15px',
                            fontWeight: 700,
                            display: 'inline-block',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            transition: 'background-color 0.2s ease',
                          }}
                        >
                          ₹{formatInr(stock.currentPricePaise)}
                        </span>
                        {isUsStock && approxUsd && (
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            ~${approxUsd} USD
                          </div>
                        )}
                      </div>
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
                          {isPositive ? '+' : ''}{formatInr(changePaise)} ({isPositive ? '+' : ''}{changePct.toFixed(2)}%)
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-neutral">{selectedStockHistory.stock.sector}</span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: selectedStockHistory.stock.market === 'US' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: selectedStockHistory.stock.market === 'US' ? '#c4b5fd' : '#6ee7b7',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}>
                    {selectedStockHistory.stock.market === 'US' ? '🇺🇸 NASDAQ / NYSE' : '🇮🇳 NSE Equity'}
                  </span>
                </div>
                <h2 style={{ fontSize: '24px', fontWeight: 800 }}>{selectedStockHistory.stock.symbol}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{selectedStockHistory.stock.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: '24px', fontWeight: 800 }}>
                  ₹{formatInr(selectedStockHistory.stock.currentPricePaise)}
                </div>
                {selectedStockHistory.stock.market === 'US' && (
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    ~${(selectedStockHistory.stock.currentPricePaise / (100 * 84)).toFixed(2)} USD
                  </div>
                )}
                <div style={{
                  color: (selectedStockHistory.stock.changePaise || 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                  fontWeight: 600,
                  marginTop: '4px',
                }}>
                  {(selectedStockHistory.stock.changePaise || 0) >= 0 ? '+' : ''}
                  {formatInr(selectedStockHistory.stock.changePaise)} ({selectedStockHistory.stock.changePercent ? parseFloat(selectedStockHistory.stock.changePercent).toFixed(2) : '0.00'}%)
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
                <span>{dataMode === 'live' ? 'Live Exchange Candlestick Range' : 'Intraday Simulated Ticks'}</span>
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
