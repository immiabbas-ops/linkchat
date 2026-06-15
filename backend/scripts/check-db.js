const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres@127.0.0.1:5432/postgres',
    connectionTimeoutMillis: 5000,
  });

  await client.connect();
  const res = await client.query(`
    SELECT to_regclass('public.chat_connectors') AS connectors_table,
           (SELECT count(*)::int FROM users) AS user_count
  `);
  console.log(res.rows[0]);
  await client.end();
}

main().catch((e) => {
  console.error('DB ERR:', e.message);
  process.exit(1);
});
