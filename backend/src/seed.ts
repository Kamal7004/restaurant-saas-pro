import dotenv from 'dotenv';
dotenv.config();

import { runMigrations, execute, queryOne } from './db/index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Running seed...');

  // await runMigrations();

  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@yoursaas.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';

  const existing = await queryOne('SELECT id FROM users WHERE email = $1 AND tenant_id IS NULL', [email]);
  if (existing) {
    console.log('✅ Super admin already exists, skipping.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  await execute(
    `INSERT INTO users (id, tenant_id, email, password_hash, name, role)
     VALUES ($1, NULL, $2, $3, $4, 'SUPER_ADMIN')`,
    [id, email, hash, 'Super Admin']
  );

  console.log(`✅ Super admin created: ${email} / ${password}`);
  console.log('🎉 Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
