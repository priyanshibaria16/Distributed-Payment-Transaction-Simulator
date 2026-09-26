import React from 'react';
import { TransactionStatus } from '../types';
import { CheckCircle2, Clock, XCircle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  status: TransactionStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case 'SUCCESS':
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={12} /> Success
        </span>
      );
    case 'PENDING':
    case 'PROCESSING':
      return (
        <span className="badge badge-pending">
          <Clock size={12} className="animate-spin" /> {status}
        </span>
      );
    case 'RETRYING':
      return (
        <span className="badge badge-retrying">
          <RefreshCw size={12} className="animate-spin" /> Retrying
        </span>
      );
    case 'FAILED':
      return (
        <span className="badge badge-failed">
          <XCircle size={12} /> Failed
        </span>
      );
    case 'REFUND_PENDING':
    case 'REFUNDED':
      return (
        <span className="badge badge-refunded">
          <RotateCcw size={12} /> {status === 'REFUNDED' ? 'Refunded' : 'Refund Pending'}
        </span>
      );
    default:
      return <span className="badge">{status}</span>;
  }
};
