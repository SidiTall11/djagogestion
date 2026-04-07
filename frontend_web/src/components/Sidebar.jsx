import { NavLink, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { Home, ShoppingCart, Box, DollarSign, Users, Settings, LogOut, BarChart2, Target, X, Download } from 'lucide-react';
import { AuthContext } from '../App';
import logoImage from '../assets/logo.png';

// Définition centralisée de tous les menus avec leur module associé
const ALL_MENU_ITEMS = [
  { to: '/dashboard',  label: 'Tableau de Bord',       icon: <Home size={20} />,       adminOnly: true,  module: null },
  { to: '/ventes',     label: 'Caisse (Ventes)',        icon: <ShoppingCart size={20}/>, adminOnly: false, module: '/ventes' },
  { to: '/achats',     label: 'Ravitaillement (Achats)',icon: <ShoppingCart size={20}/>, adminOnly: false, module: '/achats' },
  { to: '/stock',      label: 'Gestion du Stock',       icon: <Box size={20} />,        adminOnly: false, module: '/stock' },
  { to: '/finance',    label: 'Finances',               icon: <DollarSign size={20}/>,  adminOnly: false, module: '/finance' },
  { to: '/budgets',    label: 'Budgets',                icon: <Target size={20} />,     adminOnly: false, module: '/budgets' },
  { to: '/rapports',   label: 'Rapports',               icon: <BarChart2 size={20}/>,   adminOnly: false, module: '/rapports' },
  { to: '/contacts',   label: 'Clients & Fournisseurs', icon: <Users size={20} />,      adminOnly: false, module: '/contacts' },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, deferredPrompt, installPWA } = useContext(AuthContext);

  const isAdmin = user?.role === 'ADMIN_PME' || user?.role === 'COMMERCANT';
  const isAccountant = user?.role === 'COMPTABLE';
  // Liste des modules que l'agent a le droit de voir
  const agentModules = user?.agent_modules || [];

  const canSeeMenu = (item) => {
    // L'admin et le comptable voient tout par défaut (pour l'instant)
    if (isAdmin || isAccountant) return true;
    // Pour un agent : pas de dashboard, seulement les modules autorisés
    if (item.adminOnly) return false;
    if (item.module) return agentModules.includes(item.module);
    return false;
  };

  const handleLogout = (e) => {
    e.preventDefault();
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  };

  return (
    <>
    <div className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="mobile-close" style={{ display: 'none', position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} onClick={onClose}>
        <X size={24} />
      </div>
      <div style={{ paddingTop: '30px' }}></div>
      
      {/* Afficher le titre / rôle perso de l'agent */}
      {!isAdmin && user?.agent_custom_role && (
        <div style={{ margin: '0 12px 12px', padding: '8px 12px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Connecté en tant que</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--accent-green)' }}>{user.agent_custom_role}</div>
        </div>
      )}

      {isAccountant && (
        <div style={{ margin: '0 12px 12px', padding: '8px 12px', background: 'rgba(79,70,229,0.1)', borderRadius: '8px', border: '1px solid rgba(79,70,229,0.2)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Mode Consultation</div>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary)' }}>Comptable</div>
        </div>
      )}

      <nav>
        {ALL_MENU_ITEMS.map(item => (
          canSeeMenu(item) && (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'active' : ''} onClick={() => { if (window.innerWidth <= 768) onClose(); }}>
              {item.icon} {item.label}
            </NavLink>
          )
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {deferredPrompt && (
            <button 
              onClick={installPWA}
              style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: '12px 0', width: '100%', fontWeight: '700', fontSize: '0.9rem' }}>
              <Download size={20} /> Installer l'App
            </button>
          )}

          {isAdmin && (
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              <Settings size={20} /> Paramètres
            </NavLink>
          )}

          <a href="#" onClick={handleLogout} style={{ color: 'var(--accent-red)', textDecoration: 'none', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', cursor: 'pointer' }}>
            <LogOut size={20} /> Déconnexion
          </a>
        </div>
      </nav>
      
      <style>{`
        @media (max-width: 768px) {
          .mobile-close { display: block !important; }
        }
      `}</style>
    </div>
    <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
    </>
  );
}
