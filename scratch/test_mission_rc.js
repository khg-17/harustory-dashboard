const { createClient } = require('@clickhouse/client');

const client = createClient({
  url: 'http://210.97.114.130:60001',
  username: 'mcp_user',
  password: '4a475bd1ec3f439e',
  database: 'default',
});

async function run() {
  try {
    const query = `
      SELECT 
        dt,
        sum(completeCount) as totalCompleteCount,
        sum(rewardAmount) as totalRewardAmount
      FROM Report.MissionByType__app_from_to_PV(
        app = 'tc',
        from = '2026-07-05',
        to = '2026-08-03'
      )
      WHERE missionType != 'RC'
      GROUP BY dt
      ORDER BY dt ASC
    `;
    const res = await client.query({ query, format: 'JSONEachRow' });
    const rows = await res.json();
    console.log('Sample rows:', rows.slice(0, 3));
    console.log('Total rows count:', rows.length);
    let sum = 0;
    rows.forEach(r => {
      sum += Number(r.totalRewardAmount ?? r.total_reward_amount ?? 0);
    });
    console.log('Total sum:', sum);
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
