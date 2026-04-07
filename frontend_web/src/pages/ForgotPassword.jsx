 import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMsg('');
    
    try {
      await api.post('password_reset/', { email });
      setMsg('Un e-mail de réinitialisation a été envoyé à cette adresse (si elle existe).');
    } catch (err) {
      setError('Erreur lors de la demande. Vérifiez l\'adresse e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Côté Gauche */}
      <div className="hero-side">
        <h1>Mot de passe oublié ?</h1>
        <p>Pas de panique, nous allons vous aider à récupérer l'accès à votre compte Djago Gestion.</p>
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', textDecoration: 'none', marginTop: '24px', fontWeight: 'bold' }}>
          <ArrowLeft size={18} /> Retour à la connexion
        </Link>
      </div>

      {/* Côté Droit */}
      <div className="form-side">
        <div className="glass-panel auth-box">
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', color: 'white' }}>Réinitialisation</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Saisissez l'adresse e-mail associée à votre compte.</p>

          {error && <div style={{ color: 'var(--accent-red)', marginBottom: '24px', background: 'rgba(231, 76, 60, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-red)' }}>{error}</div>}
          {msg && <div style={{ color: 'var(--accent-green)', marginBottom: '24px', background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-green)' }}>{msg}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label><Mail size={16} /> Adresse E-mail</label>
              <input 
                type="email" required placeholder="votre_email@exemple.com"
                value={email} onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer le lien'} <ArrowRight size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
