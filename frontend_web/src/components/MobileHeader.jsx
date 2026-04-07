import { Menu, X } from 'lucide-react';
import logoImage from '../assets/logo.png';

export default function MobileHeader({ onToggle, isSidebarOpen }) {
  return (
    <div className="mobile-header" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: '60px',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--glass-border)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 1100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src={logoImage} alt="Logo" style={{ height: '48px' }} />
      </div>

      <button 
        onClick={onToggle}
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'white', 
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px'
        }}
      >
        {isSidebarOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
