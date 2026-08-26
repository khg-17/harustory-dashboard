async function testApi() {
  const apps = ['tc', 'bitbunny', 'yafit', 'harustory'];
  const presets = [
    { name: '7d', from: '2026-07-28', to: '2026-08-03' },
    { name: '30d', from: '2026-07-05', to: '2026-08-03' },
  ];

  for (const app of apps) {
    for (const p of presets) {
      const url = `http://localhost:3000/api/clickhouse?type=mission_total&app=${app}&from=${p.from}&to=${p.to}`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        console.log(`[${app}][${p.name}] status: ${res.status}, success: ${json.success}, mode: ${json.mode}, length: ${json.data?.length}`);
        if (json.data && json.data.length > 0) {
          console.log(`  Sample item:`, json.data[0]);
        }
      } catch (err) {
        console.error(`[${app}][${p.name}] Error:`, err.message);
      }
    }
  }
}

testApi();
