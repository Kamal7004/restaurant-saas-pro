import { Pool, QueryResult, types } from 'pg';

// Configure PostgreSQL to automatically parse NUMERIC (type 1700) as float instead of string
types.setTypeParser(1700, (val: string) => parseFloat(val));

let pool: Pool;

function getPool(): Pool {
  if (!pool) {
    // Support both connection string and individual params
    const connectionString = process.env.DATABASE_URL;
    if (connectionString && connectionString.startsWith('postgres')) {
      pool = new Pool({ connectionString, ssl: false });
    } else {
      pool = new Pool({
        host:     process.env.PGHOST     || 'localhost',
        port:     parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE || 'restaurant_saas',
        user:     process.env.PGUSER     || 'postgres',
        password: process.env.PGPASSWORD || 'password',
      });
    }
  }
  return pool;
}

const SCHEMA = `
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";

  CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','DISABLED')),
    plan        TEXT NOT NULL DEFAULT 'BASIC'   CHECK(plan   IN ('BASIC','PRO','ENTERPRISE')),
    owner_email TEXT NOT NULL,
    owner_phone TEXT,
    address     TEXT,
    logo_url    TEXT,
    primary_color TEXT DEFAULT '#E63946',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN','KITCHEN_STAFF','STAFF')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email, tenant_id)
  );

  CREATE TABLE IF NOT EXISTS restaurant_tables (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_number INTEGER NOT NULL,
    name         TEXT,
    capacity     INTEGER DEFAULT 4,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    qr_code_url  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, table_number)
  );

  CREATE TABLE IF NOT EXISTS menu_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    image_url   TEXT,
    sort_order  INTEGER DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id  UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL,
    image_url    TEXT,
    is_veg       BOOLEAN NOT NULL DEFAULT TRUE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INTEGER DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS otp_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id      UUID NOT NULL REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    otp           TEXT NOT NULL,
    customer_name TEXT,
    session_token TEXT UNIQUE,
    status        TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','VERIFIED','EXPIRED')),
    expires_at    TIMESTAMPTZ NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS orders (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id             UUID NOT NULL REFERENCES restaurant_tables(id),
    order_number         TEXT NOT NULL,
    status               TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','PREPARING','READY','DELIVERED','CANCELLED')),
    customer_name        TEXT,
    special_instructions TEXT,
    total_amount         NUMERIC(10,2) DEFAULT 0,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id),
    name         TEXT NOT NULL,
    price        NUMERIC(10,2) NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 1,
    status       TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PREPARING','READY','DELIVERED')),
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS waiter_calls (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_id    UUID NOT NULL REFERENCES restaurant_tables(id),
    status      TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','RESOLVED')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  );
`;

export async function runMigrations(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(SCHEMA);
    console.log('✅ Database migrations complete');
  } finally {
    client.release();
  }
}

function replaceP(sql: string): string {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}

export async function query<T extends import('pg').QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result: QueryResult<T> = await getPool().query(replaceP(sql), params);
  return result.rows;
}

export async function queryOne<T extends import('pg').QueryResultRow = any>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  const rows = await query<T>(replaceP(sql), params);
  return rows[0];
}

export async function execute(
  sql: string,
  params?: unknown[]
): Promise<void> {
  await getPool().query(replaceP(sql), params);
}

export async function transaction<T>(fn: (client: import('pg').PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export default getPool;
