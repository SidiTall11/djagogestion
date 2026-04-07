import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../api/api';
import { Lock, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const token = queryParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('Token invalide ou manquant.');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      await api.post('password_reset/confirm/', { token, password });
      setMsg('Votre mot de passe a été mis à jour avec succès.');
    } catch (err) {
      setError('Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      <div className="hero-side">
        <h1>Nouveau mot de passe</h1>
        <p>Pas de panique, nous allons vous aider à récupérer l'accès à votre compte Djago Gestion.</p>
      </div>

      <div className="form-side">
        <div className="glass-panel auth-box">
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Mise à jour</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Entrez votre nouveau mot de passe ci-dessous.</p>

          {error && <div style={{ color: 'var(--accent-red)', marginBottom: '24px', background: 'rgba(231, 76, 60, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-red)' }}>{error}</div>}
          
          {msg ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--accent-green)', background: 'rgba(16, 185, 129, 0.1)', padding: '24px', borderRadius: '8px', border: '1px solid var(--accent-green)' }}>
                 <CheckCircle size={48} style={{margin: '0 auto 12px auto'}} />
                 <div style={{fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '8px'}}>Succès !</div>
                 {msg}
              </div>
              <Link to="/login" className="btn-primary" style={{ marginTop: '24px', display: 'inline-flex', textDecoration: 'none' }}>
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label><Lock size={16} /> Nouveau Mot de passe</label>
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

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Validation...' : 'Enregistrer'} <ArrowRight size={20} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
