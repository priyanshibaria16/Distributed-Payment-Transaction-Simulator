import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Account, User } from '../types';
import { Send, RefreshCw, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface Props {
  account: Account | null;
  onPaymentSubmitted: (reference: string) => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export const SendPaymentPage: React.FC<Props> = ({
  account,
  onPaymentSubmitted,
  onError,
  onSuccess,
}) => {
  const [recipients, setRecipients] = useState<User[]>([]);
  const [receiverId, setReceiverId] = useState<number | ''>('');
  const [amount, setAmount] = useState('500.00');
  const [currency] = useState('INR');
  const [paymentMethod, setPaymentMethod] = useState('SIMULATED_UPI');
  const [description, setDescription] = useState('Demo payment simulation');
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{ txnId: string; status: string } | null>(null);

  const generateNewKey = () => {
    const key = 'IDEMP-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    setIdempotencyKey(key);
  };

  useEffect(() => {
    generateNewKey();
    api.getRecipients()
      .then((data) => {
        setRecipients(data || []);
        if (data && data.length > 0) {
          setReceiverId(data[0].id);
        }
      })
      .catch((err) => onError('Failed to load recipient list: ' + err.message));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiverId) {
      onError('Please select a recipient');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      onError('Amount must be positive');
      return;
    }

    try {
      setLoading(true);
      const res = await api.createPayment({
        receiverId: Number(receiverId),
        amount: numAmount,
        currency,
        paymentMethod,
        description,
        idempotencyKey,
      });

      setLastSubmission({
        txnId: res.transactionId,
        status: res.status,
      });

      onSuccess(`Payment command accepted: ${res.transactionId}. Queued in ActiveMQ.`);
      onPaymentSubmitted(res.transactionId);
    } catch (err: any) {
      onError(err.message || 'Payment initiation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: '#fff', marginBottom: '0.25rem' }}>
          Initiate Payment Transfer
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Submit transaction command through Go Gateway &amp; ActiveMQ Artemis JMS queue
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          {/* Recipient Selection */}
          <div className="form-group">
            <label className="form-label">Select Simulated Recipient</label>
            {recipients.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No other registered users found.</p>
            ) : (
              <select
                className="form-select"
                value={receiverId}
                onChange={(e) => setReceiverId(Number(e.target.value))}
                required
              >
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} ({r.email}) - User #{r.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Amount & Currency */}
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Transfer Amount (INR)</label>
              <input
                type="number"
                step="any"
                min="0.01"
                className="form-input mono"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500.00"
                required
                style={{ fontSize: '1.2rem', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.25rem', display: 'block' }}>
                Available balance: ₹{account ? Number(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Payment Engine Strategy</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="SIMULATED_UPI">Simulated UPI (VPA Direct Settlement)</option>
                <option value="SIMULATED_CARD">Simulated Card (Tokenized Mock 3DS)</option>
                <option value="SIMULATED_WALLET">Simulated Wallet (Internal Ledger Transfer)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Transaction Memo / Description</label>
            <input
              type="text"
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Project invoice settlement"
              required
            />
          </div>

          {/* Idempotency Key Control */}
          <div className="form-group" style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginTop: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Key size={14} color="var(--primary)" /> Idempotency-Key Header
              </label>
              <button
                type="button"
                onClick={generateNewKey}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
            <input
              type="text"
              className="form-input mono"
              value={idempotencyKey}
              onChange={(e) => setIdempotencyKey(e.target.value)}
              style={{ fontSize: '0.85rem' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
              Submitting the exact same key twice tests the idempotent replay mechanism without double debiting.
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ minWidth: '180px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Queuing Command...
                </>
              ) : (
                <>
                  <Send size={16} /> Submit Payment (HTTP 202)
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feedback / Receipt */}
        {lastSubmission && (
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="var(--success)" />
              <div>
                <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                  Transaction Queued: {lastSubmission.txnId}
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ActiveMQ JMS broker dispatch successful. Status is {lastSubmission.status}.
                </p>
              </div>
            </div>
            <button
              onClick={() => onPaymentSubmitted(lastSubmission.txnId)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            >
              Track Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
