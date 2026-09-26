export interface User {
  id: number;
  email: string;
  fullName: string;
  status: string;
  roles?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: number;
  userId: number;
  accountNumber: string;
  currency: string;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYING'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentMethod =
  | 'SIMULATED_UPI'
  | 'SIMULATED_CARD'
  | 'SIMULATED_WALLET';

export interface Transaction {
  id: number;
  transactionReference: string;
  senderAccountId?: number;
  receiverAccountId: number;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  description?: string;
  idempotencyKey?: string;
  retryCount: number;
  maxRetries: number;
  failureCode?: string;
  failureMessage?: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  senderName?: string;
  receiverName?: string;
}

export interface AdminStats {
  totalTransactions: number;
  successfulCount: number;
  failedCount: number;
  pendingCount: number;
  totalVolume: number;
  paymentMethodCounts: Record<string, number>;
  recentRetriesCount: number;
}
