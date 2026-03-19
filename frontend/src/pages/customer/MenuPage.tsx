import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useCartStore } from '../../stores/cartStore';

interface MenuItem { id: string; name: string; description: string; price: number; is_veg: number; image_url: string; category_id: string; }
interface Category { id: string; name: string; }

export default function CustomerMenuPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const { items: cartItems, addItem, removeItem, updateQuantity, clearCart, total } = useCartStore();

  const session = (() => { try { return JSON.parse(localStorage.getItem('tf_session') || '{}'); } catch { return {}; } })();

  const fetchMenu = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedCat) params.categoryId = selectedCat;
      if (vegOnly) params.veg = 'true';
      if (search) params.search = search;
      const { data } = await api.get(`/menu/public/${tenantSlug}`, { params });
      setCategories(data.categories);
      setItems(data.items);
    } catch { toast.error('Failed to load menu'); }
    finally { setLoading(false); }
  }, [tenantSlug, selectedCat, vegOnly, search]);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const handleOrder = async () => {
    if (cartItems.length === 0) { toast.error('Add items first'); return; }
    setOrdering(true);
    try {
      await api.post('/orders/customer', {
        items: cartItems.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
      }, { headers: { 'x-session-token': session.sessionToken } });
      toast.success('Order placed! 🎉');
      clearCart();
      setShowCart(false);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Order failed');
    } finally { setOrdering(false); }
  };

  const cartQty = (id: string) => cartItems.find(i => i.menuItemId === id)?.quantity || 0;

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>🍽️ Menu</h1>
          <button className="btn btn-primary" onClick={() => setShowCart(!showCart)} style={{ position: 'relative' }}>
            🛒 Cart {cartItems.length > 0 && <span style={{ background: 'white', color: 'var(--accent)', borderRadius: '50%', padding: '0 6px', fontSize: 11, fontWeight: 700, marginLeft: 4 }}>{cartItems.reduce((s, i) => s + i.quantity, 0)}</span>}
          </button>
        </div>
        <input className="input" placeholder="🔍 Search dishes..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginTop: 12 }} />
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Categories sidebar */}
        <div style={{ width: 120, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-secondary)', padding: '12px 0' }}>
          <div onClick={() => setSelectedCat('')} style={{ padding: '10px 16px', cursor: 'pointer', background: !selectedCat ? 'var(--accent-muted)' : 'transparent', color: !selectedCat ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: !selectedCat ? 600 : 400, fontSize: 13 }}>All</div>
          {categories.map(c => (
            <div key={c.id} onClick={() => setSelectedCat(c.id)} style={{ padding: '10px 16px', cursor: 'pointer', background: selectedCat === c.id ? 'var(--accent-muted)' : 'transparent', color: selectedCat === c.id ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: selectedCat === c.id ? 600 : 400, fontSize: 13 }}>{c.name}</div>
          ))}
        </div>

        {/* Items grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} /> 🌱 Veg Only
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {items.map(item => {
              const qty = cartQty(item.id);
              return (
                <div key={item.id} className="card" style={{ padding: 16, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 11 }}>{item.is_veg ? '🟢' : '🔴'}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.name}</h3>
                  {item.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>{item.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 16 }}>₹{item.price}</span>
                    {qty === 0 ? (
                      <button className="btn btn-primary btn-sm" onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price, quantity: 1, isVeg: !!item.is_veg })}>+ Add</button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => updateQuantity(item.id, qty - 1)}>−</button>
                        <span style={{ fontWeight: 700 }}>{qty}</span>
                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => addItem({ menuItemId: item.id, name: item.name, price: item.price, quantity: 1, isVeg: !!item.is_veg })}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {items.length === 0 && <div className="empty-state"><span className="empty-icon">🍽️</span><p>No items found</p></div>}
        </div>
      </div>

      {/* Cart Overlay */}
      {showCart && (
        <div className="modal-overlay" onClick={() => setShowCart(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">🛒 Your Cart</h2>
            {cartItems.length === 0 ? <div className="empty-state" style={{ height: 100 }}><p>Cart is empty</p></div> : (
              <>
                <div className="modal-body">
                  {cartItems.map(item => (
                    <div key={item.menuItemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>₹{item.price} × {item.quantity}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}>−</button>
                        <span>{item.quantity}</span>
                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}>+</button>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeItem(item.menuItemId)}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginTop: 8 }}>
                    <span>Total</span><span style={{ color: 'var(--accent)' }}>₹{total().toFixed(2)}</span>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setShowCart(false)}>Continue Shopping</button>
                  <button className="btn btn-primary" onClick={handleOrder} disabled={ordering}>
                    {ordering ? <><span className="spinner" />Placing...</> : '✅ Place Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
