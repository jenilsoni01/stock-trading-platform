import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { MarketWatch } from './components/MarketWatch';
import { PortfolioView } from './components/PortfolioView';
import { OrdersTradesView } from './components/OrdersTradesView';
import { WalletLedgerView } from './components/WalletLedgerView';
import { OrderModal } from './components/OrderModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SystemStatusModal } from './components/SystemStatusModal';
import { AuthModal } from './components/AuthModal';
import { TradingGuideView } from './components/TradingGuideView';

function AppContent() {
  const [activeTab, setActiveTab] = useState('market');
  const [orderModalData, setOrderModalData] = useState(null); // { stock, initialSide }
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSystemStatus={() => setIsSystemStatusOpen(true)}
      />

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {activeTab === 'market' && (
          <MarketWatch onSelectStockForOrder={(data) => setOrderModalData(data)} />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioView onSelectStockForOrder={(data) => setOrderModalData(data)} />
        )}

        {activeTab === 'orders' && (
          <OrdersTradesView />
        )}

        {activeTab === 'wallet' && (
          <WalletLedgerView />
        )}

        {activeTab === 'guide' && (
          <TradingGuideView onSelectStockForOrder={(data) => setOrderModalData(data)} />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        padding: '24px 20px',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '12px',
        background: 'rgba(10, 13, 20, 0.95)',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>Stock Trading Platform</strong> • Distributed Microservices Academic Project
          </div>
          <div>
            Built with Java/Spring Boot • Go/Gin • C++/Drogon • Python/FastAPI • Node.js/Express
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      {orderModalData && (
        <OrderModal
          stock={orderModalData.stock}
          initialSide={orderModalData.initialSide}
          onClose={() => setOrderModalData(null)}
          onOrderCompleted={() => {
            // Can trigger a refresh or toast if desired
          }}
        />
      )}

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <SystemStatusModal
        isOpen={isSystemStatusOpen}
        onClose={() => setIsSystemStatusOpen(false)}
      />

      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
