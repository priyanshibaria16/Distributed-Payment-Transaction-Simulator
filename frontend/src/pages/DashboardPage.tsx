import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Account, Transaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Send, 
  PlusCircle,
  ExternalLink
} from 'lucide-react';

interface Props {
  account: Account | null;
  onNavigateToSend: () => void;
  onOpenTopUp: () => void;
  onSelectTransaction: (ref: string) => void;
  onError: (msg: string) => void;
}

export const DashboardPage: React.FC<Props> = ({
  account,
  onNavigateToSend,
  onOpenTopUp,
  onSelectTransaction,
  onError,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentTransactions = async () => {
    try {
      const res = await api.listPayments(undefined, undefined, 5, 0);
      setTransactions(res.transactions || []);
    } catch (err: any) {
      onError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();
    // Poll every 3 seconds for live transaction status updates
    const interval = setInterval(fetchRecentTransactions, 3000);
    return () => clearInterval(interval);
  }, []);

  const totalSuccessful = transactions.filter((t) => t.status === 'SUCCESS').length;
  const totalPending = transactions.filter((t) => t.status === 'PENDING' || t.status === 'PROCESSING' || t.status === 'RETRYING').length;
  const totalFailed = transactions.filter((t) => t.status === 'FAILED').length;

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
            Account Overview
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Real-time simulated ledger balance &amp; transaction telemetry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onOpenTopUp} className="btn btn-secondary">
            <PlusCircle size={16} /> Top-Up
          </button>
          <button onClick={onNavigateToSend} className="btn btn-primary">
            <Send size={16} /> Send Payment
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        {/* Balance Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.4), var(--bg-secondary))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Simulated Balance
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            ₹{account ? Number(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Acc: {account?.accountNumber || 'Loading...'}
          </span>
        </div>

        {/* Successful Payments */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Settled (Recent)
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            {totalSuccessful}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#34d399' }}>
            Committed to ledger
          </span>
        </div>

        {/* In-Flight / Retrying */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              In Flight / Retrying
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
              <RefreshCw size={18} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            {totalPending}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>
            ActiveMQ broker queues
          </span>
        </div>

        {/* Failed */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Rejected / Failed
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
            {totalFailed}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#f87171' }}>
            Balance check / faults
          </span>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>Recent Activity</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Latest transactions processed through Java worker pool
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Auto-refreshing every 3s
          </span>
        </div>

        {loading && transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading activity from Go gateway...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <p>No transactions found for this account yet.</p>
            <button onClick={onNavigateToSend} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Initiate First Transfer
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Party</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const isDebit = account && txn.senderAccountId === account.id;
                  return (
                    <tr key={txn.id}>
                      <td>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '6px',
                          background: isDebit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isDebit ? 'var(--danger)' : 'var(--success)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isDebit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                        </div>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {txn.transactionReference}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>
                          {isDebit ? (txn.receiverName || 'Recipient') : (txn.senderName || 'Sender')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {txn.paymentMethod.replace('SIMULATED_', '')}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{
                          fontWeight: 600,
                          color: isDebit ? 'var(--danger)' : 'var(--success)'
                        }}>
                          {isDebit ? '-' : '+'}₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={txn.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => onSelectTransaction(txn.transactionReference)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={12} /> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
