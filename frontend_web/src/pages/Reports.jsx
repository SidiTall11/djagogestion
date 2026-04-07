import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Package, DollarSign, Award, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/api';
import { exportToExcel, exportToCSV, exportToPDF } from '../utils/exportUtils';

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [advancedData, setAdvancedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // 'week' | 'month' | 'year'
  const [activeTab, setActiveTab] = useState('basic'); // 'basic' | 'advanced'

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, prodRes, advRes] = await Promise.all([
        api.get('sales/?limit=1000'),
        api.get('products/?limit=1000'),
        api.get('finance/analytics/')
      ]);
      setSales(salesRes.data.results ?? salesRes.data);
      setProducts(prodRes.data.results ?? prodRes.data);
      setAdvancedData(advRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ---- Calculs ----
  const now = new Date();
  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    if (period === 'week') return (now - d) <= 7 * 86400000;
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (period === 'year') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalRevenue = filteredSales.reduce((a, s) => a + parseFloat(s.total_amount), 0);
  const totalMargin = filteredSales.reduce((a, s) => a + parseFloat(s.total_margin), 0);
  const marginRate = totalRevenue > 0 ? ((totalMargin / totalRevenue) * 100).toFixed(1) : 0;
  const creditSales = filteredSales.filter(s => s.is_credit).length;

  // Données graphique ventes journalières
  const salesByDay = {};
  filteredSales.forEach(s => {
    const day = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    salesByDay[day] = (salesByDay[day] || 0) + parseFloat(s.total_amount);
  });
  const chartData = Object.entries(salesByDay).map(([day, amount]) => ({ day, amount })).slice(-15);

  // Top 5 produits par valorisation stock
  const topStockProducts = [...products]
    .map(p => ({ ...p, stockValue: parseFloat(p.stock_quantity) * parseFloat(p.purchase_price) }))
    .sort((a, b) => b.stockValue - a.stockValue)
    .slice(0, 5);

  const totalStockValue = products.reduce((a, p) => a + parseFloat(p.stock_quantity) * parseFloat(p.purchase_price), 0);
  const totalSaleValue = products.reduce((a, p) => a + parseFloat(p.stock_quantity) * parseFloat(p.sale_price), 0);
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_threshold);

  const handleExportSales = (format) => {
    const data = filteredSales.map(s => ({
      ID: s.id,
      Date: new Date(s.date).toLocaleDateString('fr-FR'),
      Client: s.customer_name || 'Comptant',
      Montant: s.total_amount,
      Marge: s.total_margin,
      Credit: s.is_credit ? 'Oui' : 'Non'
    }));
    if (format === 'excel') exportToExcel(data, `Djago_Ventes_${period}`, 'Ventes');
    else if (format === 'pdf') exportToPDF(data, `Djago_Ventes_${period}`, `Rapport des Ventes (${period})`);
    else exportToCSV(data, `Djago_Ventes_${period}`);
  };

  const handleExportStock = (format) => {
    const data = products.map(p => ({
      Produit: p.name,
      Stock: p.stock_quantity,
      'Seuil min': p.min_stock_threshold,
      'Prix achat': p.purchase_price,
      'Prix vente': p.sale_price,
      'Valeur stock': (parseFloat(p.stock_quantity) * parseFloat(p.purchase_price)).toFixed(0)
    }));
    if (format === 'excel') exportToExcel(data, 'Djago_Stock', 'Inventaire');
    else if (format === 'pdf') exportToPDF(data, 'Djago_Stock', 'Valorisation de l\'Inventaire');
    else exportToCSV(data, 'Djago_Stock');
  };

  return (
    <div className="main-content">
      <div className="header">
        <h1>Rapports & Analyses</h1>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px' }}>
          {[['week', '7 Jours'], ['month', 'Ce Mois'], ['year', 'Cette Année']].map(([val, label]) => (
            <button key={val} onClick={() => setPeriod(val)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: period === val ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ color: 'var(--text-muted)' }}>Chargement des rapports...</div> : (
        <>
          {/* KPI Cards */}
          <div className="dashboard-grid" style={{ marginBottom: '32px' }}>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--accent-green)' }}>
              <div className="title" style={{ display: 'flex', gap: '8px' }}><DollarSign size={18} color="var(--accent-green)" /> CA Période</div>
              <div className="amount green">{totalRevenue.toLocaleString()} FCFA</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>{filteredSales.length} ventes</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--primary)' }}>
              <div className="title" style={{ display: 'flex', gap: '8px' }}><TrendingUp size={18} color="var(--primary)" /> Bénéfice Net</div>
              <div className="amount" style={{ color: 'var(--primary)' }}>{totalMargin.toLocaleString()} FCFA</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Taux: {marginRate}%</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
              <div className="title">Ventes à Crédit</div>
              <div className="amount" style={{ color: 'var(--accent-orange)' }}>{creditSales}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>sur {filteredSales.length} ventes</div>
            </div>
            <div className="glass-panel" style={{ borderLeft: '4px solid var(--accent-red)' }}>
              <div className="title">Stock Bas ⚠️</div>
              <div className="amount red">{lowStockProducts.length}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>produits sous le seuil</div>
            </div>
          </div>

          {/* Graphique Ventes */}
          <div className="glass-panel" style={{ marginBottom: '24px' }}>
            <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <h2 className="title" style={{ margin: 0, display: 'flex', gap: '12px', alignItems: 'center' }}>
                <BarChart2 size={22} color="var(--primary)" /> Évolution du CA
              </h2>
              <div className="wrap-mobile" style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleExportSales('csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.82rem' }}>
                  <Download size={13}/> CSV
                </button>
                <button onClick={() => handleExportSales('excel')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: 'none', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  <Download size={13}/> Excel
                </button>
                <button onClick={() => handleExportSales('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '7px', border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  <Download size={13}/> PDF
                </button>
              </div>
            </div>
            {chartData.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>Aucune vente pour cette période.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [`${v.toLocaleString()} FCFA`, 'CA']}
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                  <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Valorisation Stock */}
            <div className="glass-panel" style={{ borderTop: '4px solid var(--accent-green)' }}>
              <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <h2 className="title" style={{ margin: 0, display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Package size={20} color="var(--accent-green)" /> Valorisation du Stock
                </h2>
                <div className="wrap-mobile" style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleExportStock('csv')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Download size={12}/> CSV
                  </button>
                  <button onClick={() => handleExportStock('excel')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '7px', border: 'none', background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <Download size={12}/> Excel
                  </button>
                  <button onClick={() => handleExportStock('pdf')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '7px', border: 'none', background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    <Download size={12}/> PDF
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Valeur d'achat</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>{totalStockValue.toLocaleString()} FCFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(79,70,229,0.1)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Valeur de vente potentielle</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{totalSaleValue.toLocaleString()} FCFA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(245,158,11,0.1)', borderRadius: '10px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Marge potentielle</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-orange)' }}>{(totalSaleValue - totalStockValue).toLocaleString()} FCFA</span>
                </div>
              </div>
              <h3 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem' }}>Top 5 Produits (par valeur)</h3>
              {topStockProducts.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 'bold', width: '20px' }}>#{i + 1}</span>
                    {p.name}
                  </span>
                  <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{p.stockValue.toLocaleString()} FCFA</span>
                </div>
              ))}
            </div>

            {/* Alertes Stock Bas */}
            <div className="glass-panel" style={{ borderTop: '4px solid var(--accent-red)' }}>
              <h2 className="title" style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Award size={20} color="var(--accent-red)" /> Alertes Stock Faible
              </h2>
              {lowStockProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-green)' }}>
                  ✅ Tous les stocks sont au-dessus du seuil minimum.
                </div>
              ) : lowStockProducts.map(p => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', marginBottom: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{p.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seuil min: {p.min_stock_threshold}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--accent-red)', fontSize: '1.2rem' }}>{p.stock_quantity}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>restants</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
