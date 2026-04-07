import { useState, useEffect, useContext } from 'react';
import { ShoppingCart, Plus, Check, Search, X, Users, CreditCard, FileText, Printer } from 'lucide-react';
import api from '../api/api';
import { exportToPDF } from '../utils/exportUtils';
import { printThermalReceipt } from '../utils/receiptUtils';
import { AuthContext } from '../App';
import Pagination from '../components/Pagination';

export default function NewSale() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const { user } = useContext(AuthContext);

  // État pour la modale de succès après la vente
  const [lastSale, setLastSale] = useState(null);

  // Modal quantité
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);

  // Historique
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' ou 'history'
  const [salesHistory, setSalesHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (p = page) => {
    try {
      const [prodRes, custRes] = await Promise.all([
        api.get(`products/?page=${p}&search=${searchTerm}`),
        api.get('customers/')
      ]);
      setProducts(prodRes.data.results ?? prodRes.data);
      setCustomers(custRes.data.results ?? custRes.data);
      setTotalProducts(prodRes.data.count ?? prodRes.data.length);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchHistory = async (p = historyPage) => {
    try {
      const res = await api.get(`sales/?page=${p}`);
      setSalesHistory(res.data.results ?? res.data);
      setTotalSales(res.data.count ?? res.data.length);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const openQtyModal = (product) => {
    if (product.stock_quantity <= 0) { alert("Stock insuffisant !"); return; }
    setSelectedProduct(product);
    setSelectedQty(1);
  };

  const confirmAddToCart = () => {
    const qty = parseInt(selectedQty);
    if (qty <= 0 || qty > selectedProduct.stock_quantity) {
      alert(`Quantité invalide. Stock disponible : ${selectedProduct.stock_quantity}`);
      return;
    }
    const existing = cart.find(i => i.product.id === selectedProduct.id);
    if (existing) {
      const newQty = existing.quantity + qty;
      if (newQty > selectedProduct.stock_quantity) { alert(`Stock insuffisant`); return; }
      setCart(cart.map(i => i.product.id === selectedProduct.id ? { ...i, quantity: newQty } : i));
    } else {
      setCart([...cart, { product: selectedProduct, quantity: qty, unit_price: selectedProduct.sale_price }]);
    }
    setSelectedProduct(null);
  };

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) setCart(cart.filter(i => i.product.id !== productId));
    else setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
  };

  const submitSale = async () => {
    if (cart.length === 0) return;
    if (isCredit && !selectedCustomer) { alert("Veuillez sélectionner un client pour une vente à crédit."); return; }

    const items = cart.map(item => ({
      product: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    try {
      const res = await api.post('sales/', {
        items,
        is_credit: isCredit,
        customer: selectedCustomer || null
      });
      
      // Stocker les infos de la vente pour l'impression avant de vider le panier
      setLastSale({
        id: res.data?.id || Math.floor(Math.random() * 10000),
        cart: [...cart],
        total: total,
        isCredit: isCredit,
        customerName: selectedCustomer ? customers.find(c => c.id === parseInt(selectedCustomer))?.name : 'Client de passage'
      });

      setCart([]);
      setIsCredit(false);
      setSelectedCustomer('');
      fetchData();
    } catch (error) {
      alert("Erreur lors de l'enregistrement de la vente");
      console.error(error);
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  const handleExportA4 = () => {
    if (!lastSale) return;
    const data = lastSale.cart.map(item => ({
      'Désignation': item.product.name,
      'Quantité': item.quantity,
      'Prix Unitaire': `${item.unit_price} FCFA`,
      'Total': `${item.quantity * item.unit_price} FCFA`
    }));
    
    data.push({
      'Désignation': '--- TOTAL GÉNÉRAL ---',
      'Quantité': '',
      'Prix Unitaire': '',
      'Total': `${lastSale.total} FCFA`
    });

    const info = lastSale.isCredit ? ' (CRÉDIT)' : ' (COMPTANT)';
    exportToPDF(data, `Facture_${lastSale.id}`, `FACTURE N° ${lastSale.id} - ${lastSale.customerName}${info}`);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="main-content">
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Point de Vente</h1>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px' }}>
          <button 
            onClick={() => setActiveTab('pos')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: activeTab === 'pos' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Nouveau Ticket
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            style={{ padding: '8px 16px', border: 'none', borderRadius: '8px', background: activeTab === 'history' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>
            Historique
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="flex-col-mobile" style={{ display: 'flex', gap: '24px' }}>
          {/* Grille produits */}
          <div style={{ flex: 2 }}>
            <div className="glass-panel">
              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <Search size={20} style={{ position: 'absolute', top: '12px', left: '14px', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Rechercher un produit..." value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 42px', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                {filteredProducts.map(product => (
                  <div key={product.id} onClick={() => openQtyModal(product)}
                    style={{
                      padding: '16px', borderRadius: '12px', cursor: product.stock_quantity > 0 ? 'pointer' : 'not-allowed',
                      background: 'rgba(255,255,255,0.04)', opacity: product.stock_quantity <= 0 ? 0.5 : 1,
                      border: cart.find(i => i.product.id === product.id) ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                      transition: 'all 0.2s', userSelect: 'none'
                    }}
                    onMouseEnter={e => { if (product.stock_quantity > 0) e.currentTarget.style.background = 'rgba(79,70,229,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>
                    <div style={{ fontWeight: '600', marginBottom: '8px' }}>{product.name}</div>
                    <div style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '6px' }}>{parseFloat(product.sale_price).toLocaleString()} FCFA</div>
                    <div style={{ fontSize: '0.8rem', color: product.stock_quantity <= 0 ? 'var(--accent-red)' : product.stock_quantity <= product.min_stock_threshold ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                      Stock: {product.stock_quantity}
                    </div>
                    {cart.find(i => i.product.id === product.id) && (
                      <div style={{ marginTop: '6px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold' }}>
                        ✓ Dans panier ({cart.find(i => i.product.id === product.id).quantity})
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Pagination currentPage={page} totalCount={totalProducts} onPageChange={handlePageChange} />
            </div>
          </div>

          {/* Panier + Options */}
          <div className="w-full-mobile" style={{ flex: 1, minWidth: '300px' }}>
            <div className="glass-panel" style={{ position: 'sticky', top: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ShoppingCart size={24} color="var(--primary)" />
                  <h2 className="title" style={{ margin: 0 }}>Panier ({cart.reduce((a, i) => a + i.quantity, 0)} art.)</h2>
                </div>
              </div>

              {/* Options Vente */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: isCredit ? '1px solid var(--accent-orange)' : '1px solid transparent' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: isCredit ? '16px' : '0' }}>
                  <input type="checkbox" checked={isCredit} onChange={e => { setIsCredit(e.target.checked); if (!e.target.checked) setSelectedCustomer(''); }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-orange)' }} />
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: isCredit ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                    <CreditCard size={16} /> Vente à crédit
                  </span>
                </label>
                {isCredit && (
                  <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid var(--accent-orange)', marginTop: '8px' }}>
                    <option value="">-- Sélectionner un client --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {!isCredit && customers.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
                      <option value="">Client optionnel</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Liste Panier */}
              <div style={{ minHeight: '150px', maxHeight: '300px', overflowY: 'auto' }}>
                {cart.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>Cliquez sur un produit pour l'ajouter</div>
                ) : cart.map((item, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.product.name}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-green)', fontSize: '0.9rem' }}>{(item.quantity * item.unit_price).toLocaleString()} FCFA</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>-</button>
                      <input type="number" min="1" value={item.quantity} onChange={e => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                        style={{ width: '44px', textAlign: 'center', background: 'transparent', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '4px', padding: '2px' }} />
                      <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} style={{ background: 'rgba(79,70,229,0.2)', border: 'none', color: 'white', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>+</button>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{parseFloat(item.unit_price).toLocaleString()}/u</span>
                      <X size={14} style={{ cursor: 'pointer', marginLeft: 'auto', color: 'var(--accent-red)' }} onClick={() => updateCartQty(item.product.id, 0)} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <span>Total</span>
                  <span style={{ color: isCredit ? 'var(--accent-orange)' : 'var(--accent-green)' }}>{total.toLocaleString()} FCFA</span>
                </div>
                {isCredit && (
                  <div style={{ marginBottom: '12px', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.85rem', color: 'var(--accent-orange)' }}>
                    💳 Une créance de {total.toLocaleString()} FCFA sera créée automatiquement.
                  </div>
                )}
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', background: isCredit ? 'var(--accent-orange)' : undefined }}
                  onClick={submitSale} disabled={cart.length === 0}>
                  <Check size={20} /> {isCredit ? 'Valider Vente à Crédit' : 'Valider la Vente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Montant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map(sale => (
                  <tr key={sale.id}>
                    <td>#{sale.id}</td>
                    <td>{new Date(sale.created_at).toLocaleString('fr-FR')}</td>
                    <td>{sale.customer_name || 'Client de passage'}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                        background: sale.is_credit ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: sale.is_credit ? 'var(--accent-orange)' : 'var(--accent-green)'
                      }}>
                        {sale.is_credit ? 'Crédit' : 'Comptant'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{parseFloat(sale.total_amount).toLocaleString()} FCFA</td>
                    <td>
                      <button 
                        onClick={() => printThermalReceipt(user?.enterprise, {
                          id: sale.id,
                          total: sale.total_amount,
                          isCredit: sale.is_credit,
                          customerName: sale.customer_name
                        }, sale.items)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Printer size={14} /> Réimprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination 
            currentPage={historyPage} 
            totalCount={totalSales} 
            onPageChange={(p) => { setHistoryPage(p); fetchHistory(p); }} 
          />
        </div>
      )}

      {/* Modal Quantité */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 200 }}>
          <div className="glass-panel" style={{ width: '360px', border: '2px solid var(--primary)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Ajouter au Panier</h3>
              <X size={20} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedProduct(null)} />
            </div>
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '6px' }}>{selectedProduct.name}</div>
              <div style={{ color: 'var(--primary)', fontSize: '1.3rem', fontWeight: 'bold' }}>{parseFloat(selectedProduct.sale_price).toLocaleString()} FCFA</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>Stock dispo: {selectedProduct.stock_quantity}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '16px' }}>
              <button onClick={() => setSelectedQty(q => Math.max(1, q - 1))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '10px', width: '44px', height: '44px', fontSize: '1.4rem', cursor: 'pointer' }}>-</button>
              <input type="number" min="1" max={selectedProduct.stock_quantity} value={selectedQty}
                onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', border: '2px solid var(--primary)', borderRadius: '10px', padding: '8px', fontSize: '1.4rem', fontWeight: 'bold' }} />
              <button onClick={() => setSelectedQty(q => Math.min(selectedProduct.stock_quantity, q + 1))} style={{ background: 'rgba(79,70,229,0.3)', border: 'none', color: 'white', borderRadius: '10px', width: '44px', height: '44px', fontSize: '1.4rem', cursor: 'pointer' }}>+</button>
            </div>
            <div style={{ color: 'var(--accent-green)', fontWeight: '600', marginBottom: '16px' }}>
              Sous-total: {(selectedQty * parseFloat(selectedProduct.sale_price)).toLocaleString()} FCFA
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={confirmAddToCart}>
              <ShoppingCart size={18} /> Ajouter au Panier
            </button>
          </div>
        </div>
      )}

      {/* Modal Succès / Imprimer Ticket */}
      {lastSale && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', border: '2px solid var(--accent-green)', textAlign: 'center', padding: '32px' }}>
            <div style={{ width: '72px', height: '72px', background: 'rgba(16,185,129,0.2)', color: 'var(--accent-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>
              <Check size={40} />
            </div>
            <h2 style={{ margin: '0 0 10px', color: 'var(--accent-green)', fontSize: '1.8rem' }}>Vente Enregistrée !</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1rem' }}>La transaction #<strong>{lastSale.id}</strong> a été validée avec succès.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <button 
                onClick={() => printThermalReceipt(user?.enterprise, lastSale, lastSale.cart)}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '16px', fontSize: '1.1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                <Printer size={22} /> Imprimer Ticket (Caisse)
              </button>

              <button 
                onClick={handleExportA4}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '16px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                <FileText size={22} /> Télécharger Facture (A4)
              </button>
              
              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '10px 0' }}></div>

              <button 
                onClick={() => setLastSale(null)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                Nouvelle Vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
