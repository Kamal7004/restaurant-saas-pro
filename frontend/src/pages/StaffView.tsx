import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface Order { id: string; order_number: string; table_number: number; customer_name: string; updated_at: string; }

export default function StaffView() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/staff/ready');
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const deliver = async (orderId: string) => {
    try {
      await api.patch(`/orders/staff/${orderId}/deliver`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('Order delivered! ✅');
    } catch { toast.error('Failed to mark delivered'); }
  };

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>🚶 Staff Delivery</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Logged in as {user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>🔄 Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {orders.length === 0 ? (
          <div className="empty-state"><span className="empty-icon">✅</span><p>No ready orders</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {orders.map(order => (
              <div key={order.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{order.order_number}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Table {order.table_number}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{order.customer_name}</div>
                </div>
                <button className="btn btn-success" onClick={() => deliver(order.id)}>Deliver ✓</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
