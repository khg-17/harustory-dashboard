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
  try {
    console.log('Querying MissionByType view...');
    const res1 = await client.query({
      query: `
        SELECT *
        FROM Report.MissionByType__app_from_to_PV(
          app = 'tc',
          from = '2026-07-03',
          to = '2026-07-22'
        )
        LIMIT 10
      `,
      format: 'JSONEachRow',
    });
    const sample = await res1.json();
    console.log('Sample row from MissionByType__app_from_to_PV:', sample);

    console.log('\nQuerying current api query logic:');
    const res2 = await client.query({
      query: `
        SELECT 
          dt,
          sum(completeCount) as totalCompleteCount,
          sum(rewardAmount) as totalRewardAmount
        FROM Report.MissionByType__app_from_to_PV(
          app = 'tc',
          from = '2026-07-03',
          to = '2026-07-22'
        )
        WHERE missionType != 'RC'
        GROUP BY dt
        ORDER BY dt ASC
      `,
      format: 'JSONEachRow',
    });
    console.log('API query result:', await res2.json());
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
