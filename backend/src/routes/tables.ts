import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticate, requireRoles } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'));

// GET /api/v1/tables
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const tables = await query('SELECT * FROM restaurant_tables WHERE tenant_id = ? ORDER BY table_number', [tenantId]);
  res.json(tables);
});

// POST /api/v1/tables
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { table_number, name, capacity } = req.body;
  if (!table_number) { res.status(400).json({ error: 'table_number required' }); return; }
  const id = uuidv4();
  try {
    await execute(
      'INSERT INTO restaurant_tables (id, tenant_id, table_number, name, capacity) VALUES (?,?,?,?,?)',
      [id, tenantId, table_number, name || `Table ${table_number}`, capacity || 4]
    );
    res.status(201).json(await queryOne('SELECT * FROM restaurant_tables WHERE id = ?', [id]));
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Table number already exists' });
    } else {
      throw e;
    }
  }
});

// PUT /api/v1/tables/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { table_number, name, capacity, is_active } = req.body;
  await execute(
    'UPDATE restaurant_tables SET table_number=?, name=?, capacity=?, is_active=? WHERE id=? AND tenant_id=?',
    [table_number, name, capacity, is_active !== false ? true : false, req.params.id, tenantId]
  );
  res.json(await queryOne('SELECT * FROM restaurant_tables WHERE id = ?', [req.params.id]));
});

// DELETE /api/v1/tables/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  await execute('DELETE FROM restaurant_tables WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  res.json({ success: true });
});

export default router;
