import { useState, useEffect } from 'react';
import { Plus, Package, Edit, Trash2, X, Target, List, ArrowUpDown, FileText, Search } from 'lucide-react';
import api from '../api/api';
import { exportToPDF } from '../utils/exportUtils';
import Pagination from '../components/Pagination';

export default function Stock() {
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalCounts, setTotalCounts] = useState({ products: 0, movements: 0 });
  
  // States des Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  
  // Data States
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [adjustData, setAdjustData] = useState({ quantity_diff: 0, notes: 'Ajustement manuel' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (p = page) => {
    setLoading(true);
    try {
      const [prodRes, catRes, movRes] = await Promise.all([
        api.get(`products/?page=${p}&search=${searchTerm}`),
        api.get('categories/'),
        api.get(`stock-movements/?page=${p}`)
      ]);
      setProducts(prodRes.data.results ?? prodRes.data);
      setCategories(catRes.data.results ?? catRes.data);
      setMovements(movRes.data.results ?? movRes.data);
      setTotalCounts({
        products: prodRes.data.count ?? prodRes.data.length,
        movements: movRes.data.count ?? movRes.data.length,
      });
    } catch (error) {
      console.error("Erreur de récupération", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchData(newPage);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', currentProduct.name);
      formData.append('category', currentProduct.category);
      formData.append('purchase_price', currentProduct.purchase_price);
      formData.append('sale_price', currentProduct.sale_price);
      formData.append('min_stock_threshold', currentProduct.min_stock_threshold);
      
      if (currentProduct.image instanceof File) {
        formData.append('image', currentProduct.image);
      }

      if (currentProduct.id) {
        await api.patch(`products/${currentProduct.id}/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('products/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      fetchData();
      setShowProductModal(false);
    } catch (error) {
      alert("Erreur lors de la sauvegarde du produit.");
    }
  };

  const handleDeleteProduct = async (id) => {
    if(window.confirm("Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.")) {
      try {
        await api.delete(`products/${id}/`);
        fetchData();
      } catch (e) { alert("Erreur suppression."); }
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await api.post(`products/${currentProduct.id}/adjust_stock/`, adjustData);
      fetchData();
      setShowAdjustModal(false);
    } catch (error) {
      alert("Erreur lors de l'ajustement du stock.");
    }
  };

  const openProductModal = (product = null) => {
    if (product) {
      setCurrentProduct(product);
    } else {
      setCurrentProduct({ name: '', category: categories.length > 0 ? categories[0].id : '', purchase_price: 0, sale_price: 0, min_stock_threshold: 5 });
    }
    setShowProductModal(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (currentCategory.id) {
        await api.put(`categories/${currentCategory.id}/`, currentCategory);
      } else {
        await api.post('categories/', currentCategory);
      }
      fetchData();
      setShowCategoryModal(false);
    } catch (error) {
      alert("Erreur sauvegarde catégorie.");
    }
  };

  const handleDeleteCategory = async (id) => {
    if(window.confirm("Voulez-vous vraiment supprimer cette catégorie ? Assurez-vous qu'elle est vide.")) {
      try {
        await api.delete(`categories/${id}/`);
        fetchData();
      } catch (e) {
        alert("Impossible de supprimer : Des produits y sont probablement rattachés.");
      }
    }
  };

  const openCategoryModal = (cat = null) => {
    if (cat) setCurrentCategory(cat);
    else setCurrentCategory({ name: '', description: '' });
    setShowCategoryModal(true);
  };

  const handleExportStockPDF = () => {
    if (products.length === 0) return;
    const data = products.map(p => {
      const catObj = categories.find(c => c.id === p.category);
      return {
        'Nom du Produit': p.name,
        'Catégorie': catObj ? catObj.name : '-',
        'Prix Achat (FCFA)': p.purchase_price,
        'Prix Vente (FCFA)': p.sale_price,
        'En Stock': p.stock_quantity
      };
    });
    exportToPDF(data, `Inventaire_${Date.now()}`, 'État de l\'Inventaire du Stock');
  };

  return (
    <div className="main-content">
      <div className="header">
        <h1>Gestion du Stock & Inventaire</h1>
        
        <div className="wrap-mobile" style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px', overflowX: 'auto' }}>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'products' ? 'var(--primary)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setActiveTab('products')}
          >
            <Package size={16} style={{display: 'inline', marginRight: '8px'}} /> Produits
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'categories' ? 'var(--accent-orange)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setActiveTab('categories')}
          >
            <List size={16} style={{display: 'inline', marginRight: '8px'}} /> Catégories
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: activeTab === 'movements' ? 'var(--accent-green)' : 'transparent', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setActiveTab('movements')}
          >
            <ArrowUpDown size={16} style={{display: 'inline', marginRight: '8px'}} /> Mouvements
          </button>
        </div>
      </div>

      {/* ----------- TAB: PRODUITS ----------- */}
      {activeTab === 'products' && (
        <div className="glass-panel">
          <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div className="flex-col-mobile w-full-mobile" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <h2 className="title" style={{ margin: 0 }}>Catalogue Produits</h2>
              <div className="w-full-mobile" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full-mobile" style={{ width: '260px', padding: '8px 12px 8px 34px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--glass-border)', color: 'white', outline: 'none', fontSize: '0.9rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary desktop-only" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: 'none' }} onClick={handleExportStockPDF}>
                <FileText size={18} /> Export PDF
              </button>
              <button className="btn-primary" onClick={() => openProductModal()}>
                <Plus size={20} /> Ajouter
              </button>
            </div>
          </div>
          
          <div className="table-responsive">
            {loading ? <div style={{padding: '20px', textAlign: 'center'}}>Chargement...</div> : (
              <>
                <table className="desktop-only">
                  <thead>
                    <tr>
                      <th>Image</th><th>Nom</th><th>Catégorie</th><th>Prix Vente</th><th>Stock</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => {
                      const catName = categories.find(c => c.id === p.category)?.name || '';
                      const q = searchTerm.toLowerCase();
                      return p.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                    }).map((product) => {
                      const catObj = categories.find(c => c.id === product.category);
                      return (
                        <tr key={product.id}>
                          <td>
                            {product.image ? (
                              <img src={product.image} alt={product.name} style={{width:'40px', height:'40px', borderRadius:'8px', objectFit:'cover', border:'1px solid var(--glass-border)'}} />
                            ) : (
                              <div style={{width:'40px', height:'40px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.7rem', color:'var(--text-muted)'}}>Pas d'img</div>
                            )}
                          </td>
                          <td>{product.name}</td>
                          <td>{catObj ? catObj.name : '-'}</td>
                          <td>{product.sale_price} FCFA</td>
                          <td>
                            <span style={{ 
                              padding: '4px 8px', borderRadius: '8px',
                              background: product.stock_quantity <= product.min_stock_threshold ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: product.stock_quantity <= product.min_stock_threshold ? 'var(--accent-red)' : 'var(--accent-green)'
                            }}>
                              {product.stock_quantity}
                            </span>
                          </td>
                          <td style={{ display: 'flex', gap: '16px' }}>
                            <Target size={18} color="var(--primary)" style={{ cursor: 'pointer' }} onClick={() => { setCurrentProduct(product); setShowAdjustModal(true); }} />
                            <Edit size={18} color="var(--accent-orange)" style={{ cursor: 'pointer' }} onClick={() => openProductModal(product)} />
                            <Trash2 size={18} color="var(--accent-red)" style={{ cursor: 'pointer' }} onClick={() => handleDeleteProduct(product.id)} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mobile-only">
                  {products.filter(p => {
                    const catName = categories.find(c => c.id === p.category)?.name || '';
                    const q = searchTerm.toLowerCase();
                    return p.name.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                  }).map((product) => {
                    const catObj = categories.find(c => c.id === product.category);
                    const isLowStock = product.stock_quantity <= product.min_stock_threshold;
                    return (
                      <div key={product.id} className="mobile-card">
                        <div className="card-header">
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{width:'40px', height:'40px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid var(--glass-border)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                               {product.image ? <img src={product.image} style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'8px'}} /> : '📦'}
                            </div>
                            <div>
                                <div className="card-title">{product.name}</div>
                                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{catObj?.name || 'Sans catégorie'}</div>
                            </div>
                          </div>
                          <div style={{ color: isLowStock ? 'var(--accent-red)' : 'var(--accent-green)', fontWeight:'bold' }}>Stock: {product.stock_quantity}</div>
                        </div>
                        <div className="card-detail">
                           <span className="label">Prix Vente</span>
                           <span className="value">{product.sale_price} FCFA</span>
                        </div>
                        <div className="card-actions">
                           <button className="btn-primary" onClick={() => { setCurrentProduct(product); setShowAdjustModal(true); }} style={{flex:1, fontSize:'0.85rem', padding:'10px'}}><Target size={14}/> Stock</button>
                           <button className="btn-primary" onClick={() => openProductModal(product)} style={{flex:1, fontSize:'0.85rem', padding:'10px', background:'var(--accent-orange)'}}><Edit size={14}/> Éditer</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <Pagination currentPage={page} totalCount={totalCounts.products} onPageChange={handlePageChange} />
          </div>
        </div>
      )}

      {/* ----------- TAB: CATÉGORIES ----------- */}
      {activeTab === 'categories' && (
        <div className="glass-panel" style={{ borderTop: '4px solid var(--accent-orange)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="title" style={{ margin: 0 }}>Catégories</h2>
            <button className="btn-primary" style={{ background: 'var(--accent-orange)' }} onClick={() => openCategoryModal()}>
              <Plus size={20} /> Ajouter
            </button>
          </div>
          
          <div className="table-responsive">
            {loading ? <div style={{padding: '20px', textAlign: 'center'}}>Chargement...</div> : (
              <>
                <table className="desktop-only">
                  <thead>
                    <tr><th>Nom</th><th>Description</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id}>
                        <td>{cat.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                        <td style={{ display: 'flex', gap: '16px' }}>
                          <Edit size={18} color="white" style={{ cursor: 'pointer' }} onClick={() => openCategoryModal(cat)} />
                          <Trash2 size={18} color="var(--accent-red)" style={{ cursor: 'pointer' }} onClick={() => handleDeleteCategory(cat.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mobile-only">
                  {categories.map((cat) => (
                    <div key={cat.id} className="mobile-card">
                       <div className="card-header">
                         <div className="card-title">{cat.name}</div>
                         <div style={{display:'flex', gap:'12px'}}>
                            <Edit size={18} onClick={() => openCategoryModal(cat)} style={{color:'var(--accent-orange)'}}/>
                            <Trash2 size={18} onClick={() => handleDeleteCategory(cat.id)} style={{color:'var(--accent-red)'}}/>
                         </div>
                       </div>
                       <div className="card-detail">
                         <span className="label">Description</span>
                         <span className="value">{cat.description || '-'}</span>
                       </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ----------- TAB: MOUVEMENTS ----------- */}
      {activeTab === 'movements' && (
        <div className="glass-panel" style={{ borderTop: '4px solid var(--accent-green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="title" style={{ margin: 0 }}>Mouvements</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{movements.length} enregistrés</div>
          </div>
          
          <div className="table-responsive">
            {loading ? <div style={{padding: '20px', textAlign: 'center'}}>Chargement...</div> : (
              <>
                <table className="desktop-only">
                  <thead>
                    <tr><th>Type</th><th>Produit</th><th>Qté</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {movements.map((mv) => (
                      <tr key={mv.id}>
                        <td>{mv.movement_type === 'IN' ? '▲ Entrée' : mv.movement_type === 'OUT' ? '▼ Sortie' : '⚖ Ajustement'}</td>
                        <td>{mv.product_name || mv.product}</td>
                        <td>{mv.quantity}</td>
                        <td>{new Date(mv.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mobile-only">
                  {movements.map((mv) => (
                    <div key={mv.id} className="mobile-card" style={{borderLeft:`4px solid ${mv.movement_type==='IN'?'var(--accent-green)':'var(--accent-red)'}`}}>
                      <div className="card-header">
                         <div className="card-title">{mv.product_name || mv.product}</div>
                         <div style={{fontWeight:'bold'}}>{mv.quantity}</div>
                      </div>
                      <div className="card-detail">
                        <span className="label">Type</span>
                        <span className="value">{mv.movement_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Pagination currentPage={page} totalCount={totalCounts.movements} onPageChange={handlePageChange} />
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {showProductModal && currentProduct && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth:'500px', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2>Produit</h2>
              <X cursor="pointer" onClick={() => setShowProductModal(false)}/>
            </div>
            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" placeholder="Nom" required value={currentProduct.name} onChange={e => setCurrentProduct({...currentProduct, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
              <select required value={currentProduct.category} onChange={e => setCurrentProduct({...currentProduct, category: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid var(--glass-border)' }}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <input type="number" required placeholder="Prix Achat" value={currentProduct.purchase_price} onChange={e => setCurrentProduct({...currentProduct, purchase_price: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
                <input type="number" required placeholder="Prix Vente" value={currentProduct.sale_price} onChange={e => setCurrentProduct({...currentProduct, sale_price: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
              </div>
              <input type="file" onChange={e => setCurrentProduct({...currentProduct, image: e.target.files[0]})} />
              <button className="btn-primary" type="submit">Sauvegarder</button>
            </form>
          </div>
        </div>
      )}

      {showCategoryModal && currentCategory && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth:'400px', border: '1px solid var(--accent-orange)' }}>
            <X cursor="pointer" onClick={() => setShowCategoryModal(false)}/>
            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop:'10px' }}>
              <input type="text" placeholder="Nom" required value={currentCategory.name} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
              <button className="btn-primary" type="submit" style={{ background: 'var(--accent-orange)' }}>Sauvegarder</button>
            </form>
          </div>
        </div>
      )}

      {showAdjustModal && currentProduct && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth:'400px', border: '2px solid var(--accent-green)' }}>
            <X cursor="pointer" onClick={() => setShowAdjustModal(false)}/>
            <h3 style={{marginTop:'10px'}}>Ajuster : {currentProduct.name}</h3>
            <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop:'10px' }}>
              <input type="number" required value={adjustData.quantity_diff} onChange={e => setAdjustData({...adjustData, quantity_diff: parseInt(e.target.value)})} style={{ padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none' }} />
              <button className="btn-primary" type="submit" style={{ background: 'var(--accent-green)' }}>Confirmer</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
