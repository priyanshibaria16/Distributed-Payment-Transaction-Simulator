import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

interface Props {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<Props> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
      color: '#fff',
      padding: '0.85rem 1.25rem',
      borderRadius: 'var(--radius-md)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      zIndex: 100,
      maxWidth: '450px',
      fontSize: '0.875rem',
      backdropFilter: 'blur(8px)',
      animation: 'slideIn 0.3s ease'
    }}>
      {isSuccess ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
        <X size={16} />
      </button>
    </div>
  );
};
