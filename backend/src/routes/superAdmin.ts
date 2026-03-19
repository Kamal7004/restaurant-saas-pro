import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticate, requireSuperAdmin } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate, requireSuperAdmin);

// GET /api/v1/super-admin/tenants
router.get('/tenants', async (_req: Request, res: Response): Promise<void> => {
  const tenants = await query(
    `SELECT t.*,
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as staff_count,
      (SELECT COUNT(*) FROM orders o WHERE o.tenant_id = t.id) as order_count
     FROM tenants t ORDER BY t.created_at DESC`
  );
  res.json(tenants);
});

// POST /api/v1/super-admin/tenants
router.post('/tenants', async (req: Request, res: Response): Promise<void> => {
  const { name, slug, ownerEmail, ownerPhone, address, plan, adminPassword } = req.body;
  if (!name || !slug || !ownerEmail) {
    res.status(400).json({ error: 'name, slug, ownerEmail required' }); return;
  }
  const existing = await queryOne('SELECT id FROM tenants WHERE slug = ?', [slug]);
  if (existing) { res.status(409).json({ error: 'Slug already taken' }); return; }

  const tenantId = uuidv4();
  await execute(
    `INSERT INTO tenants (id, name, slug, owner_email, owner_phone, address, plan, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    [tenantId, name, slug, ownerEmail, ownerPhone || null, address || null, plan || 'BASIC']
  );

  // Create admin user for the tenant
  const password = adminPassword || 'Admin@123';
  const hash = await bcrypt.hash(password, 12);
  const userId = uuidv4();
  await execute(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?,?,?,?,?,?)`,
    [userId, tenantId, ownerEmail, hash, name + ' Admin', 'ADMIN']
  );

  res.status(201).json({
    tenant: await queryOne('SELECT * FROM tenants WHERE id = ?', [tenantId]),
    adminCredentials: { email: ownerEmail, password },
  });
});

// PATCH /api/v1/super-admin/tenants/:id/status
router.patch('/tenants/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.body;
  const valid = ['PENDING', 'ACTIVE', 'DISABLED'];
  if (!valid.includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }
  await execute(`UPDATE tenants SET status = ?, updated_at = NOW() WHERE id = ?`, [status, req.params.id]);
  res.json(await queryOne('SELECT * FROM tenants WHERE id = ?', [req.params.id]));
});

// DELETE /api/v1/super-admin/tenants/:id
router.delete('/tenants/:id', async (req: Request, res: Response): Promise<void> => {
  await execute('DELETE FROM tenants WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// GET /api/v1/super-admin/analytics
router.get('/analytics', async (_req: Request, res: Response): Promise<void> => {
  const totalTenants = (await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tenants'))?.cnt || 0;
  const activeTenants = (await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tenants WHERE status = ?', ['ACTIVE']))?.cnt || 0;
  const totalOrders = (await queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM orders'))?.cnt || 0;
  const totalRevenue = parseFloat((await queryOne<{ rev: string }>('SELECT COALESCE(SUM(total_amount),0) as rev FROM orders WHERE status = $1', ['DELIVERED']))?.rev || '0');
  const recentTenants = await query('SELECT id, name, slug, status, plan, created_at FROM tenants ORDER BY created_at DESC LIMIT 5');
  res.json({ totalTenants, activeTenants, totalOrders, totalRevenue, recentTenants });
});

export default router;
