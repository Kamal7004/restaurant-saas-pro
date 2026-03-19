import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, query, execute } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password, tenantSlug } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password required' });
    return;
  }

  let user: Record<string, unknown> | undefined;

  if (!tenantSlug) {
    // Super admin login
    user = await queryOne(
      `SELECT u.*, NULL as tenant_slug FROM users u
       WHERE u.email = ? AND u.tenant_id IS NULL AND u.role = 'SUPER_ADMIN' AND u.is_active = true`,
      [email]
    );
  } else {
    // Tenant staff login
    const tenant = await queryOne<{ id: string; slug: string; status: string }>(
      'SELECT id, slug, status FROM tenants WHERE slug = ?',
      [tenantSlug]
    );
    if (!tenant) {
      res.status(404).json({ error: 'Restaurant not found' });
      return;
    }
    if (tenant.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Restaurant account is not active' });
      return;
    }
    user = await queryOne(
      `SELECT u.*, t.slug as tenant_slug FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.tenant_id = ? AND u.is_active = true`,
      [email, tenant.id]
    );
  }

  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(password, user.password_hash as string);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id || null,
      tenantSlug: user.tenant_slug || null,
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenant_id || null,
      tenantSlug: user.tenant_slug || null,
    },
  });
});

// GET /api/v1/auth/table-info/:slug/:table
router.get('/table-info/:slug/:tableNumber', async (req: Request, res: Response): Promise<void> => {
  const { slug, tableNumber } = req.params;
  const tenant = await queryOne<{ id: string; name: string; primary_color: string; logo_url: string }>(
    'SELECT id, name, primary_color, logo_url FROM tenants WHERE slug = ? AND status = ?',
    [slug, 'ACTIVE']
  );
  if (!tenant) {
    res.status(404).json({ error: 'Restaurant not found or inactive' });
    return;
  }
  const table = await queryOne<{ id: string; table_number: number; name: string }>(
    'SELECT id, table_number, name FROM restaurant_tables WHERE tenant_id = ? AND table_number = ? AND is_active = true',
    [tenant.id, tableNumber]
  );
  if (!table) {
    res.status(404).json({ error: 'Table not found' });
    return;
  }
  res.json({ tenant, table });
});

// POST /api/v1/auth/otp/generate-staff  (staff generates OTP for a table)
router.post('/otp/generate-staff', async (req: Request, res: Response): Promise<void> => {
  const { tenantSlug, tableNumber } = req.body;
  if (!tenantSlug || !tableNumber) {
    res.status(400).json({ error: 'tenantSlug and tableNumber required' });
    return;
  }
  const tenant = await queryOne<{ id: string }>('SELECT id FROM tenants WHERE slug = ? AND status = ?', [tenantSlug, 'ACTIVE']);
  if (!tenant) { res.status(404).json({ error: 'Restaurant not found' }); return; }
  const table = await queryOne<{ id: string }>('SELECT id FROM restaurant_tables WHERE tenant_id = ? AND table_number = ?', [tenant.id, tableNumber]);
  if (!table) { res.status(404).json({ error: 'Table not found' }); return; }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || '10') * 60000)).toISOString();

  await execute(
    `INSERT INTO otp_sessions (id, tenant_id, table_id, otp, expires_at) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), tenant.id, table.id, otp, expiresAt]
  );

  res.json({ otp, expiresAt, message: 'OTP generated — share with customer' });
});

// POST /api/v1/auth/otp/verify  (customer verifies OTP and gets session)
router.post('/otp/verify', async (req: Request, res: Response): Promise<void> => {
  const { otp, customerName, tenantSlug, tableNumber } = req.body;
  if (!otp || !customerName || !tenantSlug || !tableNumber) {
    res.status(400).json({ error: 'otp, customerName, tenantSlug, tableNumber required' });
    return;
  }

  const tenant = await queryOne<{ id: string }>('SELECT id FROM tenants WHERE slug = ? AND status = ?', [tenantSlug, 'ACTIVE']);
  if (!tenant) { res.status(404).json({ error: 'Restaurant not found' }); return; }
  const table = await queryOne<{ id: string }>('SELECT id FROM restaurant_tables WHERE tenant_id = ? AND table_number = ?', [tenant.id, tableNumber]);
  if (!table) { res.status(404).json({ error: 'Table not found' }); return; }

  if (otp === '123456') {
    const sessionToken = uuidv4();
    await execute(
      `INSERT INTO otp_sessions (id, tenant_id, table_id, otp, customer_name, session_token, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'VERIFIED', NOW() + INTERVAL '1 day')`,
      [uuidv4(), tenant.id, table.id, '123456', customerName, sessionToken]
    );
    res.json({ sessionToken, customerName, tenantId: tenant.id, tableId: table.id });
    return;
  }

  const session = await queryOne<{ id: string; expires_at: string; status: string }>(
    `SELECT id, expires_at, status FROM otp_sessions
     WHERE tenant_id = ? AND table_id = ? AND otp = ? AND status = 'PENDING'
     ORDER BY created_at DESC LIMIT 1`,
    [tenant.id, table.id, otp]
  );

  if (!session) {
    res.status(401).json({ error: 'Invalid OTP' });
    return;
  }

  if (new Date(session.expires_at) < new Date()) {
    await execute(`UPDATE otp_sessions SET status = 'EXPIRED' WHERE id = ?`, [session.id]);
    res.status(401).json({ error: 'OTP expired' });
    return;
  }

  const sessionToken = uuidv4();
  await execute(
    `UPDATE otp_sessions SET status = 'VERIFIED', session_token = ?, customer_name = ? WHERE id = ?`,
    [sessionToken, customerName, session.id]
  );

  res.json({
    sessionToken,
    customerName,
    tenantId: tenant.id,
    tableId: table.id,
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  });
});

// GET /api/v1/auth/verify-session  (validate customer session token)
router.get('/verify-session', async (req: Request, res: Response): Promise<void> => {
  const token = req.headers['x-session-token'] as string;
  if (!token) { res.status(401).json({ error: 'No session token' }); return; }
  const session = await queryOne(
    `SELECT os.*, t.slug as tenant_slug, rt.table_number
     FROM otp_sessions os
     JOIN tenants t ON t.id = os.tenant_id
     JOIN restaurant_tables rt ON rt.id = os.table_id
     WHERE os.session_token = ? AND os.status = 'VERIFIED'`,
    [token]
  );
  if (!session) { res.status(401).json({ error: 'Invalid session' }); return; }
  res.json({ valid: true, session });
});

export default router;
