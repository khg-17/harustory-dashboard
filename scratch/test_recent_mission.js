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

async function run() {
  const from = '2026-07-05';
  const to = '2026-08-03';
  console.log(`Querying mission_total from ${from} to ${to}...`);

  try {
    const res = await client.query({
      query: `
        SELECT 
          dt,
          sum(completeCount) as totalCompleteCount,
          sum(rewardAmount) as totalRewardAmount
        FROM Report.MissionByType__app_from_to_PV(
          app = 'tc',
          from = '${from}',
          to = '${to}'
        )
        WHERE missionType != 'RC'
        GROUP BY dt
        ORDER BY dt ASC
      `,
      format: 'JSONEachRow',
    });
    const data = await res.json();
    console.log(`Count: ${data.length}`);
    console.log('Data:', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
