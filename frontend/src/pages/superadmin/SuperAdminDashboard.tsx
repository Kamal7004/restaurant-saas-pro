import React, { useEffect, useState } from 'react';
import api from '../../api/client';

interface Analytics { totalTenants: number; activeTenants: number; totalOrders: number; totalRevenue: number; recentTenants: { id: string; name: string; slug: string; status: string; plan: string; created_at: string; }[]; }

const STATUS_COLORS: Record<string, string> = { ACTIVE: 'badge-green', PENDING: 'badge-yellow', DISABLED: 'badge-red' };

export default function SuperAdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    api.get('/super-admin/analytics').then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h1 className="page-title">Platform Overview</h1><p className="page-subtitle">Global statistics across all tenants</p></div>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--blue-muted)' }}>🏪</div><div><div className="stat-value">{data.totalTenants}</div><div className="stat-label">Total Tenants</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--green-muted)' }}>✅</div><div><div className="stat-value">{data.activeTenants}</div><div className="stat-label">Active Tenants</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--accent-muted)' }}>📋</div><div><div className="stat-value">{data.totalOrders}</div><div className="stat-label">Total Orders</div></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'var(--yellow-muted)' }}>💰</div><div><div className="stat-value">₹{data.totalRevenue.toFixed(0)}</div><div className="stat-label">Total Revenue</div></div></div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Tenants</h2>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Plan</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              {data.recentTenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{t.slug}</td>
                  <td><span className="badge badge-blue">{t.plan}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[t.status] || 'badge-muted'}`}>{t.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recentTenants.length === 0 && <div className="empty-state"><span className="empty-icon">🏪</span><p>No tenants yet</p></div>}
        </div>
      </div>
    </div>
  );
}
