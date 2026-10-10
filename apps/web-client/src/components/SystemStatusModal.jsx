import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle2, Server, Database, Layers, Radio, Shield, RefreshCw } from 'lucide-react';

const SERVICES = [
  {
    name: 'API Gateway',
    owner: 'Platform Gateway',
    tech: 'Java 17 • Spring Cloud Gateway',
    port: '8080',
    db: 'Stateless / Reactive',
    protocol: 'REST / JWT / CORS',
  },
  {
    name: 'Identity & Wallet Service',
    owner: 'Jenil (23BCE119)',
    tech: 'Java 17 • Spring Boot 3.3.4 (Maven)',
    port: '8081',
    db: 'PostgreSQL 16 (ACID Ledger)',
    protocol: 'REST / BCrypt / Pessimistic Lock',
  },
  {
    name: 'Market Data Service',
    owner: 'Jeel (23BCE116)',
    tech: 'Go 1.22 • Gin Engine',
    port: '8082 / 50051 (gRPC)',
    db: 'MongoDB 7.0 (Catalogs & Quotes)',
    protocol: 'HTTP REST / gRPC Protobuf',
  },
  {
    name: 'Order Service',
    owner: 'Harsh (23BCE091)',
    tech: 'C++ 17 • Drogon Framework',
    port: '8083',
    db: 'MySQL 8.0 (Orders, Trades, Saga)',
    protocol: 'Transactional Outbox / Idempotency',
  },
  {
    name: 'Portfolio Service',
    owner: 'Kevl (23BCE066)',
    tech: 'Python 3.11 • FastAPI',
    port: '8084',
    db: 'Redis 7.4 (Materialized View)',
    protocol: 'CQRS Projection / Realized P&L',
  },
  {
    name: 'Notification Service',
    owner: 'Krish (23BCE151)',
    tech: 'Node.js 20 • Express (ESM)',
    port: '8085',
    db: 'Firestore Emulator / Document Store',
    protocol: 'Event Consumer / In-App Alerts',
  },
  {
    name: 'Eureka Discovery Server',
    owner: 'Infrastructure Registry',
    tech: 'Netflix Eureka Server',
    port: '8761',
    db: 'In-Memory Service Registry',
    protocol: 'Heartbeat Health Polling',
  },
  {
    name: 'Apache Kafka Event Bus',
    owner: 'Event Backbone',
    tech: 'Kafka 7.7 + Zookeeper 3.8',
    port: '9092 / 29092',
    db: 'Event Log (Partitions: 3)',
    protocol: 'Pub/Sub Domain Topics',
  },
];

export function SystemStatusModal({ isOpen, onClose }) {
  const [checking, setChecking] = useState(false);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }} onClick={onClose}>
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          background: '#121826',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={22} color="#38bdf8" />
              <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Distributed Microservices Architecture</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
              Polyglot Multi-Service System: Java, Go, C++, Python, Node.js with Heterogeneous Databases
            </p>
          </div>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={16} />
          </button>
        </div>

        {/* Content Grid */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Architecture Diagram Card */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '18px',
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>
              SYSTEM TOPOLOGY & DATA BOUNDARIES
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              • <strong>Zero-Trust Perimeter</strong>: Client only reaches Gateway (Port 8080). Gateway verifies JWT, injects <code>X-User-Id</code>, and blocks <code>/internal/**</code> routes.<br />
              • <strong>Distributed Saga Pattern</strong>: Order Service orchestrates atomic BUY/SELL flow with pessimistic cash reservation in PostgreSQL.<br />
              • <strong>CQRS Pattern</strong>: Fast writes in MySQL; materialized portfolio projections calculated asynchronously in Redis by Python.<br />
              • <strong>Financial Invariant</strong>: Integer paise arithmetic ensures zero floating-point rounding errors.
            </div>
          </div>

          {/* Microservices Matrix */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '12px',
          }}>
            {SERVICES.map((s, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#ffffff' }}>{s.name}</span>
                  <span className="status-dot status-dot-active" />
                </div>
                <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 600 }}>{s.owner}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.tech}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
                  <span>Port: {s.port}</span>
                  <span>{s.db}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
