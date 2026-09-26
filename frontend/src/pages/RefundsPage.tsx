import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Transaction } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { RotateCcw, AlertTriangle, RefreshCw, X, CheckCircle2 } from 'lucide-react';

interface Props {
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const RefundsPage: React.FC<Props> = ({ onError, onSuccess }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('Customer requested reversal');
  const [submitting, setSubmitting] = useState(false);

  const fetchEligibleTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.listPayments('SUCCESS', undefined, 50, 0);
      setTransactions(res.transactions || []);
    } catch (err: any) {
      onError(err.message || 'Failed to load refundable transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEligibleTransactions();
  }, []);

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;

    try {
      setSubmitting(true);
      const res = await api.requestRefund(selectedTxn.transactionReference, refundReason);
      onSuccess(`Refund requested: ${res.refundReference}. Reversal command queued in ActiveMQ Artemis.`);
      setSelectedTxn(null);
      fetchEligibleTransactions();
    } catch (err: any) {
      onError(err.message || 'Refund request failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
            Payment Refunds &amp; Reversals
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Asynchronous refund processing via ActiveMQ Artemis <code>refund.queue</code>
          </p>
        </div>

        <button onClick={fetchEligibleTransactions} className="btn btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RotateCcw size={18} color="var(--primary)" />
          <h3 style={{ fontSize: '1rem', color: '#fff' }}>Eligible Successful Transactions</h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Searching eligible payments...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <p>No eligible transactions in SUCCESS status found for refund.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Recipient</th>
                  <th>Settlement Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>
                      <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {txn.transactionReference}
                      </span>
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>
                        ₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {txn.paymentMethod.replace('SIMULATED_', '')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem' }}>{txn.receiverName || 'Recipient'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedTxn(txn)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'var(--warning)' }}
                      >
                        <RotateCcw size={12} /> Request Refund
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {selectedTxn && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={20} color="var(--warning)" />
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Confirm Payment Refund</h3>
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              display: 'flex',
              gap: '0.65rem',
              alignItems: 'flex-start',
              marginBottom: '1.5rem',
              fontSize: '0.8rem',
              color: '#fbbf24'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Refunding <strong>{selectedTxn.transactionReference}</strong> will reverse double-entry ledger entries, debiting recipient and restoring ₹{selectedTxn.amount} to your wallet.
              </span>
            </div>

            <form onSubmit={handleRefundSubmit}>
              <div className="form-group">
                <label className="form-label">Refund Reason</label>
                <input
                  type="text"
                  className="form-input"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedTxn(null)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }}
                  disabled={submitting}
                >
                  {submitting ? 'Dispatching to Queue...' : 'Execute Refund Command'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
