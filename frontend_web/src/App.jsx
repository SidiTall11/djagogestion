import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import api from './api/api';
import Sidebar from './components/Sidebar';
import MobileHeader from './components/MobileHeader';
import PWAInstallButton from './components/PWAInstallButton';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

import Stock from './pages/Stock';
import NewSale from './pages/NewSale';
import Purchases from './pages/Purchases';
import Finance from './pages/Finance';
import Contacts from './pages/Contacts';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Budgets from './pages/Budgets';

function SmartRedirect() {
  const { user } = useContext(AuthContext);
  if (!user) return null;
  const isAdmin = user.role === 'ADMIN_PME' || user.role === 'COMMERCANT';
  const isAccountant = user.role === 'COMPTABLE';
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  if (isAccountant) return <Navigate to="/rapports" replace />;
  // Pour un agent, aller directement vers le premier module autorisé
  const modules = user.agent_modules || [];
  const firstModule = modules[0] || '/ventes';
  return <Navigate to={firstModule} replace />;
}

function PrivateLayout() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Déconnexion automatique après 15 min d'inactivité ---
  useEffect(() => {
    const TIMEOUT = 15 * 60 * 1000; // 15 minutes
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login?reason=inactivity';
      }, TIMEOUT);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer(); // Démarrer le timer

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, []);

  // --- Détection réseau ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const token = localStorage.getItem('access_token');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } catch (error) {
      console.error("Erreur PWA :", error);
      alert("L'installation a été bloquée ou a échoué. Détail : " + error.message);
    }
  };

  useEffect(() => {
    if (token) {
      api.get('users/me/')
        .then(res => setUser(res.data))
        .catch(err => {
          console.error("Token expiré ou invalide :", err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        })
        .finally(() => setLoadingUser(false));
    } else {
      setLoadingUser(false);
    }
  }, [token]);
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (loadingUser) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Chargement du profil...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, deferredPrompt, installPWA }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {isOffline && (
        <div style={{ background: 'var(--accent-red)', color: 'white', textAlign: 'center', padding: '8px', zIndex: 1000, fontWeight: 'bold' }}>
          Mode Hors-Ligne. Synchronisation en attente...
        </div>
      )}
      <MobileHeader onToggle={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div style={{ width: '100%', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </div>
      <PWAInstallButton />
      </div>
    </AuthContext.Provider>
  );
}

export const AuthContext = createContext(null);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        
        {/* Protected Routes Layout */}
        <Route element={<PrivateLayout />}>
          <Route path="/" element={<SmartRedirect />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/ventes" element={<NewSale />} />
          <Route path="/achats" element={<Purchases />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/rapports" element={<Reports />} />
          {/* Add more private routes here */}
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
