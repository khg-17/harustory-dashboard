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
const from = '2026-07-05';
const to = '2026-08-03';

async function queryType(type, app) {
  let sql = '';
  if (type === 'overview') {
    sql = `
      SELECT 
        eventDateKst,
        activeUserCount,
        newUserCount,
        totalEventCount AS eventCount
      FROM Report.Overview__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY eventDateKst ASC
    `;
  } else if (type === 'retention') {
    sql = `
      SELECT 
        cohortDateKst AS cohortDate,
        dayN,
        retainedUserCount,
        retentionRate
      FROM Report.Retention__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY cohortDateKst ASC, dayN ASC
    `;
  } else if (type === 'earning_activation') {
    sql = `
      SELECT 
        cohortDateKst AS cohortDate,
        dayN,
        activatedUu,
        activationRate
      FROM Report.EarningActivationRate__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY cohortDateKst ASC, dayN ASC
    `;
  } else if (type === 'mission_total') {
    sql = `
      SELECT 
        dt,
        sum(completeCount) as totalCompleteCount,
        sum(rewardAmount) as totalRewardAmount
      FROM Report.MissionByType__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      GROUP BY dt
      ORDER BY dt ASC
    `;
  } else if (type === 'ad_revenue') {
    sql = `
      SELECT * FROM Report.AdRevenue__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY dt ASC
    `;
  } else if (type === 'content_revenue') {
    sql = `
      SELECT * FROM Report.ContentRevenue__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY dt ASC
    `;
  } else if (type === 'content_purchase') {
    sql = `
      SELECT * FROM Report.ContentPurchase__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY dt ASC
    `;
  } else if (type === 'service_total_revenue') {
    sql = `
      SELECT * FROM Report.ServiceTotalRevenue__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY dt ASC
    `;
  } else if (type === 'earning') {
    sql = `
      SELECT * FROM Report.Earning__app_from_to_PV(app = '${app}', from = '${from}', to = '${to}')
      ORDER BY dt ASC
    `;
  } else {
    return [];
  }

  try {
    const res = await client.query({ query: sql, format: 'JSONEachRow' });
    return await res.json();
  } catch (err) {
    console.error(`Failed ${type} for ${app}:`, err.message);
    return [];
  }
}

async function main() {
  console.log('Fetching latest complete dataset (2026-07-03 to 2026-08-03)...');
  const seedPath = path.resolve(__dirname, '../src/lib/db_fallback_seed.json');
  
  let currentSeed = {};
  if (fs.existsSync(seedPath)) {
    try {
      currentSeed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    } catch (e) {}
  }

  const types = [
    'overview',
    'retention',
    'earning_activation',
    'service_total_revenue',
    'ad_revenue',
    'content_revenue',
    'content_purchase',
    'earning',
    'mission_total',
  ];

  for (const app of apps) {
    for (const type of types) {
      const key = `${app}_${type}`;
      console.log(`Processing ${key}...`);
      const rows = await queryType(type, app);
      if (rows && rows.length > 0) {
        currentSeed[key] = rows;
      } else if (!currentSeed[key]) {
        currentSeed[key] = [];
      }
    }
  }

  fs.writeFileSync(seedPath, JSON.stringify(currentSeed, null, 2), 'utf8');
  console.log('✅ db_fallback_seed.json successfully updated up to 2026-08-03!');
}

main();
