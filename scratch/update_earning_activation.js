const fs = require('fs');
const path = require('path');
const { createClient } = require('@clickhouse/client');

const host = process.env.CLICKHOUSE_HOST || 'http://210.97.114.130:60001';
const username = process.env.CLICKHOUSE_USER || 'mcp_user';
const password = process.env.CLICKHOUSE_PASSWORD || '4a475bd1ec3f439e';
const database = process.env.CLICKHOUSE_DATABASE || 'default';

const client = createClient({
  url: host,
  username: username,
  password: password,
  database: database,
});

const apps = ['tc', 'bitbunny', 'yafit', 'harustory'];
const from = '2026-07-20';
const to = '2026-08-03';

async function main() {
  const seedPath = path.resolve(__dirname, '../src/lib/db_fallback_seed.json');
  let currentSeed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  for (const app of apps) {
    const key = `${app}_earning_activation`;
    console.log(`Updating ${key}...`);
    try {
      const sql = `
        SELECT 
          cohortDateKst AS cohortDate,
          dayN,
          activatedUu,
          activationRate
        FROM Report.EarningActivationRate__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
        ORDER BY cohortDateKst ASC, dayN ASC
      `;
      const res = await client.query({ query: sql, format: 'JSONEachRow' });
      const rows = await res.json();
      currentSeed[key] = rows;
      console.log(`  Done ${key}: ${rows.length} rows`);
    } catch (err) {
      console.error(`  Failed ${key}:`, err.message);
    }
  }

  fs.writeFileSync(seedPath, JSON.stringify(currentSeed, null, 2), 'utf8');
  console.log('✅ db_fallback_seed.json complete sync finished!');
}

main();
