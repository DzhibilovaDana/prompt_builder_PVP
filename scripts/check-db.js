// scripts/check-db.js
require('dotenv/config'); // гарантированно загрузит .env в process.env
const { Client } = require('pg');

console.log('NODE version:', process.version);
console.log('Using CWD:', process.cwd());
console.log('DATABASE_URL (raw):', process.env.DATABASE_URL);

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

(async () => {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query('SELECT NOW() as now');
    console.log('DB OK:', res.rows[0]);
  } catch (e) {
    console.error('DB connect error', e);
  } finally {
    await client.end();
  }
})();
