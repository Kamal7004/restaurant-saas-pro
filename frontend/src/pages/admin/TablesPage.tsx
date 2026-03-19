import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface Table { id: string; table_number: number; name: string; capacity: number; is_active: number; }

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/tables');
    setTables(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) await api.put(`/tables/${form.id}`, form);
      else await api.post('/tables', form);
      toast.success('Saved!'); setShowModal(false); setForm({}); load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Delete table?')) return;
    await api.delete(`/tables/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h1 className="page-title">Tables</h1><p className="page-subtitle">Manage restaurant tables</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ capacity: 4, is_active: 1 }); setShowModal(true); }}>+ Add Table</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Table #</th><th>Name</th><th>Capacity</th><th>Status</th><th>QR Link</th><th>Actions</th></tr></thead>
            <tbody>
              {tables.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, fontSize: 18 }}>#{t.table_number}</td>
                  <td>{t.name}</td>
                  <td>{t.capacity} seats</td>
                  <td><span className={`badge ${t.is_active ? 'badge-green' : 'badge-muted'}`}>{t.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>/scan/[slug]/{t.table_number}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...t }); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => del(t.id)} style={{ color: 'var(--red)' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tables.length === 0 && <div className="empty-state"><span className="empty-icon">🪑</span><p>No tables yet</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{form.id ? 'Edit Table' : 'Add Table'}</h2>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group"><label className="input-label">Table Number *</label><input className="input" type="number" value={String(form.table_number || '')} onChange={e => setForm({ ...form, table_number: parseInt(e.target.value) })} /></div>
                <div className="input-group"><label className="input-label">Name</label><input className="input" value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Capacity</label><input className="input" type="number" value={String(form.capacity || 4)} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) })} /></div>
                <div className="input-group"><label className="input-label">Status</label>
                  <select className="select" value={form.is_active ? 'active' : 'inactive'} onChange={e => setForm({ ...form, is_active: e.target.value === 'active' ? 1 : 0 })}>
                    <option value="active">Active</option><option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
