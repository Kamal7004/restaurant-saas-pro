import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../db';
import { authenticate, requireRoles } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = Router();
router.use(authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'));

// GET /api/v1/staff
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const staff = await query(
    `SELECT id, email, name, role, is_active, created_at FROM users WHERE tenant_id = ? ORDER BY name`,
    [tenantId]
  );
  res.json(staff);
});

// POST /api/v1/staff
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { email, name, password, role } = req.body;
  if (!email || !name || !password || !role) {
    res.status(400).json({ error: 'email, name, password, role required' }); return;
  }
  const validRoles = ['ADMIN', 'KITCHEN_STAFF', 'STAFF'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: 'Invalid role' }); return;
  }
  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();
  await execute(
    'INSERT INTO users (id, tenant_id, email, password_hash, name, role) VALUES (?,?,?,?,?,?)',
    [id, tenantId, email, hash, name, role]
  );
  res.status(201).json(await queryOne('SELECT id, email, name, role, is_active FROM users WHERE id = ?', [id]));
});

// PUT /api/v1/staff/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  const { name, role, is_active, password } = req.body;
  if (password) {
    const hash = await bcrypt.hash(password, 12);
    await execute(`UPDATE users SET name=?, role=?, is_active=?, password_hash=?, updated_at=NOW() WHERE id=? AND tenant_id=?`,
      [name, role, is_active !== false ? true : false, hash, req.params.id, tenantId]);
  } else {
    await execute(`UPDATE users SET name=?, role=?, is_active=?, updated_at=NOW() WHERE id=? AND tenant_id=?`,
      [name, role, is_active !== false ? true : false, req.params.id, tenantId]);
  }
  res.json(await queryOne('SELECT id, email, name, role, is_active FROM users WHERE id = ?', [req.params.id]));
});

// DELETE /api/v1/staff/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(403).json({ error: 'No tenant context' }); return; }
  await execute('DELETE FROM users WHERE id = ? AND tenant_id = ?', [req.params.id, tenantId]);
  res.json({ success: true });
});

export default router;
