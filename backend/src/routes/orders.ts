import { Router, Request, Response } from 'express';
import { query, queryOne, execute, transaction } from '../db';
import { authenticate, requireRoles } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { wsManager } from '../websocket/manager';

const router = Router();
// router.use(authenticate); removed to allow customer routes

// ─── Customer Routes ──────────────────────────────────────────────────────────

// POST /api/v1/orders/customer  — place new order
router.post('/customer', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken) { res.status(401).json({ error: 'Session token required' }); return; }

  const session = await queryOne<{ tenant_id: string; table_id: string; customer_name: string }>(
    `SELECT tenant_id, table_id, customer_name FROM otp_sessions
     WHERE session_token = ? AND status = 'VERIFIED'`,
    [sessionToken]
  );
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }

  const { items, specialInstructions } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Items required' }); return;
  }

  const result = await transaction(async () => {
    // Generate order number
    const count = ((await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM orders WHERE tenant_id = ?', [session.tenant_id]))?.cnt || 0);
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

    const orderId = uuidv4();
    await execute(
      `INSERT INTO orders (id, tenant_id, table_id, order_number, customer_name, special_instructions)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [orderId, session.tenant_id, session.table_id, orderNumber, session.customer_name, specialInstructions || null]
    );

    let total = 0;
    for (const item of items) {
      const menuItem = await queryOne<{ id: string; price: number; name: string; is_available: number }>(
        'SELECT id, price, name, is_available FROM menu_items WHERE id = ? AND tenant_id = ?',
        [item.menuItemId, session.tenant_id]
      );
      if (!menuItem || !menuItem.is_available) continue;
      const qty = item.quantity || 1;
      total += menuItem.price * qty;
      await execute(
        'INSERT INTO order_items (id, order_id, menu_item_id, name, price, quantity, notes) VALUES (?,?,?,?,?,?,?)',
        [uuidv4(), orderId, menuItem.id, menuItem.name, menuItem.price, qty, item.notes || null]
      );
    }

    await execute(`UPDATE orders SET total_amount = ?, updated_at = NOW() WHERE id = ?`, [total, orderId]);
    return orderId;
  });

  const order = await queryOne(
    'SELECT o.*, json_agg(json_build_object(\'id\',oi.id,\'name\',oi.name,\'price\',oi.price,\'quantity\',oi.quantity,\'status\',oi.status)) as items FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.id = $1 GROUP BY o.id',
    [result]
  );

  if (session.tenant_id) wsManager.broadcastToTenant(session.tenant_id, { type: 'ORDER_CREATED', data: order });

  res.status(201).json(order);
});

// GET /api/v1/orders/customer/my-orders
router.get('/customer/my-orders', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken) { res.status(401).json({ error: 'Session token required' }); return; }
  const session = await queryOne<{ tenant_id: string; table_id: string }>(
    `SELECT tenant_id, table_id FROM otp_sessions WHERE session_token = ? AND status = 'VERIFIED'`,
    [sessionToken]
  );
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }

  const orders = await query(
    `SELECT o.*, (SELECT json_agg(json_build_object('id',oi.id,'name',oi.name,'price',oi.price,'quantity',oi.quantity,'status',oi.status,'notes',oi.notes))
     FROM order_items oi WHERE oi.order_id = o.id) as items
     FROM orders o WHERE o.tenant_id = $1 AND o.table_id = $2 ORDER BY o.created_at DESC`,
    [session.tenant_id, session.table_id]
  );

  res.json(orders);
});

// POST /api/v1/orders/customer/call-waiter
router.post('/customer/call-waiter', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken) { res.status(401).json({ error: 'Session token required' }); return; }
  const session = await queryOne<{ tenant_id: string; table_id: string }>(
    `SELECT tenant_id, table_id FROM otp_sessions WHERE session_token = ? AND status = 'VERIFIED'`,
    [sessionToken]
  );
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }

  const id = uuidv4();
  await execute('INSERT INTO waiter_calls (id, tenant_id, table_id) VALUES (?,?,?)', [id, session.tenant_id, session.table_id]);
  wsManager.broadcastToTenant(session.tenant_id, { type: 'CALL_WAITER', data: { id, tableId: session.table_id } });
  res.json({ success: true, callId: id });
});

// GET /api/v1/orders/customer/bill
router.get('/customer/bill', async (req: Request, res: Response): Promise<void> => {
  const sessionToken = req.headers['x-session-token'] as string;
  if (!sessionToken) { res.status(401).json({ error: 'Session token required' }); return; }
  const session = await queryOne<{ tenant_id: string; table_id: string }>(
    `SELECT tenant_id, table_id FROM otp_sessions WHERE session_token = ? AND status = 'VERIFIED'`,
    [sessionToken]
  );
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }

  const orders = await query(
    `SELECT o.*, (SELECT json_agg(json_build_object('id',oi.id,'name',oi.name,'price',oi.price,'quantity',oi.quantity,'status',oi.status))
     FROM order_items oi WHERE oi.order_id = o.id) as items
     FROM orders o WHERE o.tenant_id = ? AND o.table_id = ? AND o.status != 'CANCELLED' ORDER BY o.created_at`,
    [session.tenant_id, session.table_id]
  );
  const total = (orders as Array<{ total_amount: number }>).reduce((s, o) => s + (o.total_amount || 0), 0);
  res.json({ orders, total });
});

// ─── Kitchen Routes ───────────────────────────────────────────────────────────

// GET /api/v1/orders/kitchen
router.get('/kitchen', authenticate, requireRoles('KITCHEN_STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant' }); return; }
  const orders = await query(
    `SELECT o.*, rt.table_number, rt.name as table_name,
     (SELECT json_agg(json_build_object('id',oi.id,'name',oi.name,'price',oi.price,'quantity',oi.quantity,'status',oi.status,'notes',oi.notes))
     FROM order_items oi WHERE oi.order_id = o.id) as items
     FROM orders o JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.tenant_id = ? AND o.status NOT IN ('DELIVERED','CANCELLED')
     ORDER BY o.created_at`,
    [tenantId]
  );
  res.json(orders);
});

// PATCH /api/v1/orders/kitchen/items/:id
router.patch('/kitchen/items/:id', authenticate, requireRoles('KITCHEN_STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  const { status } = req.body;
  const item = await queryOne<{ order_id: string }>('SELECT order_id FROM order_items WHERE id = ?', [req.params.id]);
  if (!item) { res.status(404).json({ error: 'Item not found' }); return; }

  await execute(`UPDATE order_items SET status = ? WHERE id = ?`, [status, req.params.id]);

  // Check if all items in order are READY
  const notReady = await queryOne<{ cnt: string | number }>(
    `SELECT COUNT(*) as cnt FROM order_items WHERE order_id = ? AND status NOT IN ('READY','DELIVERED')`,
    [item.order_id]
  );
  if (Number(notReady?.cnt || 0) === 0) {
    await execute(`UPDATE orders SET status = 'READY', updated_at = NOW() WHERE id = ?`, [item.order_id]);
  }

  if (tenantId) wsManager.broadcastToTenant(tenantId, { type: 'ITEM_STATUS_UPDATED', data: { itemId: req.params.id, status, orderId: item.order_id } });
  res.json({ success: true });
});

// ─── Staff Routes ─────────────────────────────────────────────────────────────

// GET /api/v1/orders/staff/ready
router.get('/staff/ready', authenticate, requireRoles('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant' }); return; }
  const orders = await query(
    `SELECT o.*, rt.table_number, rt.name as table_name FROM orders o
     JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.tenant_id = ? AND o.status = 'READY' ORDER BY o.updated_at`,
    [tenantId]
  );
  res.json(orders);
});

// PATCH /api/v1/orders/staff/:id/deliver
router.patch('/staff/:id/deliver', authenticate, requireRoles('STAFF', 'ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  await execute(`UPDATE orders SET status = 'DELIVERED', updated_at = NOW() WHERE id = ?`, [req.params.id]);
  await execute(`UPDATE order_items SET status = 'DELIVERED' WHERE order_id = ?`, [req.params.id]);
  if (tenantId) wsManager.broadcastToTenant(tenantId, { type: 'ORDER_DELIVERED', data: { orderId: req.params.id } });
  res.json({ success: true });
});

// ─── Admin Routes for all orders ─────────────────────────────────────────────

// GET /api/v1/orders/admin  (all orders for admin)
router.get('/admin', authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant' }); return; }
  const orders = await query(
    `SELECT o.*, rt.table_number,
     (SELECT json_agg(json_build_object('id',oi.id,'name',oi.name,'price',oi.price,'quantity',oi.quantity,'status',oi.status))
     FROM order_items oi WHERE oi.order_id = o.id) as items
     FROM orders o JOIN restaurant_tables rt ON rt.id = o.table_id
     WHERE o.tenant_id = ? ORDER BY o.created_at DESC LIMIT 200`,
    [tenantId]
  );
  res.json(orders);
});

export default router;
