import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface Category { id: string; name: string; description: string; is_active: number; }
interface Item { id: string; name: string; price: number; is_veg: number; is_available: number; category_id: string; description: string; }

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<'items' | 'categories'>('items');
  const [showModal, setShowModal] = useState<'item' | 'cat' | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [c, i] = await Promise.all([api.get('/menu/categories'), api.get('/menu/items')]);
    setCategories(c.data); setItems(i.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveItem = async () => {
    setSaving(true);
    try {
      if (form.id) await api.put(`/menu/items/${form.id}`, form);
      else await api.post('/menu/items', form);
      toast.success('Saved!'); setShowModal(null); setForm({}); load();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const saveCat = async () => {
    setSaving(true);
    try {
      if (form.id) await api.put(`/menu/categories/${form.id}`, form);
      else await api.post('/menu/categories', form);
      toast.success('Saved!'); setShowModal(null); setForm({}); load();
    } catch { toast.error('Save failed'); } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Delete this item?')) return;
    await api.delete(`/menu/items/${id}`); toast.success('Deleted'); load();
  };
  const deleteCat = async (id: string) => {
    if (!window.confirm('Delete this category?')) return;
    await api.delete(`/menu/categories/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Menu</h1>
          <p className="page-subtitle">Manage your menu items and categories</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm({ is_veg: true, is_available: true }); setShowModal(tab === 'items' ? 'item' : 'cat'); }}>
          + Add {tab === 'items' ? 'Item' : 'Category'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button className={`btn ${tab === 'items' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('items')}>🍱 Items ({items.length})</button>
        <button className={`btn ${tab === 'categories' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('categories')}>📂 Categories ({categories.length})</button>
      </div>

      {tab === 'items' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{categories.find(c => c.id === item.category_id)?.name || '—'}</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>₹{item.price}</td>
                    <td><span className={`badge ${item.is_veg ? 'badge-green' : 'badge-red'}`}>{item.is_veg ? 'Veg' : 'Non-Veg'}</span></td>
                    <td><span className={`badge ${item.is_available ? 'badge-green' : 'badge-muted'}`}>{item.is_available ? 'Available' : 'Unavailable'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...item }); setShowModal('item'); }}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id)} style={{ color: 'var(--red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="empty-state"><span className="empty-icon">🍽️</span><p>No menu items yet</p></div>}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Description</th><th>Active</th><th>Actions</th></tr></thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{cat.description || '—'}</td>
                    <td><span className={`badge ${cat.is_active ? 'badge-green' : 'badge-muted'}`}>{cat.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...cat }); setShowModal('cat'); }}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => deleteCat(cat.id)} style={{ color: 'var(--red)' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {categories.length === 0 && <div className="empty-state"><span className="empty-icon">📂</span><p>No categories yet</p></div>}
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showModal === 'item' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{form.id ? 'Edit Item' : 'Add Item'}</h2>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group full"><label className="input-label">Name *</label><input className="input" value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Price *</label><input className="input" type="number" value={String(form.price || '')} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) })} /></div>
                <div className="input-group"><label className="input-label">Category</label>
                  <select className="select" value={String(form.category_id || '')} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">None</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group full"><label className="input-label">Description</label><input className="input" value={String(form.description || '')} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Type</label>
                  <select className="select" value={form.is_veg ? 'veg' : 'nonveg'} onChange={e => setForm({ ...form, is_veg: e.target.value === 'veg' })}>
                    <option value="veg">🟢 Veg</option><option value="nonveg">🔴 Non-Veg</option>
                  </select>
                </div>
                <div className="input-group"><label className="input-label">Status</label>
                  <select className="select" value={form.is_available ? 'available' : 'unavailable'} onChange={e => setForm({ ...form, is_available: e.target.value === 'available' })}>
                    <option value="available">Available</option><option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowModal(null); setForm({}); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveItem} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showModal === 'cat' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{form.id ? 'Edit Category' : 'Add Category'}</h2>
            <div className="modal-body">
              <div className="input-group"><label className="input-label">Name *</label><input className="input" value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="input-group"><label className="input-label">Description</label><input className="input" value={String(form.description || '')} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowModal(null); setForm({}); }}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCat} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
