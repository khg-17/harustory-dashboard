async function testAll() {
  const types = [
    'service_total_revenue',
    'ad_revenue',
    'content_revenue',
    'content_purchase',
    'earning',
    'mission_total'
  ];

  for (const type of types) {
    const url = `http://localhost:3000/api/clickhouse?type=${type}&app=yafit&from=2026-07-03&to=2026-07-22`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      console.log(`Type: ${type} => success: ${json.success}, mode: ${json.mode}, count: ${json.data?.length}`);
      if (!json.success) {
        console.log(`  Error: ${json.error}`);
      }
    } catch (err) {
      console.log(`Type: ${type} => Fetch Exception: ${err.message}`);
    }
  }
}

testAll();
