import React from 'react';
import { Wallet, PlusCircle, Activity } from 'lucide-react';
import { Account } from '../types';

interface Props {
  account: Account | null;
  onOpenTopUp: () => void;
}

export const Navbar: React.FC<Props> = ({ account, onOpenTopUp }) => {
  return (
    <header style={{
      height: '70px',
      borderBottom: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          fontSize: '0.75rem',
          color: '#34d399',
          fontWeight: 500
        }}>
          <Activity size={13} className="animate-pulse" />
          <span>ActiveMQ Artemis &amp; Go Gateway: Connected</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Balance Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-surface)',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <Wallet size={18} color="var(--primary)" />
          <div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', display: 'block' }}>
              Simulated Balance
            </span>
            <span className="mono" style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
              ₹{account ? Number(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            </span>
          </div>
        </div>

        {/* Top-up Button */}
        <button
          onClick={onOpenTopUp}
          className="btn btn-success"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
        >
          <PlusCircle size={16} /> Add Funds
        </button>
      </div>
    </header>
  );
};
