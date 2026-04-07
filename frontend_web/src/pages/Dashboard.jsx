import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, DownloadCloud,
  AlertTriangle, Package, ShoppingCart, ArrowUpRight,
  ArrowDownRight, Target, Clock, Users, Truck, Calendar,
  BarChart2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../api/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const getPeriodStart = (period) => {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0,0,0,0); return d; }
    case 'week':  { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
    case 'month': { return new Date(now.getFullYear(), now.getMonth(), 1); }
    case 'year':  { return new Date(now.getFullYear(), 0, 1); }
    default: return new Date(0);
  }
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({ title, value, icon: Icon, color, sub, trend, trendLabel }) {
  const isPositive = trend >= 0;
  return (
    <div style={{
      background: 'rgba(30,41,59,0.7)',
      backdropFilter: 'blur(12px)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.3s, box-shadow 0.3s',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Fond décoratif */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: color, opacity: 0.07 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ padding: '10px', borderRadius: '10px', background: `${color}20` }}>
          <Icon size={22} color={color} />
        </div>
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700',
            background: isPositive ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
            color: isPositive ? '#10b981' : '#ef4444'
          }}>
            {isPositive ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>{sub}</div>}
        {trendLabel && <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '4px' }}>{trendLabel}</div>}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, color='var(--primary)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <div style={{ padding: '8px', borderRadius: '10px', background: `${color}20` }}>
        <Icon size={18} color={color} />
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', margin: 0 }}>{title}</h2>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '8px' }}>{label}</p>
        {payload.map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
            <span style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: '600' }}>{fmt(p.value)} FCFA</span>
            <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Composant Principal ──────────────────────────────────────────────────────
