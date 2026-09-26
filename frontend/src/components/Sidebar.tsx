import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  History, 
  RotateCcw, 
  BarChart3, 
  LogOut, 
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { User } from '../types';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<Props> = ({ activeTab, setActiveTab, user, onLogout }) => {
  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  return (
    <aside style={{
      width: '260px',
      backgroundColor: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      justifyContent: 'space-between',
    }}>
      <div>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 15px rgba(59, 130, 246, 0.4)'
          }}>
            <Cpu size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              PaySim
            </h2>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Distributed Engine
            </p>
          </div>
        </div>

        {/* Navigation items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button
            onClick={() => setActiveTab('send')}
            className={`btn ${activeTab === 'send' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}
          >
            <Send size={18} /> Send Payment
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}
          >
            <History size={18} /> Transactions
          </button>

          <button
            onClick={() => setActiveTab('refunds')}
            className={`btn ${activeTab === 'refunds' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}
          >
            <RotateCcw size={18} /> Refunds
          </button>

          {isAdmin && (
            <>
              <div style={{
                margin: '1.25rem 0 0.5rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Administration
              </div>
              <button
                onClick={() => setActiveTab('admin')}
                className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', border: 'none' }}
              >
                <BarChart3 size={18} /> Telemetry & Admin
              </button>
            </>
          )}
        </nav>
      </div>

      {/* User profile card & Logout */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.fullName}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', color: 'var(--danger)' }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
};
