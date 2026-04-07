import { useState, useEffect } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Plus, X, Check, Clock, Banknote, TrendingDown, TrendingUp, Download, Search } from 'lucide-react';
import api from '../api/api';
import { exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';
import Pagination from '../components/Pagination';

const TABS = [
  { id: 'revenus', label: 'Revenus', icon: <TrendingUp size={16}/>, color: 'var(--accent-green)' },
  { id: 'depenses', label: 'Dépenses', icon: <TrendingDown size={16}/>, color: 'var(--accent-red)' },
  { id: 'dettes', label: 'Dettes', icon: <ArrowDownRight size={16}/>, color: 'var(--accent-orange)' },
  { id: 'creances', label: 'Créances', icon: <ArrowUpRight size={16}/>, color: 'var(--primary)' },
];

const REVENUE_CATS = ['Vente', 'Prestation', 'Commission', 'Investissement', 'Autre'];
const EXPENSE_CATS = ['Loyer', 'Salaires', 'Transport', 'Alimentation', 'Fournitures', 'Eau/Électricité', 'Communication', 'Achat Marchandise', 'Autre'];

export default function Finance() {
  const [activeTab, setActiveTab] = useState('revenus');
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [current, setCurrent] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCounts, setTotalCounts] = useState({ revenus: 0, depenses: 0, dettes: 0, creances: 0 });
  const [summary, setSummary] = useState({
    total_revenues: 0, total_expenses: 0, net_result: 0, total_debts: 0, total_receivables: 0 
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async (p = page) => {
    setLoading(true);
    try {
      const [revRes, expRes, debRes, recRes, sumRes] = await Promise.all([
        api.get(`revenues/?page=${p}`), api.get(`expenses/?page=${p}`),
        api.get(`debts/?page=${p}`), api.get(`receivables/?page=${p}`),
        api.get('finance/summary/')
      ]);
      setRevenues(revRes.data.results ?? revRes.data);
      setExpenses(expRes.data.results ?? expRes.data);
      setDebts(debRes.data.results ?? debRes.data);
      setReceivables(recRes.data.results ?? recRes.data);
      setSummary(sumRes.data);
      setTotalCounts({
        revenus: revRes.data.count ?? revRes.data.length,
        depenses: expRes.data.count ?? expRes.data.length,
        dettes: debRes.data.count ?? debRes.data.length,
        creances: recRes.data.count ?? recRes.data.length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchAll(newPage);
  };

  // Totaux globaux issus de l'API
  const { total_revenues, total_expenses, net_result, total_debts, total_receivables } = summary;

  const openNew = () => {
    if (activeTab === 'revenus') setCurrent({ amount: '', category: 'Vente', description: '' });
    else if (activeTab === 'depenses') setCurrent({ amount: '', category: 'Achat Marchandise', description: '', is_recurring: false });
    else if (activeTab === 'dettes') setCurrent({ amount_total: '', amount_paid: 0, due_date: '', description: '' });
    else setCurrent({ amount_total: '', amount_paid: 0, due_date: '', description: '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const endpoints = { revenus: 'revenues/', depenses: 'expenses/', dettes: 'debts/', creances: 'receivables/' };
    const ep = endpoints[activeTab];
    try {
      if (current.id) {
        await api.put(`${ep}${current.id}/`, current);
      } else {
        await api.post(ep, current);
      }
      fetchAll();
      setShowModal(false);
    } catch (e) { alert('Erreur lors de la sauvegarde.'); console.error(e); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet enregistrement ?')) return;
    const endpoints = { revenus: 'revenues/', depenses: 'expenses/', dettes: 'debts/', creances: 'receivables/' };
    try {
      await api.delete(`${endpoints[activeTab]}${id}/`);
      fetchAll();
    } catch (e) { alert('Erreur suppression.'); }
  };

  const openPayment = (item) => {
    setCurrent(item);
    setPayAmount('');
    setShowPayModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) return alert('Montant invalide');
    const ep = activeTab === 'dettes' ? 'debts/' : 'receivables/';
    const newPaid = parseFloat(current.amount_paid) + amount;
    const isPaid = newPaid >= parseFloat(current.amount_total);
    try {
      await api.patch(`${ep}${current.id}/`, { amount_paid: newPaid, is_paid: isPaid });
      fetchAll();
      setShowPayModal(false);
    } catch (e) { alert('Erreur enregistrement paiement.'); }
  };

 const accentColor = TABS.find(t => t.id === activeTab)?.color || 'var(--primary)';

  // Calcul du badge d'échéance
  const getDueBadge = (due_date) => {
    if (!due_date) return null;
    const today = new Date();
    const due = new Date(due_date);
    const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: `Échue (${Math.abs(diffDays)}j)`, color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.15)' };
    if (diffDays <= 7) return { label: `Dans ${diffDays}j`, color: 'var(--accent-orange)', bg: 'rgba(245,158,11,0.15)' };
    return null;
  };

  // Fonctions d'export
  const handleExport = (format) => {
    let data = [];
    let filename = '';
    if (activeTab === 'revenus') {
      data = revenues.map(r => ({ Catégorie: r.category, Description: r.description, Montant: r.amount, Date: new Date(r.date).toLocaleDateString('fr-FR') }));
      filename = 'Djago_Revenus';
    } else if (activeTab === 'depenses') {
      data = expenses.map(e => ({ Catégorie: e.category, Description: e.description, Montant: e.amount, Récurrent: e.is_recurring ? 'Oui' : 'Non', Date: new Date(e.date).toLocaleDateString('fr-FR') }));
      filename = 'Djago_Dépenses';
    } else if (activeTab === 'dettes') {
      data = debts.map(d => ({ Description: d.description, Total: d.amount_total, Payé: d.amount_paid, Restant: parseFloat(d.amount_total) - parseFloat(d.amount_paid), Echéance: d.due_date || '-', Statut: d.is_paid ? 'Réglé' : 'En attente' }));
    } else {
      data = receivables.map(r => ({ Description: r.description, Total: r.amount_total, Reçu: r.amount_paid, Restant: parseFloat(r.amount_total) - parseFloat(r.amount_paid), Echéance: r.due_date || '-', Statut: r.is_paid ? 'Encaissé' : 'En attente' }));
    }
    if (format === 'excel') exportToExcel(data, `Djago_${activeTab}`, activeTab);
    else if (format === 'pdf') exportToPDF(data, `Djago_${activeTab}`, `Liste des ${activeTab}`);
    else exportToCSV(data, `Djago_${activeTab}`);
  };


  const renderTable = () => {
    const filterData = (data) => data.filter(item => 
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.amount && item.amount.toString().includes(searchTerm)) ||
      (item.amount_total && item.amount_total.toString().includes(searchTerm))
    );

    if (activeTab === 'revenus') return (
      <table>
        <thead><tr><th>Catégorie</th><th>Description</th><th>Montant</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {filterData(revenues).map(r => (
            <tr key={r.id}>
              <td><span style={{padding:'4px 10px', borderRadius:'20px', background:'rgba(16,185,129,0.15)', color:'var(--accent-green)', fontSize:'0.8rem', fontWeight:'600'}}>{r.category}</span></td>
              <td style={{color:'var(--text-muted)'}}>{r.description || '-'}</td>
              <td style={{fontWeight:'bold', color:'var(--accent-green)'}}>{parseFloat(r.amount).toLocaleString()} FCFA</td>
              <td style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>{new Date(r.date).toLocaleDateString('fr-FR')}</td>
              <td style={{display:'flex', gap:'12px'}}>
                <span style={{cursor:'pointer', color:'var(--accent-orange)'}} onClick={() => { setCurrent(r); setShowModal(true); }}>✏️</span>
                <span style={{cursor:'pointer', color:'var(--accent-red)'}} onClick={() => handleDelete(r.id)}>🗑️</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    if (activeTab === 'depenses') return (
      <table>
        <thead><tr><th>Catégorie</th><th>Description</th><th>Récurrent</th><th>Montant</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>
          {filterData(expenses).map(e => (
            <tr key={e.id}>
              <td><span style={{padding:'4px 10px', borderRadius:'20px', background:'rgba(239,68,68,0.15)', color:'var(--accent-red)', fontSize:'0.8rem', fontWeight:'600'}}>{e.category}</span></td>
              <td style={{color:'var(--text-muted)'}}>{e.description || '-'}</td>
              <td>{e.is_recurring ? <span style={{color:'var(--accent-orange)'}}>🔄 Oui</span> : <span style={{color:'var(--text-muted)'}}>Non</span>}</td>
              <td style={{fontWeight:'bold', color:'var(--accent-red)'}}>{parseFloat(e.amount).toLocaleString()} FCFA</td>
              <td style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>{new Date(e.date).toLocaleDateString('fr-FR')}</td>
              <td style={{display:'flex', gap:'12px'}}>
                <span style={{cursor:'pointer', color:'var(--accent-orange)'}} onClick={() => { setCurrent(e); setShowModal(true); }}>✏️</span>
                <span style={{cursor:'pointer', color:'var(--accent-red)'}} onClick={() => handleDelete(e.id)}>🗑️</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    if (activeTab === 'dettes') return (
      <table>
        <thead><tr><th>Description</th><th>Total</th><th>Payé</th><th>Restant</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          {filterData(debts).map(d => {
            const restant = parseFloat(d.amount_total) - parseFloat(d.amount_paid);
            const badge = getDueBadge(d.due_date);
            return (
              <tr key={d.id}>
                <td style={{fontWeight:'500'}}>{d.description || `Dette #${d.id}`}</td>
                <td>{parseFloat(d.amount_total).toLocaleString()} FCFA</td>
                <td style={{color:'var(--accent-green)'}}>{parseFloat(d.amount_paid).toLocaleString()} FCFA</td>
                <td style={{fontWeight:'bold', color: d.is_paid ? 'var(--accent-green)' : 'var(--accent-red)'}}>{restant.toLocaleString()} FCFA</td>
                <td>
                  <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                    <span style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>{d.due_date || '-'}</span>
                    {!d.is_paid && badge && (
                      <span style={{padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'700', background: badge.bg, color: badge.color}}>
                        🔔 {badge.label}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'600',
                    background: d.is_paid ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: d.is_paid ? 'var(--accent-green)' : 'var(--accent-red)'}}>
                    {d.is_paid ? '✓ Réglé' : '⏳ En attente'}
                  </span>
                </td>
                <td style={{display:'flex', gap:'8px'}}>
                  {!d.is_paid && <button onClick={() => openPayment(d)} style={{background:'rgba(16,185,129,0.2)', border:'none', color:'var(--accent-green)', padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold'}}>Payer</button>}
                  <span style={{cursor:'pointer', color:'var(--accent-red)'}} onClick={() => handleDelete(d.id)}>🗑️</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    if (activeTab === 'creances') return (
      <table>
        <thead><tr><th>Description</th><th>Total</th><th>Reçu</th><th>Restant</th><th>Échéance</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          {filterData(receivables).map(r => {
            const restant = parseFloat(r.amount_total) - parseFloat(r.amount_paid);
            const badge = getDueBadge(r.due_date);
            return (
              <tr key={r.id}>
                <td style={{fontWeight:'500'}}>{r.description || `Créance #${r.id}`}</td>
                <td>{parseFloat(r.amount_total).toLocaleString()} FCFA</td>
                <td style={{color:'var(--accent-green)'}}>{parseFloat(r.amount_paid).toLocaleString()} FCFA</td>
                <td style={{fontWeight:'bold', color: r.is_paid ? 'var(--accent-green)' : 'var(--primary)'}}>{restant.toLocaleString()} FCFA</td>
                <td>
                  <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                    <span style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>{r.due_date || '-'}</span>
                    {!r.is_paid && badge && (
                      <span style={{padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'700', background: badge.bg, color: badge.color}}>
                        🔔 {badge.label}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <span style={{padding:'4px 10px', borderRadius:'20px', fontSize:'0.8rem', fontWeight:'600',
                    background: r.is_paid ? 'rgba(16,185,129,0.15)' : 'rgba(79,70,229,0.15)',
                    color: r.is_paid ? 'var(--accent-green)' : 'var(--primary)'}}>
                    {r.is_paid ? '✓ Encaissé' : '⏳ En attente'}
                  </span>
                </td>
                <td style={{display:'flex', gap:'8px'}}>
                  {!r.is_paid && <button onClick={() => openPayment(r)} style={{background:'rgba(79,70,229,0.2)', border:'none', color:'var(--primary)', padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'0.8rem', fontWeight:'bold'}}>Encaisser</button>}
                  <span style={{cursor:'pointer', color:'var(--accent-red)'}} onClick={() => handleDelete(r.id)}>🗑️</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderModal = () => {
    if (!showModal || !current) return null;
    return (
      <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:200}}>
        <div className="glass-panel" style={{width:'460px', border:`2px solid ${accentColor}`}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'24px'}}>
            <h3 style={{margin:0}}>{current.id ? 'Modifier' : 'Nouveau'} {TABS.find(t => t.id === activeTab)?.label}</h3>
            <X size={20} style={{cursor:'pointer', color:'var(--text-muted)'}} onClick={() => setShowModal(false)} />
          </div>
          <form onSubmit={handleSave} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            {(activeTab === 'revenus' || activeTab === 'depenses') && (
              <>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Montant (FCFA) *</label>
                  <input type="number" required min="1" value={current.amount || ''} onChange={e => setCurrent({...current, amount: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:`1px solid ${accentColor}`}} />
                </div>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Catégorie</label>
                  <select value={current.category} onChange={e => setCurrent({...current, category: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'#1e293b', color:'white', border:'1px solid var(--glass-border)'}}>
                    {(activeTab === 'revenus' ? REVENUE_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Description</label>
                  <input type="text" placeholder="Détail optionnel..." value={current.description || ''} onChange={e => setCurrent({...current, description: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:'1px solid var(--glass-border)'}} />
                </div>
                {activeTab === 'depenses' && (
                  <label style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', color:'var(--text-muted)'}}>
                    <input type="checkbox" checked={current.is_recurring || false} onChange={e => setCurrent({...current, is_recurring: e.target.checked})} />
                    Dépense récurrente (mensuelle)
                  </label>
                )}
              </>
            )}

            {(activeTab === 'dettes' || activeTab === 'creances') && (
              <>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Montant Total (FCFA) *</label>
                  <input type="number" required min="1" value={current.amount_total || ''} onChange={e => setCurrent({...current, amount_total: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:`1px solid ${accentColor}`}} />
                </div>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Date d'Échéance</label>
                  <input type="date" value={current.due_date || ''} onChange={e => setCurrent({...current, due_date: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:'1px solid var(--glass-border)'}} />
                </div>
                <div>
                  <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Description / Référence *</label>
                  <input type="text" required placeholder="Ex: Fournisseur A - Facture 012" value={current.description || ''} onChange={e => setCurrent({...current, description: e.target.value})}
                    style={{width:'100%', padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:'1px solid var(--glass-border)'}} />
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" style={{justifyContent:'center', background: accentColor, marginTop:'8px', padding:'14px', fontSize:'1rem'}}>
              <Check size={18}/> Enregistrer
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content">
      <div className="header">
        <h1>Finances & Comptabilité</h1>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{marginBottom:'32px'}}>
        <div className="glass-panel" style={{borderLeft:'4px solid var(--accent-green)'}}>
          <div className="title" style={{display:'flex', gap:'8px'}}><TrendingUp size={18} color="var(--accent-green)"/> Total Revenus</div>
          <div className="amount green">{total_revenues.toLocaleString()} FCFA</div>
        </div>
        <div className="glass-panel" style={{borderLeft:'4px solid var(--accent-red)'}}>
          <div className="title" style={{display:'flex', gap:'8px'}}><TrendingDown size={18} color="var(--accent-red)"/> Total Dépenses</div>
          <div className="amount red">{total_expenses.toLocaleString()} FCFA</div>
        </div>
        <div className="glass-panel" style={{borderLeft:`4px solid ${net_result >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}`}}>
          <div className="title">Résultat Net</div>
          <div className="amount" style={{color: net_result >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}}>{net_result >= 0 ? '+' : ''}{net_result.toLocaleString()} FCFA</div>
        </div>
        <div className="glass-panel" style={{borderLeft:'4px solid var(--accent-orange)'}}>
          <div className="title" style={{display:'flex', gap:'8px'}}><Clock size={18} color="var(--accent-orange)"/> Dettes Restantes</div>
          <div className="amount" style={{color:'var(--accent-orange)'}}>{total_debts.toLocaleString()} FCFA</div>
        </div>
        <div className="glass-panel" style={{borderLeft:'4px solid var(--primary)'}}>
          <div className="title" style={{display:'flex', gap:'8px'}}><ArrowUpRight size={18} color="var(--primary)"/> Créances Restantes</div>
          <div className="amount" style={{color:'var(--primary)'}}>{total_receivables.toLocaleString()} FCFA</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="wrap-mobile" style={{display:'flex', gap:'8px', background:'rgba(255,255,255,0.05)', padding:'6px', borderRadius:'12px', marginBottom:'24px', width:'fit-content'}}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{padding:'10px 20px', borderRadius:'8px', border:'none', display:'flex', alignItems:'center', gap:'8px',
              background: activeTab === tab.id ? tab.color : 'transparent', color:'white', cursor:'pointer', fontWeight:'bold', transition:'all 0.2s'}}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Panel Principal */}
      <div className="glass-panel" style={{borderTop:`4px solid ${accentColor}`}}>
        <div className="flex-col-mobile" style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px', flexWrap:'wrap', gap:'16px'}}>
          <div className="flex-col-mobile w-full-mobile" style={{display:'flex', alignItems:'center', gap:'16px'}}>
            <h2 className="title" style={{margin:0}}>Liste des {TABS.find(t => t.id === activeTab)?.label}</h2>
            <div className="w-full-mobile" style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                className="w-full-mobile" style={{ width: '220px', padding: '8px 12px 8px 34px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', outline: 'none' }} />
            </div>
          </div>
          <div className="wrap-mobile" style={{display:'flex', gap:'8px', alignItems:'center'}}>
            <button onClick={() => handleExport('csv')}
              style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:'1px solid var(--glass-border)', background:'transparent', color:'var(--text-muted)', cursor:'pointer', fontSize:'0.85rem'}}>
              <Download size={14}/> CSV
            </button>
            <button onClick={() => handleExport('excel')}
              style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:'none', background:'rgba(16,185,129,0.15)', color:'var(--accent-green)', cursor:'pointer', fontSize:'0.85rem', fontWeight:'bold'}}>
              <Download size={14}/> Excel
            </button>
            <button onClick={() => handleExport('pdf')}
              style={{display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'8px', border:'none', background:'rgba(239,68,68,0.15)', color:'var(--accent-red)', cursor:'pointer', fontSize:'0.85rem', fontWeight:'bold'}}>
              <Download size={14}/> PDF
            </button>
            <button className="btn-primary" style={{background: accentColor}} onClick={openNew}>
              <Plus size={18}/> Ajouter
            </button>
          </div>
        </div>

        <div className="table-container">
          {loading ? <div style={{color:'var(--text-muted)'}}>Chargement...</div> : renderTable()}
        </div>
        <Pagination currentPage={page} totalCount={totalCounts[activeTab]} onPageChange={handlePageChange} />
      </div>

      {renderModal()}

      {/* Modal Paiement */}
      {showPayModal && current && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:200}}>
          <div className="glass-panel" style={{width:'380px', border:'2px solid var(--accent-green)'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
              <h3 style={{margin:0, color:'var(--accent-green)'}}>Enregistrer un Paiement</h3>
              <X size={20} style={{cursor:'pointer'}} onClick={() => setShowPayModal(false)} />
            </div>
            <p style={{color:'var(--text-muted)', marginBottom:'16px'}}>{current.description || `Référence #${current.id}`}</p>
            <div style={{marginBottom:'16px', padding:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'8px'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'var(--text-muted)'}}>Total :</span>
                <span style={{fontWeight:'bold'}}>{parseFloat(current.amount_total).toLocaleString()} FCFA</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{color:'var(--text-muted)'}}>Déjà payé :</span>
                <span style={{color:'var(--accent-green)'}}>{parseFloat(current.amount_paid).toLocaleString()} FCFA</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--glass-border)', paddingTop:'8px'}}>
                <span style={{fontWeight:'bold'}}>Restant :</span>
                <span style={{fontWeight:'bold', color:'var(--accent-red)'}}>{(parseFloat(current.amount_total) - parseFloat(current.amount_paid)).toLocaleString()} FCFA</span>
              </div>
            </div>
            <form onSubmit={handlePayment} style={{display:'flex', flexDirection:'column', gap:'16px'}}>
              <div>
                <label style={{display:'block', color:'var(--text-muted)', marginBottom:'6px'}}>Montant versé (FCFA)</label>
                <input type="number" required min="1" max={parseFloat(current.amount_total) - parseFloat(current.amount_paid)} value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  style={{width:'100%', padding:'14px', borderRadius:'8px', background:'rgba(255,255,255,0.08)', color:'white', border:'2px solid var(--accent-green)', fontSize:'1.2rem', textAlign:'center'}} />
              </div>
              <button type="submit" className="btn-primary" style={{background:'var(--accent-green)', justifyContent:'center', padding:'14px'}}>
                <Check size={18}/> Confirmer le Paiement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
