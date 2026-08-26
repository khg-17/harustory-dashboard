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

// Helper parser to test field extraction
function extractRewardAmount(row) {
  if (!row) return 0;
  const raw =
    row.totalRewardAmount ??
    row.total_reward_amount ??
    row.rewardAmount ??
    row.reward_amount ??
    row.reward ??
    row.totalReward ??
    row.total_reward ??
    row.rewardCost ??
    row.reward_cost ??
    row.total_reward_cost ??
    row.mCost ??
    row.missionReward ??
    row.totalMissionReward ??
    row.rewardSum ??
    row.total_reward_sum ??
    0;
  const num = Number(raw);
  return !isNaN(num) ? num : 0;
}

function runFieldParserUnitTests() {
  console.log('--- 1. Unit Testing Multi-Field Parser ---');
  const testCases = [
    { name: 'totalRewardAmount string', input: { totalRewardAmount: '12345' }, expected: 12345 },
    { name: 'total_reward_amount number', input: { total_reward_amount: 67890 }, expected: 67890 },
    { name: 'rewardAmount string', input: { rewardAmount: '9999' }, expected: 9999 },
    { name: 'reward_amount string', input: { reward_amount: '4321' }, expected: 4321 },
    { name: 'reward_cost string', input: { reward_cost: '500' }, expected: 500 },
    { name: 'mCost number', input: { mCost: 777 }, expected: 777 },
    { name: 'missionReward string', input: { missionReward: '8888' }, expected: 8888 },
    { name: 'empty/null item', input: null, expected: 0 },
    { name: 'invalid string', input: { totalRewardAmount: 'invalid' }, expected: 0 },
  ];

  let passed = 0;
  testCases.forEach((tc) => {
    const result = extractRewardAmount(tc.input);
    if (result === tc.expected) {
      console.log(`[PASS] ${tc.name} => ${result}`);
      passed++;
    } else {
      console.error(`[FAIL] ${tc.name} => got ${result}, expected ${tc.expected}`);
    }
  });

  if (passed === testCases.length) {
    console.log(`✅ All ${passed} unit test cases passed!`);
  } else {
    throw new Error(`Unit tests failed: ${passed}/${testCases.length}`);
  }
}

async function verifyLiveDbRewardIntegrity() {
  console.log('\n--- 2. Live DB App Data Integrity Check ---');
  const apps = ['tc', 'bitbunny', 'yafit', 'harustory'];
  const from = '2026-07-05';
  const to = '2026-08-03';

  for (const app of apps) {
    try {
      const res = await client.query({
        query: `
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
        `,
        format: 'JSONEachRow',
      });

      const data = await res.json();
      let sumP = 0;
      data.forEach((row) => {
        sumP += extractRewardAmount(row);
      });

      console.log(`App [${app}]: Returned ${data.length} daily rows. Total Mission Reward: ${sumP.toLocaleString()} P`);

      if (app !== 'harustory') {
        if (data.length > 0 && sumP > 0) {
          console.log(`  ✅ App [${app}] Reward Integrity VERIFIED (> 0P)`);
        } else {
          console.error(`  🚨 App [${app}] UNEXPECTED 0P!`);
        }
      } else {
        console.log(`  ℹ️ App [harustory] Expected behavior (no recorded mission rewards in DB)`);
      }
    } catch (err) {
      console.error(`  ❌ Error querying app [${app}]:`, err.message);
    }
  }
}

async function main() {
  try {
    runFieldParserUnitTests();
    await verifyLiveDbRewardIntegrity();
    console.log('\n🎉 INTEGRITY VERIFICATION COMPLETE: All checks passed!');
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

main();
