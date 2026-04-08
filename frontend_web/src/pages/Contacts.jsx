import { useState, useEffect } from 'react';
import { Users, UserCheck, Plus, Edit, Trash2, X, Phone, Mail, FileText } from 'lucide-react';
import api from '../api/api';
import { exportToPDF } from '../utils/exportUtils';
import Pagination from '../components/Pagination';

export default function Contacts() {
  const [activeTab, setActiveTab] = useState('customers');
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCounts, setTotalCounts] = useState({ customers: 0, suppliers: 0 });

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyContact, setHistoryContact] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const [custRes, suppRes] = await Promise.all([
        api.get(`customers/?page=${p}`),
        api.get(`suppliers/?page=${p}`)
      ]);
      setCustomers(custRes.data.results ?? custRes.data);
      setSuppliers(suppRes.data.results ?? suppRes.data);
      setTotalCounts({
        customers: custRes.data.count ?? custRes.data.length,
        suppliers: suppRes.data.count ?? suppRes.data.length
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const openModal = (item = null) => {
    if (item) {
      setCurrent(item);
    } else {
      setCurrent({ name: '', phone: '', email: '', address: '' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const endpoint = activeTab === 'customers' ? 'customers/' : 'suppliers/';
    try {
      if (current.id) {
        await api.put(`${endpoint}${current.id}/`, current);
      } else {
        await api.post(endpoint, current);
      }
      fetchData();
      setShowModal(false);
    } catch (e) { alert("Erreur lors de la sauvegarde."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce contact definitvement ?")) return;
    const endpoint = activeTab === 'customers' ? 'customers/' : 'suppliers/';
    try {
      await api.delete(`${endpoint}${id}/`);
      fetchData();
    } catch (e) { alert("Erreur suppression."); }
  };

  const openHistory = async (contact) => {
    setHistoryContact(contact);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const endpoint = activeTab === 'customers' ? 'sales/' : 'purchases/';
      const param = activeTab === 'customers' ? 'customer' : 'supplier';
      const res = await api.get(`${endpoint}?${param}=${contact.id}`);
      // L'API est paginée, les données sont dans 'results'
      setHistoryData(res.data.results || res.data);
    } catch (e) {
      console.error("Erreur historique:", e);
      setHistoryData([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const list = activeTab === 'customers' ? customers : suppliers;
  const accentColor = activeTab === 'customers' ? 'var(--primary)' : 'var(--accent-orange)';

  return (
    <div className="main-content">
      <div className="header">
        <h1>Clients & Fournisseurs</h1>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px' }}>
          <button onClick={() => setActiveTab('customers')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'customers' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            <Users size={14} style={{display: 'inline', marginRight: '8px'}}/> Clients
          </button>
          <button onClick={() => setActiveTab('suppliers')} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'suppliers' ? 'var(--accent-orange)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            <UserCheck size={14} style={{display: 'inline', marginRight: '8px'}}/> Fournisseurs
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ borderTop: `4px solid ${accentColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
          <button className="btn-primary" style={{ background: accentColor }} onClick={() => openModal()}>
            <Plus size={18} /> Ajouter {activeTab === 'customers' ? 'Client' : 'Fournisseur'}
          </button>
        </div>

        <div className="table-responsive">
          {loading ? <div style={{padding: '20px', textAlign: 'center', color: 'var(--text-muted)'}}>Chargement...</div> : (
            <>
              <table className="desktop-only">
                <thead>
                  <tr><th>Nom</th><th>Téléphone</th><th>Adresse</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {list.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: '600' }}>{item.name}</td>
                      <td>{item.phone || '-'}</td>
                      <td>{item.address || '-'}</td>
                      <td style={{ display: 'flex', gap: '16px' }}>
                        <FileText size={18} color="var(--primary)" style={{ cursor: 'pointer' }} onClick={() => openHistory(item)} />
                        <Edit size={18} color="var(--accent-orange)" style={{ cursor: 'pointer' }} onClick={() => openModal(item)} />
                        <Trash2 size={18} color="var(--accent-red)" style={{ cursor: 'pointer' }} onClick={() => handleDelete(item.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mobile-only">
                {list.length === 0 ? <p style={{textAlign:'center', padding:'20px', color:'var(--text-muted)'}}>Aucun contact.</p> : list.map(item => (
                  <div key={item.id} className="mobile-card" style={{ borderLeft: `4px solid ${accentColor}` }}>
                    <div className="card-header">
                       <div className="card-title">{item.name}</div>
                       <div style={{ display: 'flex', gap: '12px' }}>
                          <FileText size={18} color="var(--primary)" onClick={() => openHistory(item)} />
                          <Edit size={18} color="var(--accent-orange)" onClick={() => openModal(item)} />
                       </div>
                    </div>
                    <div className="card-detail">
                       <span className="label">Téléphone</span>
                       <span className="value">{item.phone || '-'}</span>
                    </div>
                    <div className="card-actions" style={{justifyContent:'flex-end'}}>
                       <button onClick={() => handleDelete(item.id)} style={{color:'var(--accent-red)', background:'rgba(239,68,68,0.1)', border:'none', padding:'6px 12px', borderRadius:'6px'}}>Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <Pagination currentPage={page} totalCount={activeTab === 'customers' ? totalCounts.customers : totalCounts.suppliers} onPageChange={handlePageChange} />
      </div>

      {/* Modal Edit/Create */}
      {showModal && current && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth:'460px', border: `2px solid ${accentColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{margin: 0}}>{current.id ? 'Modifier' : 'Nouveau'}</h3>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" required placeholder="Nom" value={current.name} onChange={e => setCurrent({...current, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid var(--glass-border)' }} />
              <input type="tel" placeholder="Téléphone" value={current.phone || ''} onChange={e => setCurrent({...current, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid var(--glass-border)' }} />
              <input type="text" placeholder="Adresse" value={current.address || ''} onChange={e => setCurrent({...current, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid var(--glass-border)' }} />
              <button type="submit" className="btn-primary" style={{ background: accentColor, padding: '12px' }}>Sauvegarder</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historique */}
      {showHistoryModal && historyContact && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth:'600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: `2px solid ${accentColor}`, padding: '0' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0 }}>Historique : {historyContact.name}</h3>
               <X size={24} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowHistoryModal(false)} />
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, padding: '24px' }}>
               {loadingHistory ? (
                 <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
               ) : historyData.length === 0 ? (
                 <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Aucune transaction trouvée.</div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   {historyData.map(tx => (
                     <div key={tx.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>{activeTab === 'customers' ? 'Vente' : 'Achat'} #{tx.id}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 'bold', color: activeTab === 'customers' ? 'var(--accent-green)' : 'var(--accent-orange)', fontSize: '1.1rem' }}>
                            {parseFloat(tx.total_amount).toLocaleString()} FCFA
                          </div>
                          {tx.is_credit && (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                              À Crédit
                            </span>
                          )}
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--glass-border)', textAlign: 'center' }}>
              <button className="btn-primary" onClick={() => setShowHistoryModal(false)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', width: '100% border: none' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
