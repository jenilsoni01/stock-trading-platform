import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ListOrdered, TrendingUp, RefreshCw, XCircle, CheckCircle2, Clock } from 'lucide-react';

export function OrdersTradesView() {
  const { user, openAuthModal } = useAuth();
  const [subTab, setSubTab] = useState('orders'); // 'orders' or 'trades'
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      if (subTab === 'orders') {
        const res = await api.getOrders(50);
        setOrders(res.orders || (Array.isArray(res) ? res : []));
      } else {
        const res = await api.getTrades(50);
        setTrades(res.trades || (Array.isArray(res) ? res : []));
      }
    } catch (err) {
      console.error('Failed to load orders/trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, subTab]);

  const handleCancel = async (orderId) => {
    try {
      await api.cancelOrder(orderId);
      await fetchData();
    } catch (err) {
      alert(`Could not cancel order: ${err.message}`);
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
          Refresh
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
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>EXEC PRICE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TOTAL VALUE</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>SUBMITTED</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Fetching orders from C++/MySQL Order Service...' : 'No orders recorded yet.'}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.orderId} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {o.orderId.slice(0, 8)}...
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
                          {o.orderType}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{o.quantity}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono">
                        {o.executionPricePaise ? `₹${formatInr(o.executionPricePaise)}` : (o.limitPricePaise ? `₹${formatInr(o.limitPricePaise)} (LMT)` : 'Market')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, color: '#ffffff' }}>
                        {o.totalValuePaise ? `₹${formatInr(o.totalValuePaise)}` : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                      {getStatusBadge(o.status)}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)' }}>
                      {o.createdAt ? new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
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
                    {loading ? 'Fetching trades from MySQL...' : 'No trade fills recorded yet.'}
                  </td>
                </tr>
              ) : (
                trades.map((t) => (
                  <tr key={t.tradeId} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {t.tradeId.slice(0, 8)}...
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
                      <span className="mono" style={{ fontWeight: 700, color: '#10b981' }}>₹{formatInr(t.totalValuePaise)}</span>
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
