import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface StaffMember { id: string; name: string; email: string; role: string; is_active: number; }

const ROLES = ['ADMIN', 'KITCHEN_STAFF', 'STAFF'];

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ role: 'STAFF', is_active: 1 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/staff');
    setStaff(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      if (form.id) await api.put(`/staff/${form.id}`, form);
      else await api.post('/staff', form);
      toast.success('Saved!'); setShowModal(false); setForm({ role: 'STAFF', is_active: 1 }); load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Remove staff member?')) return;
    await api.delete(`/staff/${id}`); toast.success('Removed'); load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h1 className="page-title">Staff</h1><p className="page-subtitle">Manage kitchen staff, waiters, and admins</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ role: 'STAFF', is_active: 1 }); setShowModal(true); }}>+ Add Staff</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td><span className="badge badge-blue">{s.role}</span></td>
                  <td><span className={`badge ${s.is_active ? 'badge-green' : 'badge-muted'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ ...s }); setShowModal(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => del(s.id)} style={{ color: 'var(--red)' }}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && <div className="empty-state"><span className="empty-icon">👥</span><p>No staff added yet</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{form.id ? 'Edit Staff' : 'Add Staff'}</h2>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group full"><label className="input-label">Full Name *</label><input className="input" value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="input-group full"><label className="input-label">Email *</label><input className="input" type="email" value={String(form.email || '')} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!form.id} /></div>
                <div className="input-group"><label className="input-label">{form.id ? 'New Password (optional)' : 'Password *'}</label><input className="input" type="password" value={String(form.password || '')} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Role *</label>
                  <select className="select" value={String(form.role || 'STAFF')} onChange={e => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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
