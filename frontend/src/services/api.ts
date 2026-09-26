import { User, Account, Transaction, AdminStats } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || data?.message || 'Request failed';
      throw new Error(errorMsg);
    }

    return data.data !== undefined ? data.data : data;
  }

  // Auth
  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getRecipients(): Promise<User[]> {
    return this.request('/users/recipients');
  }

  // Accounts
  async getMyAccount(): Promise<Account> {
    return this.request('/accounts/me');
  }

  async getMyBalance(): Promise<{ accountId: number; accountNumber: string; currency: string; balance: number }> {
    return this.request('/accounts/me/balance');
  }

  async topUp(amount: number): Promise<{ message: string; account: Account; transaction: Transaction }> {
    return this.request('/accounts/me/top-up', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // Payments
  async createPayment(payload: {
    receiverId: number;
    amount: number;
    currency: string;
    paymentMethod: string;
    description: string;
    idempotencyKey?: string;
  }): Promise<{ transactionId: string; status: string; message: string; correlationId: string }> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }

    return this.request('/payments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiverId: payload.receiverId,
        amount: payload.amount,
        currency: payload.currency,
        paymentMethod: payload.paymentMethod,
        description: payload.description,
      }),
    });
  }

  async getPaymentStatus(reference: string): Promise<Transaction> {
    return this.request(`/payments/${reference}`);
  }

  async listPayments(status?: string, paymentMethod?: string, limit = 20, offset = 0): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (paymentMethod) params.append('paymentMethod', paymentMethod);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return this.request(`/payments?${params.toString()}`);
  }

  async requestRefund(reference: string, reason: string): Promise<{ refundReference: string; status: string; message: string }> {
    return this.request(`/payments/${reference}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Admin
  async getAdminStats(): Promise<AdminStats> {
    return this.request('/admin/statistics');
  }

  async getAdminTransactions(status?: string, limit = 50, offset = 0): Promise<{ transactions: Transaction[]; total: number }> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return this.request(`/admin/transactions?${params.toString()}`);
  }

  async getFailedTransactions(limit = 50, offset = 0): Promise<{ transactions: Transaction[]; total: number }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());

    return this.request(`/admin/failed-transactions?${params.toString()}`);
  }
}

export const api = new ApiService();
