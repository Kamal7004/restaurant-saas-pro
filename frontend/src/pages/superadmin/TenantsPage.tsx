import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface Tenant { id: string; name: string; slug: string; status: string; plan: string; owner_email: string; staff_count: number; order_count: number; created_at: string; }

const PLANS = ['BASIC', 'PRO', 'ENTERPRISE'];
const STATUS_COLORS: Record<string, string> = { ACTIVE: 'badge-green', PENDING: 'badge-yellow', DISABLED: 'badge-red' };

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({ plan: 'BASIC' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get('/super-admin/tenants');
    setTenants(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setSaving(true);
    try {
      const { data } = await api.post('/super-admin/tenants', form);
      toast.success(`Created! Admin password: ${data.adminCredentials.password}`);
      setShowModal(false); setForm({ plan: 'BASIC' }); load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Create failed');
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/super-admin/tenants/${id}/status`, { status });
      toast.success(`Status → ${status}`); load();
    } catch { toast.error('Failed'); }
  };

  const del = async (id: string) => {
    if (!window.confirm('Permanently delete tenant and all data?')) return;
    await api.delete(`/super-admin/tenants/${id}`); toast.success('Deleted'); load();
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h1 className="page-title">Tenants</h1><p className="page-subtitle">{tenants.length} restaurants registered</p></div>
        <button className="btn btn-primary" onClick={() => { setForm({ plan: 'BASIC' }); setShowModal(true); }}>+ New Tenant</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Owner</th><th>Plan</th><th>Staff</th><th>Orders</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', fontSize: 13 }}>{t.slug}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t.owner_email}</td>
                  <td><span className="badge badge-blue">{t.plan}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.staff_count}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.order_count}</td>
                  <td><span className={`badge ${STATUS_COLORS[t.status] || 'badge-muted'}`}>{t.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {t.status !== 'ACTIVE' && <button className="btn btn-success btn-sm" onClick={() => changeStatus(t.id, 'ACTIVE')}>Activate</button>}
                      {t.status === 'ACTIVE' && <button className="btn btn-secondary btn-sm" onClick={() => changeStatus(t.id, 'DISABLED')}>Disable</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => del(t.id)} style={{ color: 'var(--red)' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && <div className="empty-state"><span className="empty-icon">🏪</span><p>No tenants yet</p></div>}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add New Restaurant</h2>
            <div className="modal-body">
              <div className="form-grid">
                <div className="input-group full"><label className="input-label">Restaurant Name *</label><input className="input" value={String(form.name || '')} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="input-group"><label className="input-label">Slug * <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(URL identifier)</span></label><input className="input" value={String(form.slug || '')} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })} /></div>
                <div className="input-group"><label className="input-label">Plan</label>
                  <select className="select" value={String(form.plan || 'BASIC')} onChange={e => setForm({ ...form, plan: e.target.value })}>
                    {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="input-group full"><label className="input-label">Owner Email *</label><input className="input" type="email" value={String(form.ownerEmail || '')} onChange={e => setForm({ ...form, ownerEmail: e.target.value })} /></div>
                <div className="input-group full"><label className="input-label">Admin Password <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(default: Admin@123)</span></label><input className="input" type="password" value={String(form.adminPassword || '')} placeholder="Admin@123" onChange={e => setForm({ ...form, adminPassword: e.target.value })} /></div>
                <div className="input-group full"><label className="input-label">Address</label><input className="input" value={String(form.address || '')} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create} disabled={saving}>{saving ? 'Creating...' : 'Create Restaurant'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
