import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';

interface OrderItem { id: string; name: string; quantity: number; status: string; notes?: string; }
interface Order { id: string; order_number: string; status: string; table_number: number; customer_name: string; created_at: string; items: OrderItem[] | string; }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow', PREPARING: 'badge-blue', READY: 'badge-green', DELIVERED: 'badge-muted',
};

export default function KitchenView() {
  const { user, logout } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const parseItems = (items: OrderItem[] | string): OrderItem[] => {
    if (Array.isArray(items)) return items;
    try { return JSON.parse(items as string); } catch { return []; }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/kitchen');
      setOrders(data);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      await api.patch(`/orders/kitchen/items/${itemId}`, { status });
      setOrders(prev => prev.map(o => ({
        ...o,
        items: parseItems(o.items).map(i => i.id === itemId ? { ...i, status } : i),
      })));
      toast.success(`Item marked ${status}`);
    } catch { toast.error('Update failed'); }
  };

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700 }}>🍳 Kitchen Display</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Logged in as {user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}>🔄 Refresh</button>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {orders.length === 0 ? (
          <div className="empty-state"><span className="empty-icon">🎉</span><p>No active orders</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {orders.map(order => {
              const items = parseItems(order.items);
              return (
                <div key={order.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{order.order_number}</span>
                      <span className={`badge ${STATUS_COLORS[order.status] || 'badge-muted'}`} style={{ marginLeft: 8 }}>{order.status}</span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Table {order.table_number}</span>
                  </div>
                  <div style={{ padding: 16 }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{item.quantity}× {item.name}</span>
                          {item.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.notes}</div>}
                          <span className={`badge ${STATUS_COLORS[item.status] || 'badge-muted'}`} style={{ marginTop: 4 }}>{item.status}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {item.status === 'PENDING' && <button className="btn btn-sm" style={{ background: 'var(--blue-muted)', color: 'var(--blue)' }} onClick={() => updateItemStatus(item.id, 'PREPARING')}>Start</button>}
                          {item.status === 'PREPARING' && <button className="btn btn-success btn-sm" onClick={() => updateItemStatus(item.id, 'READY')}>Ready ✓</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
