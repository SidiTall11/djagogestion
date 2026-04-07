import { useState, useEffect } from 'react';
import { Target, Plus, X, AlertTriangle, TrendingDown, Edit, Trash2 } from 'lucide-react';
import api from '../api/api';

const EXPENSE_CATS = ['Loyer', 'Salaires', 'Transport', 'Alimentation', 'Fournitures', 'Eau/Électricité', 'Communication', 'Achat Marchandise', 'Autre'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [current, setCurrent] = useState({ category: EXPENSE_CATS[0], limit_amount: '', month: selectedMonth, year: selectedYear });

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budRes, expRes] = await Promise.all([
        api.get('budgets/'),
        api.get('expenses/')
      ]);
      const budgetsData = budRes.data.results ?? budRes.data;
      const expensesData = expRes.data.results ?? expRes.data;

      // Filtrer les budgets pour le mois séléctionné
      const filteredBudgets = budgetsData.filter(b => b.month === selectedMonth && b.year === selectedYear);
      setBudgets(filteredBudgets);

      // Calculer les dépenses du mois séléctionné
      const currentExpenses = expensesData.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      });
      setExpenses(currentExpenses);

    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (current.id) {
        await api.put(`budgets/${current.id}/`, current);
      } else {
        await api.post('budgets/', current);
      }
      fetchData();
      setShowModal(false);
    } catch (e) { alert("Erreur lors de la sauvegarde du budget"); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Supprimer ce budget ?")) return;
    try {
      await api.delete(`budgets/${id}/`);
      fetchData();
    } catch { alert("Erreur de suppression."); }
  };

  const openModal = (b = null) => {
    if (b) setCurrent(b);
    else setCurrent({ category: EXPENSE_CATS[0], limit_amount: '', month: selectedMonth, year: selectedYear });
    setShowModal(true);
  };

  // Calculs consolidés par catégorie
  const budgetData = budgets.map(b => {
    const spent = expenses.filter(e => e.category === b.category).reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const limit = parseFloat(b.limit_amount);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    return { ...b, spent, limit, percentage };
  });

  const totalBudget = budgetData.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = budgetData.reduce((acc, b) => acc + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="main-content">
      <div className="header">
        <h1>Gestion des Budgets</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
            style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1} style={{color: 'black'}}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
            style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)' }}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} style={{color: 'black'}}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="title" style={{ display: 'flex', gap: '8px' }}><Target size={18} color="var(--primary)"/> Budget Global du Mois</div>
          <div className="amount" style={{ color: 'var(--primary)' }}>{totalBudget.toLocaleString()} FCFA</div>
        </div>
        <div className="glass-panel" style={{ borderLeft: `4px solid ${overallPercentage > 100 ? 'var(--accent-red)' : 'var(--accent-orange)'}` }}>
          <div className="title" style={{ display: 'flex', gap: '8px' }}><TrendingDown size={18} color="var(--accent-orange)"/> Dépenses Valisées</div>
          <div className="amount" style={{ color: overallPercentage > 100 ? 'var(--accent-red)' : 'white' }}>{totalSpent.toLocaleString()} FCFA</div>
          <div style={{ marginTop: '8px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(overallPercentage, 100)}%`, height: '100%', background: overallPercentage > 100 ? 'var(--accent-red)' : overallPercentage > 80 ? 'var(--accent-orange)' : 'var(--accent-green)', transition: 'width 0.3s' }}></div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ borderTop: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="title" style={{ margin: 0 }}>Budgets par Catégorie</h2>
          <button className="btn-primary" onClick={() => openModal()}><Plus size={18} /> Définir un Budget</button>
        </div>

        {loading ? <div style={{ color: 'var(--text-muted)' }}>Chargement...</div> :
         budgetData.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Aucun budget défini pour ce mois.</p> :
         (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
             {budgetData.map(b => (
               <div key={b.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', border: b.percentage > 100 ? '1px solid rgba(239,68,68,0.4)' : '1px solid transparent' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{b.category}</span>
                     {b.percentage >= 100 && <AlertTriangle size={16} color="var(--accent-red)" title="Budget dépassé !" />}
                   </div>
                   <div style={{ display: 'flex', gap: '12px' }}>
                      <Edit size={16} color="var(--accent-orange)" style={{cursor: 'pointer'}} onClick={() => openModal(b)} />
                      <Trash2 size={16} color="var(--accent-red)" style={{cursor: 'pointer'}} onClick={() => handleDelete(b.id)} />
                   </div>
                 </div>

                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem' }}>
                   <span style={{ color: 'var(--text-muted)' }}>Consommé : <strong style={{color: 'white'}}>{b.spent.toLocaleString()} FCFA</strong></span>
                   <span style={{ color: 'var(--text-muted)' }}>Plafond : <strong style={{color: 'var(--primary)'}}>{b.limit.toLocaleString()} FCFA</strong></span>
                 </div>

                 <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                   <div style={{ 
                     height: '100%', 
                     width: `${Math.min(b.percentage, 100)}%`, 
                     background: b.percentage >= 100 ? 'var(--accent-red)' : b.percentage > 80 ? 'var(--accent-orange)' : 'var(--accent-green)',
                     transition: 'width 0.3s' 
                   }} />
                 </div>
                 <div style={{ textAlign: 'right', fontSize: '0.75rem', marginTop: '4px', color: b.percentage >= 100 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                   {b.percentage.toFixed(1)}% {b.percentage >= 100 ? '— Dépassement !' : ''}
                 </div>
               </div>
             ))}
           </div>
         )
        }
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div className="glass-panel" style={{ width: '400px', border: "2px solid var(--primary)" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h3 style={{ margin: 0 }}>{current.id ? 'Modifier' : 'Nouveau'} Budget</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setShowModal(false)} />
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>Catégorie *</label>
                <select value={current.category} onChange={e => setCurrent({...current, category: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid var(--glass-border)' }}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>Plafond (FCFA) *</label>
                <input type="number" required min="1" value={current.limit_amount}
                  onChange={e => setCurrent({...current, limit_amount: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid var(--primary)' }} />
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px', marginTop: '8px' }}>
                 Sauvegarder le Budget
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
