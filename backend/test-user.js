require('ts-node').register();
const { queryOne } = require('./src/db/index.ts');

async function test() {
  const user = await queryOne("SELECT * FROM users WHERE email = 'owner@gourmet.com'");
  console.log('User:', user);
  const tenant = await queryOne("SELECT * FROM tenants WHERE slug = 'gourmet'");
  console.log('Tenant:', tenant);
  process.exit();
}

test();
