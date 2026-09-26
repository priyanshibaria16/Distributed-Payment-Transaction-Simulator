import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User, Account } from './types';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Toast } from './components/Toast';
import { TopUpModal } from './components/TopUpModal';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SendPaymentPage } from './pages/SendPaymentPage';
import { HistoryPage } from './pages/HistoryPage';
import { RefundsPage } from './pages/RefundsPage';
import { AdminPage } from './pages/AdminPage';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTxnRef, setSelectedTxnRef] = useState<string | null>(null);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchAccount = async () => {
    try {
      const acc = await api.getMyAccount();
      setAccount(acc);
    } catch (err: any) {
      // If unauthorized, clear user
      if (err.message?.includes('UNAUTHORIZED') || err.message?.includes('token')) {
        api.setToken(null);
        setUser(null);
      }
    }
  };

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      fetchAccount().finally(() => setLoadingInitial(false));
    } else {
      setLoadingInitial(false);
    }
  }, []);

  // Poll balance periodically when logged in
  useEffect(() => {
    if (!user && !api.getToken()) return;
    const interval = setInterval(fetchAccount, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    fetchAccount();
    showToast(`Welcome back, ${loggedInUser.fullName}!`, 'success');
  };

  const handleRegisterSuccess = (newUser: User) => {
    setUser(newUser);
    fetchAccount();
    showToast(`Simulated account created for ${newUser.fullName}!`, 'success');
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setAccount(null);
    showToast('Signed out successfully', 'success');
  };

  if (loadingInitial) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading PaySim Environment...</p>
      </div>
    );
  }

  // If not logged in, render Login or Register
  if (!user && !api.getToken()) {
    if (authMode === 'register') {
      return (
        <>
          <RegisterPage
            onRegisterSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setAuthMode('login')}
            onError={(msg) => showToast(msg, 'error')}
          />
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
      );
    }
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setAuthMode('register')}
          onError={(msg) => showToast(msg, 'error')}
        />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <Navbar account={account} onOpenTopUp={() => setIsTopUpOpen(true)} />

        {activeTab === 'dashboard' && (
          <DashboardPage
            account={account}
            onNavigateToSend={() => setActiveTab('send')}
            onOpenTopUp={() => setIsTopUpOpen(true)}
            onSelectTransaction={(ref) => {
              setSelectedTxnRef(ref);
              setActiveTab('history');
            }}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}

        {activeTab === 'send' && (
          <SendPaymentPage
            account={account}
            onPaymentSubmitted={(ref) => {
              setSelectedTxnRef(ref);
              fetchAccount();
            }}
            onError={(msg) => showToast(msg, 'error')}
            onSuccess={(msg) => showToast(msg, 'success')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            account={account}
            selectedTxnRef={selectedTxnRef}
            onClearSelectedTxn={() => setSelectedTxnRef(null)}
            onError={(msg) => showToast(msg, 'error')}
          />
        )}

        {activeTab === 'refunds' && (
          <RefundsPage
            onError={(msg) => showToast(msg, 'error')}
            onSuccess={(msg) => {
              showToast(msg, 'success');
              fetchAccount();
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPage onError={(msg) => showToast(msg, 'error')} />
        )}
      </main>

      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        onSuccess={() => {
          showToast('Simulated funds credited to wallet!', 'success');
          fetchAccount();
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
