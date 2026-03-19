import { execute, query } from './src/db/index';

async function fix() {
  await execute("UPDATE orders SET status = 'READY' WHERE status = 'PENDING'");
  console.log("Fixed stuck orders.");
  process.exit(0);
}

fix();
