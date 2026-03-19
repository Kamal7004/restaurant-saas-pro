require('ts-node').register();
const { queryOne } = require('./src/db/index.ts');

async function test() {
  const tenant = await queryOne("SELECT id, slug, status FROM tenants WHERE slug = 'gourmet'");
  console.log('Tenant ID:', tenant.id);
  const email = 'owner@gourmet.com';
  const user = await queryOne(
      `SELECT u.*, t.slug as tenant_slug FROM users u
       LEFT JOIN tenants t ON t.id = u.tenant_id
       WHERE u.email = ? AND u.tenant_id = ? AND u.is_active = true`,
      [email, tenant.id]
  );
  console.log('Login User Query Result:', user);
  process.exit();
}

test();
