import { useState, useContext, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { AuthContext } from '../App';

/**
 * Composant de promotion de l'installation PWA.
 * S'affiche comme un bandeau/popup discret en bas de l'écran.
 */
export default function PWAInstallButton() {
  const { deferredPrompt, installPWA } = useContext(AuthContext);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // On affiche le bandeau seulement si le prompt est disponible et qu'on ne l'a pas déjà fermé cette session
    if (deferredPrompt && !sessionStorage.getItem('pwa_dismissed')) {
      const timer = setTimeout(() => setVisible(true), 2000); // Petit délai pour le confort
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('pwa_dismissed', 'true');
  };

  const handleInstallAction = () => {
    installPWA();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '16px',
      right: '16px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      padding: '12px 16px',
      borderRadius: '16px',
      color: 'white',
      boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
      cursor: 'pointer',
      animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}
      onClick={handleInstallAction}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px' }}>
          <Download size={20} />
        </div>
        <div>
          <div style={{ fontWeight: '800', fontSize: '0.95rem' }}>Installer Djago Gestion ?</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Accès rapide depuis votre écran d'accueil</div>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        style={{
          background: 'rgba(0,0,0,0.1)',
          border: 'none',
          color: 'white',
          padding: '8px',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '8px'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
