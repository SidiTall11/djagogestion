import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api';
import { Building, User, Lock, Store, ArrowRight, Eye, EyeOff } from 'lucide-react';
import logoImage from '../assets/logo.png';

export default function Register() {
  const [formData, setFormData] = useState({
    enterprise_name: '',
    username: '',
    email: '',
    password: '',
    role: 'ADMIN_PME'
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('register/', formData);
      alert("Votre compte entreprise a bien été créé ! Vous pouvez vous connecter.");
      navigate('/login');
    } catch (err) {
      if(err.response && err.response.data && err.response.data.username) {
        setError("Ce nom d'utilisateur existe déjà.");
      } else {
        setError("Impossible de créer le compte. Vérifiez les champs et la longueur du mot de passe.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-layout">
      {/* Côté Gauche : Hero Premium */}
      <div className="hero-side">
        <div style={{ marginBottom: '24px' }}>
          <img src={logoImage} alt="Djago Gestion" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
        </div>
        <h1>Transformez la gestion de votre PME.</h1>
        <p>Djago Gestion unifie vos ventes, votre stock et votre comptabilité dans une seule solution intelligente. Rejoignez des centaines de commerçants modernes.</p>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-green)' }}>100%</div>
            <div style={{ color: 'var(--text-muted)' }}>Automatisé</div>
          </div>
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>PWA</div>
            <div style={{ color: 'var(--text-muted)' }}>Offline Actif</div>
          </div>
        </div>
      </div>

      {/* Côté Droit : Formulaire */}
      <div className="form-side">
        <div className="glass-panel auth-box">
          <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-main)' }}>Créer votre Espace</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Veuillez remplir vos informations commerciales.</p>

          {error && <div style={{ color: 'var(--accent-red)', marginBottom: '24px', background: 'rgba(231, 76, 60, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-red)' }}>{error}</div>}

          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: '20px' }}>
              <label><Building size={16} /> Nom Structure / Boutique</label>
              <input 
                type="text" required placeholder="Ex: Boutique Centrale"
                value={formData.enterprise_name}
                onChange={(e) => setFormData({...formData, enterprise_name: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label><User size={16} /> Identifiant Administrateur</label>
              <input 
                type="text" required placeholder="Ex: diallo.pro"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label><User size={16} /> Email</label>
              <input 
                type="email" required placeholder="Ex: contact@boutique.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label><Lock size={16} /> Mot de passe sécurisé</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? "text" : "password"} required placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
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

            <div style={{ marginBottom: '20px' }}>
              <label><Store size={16} /> Typologie d'Activité</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="ADMIN_PME">Fondateur PME (Multirôle)</option>
                <option value="COMMERCANT">Commerçant Indépendant</option>
              </select>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              Ouvrir mon système <ArrowRight size={20} />
            </button>
          </form>
          
          <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Déjà équipé ? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '600', textDecoration: 'none' }}>Se Connecter</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
