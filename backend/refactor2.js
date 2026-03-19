const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');

function fixFile(file, fixFn) {
  let content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  content = fixFn(content);
  fs.writeFileSync(path.join(routesDir, file), content, 'utf8');
}

// Fix superAdmin.ts
fixFile('superAdmin.ts', (c) => {
  // Fix missed async
  c = c.replace(/router.get\('\/tenants', \(_req: Request, res: Response\): void => \{/g, "router.get('/tenants', async (_req: Request, res: Response): Promise<void> => {");
  c = c.replace(/router.get\('\/analytics', \(_req: Request, res: Response\): void => \{/g, "router.get('/analytics', async (_req: Request, res: Response): Promise<void> => {");
  // Fix queryOne ?.cnt etc
  c = c.replace(/queryOne<\{ cnt: number \}>\((.*?)\)\?\.cnt/g, "(await queryOne<{ cnt: number }>($1))?.cnt");
  c = c.replace(/queryOne<\{ rev: number \}>\((.*?)\)\?\.rev/g, "(await queryOne<{ rev: number }>($1))?.rev");
  return c;
});

// Fix menu.ts
fixFile('menu.ts', (c) => {
  // fix anything specific to menu? The error was around line 21
  c = c.replace(/\(_req: Request, res: Response\): void => \{/g, "async (_req: Request, res: Response): Promise<void> => {");
  c = c.replace(/\(_req, res\): void => \{/g, "async (_req, res): Promise<void> => {");
  return c;
});

// Fix orders.ts
fixFile('orders.ts', (c) => {
  // Fix transaction(() => {  -> transaction(async () => {
  c = c.replace(/transaction\(\(\) => \{/g, "transaction(async () => {");
  c = c.replace(/\(req: Request, res: Response\): void => \{/g, "async (req: Request, res: Response): Promise<void> => {");
  
  // session tenant_id / table_id errors -> The query was not awaited properly maybe?
  // Let's check `session.tenant_id`. If `session` is a Promise, it means we forgot await!
  c = c.replace(/const session = queryOne/g, "const session = await queryOne");
  c = c.replace(/const order = queryOne/g, "const order = await queryOne");
  c = c.replace(/const item = queryOne/g, "const item = await queryOne");
  c = c.replace(/const menuItem = queryOne/g, "const menuItem = await queryOne");
  c = c.replace(/const notReady = queryOne/g, "const notReady = await queryOne");
  
  // also fix double awaits if any
  c = c.replace(/await await/g, "await");

  // fix `(notReady?.cnt` -> since notReady is a promise before the above change, it will be fine now if we added await queryOne.
  
  return c;
});

// Fix auth.ts
fixFile('auth.ts', (c) => {
  // auth previously had `let user: ...` and `user = queryOne(...)`. 
  c = c.replace(/user = queryOne/g, "user = await queryOne");
  
  // `const tenant = queryOne`
  c = c.replace(/const tenant = queryOne/g, "const tenant = await queryOne");
  c = c.replace(/const table = queryOne/g, "const table = await queryOne");
  c = c.replace(/const session = queryOne/g, "const session = await queryOne");
  
  c = c.replace(/\(req: Request, res: Response\): void => \{/g, "async (req: Request, res: Response): Promise<void> => {");
  return c;
});

console.log('Follow-up refactoring complete.');
