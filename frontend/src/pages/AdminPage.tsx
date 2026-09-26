import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AdminStats, Transaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  BarChart3, 
  TrendingUp, 
  AlertOctagon, 
  Layers, 
  RefreshCw, 
  Server, 
  Cpu, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface Props {
  onError: (msg: string) => void;
}

export const AdminPage: React.FC<Props> = ({ onError }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [failedTxns, setFailedTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [s, f] = await Promise.all([
        api.getAdminStats(),
        api.getFailedTransactions(20, 0),
      ]);
      setStats(s);
      setFailedTxns(f.transactions || []);
    } catch (err: any) {
      onError(err.message || 'Failed to load administrative analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  const successRate = stats && stats.totalTransactions > 0
    ? ((stats.successfulCount / stats.totalTransactions) * 100).toFixed(1)
    : '100.0';

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
            System Telemetry &amp; Operations
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Platform-wide transaction metrics, failure queues, and broker monitoring
          </p>
        </div>

        <button onClick={fetchAdminData} className="btn btn-secondary">
          <RefreshCw size={14} /> Refresh Metrics
        </button>
      </div>

      {/* Admin KPIs */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Total Transaction Volume
          </span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', margin: '0.5rem 0 0.25rem' }}>
            ₹{stats ? Number(stats.totalVolume).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Across {stats?.totalTransactions || 0} submitted payments
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Success Rate
          </span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#34d399', margin: '0.5rem 0 0.25rem' }}>
            {successRate}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {stats?.successfulCount || 0} successfully settled
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Total Retries Handled
          </span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', margin: '0.5rem 0 0.25rem' }}>
            {stats?.recentRetriesCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Via <code>payment.retry.queue</code>
          </span>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Failed / DLQ Count
          </span>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f87171', margin: '0.5rem 0 0.25rem' }}>
            {stats?.failedCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Routed to <code>payment.failed.queue</code>
          </span>
        </div>
      </div>

      {/* Breakdown by Payment Method */}
      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="var(--primary)" /> Payment Strategy Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats && Object.entries(stats.paymentMethodCounts).map(([method, count]) => (
              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{method.replace('SIMULATED_', '')}</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{count} txns</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distributed Architecture Status */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} color="var(--accent-cyan)" /> Distributed Topology Nodes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>Go API Gateway (Port 8080)</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>Active (net/http + JWT)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>ActiveMQ Artemis Broker (61616)</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>JMS 2.0 Queues Ready</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <span>Java Worker Service (ThreadPool)</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>8 Core / 16 Max Threads</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem' }}>
              <span>PostgreSQL 16 ACID Persistence</span>
              <span style={{ color: '#34d399', fontWeight: 600 }}>Row Locking Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Failed Transactions Analysis */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertOctagon size={18} color="var(--danger)" />
          <h3 style={{ fontSize: '1rem', color: '#fff' }}>Failed Transactions Root-Cause Analysis</h3>
        </div>

        {failedTxns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-dim)' }}>
            <CheckCircle2 size={24} color="var(--success)" style={{ margin: '0 auto 0.75rem' }} />
            <p>No failed transactions recorded. All transfers settled cleanly.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Retries</th>
                  <th>Failure Code</th>
                  <th>Error Diagnostic</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {failedTxns.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.transactionReference}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--danger)' }}>₹{t.amount}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: '#fbbf24' }}>{t.retryCount} / {t.maxRetries}</span>
                    </td>
                    <td>
                      <span className="badge badge-failed">{t.failureCode || 'ERROR'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.failureMessage || 'Simulated failure'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(t.createdAt).toLocaleTimeString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
