import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export const TopUpModal: React.FC<Props> = ({ isOpen, onClose, onSuccess, onError }) => {
  const [amount, setAmount] = useState('5000');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = ['1000', '5000', '10000', '25000', '50000'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      onError('Please enter a valid top-up amount');
      return;
    }

    try {
      setLoading(true);
      await api.topUp(num);
      onSuccess();
      onClose();
    } catch (err: any) {
      onError(err.message || 'Failed to add simulated funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Add Simulated Balance</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
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
            <strong>Educational Sandbox Notice:</strong> This operation generates simulated test funds within the PostgreSQL double-entry ledger. No real currency or payment rails are involved.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Top-Up Amount (INR)</label>
            <input
              type="number"
              min="1"
              max="1000000"
              step="any"
              className="form-input mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              style={{ fontSize: '1.25rem', fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {quickAmounts.map((amt) => (
              <button
                type="button"
                key={amt}
                onClick={() => setAmount(amt)}
                className="btn btn-secondary mono"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                +₹{parseInt(amt).toLocaleString()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Crediting Wallet...' : 'Credit Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
