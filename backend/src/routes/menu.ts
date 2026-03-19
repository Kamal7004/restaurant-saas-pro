import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticate, requireRoles } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/v1/menu/public/:slug  (public — no auth)
router.get('/public/:slug', async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;
  const { search, veg, categoryId } = req.query;

  const tenant = await queryOne<{ id: string; name: string; primary_color: string }>(
    'SELECT id, name, primary_color FROM tenants WHERE slug = ? AND status = ?',
    [slug, 'ACTIVE']
  );
  if (!tenant) { res.status(404).json({ error: 'Restaurant not found' }); return; }

  const categories = await query(
    'SELECT * FROM menu_categories WHERE tenant_id = ? AND is_active = true ORDER BY sort_order, name',
    [tenant.id]
  );

  let itemSql = 'SELECT * FROM menu_items WHERE tenant_id = ? AND is_available = true';
  const params: unknown[] = [tenant.id];

  if (categoryId) { itemSql += ' AND category_id = ?'; params.push(categoryId); }
  if (veg === 'true') { itemSql += ' AND is_veg = true'; }
  if (search) { itemSql += ' AND name LIKE ?'; params.push(`%${search}%`); }

  itemSql += ' ORDER BY sort_order, name';
  const items = await query(itemSql, params);

  res.json({ tenant, categories, items });
});

// ─── Admin-only routes ────────────────────────────────────────────────────────
router.use(authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'));

// GET /api/v1/menu/categories
router.get('/categories', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const categories = await query('SELECT * FROM menu_categories WHERE tenant_id = ? ORDER BY sort_order, name', [tenantId]);
  res.json(categories);
});

// POST /api/v1/menu/categories
router.post('/categories', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { name, description, image_url, sort_order } = req.body;
  if (!name) { res.status(400).json({ error: 'Name required' }); return; }
  const id = uuidv4();
  await execute(
    'INSERT INTO menu_categories (id, tenant_id, name, description, image_url, sort_order) VALUES (?,?,?,?,?,?)',
    [id, tenantId, name, description || null, image_url || null, sort_order || 0]
  );
  res.status(201).json(await queryOne('SELECT * FROM menu_categories WHERE id = ?', [id]));
});

// PUT /api/v1/menu/categories/:id
router.put('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { name, description, image_url, sort_order, is_active } = req.body;
  await execute(
    'UPDATE menu_categories SET name=?, description=?, image_url=?, sort_order=?, is_active=? WHERE id=? AND tenant_id=?',
    [name, description, image_url, sort_order, is_active !== undefined ? (is_active ? true : false) : 1, req.params.id, tenantId]
  );
  res.json(await queryOne('SELECT * FROM menu_categories WHERE id = ?', [req.params.id]));
});

// DELETE /api/v1/menu/categories/:id
router.delete('/categories/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  await execute('DELETE FROM menu_categories WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  res.json({ success: true });
});

// GET /api/v1/menu/items
router.get('/items', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const items = await query('SELECT * FROM menu_items WHERE tenant_id = ? ORDER BY sort_order, name', [tenantId]);
  res.json(items);
});

// POST /api/v1/menu/items
router.post('/items', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { category_id, name, description, price, image_url, is_veg, sort_order } = req.body;
  if (!name || price === undefined) { res.status(400).json({ error: 'Name and price required' }); return; }
  const id = uuidv4();
  await execute(
    'INSERT INTO menu_items (id, tenant_id, category_id, name, description, price, image_url, is_veg, sort_order) VALUES (?,?,?,?,?,?,?,?,?)',
    [id, tenantId, category_id || null, name, description || null, price, image_url || null, is_veg !== false ? true : false, sort_order || 0]
  );
  res.status(201).json(await queryOne('SELECT * FROM menu_items WHERE id = ?', [id]));
});

// PUT /api/v1/menu/items/:id
router.put('/items/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { category_id, name, description, price, image_url, is_veg, is_available, sort_order } = req.body;
  await execute(
    `UPDATE menu_items SET category_id=?, name=?, description=?, price=?, image_url=?, is_veg=?, is_available=?, sort_order=?, updated_at=NOW()
     WHERE id=? AND tenant_id=?`,
    [category_id, name, description, price, image_url, is_veg ? true : false, is_available !== false ? true : false, sort_order || 0, req.params.id, tenantId]
  );
  res.json(await queryOne('SELECT * FROM menu_items WHERE id = ?', [req.params.id]));
});

// DELETE /api/v1/menu/items/:id
router.delete('/items/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  await execute('DELETE FROM menu_items WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  res.json({ success: true });
});

export default router;
