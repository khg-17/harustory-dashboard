const fs = require('fs');
const path = require('path');
const { createClient } = require('@clickhouse/client');

const client = createClient({
  url: 'http://210.97.114.130:60001',
  username: 'mcp_user',
  password: '4a475bd1ec3f439e',
  database: 'default',
});

const apps = ['tc', 'bitbunny', 'yafit', 'harustory'];
const from = '2026-07-05';
const to = '2026-08-03';

async function fetchMissionTotal(app) {
  const query = `
    SELECT 
      dt,
      sum(completeCount) as totalCompleteCount,
      sum(rewardAmount) as totalRewardAmount
    FROM Report.MissionByType__app_from_to_PV(
      app = '${app}',
      from = '${from}',
      to = '${to}'
    )
    WHERE missionType != 'RC'
    GROUP BY dt
    ORDER BY dt ASC
  `;
  try {
    const res = await client.query({ query, format: 'JSONEachRow' });
    const rows = await res.json();
    return rows.map(r => ({
      dt: String(r.dt).slice(0, 10),
      totalCompleteCount: Number(r.totalCompleteCount || 0),
      totalRewardAmount: Number(r.totalRewardAmount || 0),
    }));
  } catch (e) {
    console.error(`Error fetching mission_total for ${app}:`, e.message);
    return [];
  }
}

async function fetchEarning(app) {
  const query = `
    SELECT 
      dt,
      sum(exchangedPoints) as exchangedPoints,
      sum(exchangeUu) as exchangeUu
    FROM Report.Earning__app_from_to_PV(
      app = '${app}',
      from = '${from}',
      to = '${to}'
    )
    GROUP BY dt
    ORDER BY dt ASC
  `;
  try {
    const res = await client.query({ query, format: 'JSONEachRow' });
    const rows = await res.json();
    return rows.map(r => ({
      dt: String(r.dt).slice(0, 10),
      exchangedPoints: Number(r.exchangedPoints || 0),
      exchangeUu: Number(r.exchangeUu || 0),
    }));
  } catch (e) {
    console.error(`Error fetching earning for ${app}:`, e.message);
    return [];
  }
}

async function run() {
  const seedFilePath = path.resolve(__dirname, '../src/lib/db_fallback_seed.json');
  let currentSeed = {};
  if (fs.existsSync(seedFilePath)) {
    try {
      currentSeed = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    } catch (e) {}
  }

  for (const app of apps) {
    console.log(`Syncing ${app}...`);
    const missionRows = await fetchMissionTotal(app);
    if (missionRows.length > 0) {
      currentSeed[`${app}_mission_total`] = missionRows;
      console.log(`  ${app}_mission_total: ${missionRows.length} rows`);
    }

    const earningRows = await fetchEarning(app);
    if (earningRows.length > 0) {
      currentSeed[`${app}_earning`] = earningRows;
      console.log(`  ${app}_earning: ${earningRows.length} rows`);
    }
  }

  fs.writeFileSync(seedFilePath, JSON.stringify(currentSeed, null, 2));
  console.log('Successfully updated db_fallback_seed.json!');
}

run();
