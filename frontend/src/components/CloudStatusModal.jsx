import React, { useState, useEffect } from 'react';
import { X, Server, Database, Cloud, Zap, ShieldCheck, Activity, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';

const CloudStatusModal = ({ isOpen, onClose }) => {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const fetchStatus = () => {
    setLoading(true);
    axiosClient.get('/api/cloud/status')
      .then((res) => {
        setTelemetry(res.data);
        setLastRefreshed(new Date().toLocaleTimeString());
      })
      .catch((err) => {
        console.warn('Could not fetch live telemetry:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const infra = telemetry?.infrastructure;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(25px)',
      WebkitBackdropFilter: 'blur(25px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="apple-card" style={{
        maxWidth: '840px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--apple-surface)',
        border: '1px solid var(--apple-glass-border)',
        boxShadow: 'var(--apple-shadow-hover)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--apple-glass-border-subtle)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--apple-blue-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} color="#0071e3" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#f5f5f7' }}>
                AWS Cloud Telemetry
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                <span>ap-south-1 (Mumbai)</span>
                <span>•</span>
                <span>Account: 838775536247</span>
                {lastRefreshed && <><span>•</span><span>Synced {lastRefreshed}</span></>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="btn-apple btn-apple-secondary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              title="Refresh Telemetry"
            >
              <RefreshCw size={12} className={loading ? 'spin-anim' : ''} />
              {loading ? 'Pinging...' : 'Ping Cloud'}
            </button>
            <button
              onClick={onClose}
              style={{ color: 'var(--apple-text-secondary)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Live Grid of 6 Service Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          {/* EC2 Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Server size={14} color="#0071e3" /> Amazon EC2
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>Online</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              {infra?.ec2?.instanceId || 'i-0dc720512fdcbd100'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              IP: {infra?.ec2?.publicIp || '3.111.149.119'} • {infra?.ec2?.type || 't3.micro'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              CPU Load: {infra?.ec2?.cpuLoad || '0.05'} • Uptime: {infra?.ec2?.uptimeHours || '1.2'} hrs
            </div>
          </div>

          {/* RDS Card */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Database size={14} color="#70b4ff" /> Amazon RDS
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>{infra?.rds?.status || 'CONNECTED'}</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              {infra?.rds?.identifier || 'event-mgmt-db'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Latency: <strong style={{ color: '#30d158' }}>{infra?.rds?.latencyMs ?? 7}ms</strong> • Single-AZ MySQL
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              Private Subnet Isolation (Port 3306)
            </div>
          </div>

          {/* SQS & Lambda */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#ff9f0a" /> SQS & Lambda
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>Active</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              ticket-worker (Py3.12)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Trigger: BatchSize 5 from SQS
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              Decoupled serverless queue worker
            </div>
          </div>

          {/* SNS Notification Topic */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={14} color="#30d158" /> Amazon SNS
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>Subscribed</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              event-ticket-topic
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Subscriber: {infra?.sns?.subscriber || 'joelvarghese013@gmail.com'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              Instant email push for bookings & cancellations
            </div>
          </div>

          {/* S3 Buckets */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cloud size={14} color="#bf5af2" /> Amazon S3
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>Online</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f5f7' }}>
              event-mgmt-flyers-838775536247
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Public read enabled for event banners
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              Static mirror: event-mgmt-site-838775536247
            </div>
          </div>

          {/* AWS Budgets */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--apple-glass-border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#f5f5f7', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#30d158" /> AWS Budgets
              </span>
              <span style={{ color: '#30d158', fontSize: '11px', fontWeight: 600 }}>$2.00 Cap</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#f5f5f7' }}>
              Zero-Cost-University-Cap
            </div>
            <div style={{ fontSize: '12px', color: 'var(--apple-text-secondary)', marginTop: '4px' }}>
              Alerts at 50% ($1.00) and 80% ($1.60)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--apple-text-tertiary)', marginTop: '2px' }}>
              Recipient: joelvarghese013@gmail.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudStatusModal;
