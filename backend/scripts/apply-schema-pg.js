const { Client } = require('pg');
const { execSync } = require('child_process');

const databaseUrl = 'postgresql://postgres@127.0.0.1:5432/postgres';

async function waitForDb() {
  for (let i = 0; i < 30; i++) {
    try {
      const client = new Client({ connectionString: databaseUrl });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  if (!(await waitForDb())) {
    console.error('Database not reachable on 127.0.0.1:5432');
    process.exit(1);
  }

  const sql = execSync(
    'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
    { encoding: 'utf-8', cwd: process.cwd() },
  );

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query(sql);
    console.log('Database schema applied.');
  } catch (error) {
    if (error.code === '42710' || error.message?.includes('already exists')) {
      console.log('Database schema already present.');
    } else {
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
