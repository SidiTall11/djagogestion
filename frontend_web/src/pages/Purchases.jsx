import { useState, useEffect } from 'react';
import { ShoppingCart, Check, Search, Download, X, FileText, AlertTriangle, Plus, Minus, Package, User } from 'lucide-react';
import api from '../api/api';
import { exportToPDF } from '../utils/exportUtils';
import Pagination from '../components/Pagination';

export default function Purchases() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Modal sélection de quantité
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [selectedUnitPrice, setSelectedUnitPrice] = useState(0);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchProducts = async (p = page) => {
    try {
      const resp = await api.get(`products/?page=${p}&search=${searchTerm}`);
      setProducts(resp.data.results ?? resp.data);
      setTotalProducts(resp.data.count ?? resp.data.length);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchProducts(newPage);
  };

  const fetchSuppliers = async () => {
    try {
      const resp = await api.get('suppliers/?limit=100'); // On prend plus de fournisseurs pour la liste déroulante
      setSuppliers(resp.data.results ?? resp.data);
    } catch (error) {
      console.error(error);
    }
  };

  const openQtyModal = (product) => {
    setSelectedProduct(product);
    setSelectedQty(1);
    setSelectedUnitPrice(parseFloat(product.purchase_price));
  };

  const confirmAddToCart = () => {
    const qty = parseInt(selectedQty);
    if (qty <= 0) {
      alert("Quantité invalide.");
      return;
    }

    const existing = cart.find(item => item.product.id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.id === selectedProduct.id
          ? { ...item, quantity: existing.quantity + qty, unit_price: selectedUnitPrice }
          : item
      ));
    } else {
      setCart([...cart, { product: selectedProduct, quantity: qty, unit_price: selectedUnitPrice }]);
    }
    setSelectedProduct(null);
  };

  const updateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: newQty } : item));
    }
  };

  const submitPurchase = async () => {
    if (cart.length === 0) return;
    const items = cart.map(item => ({
      product: item.product.id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));
    try {
      const payload = {
        items,
        is_credit: isCredit,
        ...(selectedSupplier && { supplier: selectedSupplier })
      };
      await api.post('purchases/', payload);
      alert("Réapprovisionnement enregistré avec succès !");
      setCart([]);
      setSelectedSupplier('');
      setIsCredit(false);
      fetchProducts();
    } catch (error) {
      alert("Erreur lors de l'enregistrement de l'achat");
    }
  };

  const total = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);

  const handleExportPDF = () => {
    if (cart.length === 0) return;
    
    const data = cart.map(item => ({
      Produit: item.product.name,
      'Quantité': item.quantity,
      'Prix Achat (FCFA)': item.unit_price,
      'Sous-total': item.quantity * item.unit_price
    }));
    
    data.push({
      Produit: 'TOTAL GÉNÉRAL',
      'Quantité': '',
      'Prix Achat (FCFA)': '',
      'Sous-total': total
    });

    const supplierName = selectedSupplier 
      ? suppliers.find(s => s.id === parseInt(selectedSupplier))?.name 
      : 'Non spécifié';

    const infoCredit = isCredit ? ' (Achat à Crédit)' : ' (Payé Comptant)';
    const titrePDF = `Bon de Commande - Fournisseur: ${supplierName}${infoCredit}`;

    exportToPDF(data, `Bon_Commande_${Date.now()}`, titrePDF);
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="main-content">
      <div className="header">
        <h1>Ravitaillement & Achats</h1>
      </div>

      <div className="purchase-layout">
        {/* Grille produits */}
        <div style={{ flex: 2 }}>
          <div className="glass-panel">
            <div className="search-container" style={{ position: 'relative', marginBottom: '24px' }}>
              <Search size={20} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: '16px', color: 'var(--text-muted)' }} />
              <input 
                type="text" placeholder="Rechercher un produit à réapprovisionner..."
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none', fontSize: '1rem', transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-orange)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />
            </div>
            
            <div className="purchase-grid">
              {filteredProducts.map(product => {
                const isInCart = cart.find(i => i.product.id === product.id);
                const isLowStock = product.stock_quantity <= product.min_stock_threshold;
                
                return (
                  <div key={product.id}
                    onClick={() => openQtyModal(product)}
                    className={`purchase-card ${isInCart ? 'selected' : ''} ${isLowStock ? 'low-stock' : ''}`}
                  >
                    <div className="card-name">{product.name}</div>
                    <div className="card-price">{parseFloat(product.purchase_price).toLocaleString()} <span style={{fontSize: '0.8rem'}}>FCFA</span></div>
                    
                    <div className="card-stock" style={{ color: isLowStock ? 'var(--accent-orange)' : 'var(--text-muted)' }}>
                      {isLowStock ? <AlertTriangle size={14} /> : <Package size={14} />}
                      {isLowStock ? 'Stock critique: ' : 'Stock actuel: '}{product.stock_quantity}
                    </div>

                    {isInCart && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--accent-orange)', fontWeight: '700' }}>
                        <Check size={16} /> Commandé ({isInCart.quantity})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '32px' }}>
              <Pagination currentPage={page} totalCount={totalProducts} onPageChange={handlePageChange} />
            </div>
          </div>
        </div>

        {/* Bon de Commande (Receipt Panel) */}
        <div style={{ flex: 1, minWidth: '320px' }}>
          <div className="glass-panel receipt-panel">
            <div className="receipt-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(245,158,11,0.15)', borderRadius: '10px' }}>
                  <ShoppingCart size={24} color="var(--accent-orange)" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>Approvisionnement</h2>
              </div>
              {cart.length > 0 && (
                <button onClick={handleExportPDF} className="qty-btn" title="Exporter en PDF" style={{ width: 'auto', padding: '0 12px', gap: '6px', fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-red)', background: 'rgba(239,68,68,0.1)' }}>
                  <FileText size={16}/> PDF
                </button>
              )}
            </div>
            
            <div className="receipt-items">
              {cart.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <Package size={40} style={{ opacity: 0.2 }} />
                  <span>Panier vide</span>
                </div>
              ) : cart.map((item, index) => (
                <div key={index} className="receipt-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{item.product.name}</span>
                    <X size={18} style={{ cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.6 }} onClick={() => updateCartQty(item.product.id, 0)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="qty-controls" style={{ marginTop: 0 }}>
                      <button onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="qty-btn"><Minus size={14} /></button>
                      <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="qty-btn plus"><Plus size={14} /></button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', color: 'var(--accent-orange)' }}>{(item.quantity * item.unit_price).toLocaleString()} <span style={{fontSize: '0.7rem'}}>FCFA</span></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{parseFloat(item.unit_price).toLocaleString()} /u</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ borderTop: '2px dashed var(--glass-border)', paddingTop: '24px', marginTop: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                  <User size={14} /> Fournisseur (Optionnel)
                </label>
                <select 
                  value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}
                  className="modern-select"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', outline: 'none', fontSize: '0.9rem' }}
                >
                  <option value="" style={{color: 'black'}}>-- Sélectionner un fournisseur --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id} style={{color: 'black'}}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: isCredit ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', border: `1px solid ${isCredit ? 'rgba(239,68,68,0.2)' : 'transparent'}`, transition: 'all 0.3s' }}>
                <input 
                  type="checkbox" 
                  id="creditPurchaseCheck"
                  checked={isCredit} 
                  onChange={e => setIsCredit(e.target.checked)} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                />
                <label htmlFor="creditPurchaseCheck" style={{ cursor: 'pointer', userSelect: 'none', color: isCredit ? 'var(--accent-red)' : 'var(--text-main)', fontSize: '0.95rem', fontWeight: isCredit ? '700' : '500' }}>
                  Achat à Crédit (Génère une dette)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: '600' }}>Total Général</span>
                <span style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--accent-orange)' }}>{total.toLocaleString()} <span style={{fontSize: '1rem'}}>FCFA</span></span>
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', background: 'var(--accent-orange)', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700', boxShadow: '0 8px 16px -4px rgba(245,158,11,0.3)' }} onClick={submitPurchase} disabled={cart.length === 0}>
                <Check size={22} /> Enregistrer l'entrée
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Sélection Quantité */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedProduct(null)}>
          <div className="glass-panel modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(245,158,11,0.1)', borderRadius: '8px' }}>
                  <Package size={20} color="var(--accent-orange)" />
                </div>
                <h3 style={{ margin: 0, fontWeight: '800' }}>Détails de l'article</h3>
              </div>
              <X size={24} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setSelectedProduct(null)} />
            </div>
            
            <div style={{ marginBottom: '24px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <div style={{ fontWeight: '800', fontSize: '1.3rem', marginBottom: '8px' }}>{selectedProduct.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{width: '8px', height: '8px', borderRadius: '50%', background: selectedProduct.stock_quantity <= selectedProduct.min_stock_threshold ? 'var(--accent-orange)' : 'var(--accent-green)'}}></div>
                Stock actuel : <span style={{fontWeight: '700', color: 'var(--text-main)'}}>{selectedProduct.stock_quantity}</span>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600', fontSize: '0.9rem' }}>Quantité à approvisionner</label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '24px' }}>
                <button onClick={() => setSelectedQty(q => Math.max(1, q - 1))} className="qty-btn" style={{ width: '56px', height: '56px', borderRadius: '16px', fontSize: '1.5rem' }}><Minus size={24} /></button>
                <input type="number" min="1" value={selectedQty}
                  onChange={e => setSelectedQty(parseInt(e.target.value) || 1)}
                  style={{ width: '100px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'white', border: '2px solid var(--accent-orange)', borderRadius: '16px', padding: '12px', fontSize: '1.8rem', fontWeight: '800' }}
                />
                <button onClick={() => setSelectedQty(q => q + 1)} className="qty-btn plus" style={{ width: '56px', height: '56px', borderRadius: '16px', fontSize: '1.5rem' }}><Plus size={24} /></button>
              </div>

              <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600', fontSize: '0.9rem' }}>Prix d'achat unitaire (FCFA)</label>
              <input type="number" value={selectedUnitPrice}
                onChange={e => setSelectedUnitPrice(parseFloat(e.target.value) || 0)}
                style={{ width: '100%', padding: '16px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700', outline: 'none' }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-orange)'}
                onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
              />

              <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(245,158,11,0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.1)', color: 'var(--accent-orange)', fontWeight: '800', fontSize: '1.25rem', textAlign: 'center' }}>
                Sous-total : {(selectedQty * selectedUnitPrice).toLocaleString()} FCFA
              </div>
            </div>
            
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', background: 'var(--accent-orange)', borderRadius: '12px', fontSize: '1.1rem', fontWeight: '700' }} onClick={confirmAddToCart}>
              <ShoppingCart size={22} /> Ajouter à la commande
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
