import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Transaction, Account } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Search, 
  Filter, 
  ExternalLink, 
  X, 
  RefreshCw, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface Props {
  account: Account | null;
  selectedTxnRef: string | null;
  onClearSelectedTxn: () => void;
  onError: (msg: string) => void;
}

export const HistoryPage: React.FC<Props> = ({
  account,
  selectedTxnRef,
  onClearSelectedTxn,
  onError,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [activeModalTxn, setActiveModalTxn] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.listPayments(statusFilter || undefined, methodFilter || undefined, limit, page * limit);
      setTransactions(res.transactions || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      onError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, methodFilter, page]);

  // Load single transaction details if selected from another page
  useEffect(() => {
    if (selectedTxnRef) {
      api.getPaymentStatus(selectedTxnRef)
        .then((txn) => setActiveModalTxn(txn))
        .catch((err) => onError('Could not fetch transaction: ' + err.message));
    }
  }, [selectedTxnRef]);

  const handleOpenDetails = async (ref: string) => {
    try {
      const txn = await api.getPaymentStatus(ref);
      setActiveModalTxn(txn);
    } catch (err: any) {
      onError('Failed to fetch details: ' + err.message);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
            Transaction History
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Audited ledger transactions with ACID guarantees &amp; state lifecycle
          </p>
        </div>

        <button onClick={fetchTransactions} className="btn btn-secondary">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Filter size={16} /> Filters:
          </div>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            style={{ width: 'auto', minWidth: '160px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="RETRYING">RETRYING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            className="form-select"
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
            style={{ width: 'auto', minWidth: '160px', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <option value="">All Methods</option>
            <option value="SIMULATED_UPI">UPI</option>
            <option value="SIMULATED_CARD">Card</option>
            <option value="SIMULATED_WALLET">Wallet</option>
          </select>

          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Showing {transactions.length} of {total} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        {loading && transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
            <p>No transactions match the selected criteria.</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Sender / Receiver</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Retries</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
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
                        <div style={{ fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>From:</span> {txn.senderName || 'System'}<br />
                          <span style={{ color: 'var(--text-dim)' }}>To:</span> {txn.receiverName || 'Recipient'}
                        </div>
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
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {txn.paymentMethod.replace('SIMULATED_', '')}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: '0.8rem', color: txn.retryCount > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
                          {txn.retryCount} / {txn.maxRetries}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={txn.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(txn.createdAt).toLocaleTimeString()} {new Date(txn.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleOpenDetails(txn.transactionReference)}
                          className="btn btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <ExternalLink size={12} /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--border-color)',
            fontSize: '0.85rem'
          }}>
            <span style={{ color: 'var(--text-dim)' }}>
              Page {page + 1} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {activeModalTxn && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Transaction Lifecycle</h3>
                <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                  {activeModalTxn.transactionReference}
                </span>
              </div>
              <button
                onClick={() => { setActiveModalTxn(null); onClearSelectedTxn(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</span>
                <StatusBadge status={activeModalTxn.status} />
              </div>

              <div className="grid-2">
                <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Amount</span>
                  <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                    ₹{Number(activeModalTxn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'block' }}>Payment Method</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>
                    {activeModalTxn.paymentMethod}
                  </span>
                </div>
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Correlation ID:</span>
                  <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{activeModalTxn.correlationId}</span>
                </div>
                {activeModalTxn.idempotencyKey && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Idempotency Key:</span>
                    <span className="mono">{activeModalTxn.idempotencyKey}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Retry Count:</span>
                  <span className="mono">{activeModalTxn.retryCount} of {activeModalTxn.maxRetries}</span>
                </div>
              </div>

              {activeModalTxn.failureCode && (
                <div style={{
                  padding: '0.85rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#f87171',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontWeight: 600 }}>
                    <ShieldAlert size={16} /> Error Code: {activeModalTxn.failureCode}
                  </div>
                  <p>{activeModalTxn.failureMessage}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setActiveModalTxn(null); onClearSelectedTxn(); }}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
