import { useState, useContext, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Building, MapPin, Phone, Mail, FileText, CheckCircle, Users, Plus, Trash2, X, Shield } from 'lucide-react';
import api from '../api/api';
import { AuthContext } from '../App';

const AVAILABLE_MODULES = [
  { id: '/ventes', label: 'Caisse (Ventes)' },
  { id: '/achats', label: 'Ravitaillement (Achats)' },
  { id: '/stock', label: 'Gestion du Stock' },
  { id: '/finance', label: 'Finances' },
  { id: '/budgets', label: 'Budgets' },
  { id: '/rapports', label: 'Rapports' },
  { id: '/contacts', label: 'Clients & Fournisseurs' }
];

export default function Settings() {
  const { user, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('infos');
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', rccm: ''
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Agents logic
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [agentForm, setAgentForm] = useState({ username: '', password: '', custom_role: '', allowed_modules: [] });
  const [agentError, setAgentError] = useState('');

  useEffect(() => {
    if (user && user.enterprise) {
      setFormData({
        name: user.enterprise.name || '',
        email: user.enterprise.email || '',
        phone: user.enterprise.phone || '',
        address: user.enterprise.address || '',
        rccm: user.enterprise.rccm || ''
      });
    }
  }, [user]);

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const res = await api.get('agents/');
      setAgents(res.data.results ?? res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'agents') fetchAgents();
  }, [activeTab]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await api.patch('users/me/enterprise/', formData);
      setUser({ ...user, enterprise: res.data });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAgent = async (id) => {
    if (!window.confirm('Voulez-vous révoquer cet employé ?')) return;
    try {
      await api.delete(`agents/${id}/`);
      fetchAgents();
    } catch (e) { alert("Erreur suppression"); }
  };

  const handleCreateAgent = async (e) => {
    e.preventDefault();
    setAgentError('');
    
    // Au moins un module coché
    if (agentForm.allowed_modules.length === 0) {
      setAgentError('Veuillez cocher au moins un module (ex: Caisse).');
      return;
    }

    try {
      await api.post('agents/', agentForm);
      setShowAgentModal(false);
      setAgentForm({ username: '', password: '', custom_role: '', allowed_modules: [] });
      fetchAgents();
    } catch (err) {
      if (err.response?.data?.error) setAgentError(err.response.data.error);
      else if (err.response?.data?.username) setAgentError(err.response.data.username[0]);
      else setAgentError("Erreur de création de l'employé.");
    }
  };

  const toggleModule = (id) => {
    const isSelected = agentForm.allowed_modules.includes(id);
    if (isSelected) setAgentForm({...agentForm, allowed_modules: agentForm.allowed_modules.filter(m => m !== id)});
    else setAgentForm({...agentForm, allowed_modules: [...agentForm.allowed_modules, id]});
  };

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(79,70,229,0.15)' }}>
          <SettingsIcon size={28} color="var(--primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Paramètres & Équipe</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px' }}>Gérez votre profil d'entreprise et vos comptes employés.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="wrap-mobile" style={{display:'flex', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'6px', borderRadius:'12px', marginBottom:'24px', width:'fit-content'}}>
        <button onClick={() => setActiveTab('infos')}
          style={{padding:'10px 20px', borderRadius:'8px', border:'none', display:'flex', alignItems:'center', gap:'8px',
            background: activeTab === 'infos' ? 'var(--primary)' : 'transparent', color:'white', cursor:'pointer', fontWeight:'bold', transition:'all 0.2s'}}>
          <Building size={16} /> Informations Entreprise
        </button>
        <button onClick={() => setActiveTab('agents')}
          style={{padding:'10px 20px', borderRadius:'8px', border:'none', display:'flex', alignItems:'center', gap:'8px',
            background: activeTab === 'agents' ? 'var(--accent-green)' : 'transparent', color:'white', cursor:'pointer', fontWeight:'bold', transition:'all 0.2s'}}>
          <Users size={16} /> Employés & Accès
        </button>
      </div>

      {/* TAB INFOS */}
      {activeTab === 'infos' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '32px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={14} /> Nom de la boutique / PME
                </label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> NIF / STAT / RCCM
                </label>
                <input type="text" name="rccm" value={formData.rccm} onChange={handleChange} placeholder="Optionnel"
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} /> Numéro de Téléphone
                </label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange}
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Adresse E-mail Commune
                </label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} /> Adresse Complète
              </label>
              <textarea name="address" value={formData.address} onChange={handleChange} rows="3"
                style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'vertical' }} />
            </div>

            {success && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                <CheckCircle size={18} /> Paramètres mis à jour avec succès !
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
                <Save size={18} /> {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB AGENTS */}
      {activeTab === 'agents' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '32px', borderTop: '4px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h2 style={{ margin: 0 }}>Comptes Employés</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>{agents.length}/3 agents autorisés.</p>
            </div>
            <button className="btn-primary" style={{ background: 'var(--accent-green)' }} onClick={() => setShowAgentModal(true)} disabled={agents.length >= 3}>
              <Plus size={18} /> Nouvel Employé
            </button>
          </div>

          {loadingAgents ? <div>Chargement...</div> : agents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              Aucun employé créé.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {agents.map(agent => (
                <div key={agent.id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1rem', color: 'var(--accent-green)' }}>
                        {agent.agent_username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', color: 'white', fontSize: '0.95rem' }}>{agent.agent_username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Créé le {new Date(agent.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                    <span style={{ alignSelf: 'flex-start', padding: '3px 10px', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700' }}>
                      {agent.custom_role || 'Employé'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    title="Révoquer l'accès"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'var(--accent-red)', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', whiteSpace: 'nowrap' }}
                  >
                    <Trash2 size={16} /> Révoquer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Création Agent */}
      {showAgentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '450px', border: '2px solid var(--accent-green)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ color: 'var(--accent-green)', margin: 0 }}>Créer un Employé</h2>
              <X cursor="pointer" onClick={() => setShowAgentModal(false)}/>
            </div>
            
            {agentError && (
              <div style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {agentError}
              </div>
            )}

            <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>Identifiant de connexion *</label>
                <input type="text" required placeholder="Ex: amadou_caisse" value={agentForm.username} onChange={e => setAgentForm({...agentForm, username: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>Mot de passe *</label>
                <input type="text" required placeholder="Ex: 1234 (simple pour point de vente)" value={agentForm.password} onChange={e => setAgentForm({...agentForm, password: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>Titre du Poste (Optionnel)</label>
                <input type="text" placeholder="Ex: Gérant Stock" value={agentForm.custom_role} onChange={e => setAgentForm({...agentForm, custom_role: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }} />
              </div>

              {/* Checklist Modules */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 'bold', marginBottom: '12px' }}>
                  <Shield size={16} color="var(--primary)" /> Permissions d'Accès
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {AVAILABLE_MODULES.map(mod => (
                    <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <input type="checkbox" 
                        checked={agentForm.allowed_modules.includes(mod.id)} 
                        onChange={() => toggleModule(mod.id)}
                        style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }} />
                      <span style={{ fontSize: '0.9rem', color: agentForm.allowed_modules.includes(mod.id) ? 'white' : 'var(--text-muted)' }}>{mod.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ background: 'var(--accent-green)', justifyContent: 'center', marginTop: '8px', padding: '14px' }}>
                <Save size={18} /> Créer l'Employé
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
