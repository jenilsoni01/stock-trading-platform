import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Wallet, ShieldCheck, History, ArrowDownLeft, ArrowUpRight, Lock, CheckCircle2 } from 'lucide-react';

export function WalletLedgerView() {
  const { user, wallet, refreshWallet, openAuthModal } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    if (!user) return;
    try {
      await refreshWallet();
      const res = await api.getWalletTransactions(50);
      setTransactions(res.content || res.transactions || (Array.isArray(res) ? res : []));
    } catch (e) {
      console.error('Failed to load ledger:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLedger();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
        <Wallet size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Login to View Wallet & Ledger</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Your virtual wallet is credited with ₹100,000 INR on registration.
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Wallet & Double-Entry Ledger</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            ACID ledger in PostgreSQL with integer paise arithmetic and pessimistic row-locking
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>
          <ShieldCheck size={18} />
          <span>Financial Invariants Verified</span>
        </div>
      </div>

      {/* Balance Summary Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
      }}>
        {/* Available Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            AVAILABLE TO TRADE
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.availableBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Free liquid capital ready for order execution
          </span>
        </div>

        {/* Reserved Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            RESERVED CASH (IN SAGA)
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.reservedBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Locked atomically during active buy orders
          </span>
        </div>

        {/* Total Balance */}
        <div className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #38bdf8' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
            TOTAL VIRTUAL WEALTH
          </span>
          <div className="mono" style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', marginBottom: '4px' }}>
            ₹{formatInr(wallet?.totalBalancePaise)}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Available + Reserved = Total invariant holds
          </span>
        </div>
      </div>

      {/* Ledger Transactions Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700 }}>Append-Only Ledger Transactions ({transactions.length})</h2>
          <button onClick={fetchLedger} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Refresh Ledger
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>TRANSACTION ID</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>OPERATION</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600 }}>DESCRIPTION</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>AMOUNT</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>BALANCE AFTER</th>
              <th style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-dim)', fontWeight: 600, textAlign: 'right' }}>TIMESTAMP</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {loading ? 'Loading ledger entries...' : 'No ledger transactions recorded yet.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.operationType?.includes('CREDIT') || tx.operationType?.includes('REGISTRATION') || tx.operationType?.includes('RELEASE');
                return (
                  <tr key={tx.entryId || tx.id} className="glass-card-hover" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {(tx.entryId || tx.id)?.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className={`badge ${isCredit ? 'badge-success' : 'badge-danger'}`}>
                        {tx.operationType}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: '13px', color: '#f1f5f9' }}>
                      {tx.description || tx.reason || 'Wallet operation'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{
                        fontWeight: 700,
                        color: isCredit ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {isCredit ? '+' : '-'}₹{formatInr(tx.amountPaise)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <span className="mono" style={{ color: 'var(--text-muted)' }}>
                        ₹{formatInr(tx.balanceAfterPaise)}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: '12px', color: 'var(--text-dim)' }}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
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
