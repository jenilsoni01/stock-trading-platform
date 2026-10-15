import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { 
  TrendingUp, 
  Wallet, 
  Bell, 
  Activity, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Layers, 
  PieChart, 
  ListOrdered,
  BookOpen
} from 'lucide-react';

export function Navbar({ activeTab, setActiveTab, onOpenNotifications, onOpenSystemStatus }) {
  const { user, wallet, logout, openAuthModal } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      const fetchUnread = async () => {
        try {
          const res = await api.getNotifications(true);
          setUnreadCount(res.count || 0);
        } catch (e) {
          // ignore
        }
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 10000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const formatInr = (paise) => {
    return (paise / 100).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(20px)',
      background: 'rgba(10, 13, 20, 0.85)',
      borderBottom: '1px solid var(--border-color)',
      padding: '0 24px',
      height: '68px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Brand & Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div 
          onClick={() => setActiveTab('market')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.35)',
          }}>
            <TrendingUp size={22} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>
              STP<span style={{ color: '#38bdf8' }}>.exchange</span>
            </span>
            <span style={{ 
              display: 'block', 
              fontSize: '10px', 
              color: '#10b981', 
              fontWeight: 600, 
              letterSpacing: '0.5px',
              textTransform: 'uppercase'
            }}>
              Simulated Trading
            </span>
          </div>
        </div>

        {/* Nav Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('market')}
            className={`btn ${activeTab === 'market' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <TrendingUp size={16} /> Market
          </button>
          
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`btn ${activeTab === 'portfolio' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <PieChart size={16} /> Portfolio
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <ListOrdered size={16} /> Orders & Trades
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`btn ${activeTab === 'wallet' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px' }}
          >
            <Wallet size={16} /> Wallet
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`btn ${activeTab === 'guide' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '13px', background: activeTab === 'guide' ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' : undefined }}
          >
            <BookOpen size={16} /> Trading Guide
          </button>
        </div>
      </div>

      {/* Right Controls: Balance, Notifications, System Status, User Auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Live Architecture Status Monitor Button */}
        <button
          onClick={onOpenSystemStatus}
          className="btn btn-secondary"
          style={{ padding: '8px 12px', fontSize: '12px', borderColor: 'rgba(56, 189, 248, 0.3)' }}
          title="Distributed Microservices Health"
        >
          <span className="status-dot status-dot-active" />
          <Activity size={14} color="#38bdf8" />
          <span>Architecture</span>
        </button>

        {user ? (
          <>
            {/* Wallet Balance Badge */}
            {wallet && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Wallet size={15} color="#10b981" />
                <div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block', lineHeight: 1 }}>Available</span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                    ₹{formatInr(wallet.availableBalancePaise)}
                  </span>
                </div>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '9px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color="#f1f5f9" />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#f43f5e',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User Profile & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <User size={15} color="#38bdf8" />
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{user.username}</span>
              </div>

              <button
                onClick={logout}
                className="btn btn-secondary"
                style={{ padding: '8px', borderRadius: '8px' }}
                title="Logout"
              >
                <LogOut size={16} color="#94a3b8" />
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => openAuthModal('login')}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <LogIn size={15} /> Login
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <UserPlus size={15} /> Register (₹1 Lakh Cash)
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
