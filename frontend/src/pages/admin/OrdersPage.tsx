import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/client';

interface OrderItem { id: string; name: string; quantity: number; status: string; }
interface Order { id: string; order_number: string; status: string; table_number: number; customer_name: string; total_amount: number; created_at: string; items: OrderItem[] | string; }

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-yellow', CONFIRMED: 'badge-blue', PREPARING: 'badge-blue', READY: 'badge-green', DELIVERED: 'badge-muted', CANCELLED: 'badge-red'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const parseItems = (items: OrderItem[] | string): OrderItem[] => {
    if (Array.isArray(items)) return items;
    try { return JSON.parse(items as string); } catch { return []; }
  };

  const load = useCallback(async () => {
    const { data } = await api.get('/orders/admin');
    setOrders(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="spinner-center"><div className="spinner" /></div>;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div><h1 className="page-title">Orders</h1><p className="page-subtitle">{orders.length} total orders</p></div>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Refresh</button>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Order</th><th>Table</th><th>Customer</th><th>Status</th><th>Total</th><th>Time</th><th></th></tr></thead>
            <tbody>
              {orders.map(o => (
                <React.Fragment key={o.id}>
                  <tr onClick={() => setExpanded(expanded === o.id ? null : o.id)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 700 }}>{o.order_number}</td>
                    <td>Table {o.table_number}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{o.customer_name}</td>
                    <td><span className={`badge ${STATUS_COLORS[o.status] || 'badge-muted'}`}>{o.status}</span></td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>₹{o.total_amount?.toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.created_at).toLocaleString()}</td>
                    <td>{expanded === o.id ? '▲' : '▼'}</td>
                  </tr>
                  {expanded === o.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-secondary)', padding: '12px 16px' }}>
                        {parseItems(o.items).map(item => (
                          <div key={item.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', margin: '3px', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                            {item.quantity}× {item.name} <span className={`badge ${STATUS_COLORS[item.status] || 'badge-muted'}`}>{item.status}</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <div className="empty-state"><span className="empty-icon">📋</span><p>No orders yet</p></div>}
        </div>
      </div>
    </div>
  );
}
