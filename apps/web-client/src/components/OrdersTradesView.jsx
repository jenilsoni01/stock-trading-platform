import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ListOrdered, RefreshCw, Clock, Ban, CheckCircle2 } from 'lucide-react';

export function OrdersTradesView() {
  const { user, openAuthModal, refreshWallet } = useAuth();
  const [subTab, setSubTab] = useState('orders'); // 'orders' or 'trades'
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchData = async () => {
    try {
      const uid = user?.id || user?.userId || 'trader';
      if (subTab === 'orders') {
        const res = await api.getOrders(50, uid);
        setOrders(res.orders || (Array.isArray(res) ? res : []));
      } else {
        const res = await api.getTrades(50, uid);
        setTrades(res.trades || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      console.error('Failed to load orders/trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2500);
    return () => clearInterval(interval);
  }, [user, subTab]);

  const handleCancel = async (orderId) => {
    if (!orderId) return;
    setCancellingId(orderId);
    try {
      await api.cancelOrder(orderId);
      if (refreshWallet) await refreshWallet();
      await fetchData();
    } catch (err) {
      alert(`Could not cancel order: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <ListOrdered size={48} color="#38bdf8" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Login to View Orders & Trades</h2>
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'EXECUTED':
        return <span className="badge badge-success">EXECUTED</span>;
      case 'PENDING':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} /> PENDING
          </span>
        );
      case 'VALIDATING':
      case 'ACCEPTED':
      case 'EXECUTING':
        return <span className="badge badge-warning">{status}</span>;
      case 'REJECTED':
      case 'FAILED':
        return <span className="badge badge-danger">{status}</span>;
      case 'CANCELLED':
        return <span className="badge badge-neutral">CANCELLED</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Subtabs */}
      <div className="glass-card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('orders')}
            className={`btn ${subTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Orders History ({orders.length})
          </button>
          <button
            onClick={() => setSubTab('trades')}
            className={`btn ${subTab === 'trades' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Executed Trades ({trades.length})
          </button>
        </div>

        <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Auto-Refreshing (3s)
        </button>
      </div>

      {/* Orders View */}
      {subTab === 'orders' && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>ORDER ID</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SYMBOL</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SIDE & TYPE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>QUANTITY</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>PRICE (EXEC / LMT)</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TOTAL VALUE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>ACTION</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TIME</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Fetching orders from Order Service...' : 'No orders recorded yet. Place a Market or Limit order to get started.'}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId || o.id} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {String(o.orderId || o.id || '').slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{o.symbol}</span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={o.side === 'BUY' ? 'badge badge-success' : 'badge badge-danger'}>
                          {o.side}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                          {o.orderType || o.type}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{o.quantity}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono">
                        {o.executionPricePaise ? (
                          `₹${formatInr(o.executionPricePaise)}`
                        ) : o.limitPricePaise ? (
                          <span style={{ color: '#38bdf8' }}>₹{formatInr(o.limitPricePaise)} (LMT)</span>
                        ) : (
                          'Market'
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                        {o.totalValuePaise ? (
                          `₹${formatInr(o.totalValuePaise)}`
                        ) : o.limitPricePaise ? (
                          `₹${formatInr(o.limitPricePaise * o.quantity)} (Est)`
                        ) : (
                          '—'
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {getStatusBadge(o.status)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {o.status === 'PENDING' ? (
                        <button
                          onClick={() => handleCancel(o.orderId || o.id)}
                          disabled={cancellingId === (o.orderId || o.id)}
                          style={{
                            background: 'rgba(244, 63, 94, 0.12)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Ban size={12} />
                          {cancellingId === (o.orderId || o.id) ? 'Cancelling...' : 'Cancel'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Trades View */}
      {subTab === 'trades' && (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>TRADE ID</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SYMBOL</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>SIDE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>QUANTITY</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>FILL PRICE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>SETTLEMENT VALUE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>EXECUTED AT</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Fetching executed trades from MySQL...' : 'No trade fills recorded yet.'}
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.tradeId || t.id} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {String(t.tradeId || t.id || '').slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{t.symbol}</span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={t.side === 'BUY' ? 'badge badge-success' : 'badge badge-danger'}>
                        {t.side}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{t.quantity}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>₹{formatInr(t.pricePaise)}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, color: t.side === 'BUY' ? '#ffffff' : '#10b981' }}>
                        ₹{formatInr(t.totalValuePaise)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)' }}>
                      {t.executedAt ? new Date(t.executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
