import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { User, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logoImage from '../assets/logo.png';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('auth/login/', { username, password });
      localStorage.setItem('access_token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Identifiants invalides. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .login-hero { display: none !important; }
          .login-form-side {
            width: 100% !important;
            height: 100vh !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 24px 20px !important;
          }
          .login-mobile-header {
            display: flex !important;
          }
          .login-btn-spacer { margin-top: 16px !important; }
        }
        .login-mobile-header { display: none; }
      `}</style>

      <div className="split-layout" style={{ overflow: 'hidden', height: '100vh' }}>
        {/* Côté Gauche : Hero Premium (desktop only) */}
        <div className="hero-side login-hero">
          <div style={{ marginBottom: '24px' }}>
            <img src={logoImage} alt="Djago Gestion" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          </div>
          <h1>Bienvenue sur votre écosystème Djago Gestion.</h1>
          <p>Gérez vos points de vente, analysez vos flux financiers et propulsez votre PME grâce à notre caisse intelligente synchronisée.</p>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-green)' }}>+50h</div>
              <div style={{ color: 'var(--text-muted)' }}>Gagnées/mois</div>
            </div>
            <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>Secure</div>
              <div style={{ color: 'var(--text-muted)' }}>Data Cloud</div>
            </div>
          </div>
        </div>

        {/* Côté Droit : Login */}
        <div className="form-side login-form-side">
          {/* Logo visible seulement sur mobile */}
          <div className="login-mobile-header" style={{ flexDirection: 'column', alignItems: 'center', marginBottom: '24px', gap: '8px' }}>
            <img src={logoImage} alt="Djago Gestion" style={{ width: '130px', height: '130px', objectFit: 'contain' }} />
          </div>

          <div className="glass-panel auth-box">
            <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Connexion</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Accédez à votre espace sécurisé.</p>

            {error && <div style={{ color: 'var(--accent-red)', marginBottom: '16px', background: 'rgba(231, 76, 60, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-red)' }}>{error}</div>}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label><User size={16} /> Identifiant</label>
                <input 
                  type="text" required placeholder="Votre pseudo"
                  value={username} onChange={e => setUsername(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label><Lock size={16} /> Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} required placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>



              <button type="submit" className="btn-primary login-btn-spacer" disabled={loading} style={{ marginTop: '8px' }}>
                {loading ? 'Authentification...' : 'Se Connecter'} <ArrowRight size={20} />
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Pas encore de compte ? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Créer une Entreprise</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