export default function Dashboard() {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [goalInput, setGoalInput] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState(() => {
    const saved = localStorage.getItem('fintrade_monthly_goal');
    return saved ? parseFloat(saved) : 0;
  });
  const [editingGoal, setEditingGoal] = useState(false);
  const [summary, setSummary] = useState({
    total_revenues: 0, total_expenses: 0, net_result: 0, total_debts: 0, total_receivables: 0 
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, pRes, eRes, prodRes, recRes, dRes, sumRes] = await Promise.all([
        api.get('sales/?limit=1000'),
        api.get('purchases/?limit=1000'),
        api.get('expenses/?limit=1000'),
        api.get('products/?limit=1000'),
        api.get('receivables/?limit=1000'),
        api.get('debts/?limit=1000'),
        api.get('finance/summary/')
      ]);
      setSales(sRes.data.results ?? sRes.data);
      setPurchases(pRes.data.results ?? pRes.data);
      setExpenses(eRes.data.results ?? eRes.data);
      setProducts(prodRes.data.results ?? prodRes.data);
      setReceivables(recRes.data.results ?? recRes.data);
      setDebts(dRes.data.results ?? dRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveGoal = () => {
    const val = parseFloat(goalInput);
    if (!isNaN(val) && val > 0) {
      setMonthlyGoal(val);
      localStorage.setItem('fintrade_monthly_goal', val);
    }
    setEditingGoal(false);
    setGoalInput('');
  };

  // ─── Filtrage par période ────────────────────────────────────────────────────
  const filterByPeriod = useCallback((items, dateField = 'date') => {
    const start = getPeriodStart(period);
    return items.filter(i => new Date(i[dateField]) >= start);
  }, [period]);

  const filteredSales = filterByPeriod(sales);
  const filteredExpenses = filterByPeriod(expenses);
  const filteredPurchases = filterByPeriod(purchases);

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  // KPIs Globaux (Stats réelles du backend)
  const totalRevenue = summary.total_revenues;
  const totalExpenses = summary.total_expenses;
  const netProfit = summary.net_result;
  const totalReceivables = summary.total_receivables;
  const totalDebts = summary.total_debts;

  // Marge calculée localement pour le filtrage périodique
  const totalMargin = filteredSales.reduce((a, s) => a + parseFloat(s.total_margin || 0), 0);

  // Tendances (comparaison avec la période précédente de même durée)
  const getTrend = (current, allItems, dateField = 'date') => {
    const start = getPeriodStart(period);
    const duration = Date.now() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prev = allItems
      .filter(i => { const d = new Date(i[dateField]); return d >= prevStart && d < start; })
      .reduce((a, i) => a + parseFloat(i.total_amount || i.amount || 0), 0);
    if (prev === 0) return 0;
    return ((current - prev) / prev) * 100;
  };

  const revenueTrend = getTrend(totalRevenue, sales);
  const expTrend = getTrend(totalExpenses, expenses);

  // ─── Données Graphiques (Groupement intelligent) ───────────────────────────
  const chartData = (() => {
    const map = {};
    
    const getGroupKey = (dateString) => {
      const d = new Date(dateString);
      if (period === 'year') {
        const m = d.toLocaleDateString('fr-FR', { month: 'short' });
        return m.charAt(0).toUpperCase() + m.slice(1);
      } else if (period === 'today') {
        return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      } else {
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      }
    };

    const getSortValue = (dateString) => new Date(dateString).getTime();

    filteredSales.forEach(s => {
      const k = getGroupKey(s.date);
      if (!map[k]) map[k] = { label: k, Revenus: 0, Dépenses: 0, _sort: getSortValue(s.date) };
      map[k].Revenus += parseFloat(s.total_amount || 0);
    });
    filteredExpenses.forEach(e => {
      const k = getGroupKey(e.date);
      if (!map[k]) map[k] = { label: k, Revenus: 0, Dépenses: 0, _sort: getSortValue(e.date) };
      map[k].Dépenses += parseFloat(e.amount || 0);
    });
    filteredPurchases.forEach(p => {
      const k = getGroupKey(p.date);
      if (!map[k]) map[k] = { label: k, Revenus: 0, Dépenses: 0, _sort: getSortValue(p.date) };
      map[k].Dépenses += parseFloat(p.total_amount || 0);
    });
    
    return Object.values(map).sort((a, b) => a._sort - b._sort);
  })();

  // ─── Top 5 Produits ──────────────────────────────────────────────────────────
  const top5Products = (() => {
    const map = {};
    filteredSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const name = item.product_name || `Produit #${item.product}`;
        if (!map[name]) map[name] = { name, qty: 0, revenue: 0 };
        map[name].qty += item.quantity;
        map[name].revenue += item.quantity * parseFloat(item.unit_price || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  })();

  // ─── Dernières Transactions ──────────────────────────────────────────────────
  const recentTransactions = [
    ...filteredSales.map(s => ({ type: 'vente', amount: parseFloat(s.total_amount), date: s.date, label: s.customer_name || 'Client de passage', is_credit: s.is_credit })),
    ...filteredPurchases.map(p => ({ type: 'achat', amount: parseFloat(p.total_amount), date: p.date, label: p.supplier_name || 'Fournisseur', is_credit: p.is_credit })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

  // ─── Alertes Stock ───────────────────────────────────────────────────────────
  const criticalStock = products.filter(p => p.stock_quantity <= p.min_stock_threshold);

  // Créances & Dettes (KPI Cards) - Utilisation des valeurs summary
  const unpaidReceivables = receivables.filter(r => !r.is_paid);
  const unpaidDebts = debts.filter(d => !d.is_paid);

  // ─── Objectif mensuel ────────────────────────────────────────────────────────
  const currentMonthRevenue = (() => {
    const now = new Date();
    return sales
      .filter(s => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
      .reduce((a, s) => a + parseFloat(s.total_amount || 0), 0);
  })();
  const goalProgress = monthlyGoal > 0 ? Math.min((currentMonthRevenue / monthlyGoal) * 100, 100) : 0;

  // ─── Export PDF ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    const periodLabels = { today: "Aujourd'hui", week: 'Cette semaine', month: 'Ce mois', year: 'Cette année' };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Rapport Financier - Djago Gestion', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Période : ${periodLabels[period]} | Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 26);
    doc.setTextColor(40);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Indicateurs clés', 14, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Chiffre d'Affaires : ${fmt(totalRevenue)} FCFA`, 14, 44);
    doc.text(`Marge Brute       : ${fmt(totalMargin)} FCFA`, 14, 51);
    doc.text(`Total Depenses    : ${fmt(totalExpenses)} FCFA`, 14, 58);
    doc.text(`Benefice Net      : ${fmt(netProfit)} FCFA`, 14, 65);

    autoTable(doc, {
      head: [['Période', 'Revenus (FCFA)', 'Depenses (FCFA)']],
      body: chartData.map(d => [d.label, fmt(d.Revenus), fmt(d.Dépenses)]),
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save('DjagoGestion_Rapport_Comptable.pdf');
  };

  const periodButtons = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week',  label: '7 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year',  label: 'Cette année' },
  ];

  if (loading) return (
    <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
        <BarChart2 size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
        <p>Chargement du tableau de bord...</p>
      </div>
    </div>
  );

  return (
    <div className="main-content" style={{ maxWidth: '1400px' }}>

      {/* ── En-tête ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Tableau de Bord</h1>
          <p style={{ color: '#94a3b8', marginTop: '4px', fontSize: '0.9rem' }}>Vue d'ensemble en temps réel de votre activité</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filtre de Période */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', gap: '2px' }}>
            {periodButtons.map(pb => (
              <button key={pb.key} onClick={() => setPeriod(pb.key)} style={{
                padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', transition: 'all 0.2s',
                background: period === pb.key ? 'var(--primary)' : 'transparent',
                color: period === pb.key ? 'white' : '#94a3b8',
              }}>{pb.label}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={exportPDF} style={{ background: 'var(--accent-green)', gap: '8px' }}>
            <DownloadCloud size={18} /> Exporter PDF
          </button>
        </div>
      </div>

      {/* ── Alertes Stock Critique ── */}
      {criticalStock.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <AlertTriangle size={22} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: '700', color: '#ef4444', marginBottom: '6px' }}>⚠ Alerte : {criticalStock.length} produit(s) en stock critique</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {criticalStock.map(p => (
                <span key={p.id} style={{ padding: '3px 10px', borderRadius: '20px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontSize: '0.82rem', fontWeight: '600' }}>
                  {p.name} — {p.stock_quantity} restant(s)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <KpiCard title="Chiffre d'Affaires" value={`${fmt(totalRevenue)} FCFA`} icon={DollarSign} color="#4F46E5" trend={revenueTrend} trendLabel="vs période précédente" />
        <KpiCard title="Marge Brute" value={`${fmt(totalMargin)} FCFA`} icon={TrendingUp} color="#10b981" sub={totalRevenue > 0 ? `Taux: ${((totalMargin/totalRevenue)*100).toFixed(1)}%` : ''} />
        <KpiCard title="Total Dépenses" value={`${fmt(totalExpenses)} FCFA`} icon={TrendingDown} color="#ef4444" trend={expTrend} trendLabel="vs période précédente" />
        <KpiCard title="Bénéfice Net" value={`${fmt(netProfit)} FCFA`} icon={netProfit >= 0 ? ArrowUpRight : ArrowDownRight} color={netProfit >= 0 ? '#10b981' : '#ef4444'} sub="Marge − Dépenses" />
      </div>

      {/* ── Créances & Dettes ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16,185,129,0.12)' }}>
            <Users size={22} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Créances Clients</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{fmt(totalReceivables)} FCFA</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{unpaidReceivables.length} vente(s) à crédit impayée(s)</div>
          </div>
        </div>
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245,158,11,0.12)' }}>
            <Truck size={22} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>Dettes Fournisseurs</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#f59e0b' }}>{fmt(totalDebts)} FCFA</div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>{unpaidDebts.length} achat(s) à crédit non remboursé(s)</div>
          </div>
        </div>
      </div>

      {/* ── Graphiques Séparés ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        
        {/* Graphique Revenus */}
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <SectionTitle icon={TrendingUp} title="Évolution des Revenus" color="#4F46E5" />
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
              <TrendingUp size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>Aucune donnée pour cette période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              {period === 'year' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Revenus" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gRevenu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Revenus" stroke="#4F46E5" strokeWidth={2} fill="url(#gRevenu)" dot={{ r: 3, fill: '#4F46E5' }} activeDot={{ r: 6 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Graphique Dépenses */}
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <SectionTitle icon={TrendingDown} title="Évolution des Dépenses" color="#ef4444" />
          {chartData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#475569' }}>
              <TrendingDown size={40} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p>Aucune donnée pour cette période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              {period === 'year' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gDepense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 11 }} tickFormatter={v => `${fmt(v)}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Dépenses" stroke="#ef4444" strokeWidth={2} fill="url(#gDepense)" dot={{ r: 3, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Top 5 + Dernières Transactions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '28px' }}>

        {/* Top 5 Produits */}
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
          <SectionTitle icon={Package} title="Top 5 Produits les plus vendus" color="#10b981" />
          {top5Products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#475569', fontSize: '0.9rem' }}>Aucune vente sur cette période.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {top5Products.map((p, i) => {
                const maxRev = top5Products[0].revenue;
                const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
                const colors = ['#4F46E5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0' }}>
                        <span style={{ color: colors[i], marginRight: '8px', fontWeight: '800' }}>#{i+1}</span>{p.name}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{fmt(p.revenue)} FCFA</span>
                    </div>
                    <div style={{ height: '5px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: '10px', background: colors[i], transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dernières Transactions */}
        <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <SectionTitle icon={Clock} title="Dernières Transactions" color="#f59e0b" />
          {recentTransactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#475569', fontSize: '0.9rem' }}>Aucune transaction sur cette période.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '280px' }}>
              {recentTransactions.map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: tx.type === 'vente' ? 'rgba(79,70,229,0.15)' : 'rgba(245,158,11,0.15)' }}>
                      {tx.type === 'vente' ? <ShoppingCart size={14} color="#4F46E5" /> : <Truck size={14} color="#f59e0b" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#e2e8f0' }}>{tx.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {new Date(tx.date).toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                        {tx.is_credit && <span style={{ marginLeft: '6px', color: '#f59e0b' }}>• Crédit</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: '800', fontSize: '0.9rem', color: tx.type === 'vente' ? '#10b981' : '#ef4444' }}>
                    {tx.type === 'vente' ? '+' : '-'}{fmt(tx.amount)} FCFA
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Objectif Mensuel ── */}
      <div style={{ background: 'rgba(30,41,59,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <SectionTitle icon={Target} title="Objectif de Vente Mensuel" color="#ec4899" />
          <button onClick={() => setEditingGoal(true)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
            <Calendar size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            {monthlyGoal > 0 ? 'Modifier' : 'Définir objectif'}
          </button>
        </div>

        {editingGoal && (
          <div className="flex-col-mobile" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="number" placeholder="Objectif en FCFA (ex: 5000000)" value={goalInput} onChange={e => setGoalInput(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', fontSize: '0.9rem' }} />
            <button onClick={saveGoal} className="btn-primary w-full-mobile" style={{ background: '#ec4899', justifyContent: 'center' }}>Valider</button>
            <button onClick={() => setEditingGoal(false)} className="w-full-mobile" style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Annuler</button>
          </div>
        )}

        {monthlyGoal > 0 ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                <span style={{ color: '#f8fafc', fontWeight: '700' }}>{fmt(currentMonthRevenue)} FCFA</span> réalisés ce mois
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#ec4899' }}>{goalProgress.toFixed(1)}%</span>
            </div>
            <div style={{ height: '12px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '20px', transition: 'width 1s ease',
                width: `${goalProgress}%`,
                background: goalProgress >= 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : goalProgress >= 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ec4899, #f43f5e)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.78rem', color: '#475569' }}>
              <span>0 FCFA</span>
              <span style={{ color: goalProgress >= 100 ? '#10b981' : '#475569' }}>
                {goalProgress >= 100 ? '🎉 Objectif atteint !' : `Reste : ${fmt(monthlyGoal - currentMonthRevenue)} FCFA`}
              </span>
              <span>Objectif : {fmt(monthlyGoal)} FCFA</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: '#475569', fontSize: '0.9rem' }}>
            <Target size={32} style={{ marginBottom: '10px', opacity: 0.3 }} />
            <p>Aucun objectif défini. Cliquez sur "Définir objectif" pour vous fixer un cap mensuel.</p>
          </div>
        )}
      </div>

    </div>
  );
}
