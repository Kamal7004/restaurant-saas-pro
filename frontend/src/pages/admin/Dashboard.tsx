import React, { useEffect, useState } from 'react';
import api from '../../api/client';

interface Stats { totalOrders: number; totalRevenue: number; activeOrders: number; }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, activeOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/admin').then(r => {
      const orders = r.data;
      setStats({
        totalOrders: orders.length,
        totalRevenue: orders.filter((o: { status: string }) => o.status === 'DELIVERED').reduce((s: number, o: { total_amount: number }) => s + (o.total_amount || 0), 0),
        activeOrders: orders.filter((o: { status: string }) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your restaurant at a glance</p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--accent-muted)' }}>📋</div>
          <div><div className="stat-value">{stats.totalOrders}</div><div className="stat-label">Total Orders</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-muted)' }}>💰</div>
          <div><div className="stat-value">₹{stats.totalRevenue.toFixed(0)}</div><div className="stat-label">Revenue</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--yellow-muted)' }}>⚡</div>
          <div><div className="stat-value">{stats.activeOrders}</div><div className="stat-label">Active Orders</div></div>
        </div>
      </div>
    </div>
  );
}
