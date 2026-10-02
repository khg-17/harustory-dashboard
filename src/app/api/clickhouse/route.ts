import { NextRequest, NextResponse } from 'next/server';
import { queryClickHouse } from '@/lib/clickhouse';

// Server-side in-memory response cache to handle DB quota limits gracefully with full dataset seed up to 2026-07-26
const responseCache = new Map<string, { timestamp: number; data: any[] }>();

// Server-side global store per app & type to enable smart local date range slicing fallback
const appGlobalStore = new Map<string, Map<string, any>>(); // Key: `${app}_${type}`, Value: Map<dt, row>

// Load fallback seed data if available
try {
  const fs = require('fs');
  const path = require('path');
  const seedPath = path.resolve(process.cwd(), 'src/lib/db_fallback_seed.json');
  if (fs.existsSync(seedPath)) {
    const seedData: Record<string, any[]> = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    Object.entries(seedData).forEach(([key, rows]) => {
      const [app, ...typeParts] = key.split('_');
      const type = typeParts.join('_');
      if (app && type && Array.isArray(rows)) {
        updateGlobalStore(app, type, rows);
      }
    });
  }
} catch (e) {
  // Ignore seed load error
}

// Helper to store and merge rows into global store
function updateGlobalStore(app: string, type: string, rows: any[], userSegment?: string) {
  if (!Array.isArray(rows)) return;
  const segSuffix = userSegment && userSegment !== 'all' ? `_${userSegment}` : '';
  const storeKey = `${app}_${type}${segSuffix}`;
  if (!appGlobalStore.has(storeKey)) {
    appGlobalStore.set(storeKey, new Map<string, any>());
  }
  const map = appGlobalStore.get(storeKey)!;
  rows.forEach((row) => {
    const dtRaw = row.dt || row.eventDateKst || row.cohortDateKst || row.cohortDate;
    if (dtRaw) {
      const dtStr = String(dtRaw).split('T')[0];
      map.set(dtStr, { ...row, dt: dtStr });
    }
  });
}

// Helper to slice data locally from global store by date range
function sliceGlobalStore(app: string, type: string, from: string, to: string, userSegment?: string): any[] {
  const targetApp = (app === 'general_all' || app === 'ph_all') ? 'tc' : app;
  const segSuffix = userSegment && userSegment !== 'all' ? `_${userSegment}` : '';

  const map = appGlobalStore.get(`${targetApp}_${type}${segSuffix}`) ||
              appGlobalStore.get(`${targetApp}_${type}`) ||
              appGlobalStore.get(`tc_${type}${segSuffix}`) ||
              appGlobalStore.get(`tc_${type}`);

  if (!map) return [];

  const sliced: any[] = [];
  map.forEach((row, dt) => {
    if (dt >= from && dt <= to) {
      sliced.push(row);
    }
  });

  return sliced.sort((a, b) => (a.dt || '').localeCompare(b.dt || ''));
}

// Circuit Breaker state to prevent sending queries when DB quota is hit
let isQuotaExceeded = false;
let quotaResetTime = 0;

const APP_CODE_REGEX = /^[a-zA-Z0-9_-]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Helper function to extract reward amount across all possible field variations
function extractRewardAmount(item: any): number {
  if (!item) return 0;
  const raw =
    item.totalRewardAmount ??
    item.total_reward_amount ??
    item.rewardAmount ??
    item.reward_amount ??
    item.reward ??
    item.totalReward ??
    item.total_reward ??
    item.rewardCost ??
    item.reward_cost ??
    item.total_reward_cost ??
    item.mCost ??
    item.missionReward ??
    item.totalMissionReward ??
    item.rewardSum ??
    item.total_reward_sum ??
    0;
  const num = Number(raw);
  return !isNaN(num) ? num : 0;
}

// Helper function to extract exchanged points across all possible field variations
function extractExchangedPoints(item: any): number {
  if (!item) return 0;
  const raw =
    item.exchangedPoints ??
    item.exchanged_points ??
    item.exchanged ??
    item.exchangedPoint ??
    item.exchanged_point ??
    item.eCost ??
    item.exchangeAmount ??
    item.exchange_amount ??
    0;
  const num = Number(raw);
  return !isNaN(num) ? num : 0;
}

// Mapping map for Point Home sub-apps whose AppChannel_V appID is empty
const APP_CODE_TO_SN_MAP: Record<string, number> = {
  'ph-mmg': 137,
  'ph-whatisthisnumber': 77,
  'ph-quizanswer': 91,
  'ph-schooltogether': 80,
  'ph-walkingking': 70,
  'ph-specialchars': 92,
  'ph-directblood': 78,
  'ph-raisehand': 93,
};

// Helper to construct exact app condition for ClickHouse queries handling virtual app codes and sub-app appSN mappings
function getAppCond(app: string, column: string = 'appID'): string {
  if (app === 'tc') {
    return '(1 = 1)';
  } else if (app === 'general_all') {
    return `(${column} NOT LIKE 'ph-%' AND ${column} != '')`;
  } else if (app === 'ph_all') {
    return `(${column} LIKE 'ph-%')`;
  } else {
    return `${column} = '${app}'`;
  }
}

function getAppCondWithSn(app: string, appIdCol: string = 'ac.appID', appSnCol: string = 'mp.appSN'): string {
  if (app === 'tc') {
    return '(1 = 1)';
  } else if (app === 'general_all') {
    return `(${appIdCol} NOT LIKE 'ph-%' AND ${appIdCol} != '' AND ${appSnCol} NOT IN (137, 77, 91, 80, 70, 92, 78, 93))`;
  } else if (app === 'ph_all') {
    return `(${appIdCol} LIKE 'ph-%' OR ${appSnCol} IN (137, 77, 91, 80, 70, 92, 78, 93))`;
  } else {
    const targetSN = APP_CODE_TO_SN_MAP[app];
    if (targetSN) {
      return `(${appIdCol} = '${app}' OR ${appSnCol} = ${targetSN})`;
    }
    return `${appIdCol} = '${app}'`;
  }
}

function mergeManualAdRevenue(app: string, from: string, to: string, baseData: any[]): any[] {
  try {
    const fs = require('fs');
    const path = require('path');
    const manualFile = path.resolve(process.cwd(), 'src/lib/manual_ad_revenue.json');
    if (!fs.existsSync(manualFile)) return baseData || [];

    const manualRows: any[] = JSON.parse(fs.readFileSync(manualFile, 'utf8'));
    if (!Array.isArray(manualRows) || manualRows.length === 0) return baseData || [];

    const targetApp = app.toLowerCase();
    const isTotal = targetApp === 'tc' || targetApp === 'ph_all' || targetApp === 'general_all';

    const filteredManual = manualRows.filter((r) => {
      if (!r.dt || r.dt < from || r.dt > to) return false;
      if (isTotal) return true;
      const rApp = (r.app || '').toLowerCase();
      // Strict matching only: exact match or explicit ph- prefix variant.
      return rApp === targetApp || rApp === `ph-${targetApp}` || `ph-${rApp}` === targetApp;
    });

    // Deduplicate by dt+adUnit+grossRevenue to prevent double counting
    const deduped: typeof filteredManual = [];
    const seenKeys = new Set<string>();
    filteredManual.forEach((r) => {
      const key = `${r.dt}_${(r.adUnit || '').toLowerCase()}_${r.grossRevenue}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        deduped.push(r);
      }
    });

    if (deduped.length === 0) return baseData || [];

    const formattedManual = deduped.map((r) => {
      const unit = (r.adUnit || 'OK캐쉬백 매체').toLowerCase();
      const isReward = unit.includes('guru_ri_') || unit.includes('reward') || unit.includes('rc');
      return {
        dt: r.dt,
        adCategory: isReward ? 'reward' : 'display',
        network: r.adUnit || 'OK캐쉬백 매체',
        revenue: Number(r.grossRevenue || 0),
        impression: Number(r.impressions || 0),
        isManual: true,
      };
    });

    // Dates that have manual OK캐쉬백 / Guru ad revenue data
    const manualDates = new Set(formattedManual.map((m) => m.dt));
    const manualKeys = new Set(formattedManual.map((m) => `${m.dt}_${m.network.toLowerCase()}`));

    // Clean baseData: if manual entries exist for OK캐쉬백/Guru on date 'dt',
    // remove any DB raw rows for OK캐쉬백/Guru to prevent double counting (1+1=2x)
    const cleanBase = (baseData || []).filter((b) => {
      const bNet = (b.network || '').toLowerCase();
      const bCat = (b.adCategory || '').toLowerCase();
      const isOkCbDbRow = bNet.includes('okcashback') || bNet.includes('ok캐쉬백') || bNet.includes('guru_') || bCat.includes('okcashback');

      // If it's a DB OK캐쉬백 row on a date where manual OK캐쉬백 entries exist, remove it
      if (isOkCbDbRow && manualDates.has(b.dt)) {
        return false;
      }
      return !manualKeys.has(`${b.dt}_${bNet}`);
    });

    return [...cleanBase, ...formattedManual];
  } catch (e) {
    return baseData || [];
  }
}



async function getNewUserRatio(app: string, from: string, to: string): Promise<number> {
  try {
    const dbApp = (app === 'general_all' || app === 'ph_all') ? 'tc' : app;
    const overviewSql = `
      SELECT 
        sum(activeUserCount) AS totalActive,
        sum(newUserCount) AS totalNew
      FROM Report.Overview__app_from_to_PV(
        app = '${dbApp}',
        from = '${from}',
        to = '${to}'
      )
      SETTINGS max_threads = 2, max_bytes_before_external_group_by = 268435456, max_memory_usage = 4294967296
    `;
    const rows = await queryClickHouse(overviewSql);
    if (Array.isArray(rows) && rows.length > 0) {
      const active = Number(rows[0].totalActive) || 0;
      const newU = Number(rows[0].totalNew) || 0;
      if (active > 0) {
        return Math.min(1, Math.max(0.001, newU / active));
      }
    }
  } catch (e) {
    console.warn("Failed to fetch overview ratio:", e);
  }
  return 0.1;
}

// Helper function to guarantee robust numeric field mapping across live and cached data
function sanitizeDataset(type: string, data: any[], userSegment?: string, newUserRatio: number = 0.1): any[] {
  if (!Array.isArray(data)) return [];

  if (type === 'mission_total') {
    return data.map((item: any) => ({
      ...item,
      totalRewardAmount: extractRewardAmount(item),
      totalCompleteCount: Number(item?.totalCompleteCount ?? item?.total_complete_count ?? item?.completeCount ?? 0) || 0,
      totalParticipantUu: Number(item?.totalParticipantUu ?? item?.total_participant_uu ?? item?.uu ?? 0) || 0,
    }));
  }

  if (type === 'earning') {
    return data.map((item: any) => ({
      ...item,
      exchangedPoints: extractExchangedPoints(item),
      exchangeUu: Number(item?.exchangeUu ?? item?.exchange_uu ?? 0) || 0,
      maxBalanceReachUu: Number(item?.maxBalanceReachUu ?? item?.max_balance_reach_uu ?? 0) || 0,
    }));
  }

  if (type === 'earning_activity') {
    return data.map((item: any) => {
      const rawVal = Number(item?.earningUu ?? item?.earning_uu ?? 0) || 0;
      return {
        ...item,
        earningUu: rawVal,
      };
    });
  }

  if (type === 'mission_by_type') {
    return data.map((item: any) => {
      const rawComplete = Number(item?.completeCount ?? 0) || 0;
      const rawUu = Number(item?.uu ?? 0) || 0;
      const rawReward = Number(item?.rewardAmount ?? 0) || 0;
      return {
        ...item,
        rewardAmount: rawReward,
        completeCount: rawComplete,
        uu: rawUu,
      };
    });
  }

  if (type === 'missions_detail' || type === 'mission_daily_trend') {
    return data.map((item: any) => {
      const rawComplete = Number(item?.completeCount ?? 0) || 0;
      const rawUu = Number(item?.uu ?? 0) || 0;
      return {
        ...item,
        completeCount: rawComplete,
        uu: rawUu,
      };
    });
  }

  if (type === 'page_pv_uv') {
    return data.map((item: any) => ({
      ...item,
      dt: item?.dt ? String(item.dt).split('T')[0] : '',
      label: item?.label || '',
      PV: Number(item?.PV ?? item?.pv ?? 0) || 0,
      UV: Number(item?.UV ?? item?.uv ?? 0) || 0,
    }));
  }

  if (type === 'page_dau') {
    return data.map((item: any) => ({
      ...item,
      DAU: Number(item?.DAU ?? item?.dau ?? 0) || 0,
    }));
  }

  return data;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'overview';

  // Return filtered active app list immediately without checking responseCache
  if (type === 'app_list') {
    const sqlApps = `
      SELECT appID, count() as user_count
      FROM Log.UserFirstSeen_V
      WHERE appID != ''
      GROUP BY appID
      HAVING user_count >= 5
      ORDER BY appID ASC
    `;
    try {
      const rawApps = await queryClickHouse(sqlApps);
      const appNameMap: Record<string, string> = {
        tc: "전체",
        general_all: "일반 (전체)",
        ph_all: "포인트홈 (전체)",
        bitbunny: "비트버니",
        yafit: "야핏무브",
        harustory: "하루스토리",
        kakaopay: "카카오페이",
        toss: "토스",
        kbpay: "KB페이",
        digiloca: "디지로카",
        olock: "오락",
        pass: "PASS",
        passbyKT: "PASS by KT",
        okcashback: "OK캐쉬백",
        benepia: "베네피아",
        benecafe: "베네카페",
        happytoon: "해피툰",
        haruweather: "하루날씨",
        pocketcu: "포켓CU",
        rround: "알라운드",
        wabank: "와뱅",
        zaritalk: "자리톡",
        zum: "줌",
        "3o3": "삼쩜삼",
        bitwalk: "비트워크",
        bppay: "BP페이",
        memog: "메모G",
        treasurer: "트레저러",
        "ph-hw": "포인트홈-하루날씨",
        "ph-mmg": "포인트홈-메모지",
        "ph-whatisthisnumber": "포인트홈-뭐야이번호",
        "ph-schooltogether": "포인트홈-스쿨투게더",
        "ph-quizanswer": "포인트홈-퀴즈정답",
        "ph-walkingking": "포인트홈-걸음왕",
        "ph-specialchars": "포인트홈-특수문자",
        "ph-directblood": "포인트홈-지정헌혈",
        "ph-raisehand": "포인트홈-고발",
        "ph-tvdalin": "포인트홈-TV의달인",
      };

      const coreApps = ["tc", "bitbunny", "yafit", "harustory", "okcashback"];
      const activeAppSet = new Set<string>(coreApps);

      if (Array.isArray(rawApps)) {
        rawApps.forEach((item: any) => {
          const val = item.appID?.trim();
          if (val) {
            activeAppSet.add(val);
          }
        });
      }

      const appList: { label: string; value: string }[] = [];
      activeAppSet.forEach((val) => {
        if (val === "tc") {
          appList.push({ label: "전체 (통합 서비스)", value: "tc" });
        } else {
          const name = appNameMap[val];
          const labelText = name && name !== val ? `${name} (${val})` : val;
          appList.push({ label: labelText, value: val });
        }
      });

      return NextResponse.json({ success: true, data: appList });
    } catch (err: any) {
      console.error("Failed to fetch app_list:", err.message);
      const defaultAppList = [
        { label: "전체 (통합 서비스)", value: "tc" },
        { label: "비트버니 (bitbunny)", value: "bitbunny" },
        { label: "야핏무브 (yafit)", value: "yafit" },
        { label: "하루스토리 (harustory)", value: "harustory" },
        { label: "포인트홈-OK캐쉬백 (ph-okcashback)", value: "ph-okcashback" },
        { label: "OK캐쉬백 (okcashback)", value: "okcashback" },
        { label: "토스 (toss)", value: "toss" },
        { label: "카카오페이 (kakaopay)", value: "kakaopay" },
        { label: "포인트홈-하루날씨 (ph-hw)", value: "ph-hw" },
      ];
      return NextResponse.json({ success: true, data: defaultAppList });
    }
  }

  if (type === 'clear_cache') {
    responseCache.clear();
    appGlobalStore.clear();
    return NextResponse.json({ success: true, message: "Server response cache and global store cleared" });
  }

  let app = searchParams.get('app') || 'tc';
  let from = searchParams.get('from') || '2026-07-03';
  let to = searchParams.get('to') || '2026-07-22';
  const label = searchParams.get('label') || '';
  const userSegment = searchParams.get('userSegment') || 'all';

  // Map virtual aggregated app codes (general_all, ph_all) to 'tc' for ClickHouse parameterized view execution
  const dbApp = (app === 'general_all' || app === 'ph_all') ? 'tc' : app;

  // 1. Sanitize & validate parameters to prevent invalid SQL execution
  if (!APP_CODE_REGEX.test(app)) app = 'tc';
  if (!DATE_REGEX.test(from)) from = '2026-07-03';
  if (!DATE_REGEX.test(to)) to = '2026-07-22';
  if (from > to) {
    const temp = from;
    from = to;
    to = temp;
  }

  // Prevent ClickHouse 'Too many partitions to read. Max 31' exception
  const fromDateObj = new Date(from);
  const toDateObj = new Date(to);
  const diffDays = Math.round((toDateObj.getTime() - fromDateObj.getTime()) / (1000 * 3600 * 24));
  if (diffDays > 30) {
    const clampedFrom = new Date(toDateObj);
    clampedFrom.setDate(clampedFrom.getDate() - 30);
    const y = clampedFrom.getFullYear();
    const m = String(clampedFrom.getMonth() + 1).padStart(2, '0');
    const d = String(clampedFrom.getDate()).padStart(2, '0');
    from = `${y}-${m}-${d}`;
  }

  const steps = searchParams.get('steps') || '';
  const newUserOnly = searchParams.get('newUserOnly') || '';
  const cacheKey = `${type}_${app}_${from}_${to}_${label}_${userSegment}_${steps}_${newUserOnly}`;

  // 1.5 Deterministic Memory Cache Check: Return cached response immediately for identical request parameters
  if (responseCache.has(cacheKey)) {
    const cachedData = responseCache.get(cacheKey)!.data;
    return NextResponse.json({
      success: true,
      mode: 'cached',
      data: cachedData,
    });
  }

  // 2. Circuit Breaker Check: If ClickHouse is currently quota-blocked, DO NOT query DB
  if (isQuotaExceeded) {
    if (Date.now() < quotaResetTime) {
      if (responseCache.has(cacheKey)) {
        const cachedRaw = responseCache.get(cacheKey)!.data;
        const sanitizedCached = sanitizeDataset(type, cachedRaw);
        return NextResponse.json({
          success: true,
          mode: 'cached_fallback',
          warning: 'Circuit Breaker Active: Serving cached data while DB quota resets.',
          data: sanitizedCached,
        });
      }

      // Try Smart Local Date Range Slicing Fallback from appGlobalStore
      const sliced = sliceGlobalStore(app, type, from, to, userSegment);
      if (sliced.length > 0) {
        const sanitizedSliced = sanitizeDataset(type, sliced);
        return NextResponse.json({
          success: true,
          mode: 'sliced_fallback',
          warning: 'Circuit Breaker Active: Serving smart local date-sliced cached data.',
          data: sanitizedSliced,
        });
      }

      return NextResponse.json({
        success: false,
        mode: 'circuit_breaker',
        error: 'ClickHouse server quota currently exceeded. Suppressing DB calls.',
        data: [],
      }, { status: 200 });
    } else {
      isQuotaExceeded = false;
    }
  }

  try {
    let sql = '';

    if (type === 'overview') {
      const appCond = getAppCond(app, 'appID');
      const ufsCond = getAppCond(app, 'fs.appID');
      sql = `
        SELECT 
          d.eventDateKst AS eventDateKst,
          d.activeUserCount AS activeUserCount,
          ifNull(n.newUserCount, 0) AS newUserCount,
          ifNull(e.totalEventCount, 0) AS eventCount
        FROM
        (
          SELECT
            eventDateKst,
            uniqExactMerge(activeUserCount) AS activeUserCount
          FROM Log.DailyActiveUsers
          WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}'
          GROUP BY eventDateKst
        ) AS d
        LEFT JOIN
        (
          SELECT
            fs.firstEventDateKst AS eventDateKst,
            count() AS newUserCount
          FROM Log.UserFirstSeen_V AS fs
          LEFT JOIN Log.AppNewUserWatermark_V AS w ON w.appID = fs.appID
          WHERE ${ufsCond} AND (toInt64OrZero(fs.accountSN) > ifNull(w.watermark, 0)) AND fs.firstEventDateKst >= '${from}' AND fs.firstEventDateKst <= '${to}'
          GROUP BY eventDateKst
        ) AS n ON n.eventDateKst = d.eventDateKst
        LEFT JOIN
        (
          SELECT
            eventDateKst,
            sum(eventCount) AS totalEventCount
          FROM Log.DailyEventCounts_V
          WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}'
          GROUP BY eventDateKst
        ) AS e ON e.eventDateKst = d.eventDateKst
        ORDER BY eventDateKst ASC
        SETTINGS max_threads = 2, max_bytes_before_external_group_by = 268435456, max_memory_usage = 4294967296
      `;
    } else if (type === 'retention') {
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const fromYYYYMMDD = parseInt(from.replace(/-/g, ''), 10);
      const extendedToYYYYMMDD = parseInt(extendedTo.replace(/-/g, ''), 10);
      const appCondUfs = getAppCond(app, 'ufs.appID');
      const appCondUal = getAppCond(app, 'ual.appID');
      sql = `
        WITH 
        cohorts AS (
          SELECT 
            ufs.accountSN AS accountSN,
            ufs.firstEventDateKst AS cohortDateKst
          FROM Log.UserFirstSeen_V AS ufs
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ufs.appID = wm.appID
          WHERE ${appCondUfs}
            AND toInt64OrZero(ufs.accountSN) > ifNull(wm.watermark, 0)
            AND ufs.firstEventDateKst >= '${from}'
            AND ufs.firstEventDateKst <= '${to}'
        ),
        cohort_sizes AS (
          SELECT 
            cohortDateKst, 
            uniqExact(accountSN) AS d0Count
          FROM cohorts
          GROUP BY cohortDateKst
        ),
        ual_filtered AS (
          SELECT 
            accountSN, 
            toDate(toTimeZone(ts, 'Asia/Seoul')) AS actionDate
          FROM Log.UserActionLog AS ual
          WHERE ual.env = 'prod'
            AND ${appCondUal}
            AND toYYYYMMDD(ual.ts) >= ${fromYYYYMMDD}
            AND toYYYYMMDD(ual.ts) <= ${extendedToYYYYMMDD}
          GROUP BY accountSN, actionDate
        ),
        retention_raw AS (
          SELECT 
            c.cohortDateKst AS cohortDateKst,
            dateDiff('day', c.cohortDateKst, u.actionDate) AS dayN,
            count() AS retainedUserCount
          FROM cohorts AS c
          INNER JOIN ual_filtered AS u ON u.accountSN = c.accountSN
          WHERE u.actionDate >= c.cohortDateKst
            AND dateDiff('day', c.cohortDateKst, u.actionDate) <= 30
          GROUP BY cohortDateKst, dayN
        )
        SELECT 
          r.cohortDateKst AS cohortDate,
          r.dayN AS dayN,
          r.retainedUserCount AS retainedUserCount,
          if(b.d0Count > 0, round(r.retainedUserCount / b.d0Count * 100, 2), 0) AS retentionRate
        FROM retention_raw AS r
        INNER JOIN cohort_sizes AS b ON r.cohortDateKst = b.cohortDateKst
        ORDER BY cohortDate ASC, dayN ASC
        SETTINGS max_threads = 4, max_bytes_before_external_group_by = 268435456, max_memory_usage = 4294967296, max_partitions_to_read = 1000, max_rows_to_read = 0
      `;
    } else if (type === 'earning_activation') {
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const fromYYYYMMDD = parseInt(from.replace(/-/g, ''), 10);
      const extendedToYYYYMMDD = parseInt(extendedTo.replace(/-/g, ''), 10);
      const appCondUfs = getAppCond(app, 'ufs.appID');
      const appCondUal = getAppCond(app, 'ual.appID');
      sql = `
        WITH 
        cohorts AS (
          SELECT 
            ufs.accountSN AS accountSN,
            ufs.firstEventDateKst AS cohortDateKst
          FROM Log.UserFirstSeen_V AS ufs
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ufs.appID = wm.appID
          WHERE ${appCondUfs}
            AND toInt64OrZero(ufs.accountSN) > ifNull(wm.watermark, 0)
            AND ufs.firstEventDateKst >= '${from}'
            AND ufs.firstEventDateKst <= '${to}'
        ),
        cohort_sizes AS (
          SELECT 
            cohortDateKst, 
            uniqExact(accountSN) AS d0Count
          FROM cohorts
          GROUP BY cohortDateKst
        ),
        ual_filtered AS (
          SELECT 
            accountSN, 
            toDate(toTimeZone(ts, 'Asia/Seoul')) AS actionDate
          FROM Log.UserActionLog AS ual
          WHERE ual.env = 'prod'
            AND ${appCondUal}
            AND toYYYYMMDD(ual.ts) >= ${fromYYYYMMDD}
            AND toYYYYMMDD(ual.ts) <= ${extendedToYYYYMMDD}
            AND (
              ual.label LIKE 'reward_%' 
              OR ual.label LIKE '%mission%' 
              OR ual.label LIKE '%complete%' 
              OR ual.label LIKE '%confirm%' 
              OR ual.label LIKE '%claim%' 
              OR ual.label LIKE '%earn%'
            )
          GROUP BY accountSN, actionDate
        ),
        earning_raw AS (
          SELECT 
            c.cohortDateKst AS cohortDateKst,
            dateDiff('day', c.cohortDateKst, u.actionDate) AS dayN,
            count() AS activatedUu
          FROM cohorts AS c
          INNER JOIN ual_filtered AS u ON u.accountSN = c.accountSN
          WHERE u.actionDate >= c.cohortDateKst
            AND dateDiff('day', c.cohortDateKst, u.actionDate) <= 30
          GROUP BY cohortDateKst, dayN
        )
        SELECT 
          r.cohortDateKst AS cohortDate,
          r.dayN AS dayN,
          r.activatedUu AS activatedUu,
          if(b.d0Count > 0, round(r.activatedUu / b.d0Count * 100, 2), 0) AS activationRate
        FROM earning_raw AS r
        INNER JOIN cohort_sizes AS b ON r.cohortDateKst = b.cohortDateKst
        ORDER BY cohortDate ASC, dayN ASC
        SETTINGS max_threads = 4, max_bytes_before_external_group_by = 268435456, max_memory_usage = 4294967296, max_partitions_to_read = 1000, max_rows_to_read = 0
      `;
    } else if (type === 'attendance_activation') {
      const appCondUfs = getAppCond(app, 'ufs.appID');
      const appCondCr = getAppCond(app, 'ac.appID');
      sql = `
        WITH 
        cohorts AS (
          SELECT 
            ufs.appID AS appID,
            ufs.accountSN AS accountSN,
            ufs.firstEventDateKst AS cohortDateKst
          FROM Log.UserFirstSeen_V AS ufs
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ufs.appID = wm.appID
          WHERE ${appCondUfs}
            AND toInt64OrZero(ufs.accountSN) > ifNull(wm.watermark, 0)
            AND ufs.firstEventDateKst >= '${from}'
            AND ufs.firstEventDateKst <= '${to}'
        ),
        cohort_sizes AS (
          SELECT 
            cohortDateKst, 
            uniqExact(accountSN) AS d0Count
          FROM cohorts
          GROUP BY cohortDateKst
        ),
        attendance_raw AS (
          SELECT 
            c.cohortDateKst AS cohortDateKst,
            dateDiff('day', c.cohortDateKst, toDate(cr.dt)) AS dayN,
            uniqExact(toString(cr.accountSN)) AS activatedUu
          FROM cohorts AS c
          INNER JOIN Performance.CheckInRecord_Raw AS cr ON toString(cr.accountSN) = c.accountSN
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
          WHERE ${appCondCr}
            AND toDate(cr.dt) >= '${from}'
            AND toDate(cr.dt) >= c.cohortDateKst
            AND dateDiff('day', c.cohortDateKst, toDate(cr.dt)) <= 30
          GROUP BY cohortDateKst, dayN
        )
        SELECT 
          r.cohortDateKst AS cohortDate,
          r.dayN AS dayN,
          r.activatedUu AS activatedUu,
          if(b.d0Count > 0, round(r.activatedUu / b.d0Count * 100, 2), 0) AS activationRate
        FROM attendance_raw AS r
        INNER JOIN cohort_sizes AS b ON r.cohortDateKst = b.cohortDateKst
        ORDER BY cohortDate ASC, dayN ASC
      `;
    } else if (type === 'funnels') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          funnel,
          step,
          uniqExactMerge(reachedUserCount) AS reachedUserCount,
          sumMerge(reachedSessionCount) AS reachedSessionCount
        FROM Log.UserDailyFunnels
        WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}'
        GROUP BY funnel, step
        ORDER BY funnel ASC, step ASC
      `;
    } else if (type === 'funnel_steps') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          funnel,
          step,
          uniqExactMerge(reachedUserCount) AS reachedUserCount,
          sumMerge(reachedSessionCount) AS reachedSessionCount
        FROM Log.UserDailyFunnels
        WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}'
        GROUP BY funnel, step
        ORDER BY funnel ASC, step ASC
      `;
    } else if (type === 'page_pv_uv' || type === 'page_dau') {
      const appCond = getAppCond(app, 'appID');
      const rawLabels = searchParams.get('labels');
      const labelList = rawLabels 
        ? rawLabels.split(',').map(l => `'${l.trim().replace(/'/g, "")}'`).filter(Boolean)
        : ["'all_tab_view'", "'today_tab_view'", "'library_tab_view'", "'free_tab_view'", "'reward_tab_view'"];
      const labelInList = labelList.join(',');
      const fromYYYYMMDD = parseInt(from.replace(/-/g, ''), 10);
      const toYYYYMMDD = parseInt(to.replace(/-/g, ''), 10);

      if (type === 'page_pv_uv') {
        sql = `
          SELECT toDate(toTimeZone(ts, 'Asia/Seoul')) AS dt,
                 label,
                 count() AS PV,
                 uniqExact(accountSN) AS UV
          FROM Log.UserActionLog
          WHERE env = 'prod'
            AND ${appCond}
            AND toYYYYMMDD(ts) >= ${fromYYYYMMDD}
            AND toYYYYMMDD(ts) <= ${toYYYYMMDD}
            AND event = 'impression'
            AND label IN (${labelInList})
          GROUP BY dt, label
          ORDER BY dt ASC, label ASC
          SETTINGS max_threads = 4, max_rows_to_read = 0
        `;
      } else {
        sql = `
          SELECT toDate(toTimeZone(ts, 'Asia/Seoul')) AS dt,
                 uniqExact(accountSN) AS DAU
          FROM Log.UserActionLog
          WHERE env = 'prod'
            AND ${appCond}
            AND toYYYYMMDD(ts) >= ${fromYYYYMMDD}
            AND toYYYYMMDD(ts) <= ${toYYYYMMDD}
            AND event = 'impression'
            AND label IN (${labelInList})
          GROUP BY dt
          ORDER BY dt ASC
          SETTINGS max_threads = 4, max_rows_to_read = 0
        `;
      }
    } else if (type === 'custom_funnel') {
      const stepsParam = searchParams.get('steps') || '';
      const stepList = stepsParam.split(',').map(s => s.trim()).filter(Boolean);
      const newUserOnly = searchParams.get('newUserOnly') === '1';

      if (stepList.length >= 2) {
        const appCond = getAppCond(app, 'ual.appID');
        const stepConds = stepList.map(s => {
          if (s === 'reward_mission_complete_any' || s === 'any_mission_complete' || s === 'mission_complete_any') {
            return `(ual.label IN ('reward_book_mission_complete_click', 'reward_otter_click_book_8', 'reward_snack_ad_click', 'reward_snack_mission_complete_click', 'reward_drink_ad_click', 'reward_drink_mission_complete_click', 'reward_episode_mission_complete_click', 'reward_mission_complete_click', 'reward_scroll_mission_complete_click', 'reward_tip_ad_click', 'reward_tip_confirm_click'))`;
          }
          if (s === 'reward_attendance_day_any' || s === 'reward_attendance_day{n}_click') {
            return `(ual.label LIKE 'reward_attendance_day%_click' OR ual.label LIKE 'reward_attendance_day%_complete_click')`;
          }
          return `ual.label = '${s.replace(/'/g, "''")}'`;
        }).join(', ');

        const labelInList = stepList.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');

        if (newUserOnly) {
          // New-user-only funnel: JOIN with watermark + UserFirstSeen to restrict to new users
          sql = `
            SELECT 
              level_step AS step, 
              countIf(level >= level_step) AS reachedSessionCount, 
              uniqExactIf(accountSN, level >= level_step) AS reachedUserCount 
            FROM (
              SELECT 
                ual.accountSN AS accountSN, 
                windowFunnel(86400)(toDateTime(ual.ts), ${stepConds}) AS level 
              FROM Log.UserActionLog AS ual
              INNER JOIN Log.UserFirstSeen_V AS ufs 
                ON ual.appID = ufs.appID AND ual.accountSN = ufs.accountSN
              LEFT JOIN Log.AppNewUserWatermark_V AS wm
                ON ual.appID = wm.appID
              WHERE ual.env = 'prod' 
                AND ${appCond} 
                AND ual.label IN (${labelInList})
                AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) >= '${from}' 
                AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) <= '${to}' 
                AND toInt64OrZero(ual.accountSN) > ifNull(wm.watermark, 0)
                AND ufs.firstEventDateKst >= '${from}'
                AND ufs.firstEventDateKst <= '${to}'
              GROUP BY ual.appID, ual.accountSN
            ) ARRAY JOIN range(1, ${stepList.length + 1}) AS level_step 
            GROUP BY level_step 
            ORDER BY level_step ASC
            SETTINGS max_partitions_to_read = 300, max_rows_to_read = 2000000000, max_bytes_to_read = 20000000000, max_threads = 4
          `;
        } else {
          // All-user funnel (existing behavior)
          sql = `
            SELECT 
              level_step AS step, 
              countIf(level >= level_step) AS reachedSessionCount, 
              uniqExactIf(accountSN, level >= level_step) AS reachedUserCount 
            FROM (
              SELECT 
                ual.accountSN AS accountSN, 
                windowFunnel(86400)(toDateTime(ual.ts), ${stepConds}) AS level 
              FROM Log.UserActionLog AS ual
              WHERE ual.env = 'prod' 
                AND ${appCond} 
                AND ual.label IN (${labelInList})
                AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) >= '${from}' 
                AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) <= '${to}' 
              GROUP BY ual.appID, ual.accountSN, if(ual.parentSessionID != '', ual.parentSessionID, ual.sessionID)
            ) ARRAY JOIN range(1, ${stepList.length + 1}) AS level_step 
            GROUP BY level_step 
            ORDER BY level_step ASC
            SETTINGS max_partitions_to_read = 300, max_rows_to_read = 2000000000, max_bytes_to_read = 20000000000, max_threads = 4
          `;
        }
      } else {
        sql = `SELECT 1 AS step, 0 AS reachedSessionCount, 0 AS reachedUserCount`;
      }
    } else if (type === 'funnel_daily_trend') {
      const stepsParam = searchParams.get('steps') || '';
      const stepList = stepsParam.split(',').map(s => s.trim()).filter(Boolean);

      if (stepList.length >= 2) {
        const appCond = getAppCond(app, 'ual.appID');
        const stepConds = stepList.map(s => {
          if (s === 'reward_mission_complete_any' || s === 'any_mission_complete' || s === 'mission_complete_any') {
            return `(ual.label IN ('reward_book_mission_complete_click', 'reward_otter_click_book_8', 'reward_snack_ad_click', 'reward_snack_mission_complete_click', 'reward_drink_ad_click', 'reward_drink_mission_complete_click', 'reward_episode_mission_complete_click', 'reward_mission_complete_click', 'reward_scroll_mission_complete_click', 'reward_tip_ad_click', 'reward_tip_confirm_click'))`;
          }
          if (s === 'reward_attendance_day_any' || s === 'reward_attendance_day{n}_click') {
            return `(ual.label LIKE 'reward_attendance_day%_click' OR ual.label LIKE 'reward_attendance_day%_complete_click')`;
          }
          return `ual.label = '${s.replace(/'/g, "''")}'`;
        }).join(', ');

        const labelInList = stepList.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');

        sql = `
          SELECT 
            dt,
            level_step AS step, 
            countIf(level >= level_step) AS reachedSessionCount, 
            uniqExactIf(accountSN, level >= level_step) AS reachedUserCount 
          FROM (
            SELECT 
              toDate(toTimeZone(ual.ts, 'Asia/Seoul')) AS dt,
              ual.accountSN AS accountSN, 
              windowFunnel(86400)(toDateTime(ual.ts), ${stepConds}) AS level 
            FROM Log.UserActionLog AS ual
            WHERE ual.env = 'prod' 
              AND ${appCond} 
              AND ual.label IN (${labelInList})
              AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) >= '${from}' 
              AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) <= '${to}' 
            GROUP BY dt, ual.appID, ual.accountSN, if(ual.parentSessionID != '', ual.parentSessionID, ual.sessionID)
          ) ARRAY JOIN range(1, ${stepList.length + 1}) AS level_step 
          GROUP BY dt, level_step 
          ORDER BY dt ASC, level_step ASC
          SETTINGS max_partitions_to_read = 300, max_rows_to_read = 2000000000, max_bytes_to_read = 20000000000, max_threads = 4
        `;
      } else {
        sql = `SELECT '2026-09-01' AS dt, 1 AS step, 0 AS reachedSessionCount, 0 AS reachedUserCount`;
      }
    } else if (type === 'churn') {
      const churnSql = `
        SELECT
          cur.eventDateKst                                           AS date,
          cur.activeUserCount                                        AS dau,
          cur.newUserCount                                           AS newUser,
          (ifNull(prev.activeUserCount, 0) - cur.activeUserCount + cur.newUserCount) AS churn,
          if(
            (ifNull(prev.activeUserCount, 0) - ifNull(prev.newUserCount, 0)) > 0,
            (ifNull(prev.activeUserCount, 0) - cur.activeUserCount + cur.newUserCount) /
            (ifNull(prev.activeUserCount, 0) - ifNull(prev.newUserCount, 0)),
            0
          )                                                          AS churnRate
        FROM (
          SELECT * FROM Report.Overview__app_from_to_PV(
            app = '${dbApp}',
            from = '${from}',
            to = '${to}'
          )
        ) AS cur
        LEFT JOIN (
          SELECT * FROM Report.Overview__app_from_to_PV(
            app = '${dbApp}',
            from = '${from}',
            to = '${to}'
          )
        ) AS prev
        ON prev.eventDateKst = dateAdd('day', -1, cur.eventDateKst)
        ORDER BY cur.eventDateKst ASC
        SETTINGS max_threads = 2, max_memory_usage = 4294967296,
                max_bytes_before_external_group_by = 268435456;
      `;
      sql = churnSql;
    } else if (type === 'event_catalog') {
      sql = `
        SELECT *
        FROM Report.EventCatalog__app_PV(
          app = '${dbApp}'
        )
        ORDER BY totalEventCount DESC
      `;
    } else if (type === 'mission_total') {
      const appCondMp = getAppCondWithSn(app, 'ac.appID', 'mp.appSN');
      const appCondRc = getAppCondWithSn(app, 'ac.appID', 'rc.appSN');

      if (userSegment === "all") {
        sql = `
          WITH distinct_mp AS (
            SELECT 
              mp.dt AS dt,
              mp.participationSN AS itemSN,
              toUInt64(coalesce(mp.rewardAmount, 0)) AS rewardP,
              mp.accountSN AS accountSN
            FROM Performance.MissionParticipation_Raw AS mp
            LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
            WHERE mp.dt >= '${from}' AND mp.dt <= '${to}'
              AND ${appCondMp}
              AND mp.status = 'COMPLETED'
              AND mp.rewardType IN ('POINT', 'DIRECT')
              AND mp.missionSN > 0
            GROUP BY dt, itemSN, rewardP, accountSN
          ),
          distinct_rc AS (
            SELECT 
              rc.dt AS dt,
              rc.seq AS itemSN,
              toUInt64(coalesce(rc.rewardAmount, 0)) AS rewardP,
              rc.accountSN AS accountSN
            FROM Performance.RCPayload_Raw AS rc
            LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = rc.appSN
            WHERE rc.dt >= '${from}' AND rc.dt <= '${to}'
              AND ${appCondRc}
              AND rc.status = 2
              AND rc.subType BETWEEN 101 AND 112
            GROUP BY dt, itemSN, rewardP, accountSN
          ),
          combined AS (
            SELECT * FROM distinct_mp
            UNION ALL
            SELECT * FROM distinct_rc
          )
          SELECT 
            dt,
            count(itemSN) AS totalCompleteCount,
            uniqExact(accountSN) AS totalParticipantUu,
            sum(rewardP) AS totalRewardAmount
          FROM combined
          GROUP BY dt
          ORDER BY dt ASC
          SETTINGS max_partitions_to_read = 100
        `;
      } else {
        const segCondMp = userSegment === "new"
          ? `AND toInt64OrZero(toString(mp.accountSN)) > wm.watermark`
          : `AND (toInt64OrZero(toString(mp.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`;
        const segCondRc = userSegment === "new"
          ? `AND toInt64OrZero(toString(rc.accountSN)) > wm.watermark`
          : `AND (toInt64OrZero(toString(rc.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`;

        sql = `
          WITH distinct_mp AS (
            SELECT 
              mp.dt AS dt,
              mp.participationSN AS itemSN,
              toUInt64(coalesce(mp.rewardAmount, 0)) AS rewardP,
              mp.accountSN AS accountSN
            FROM Performance.MissionParticipation_Raw AS mp
            LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
            LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
            WHERE mp.dt >= '${from}' AND mp.dt <= '${to}'
              AND ${appCondMp}
              AND mp.status = 'COMPLETED'
              AND mp.rewardType IN ('POINT', 'DIRECT')
              AND mp.missionSN > 0
              ${segCondMp}
            GROUP BY dt, itemSN, rewardP, accountSN
          ),
          distinct_rc AS (
            SELECT 
              rc.dt AS dt,
              rc.seq AS itemSN,
              toUInt64(coalesce(rc.rewardAmount, 0)) AS rewardP,
              rc.accountSN AS accountSN
            FROM Performance.RCPayload_Raw AS rc
            LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = rc.appSN
            LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
            WHERE rc.dt >= '${from}' AND rc.dt <= '${to}'
              AND ${appCondRc}
              AND rc.status = 2
              AND rc.subType BETWEEN 101 AND 112
              ${segCondRc}
            GROUP BY dt, itemSN, rewardP, accountSN
          ),
          combined AS (
            SELECT * FROM distinct_mp
            UNION ALL
            SELECT * FROM distinct_rc
          )
          SELECT 
            dt,
            count(itemSN) AS totalCompleteCount,
            uniqExact(accountSN) AS totalParticipantUu,
            sum(rewardP) AS totalRewardAmount
          FROM combined
          GROUP BY dt
          ORDER BY dt ASC
          SETTINGS max_partitions_to_read = 100
        `;
      }
    } else if (type === 'missions_detail') {
      const appCondMp = getAppCondWithSn(app, 'ac.appID', 'mp.appSN');
      const appCondRc = getAppCondWithSn(app, 'ac.appID', 'rc.appSN');

      const segCondMp = userSegment === "new"
        ? `AND toInt64OrZero(toString(mp.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(mp.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      const segCondRc = userSegment === "new"
        ? `AND toInt64OrZero(toString(rc.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(rc.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      sql = `
        WITH distinct_mp AS (
          SELECT 
            mp.dt AS dt,
            mp.participationSN AS itemSN,
            upper(m.missionType) AS label,
            toUInt64(coalesce(mp.rewardAmount, 0)) AS rewardP,
            mp.accountSN AS accountSN
          FROM Performance.MissionParticipation_Raw AS mp
          INNER JOIN Performance.Mission_V AS m ON m.missionSN = mp.missionSN
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE mp.dt >= '${from}' AND mp.dt <= '${to}'
            AND ${appCondMp}
            AND mp.status = 'COMPLETED'
            AND mp.rewardType IN ('POINT', 'DIRECT')
            AND mp.missionSN > 0
            ${segCondMp}
          GROUP BY dt, itemSN, label, rewardP, accountSN
        ),
        distinct_rc AS (
          SELECT 
            rc.dt AS dt,
            rc.seq AS itemSN,
            'RC' AS label,
            toUInt64(coalesce(rc.rewardAmount, 0)) AS rewardP,
            rc.accountSN AS accountSN
          FROM Performance.RCPayload_Raw AS rc
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = rc.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE rc.dt >= '${from}' AND rc.dt <= '${to}'
            AND ${appCondRc}
            AND rc.status = 2
            AND rc.subType BETWEEN 101 AND 112
            ${segCondRc}
          GROUP BY dt, itemSN, label, rewardP, accountSN
        ),
        combined AS (
          SELECT * FROM distinct_mp
          UNION ALL
          SELECT * FROM distinct_rc
        ),
        summed AS (
          SELECT 
            label,
            count(itemSN) AS completeCount,
            uniqExact(accountSN) AS uu,
            sum(rewardP) AS rewardAmount
          FROM combined
          GROUP BY label
        )
        SELECT 
          label,
          multiIf(
            label = 'CLEANING', '책 정리',
            label = 'SNACK', '간식',
            label = 'DRINK', '음료',
            label = 'RECOMMENDATION', '추천작',
            label = 'TIP', '팁',
            label = 'SCROLL', '스크롤',
            label = 'RC', 'RC',
            '기타'
          ) AS missionName,
          completeCount,
          uu,
          rewardAmount,
          if(uu > 0, round(completeCount / uu, 1), 0) AS avgPerUser,
          if(completeCount > 0, round(rewardAmount / completeCount, 1), 0) AS rewardPerComplete
        FROM summed
        ORDER BY completeCount DESC
        SETTINGS max_partitions_to_read = 100
      `;
    } else if (type === 'mission_daily_trend') {
      const appCondMp = getAppCondWithSn(app, 'ac.appID', 'mp.appSN');
      const appCondRc = getAppCondWithSn(app, 'ac.appID', 'rc.appSN');

      const segCondMp = userSegment === "new"
        ? `AND toInt64OrZero(toString(mp.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(mp.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      const segCondRc = userSegment === "new"
        ? `AND toInt64OrZero(toString(rc.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(rc.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      sql = `
        WITH distinct_mp AS (
          SELECT 
            mp.dt AS dt,
            mp.participationSN AS itemSN,
            upper(m.missionType) AS label,
            toUInt64(coalesce(mp.rewardAmount, 0)) AS rewardP,
            mp.accountSN AS accountSN
          FROM Performance.MissionParticipation_Raw AS mp
          INNER JOIN Performance.Mission_V AS m ON m.missionSN = mp.missionSN
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE mp.dt >= '${from}' AND mp.dt <= '${to}'
            AND ${appCondMp}
            AND mp.status = 'COMPLETED'
            AND mp.rewardType IN ('POINT', 'DIRECT')
            AND mp.missionSN > 0
            ${segCondMp}
          GROUP BY dt, itemSN, label, rewardP, accountSN
        ),
        distinct_rc AS (
          SELECT 
            rc.dt AS dt,
            rc.seq AS itemSN,
            'RC' AS label,
            toUInt64(coalesce(rc.rewardAmount, 0)) AS rewardP,
            rc.accountSN AS accountSN
          FROM Performance.RCPayload_Raw AS rc
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = rc.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE rc.dt >= '${from}' AND rc.dt <= '${to}'
            AND ${appCondRc}
            AND rc.status = 2
            AND rc.subType BETWEEN 101 AND 112
            ${segCondRc}
          GROUP BY dt, itemSN, label, rewardP, accountSN
        ),
        combined AS (
          SELECT * FROM distinct_mp
          UNION ALL
          SELECT * FROM distinct_rc
        )
        SELECT 
          dt,
          label,
          multiIf(
            label = 'CLEANING', '책 정리',
            label = 'SNACK', '간식',
            label = 'DRINK', '음료',
            label = 'RECOMMENDATION', '추천작',
            label = 'TIP', '팁',
            label = 'SCROLL', '스크롤',
            label = 'RC', 'RC',
            '기타'
          ) AS missionName,
          count(itemSN) AS completeCount,
          uniqExact(accountSN) AS uu,
          sum(rewardP) AS rewardAmount,
          if(uniqExact(accountSN) > 0, round(count(itemSN) / uniqExact(accountSN), 1), 0) AS avgPerUser,
          if(count(itemSN) > 0, round(sum(rewardP) / count(itemSN), 1), 0) AS rewardPerComplete
        FROM combined
        GROUP BY dt, label
        ORDER BY dt ASC, completeCount DESC
        SETTINGS max_partitions_to_read = 100
      `;
    } else if (type === 'mission_by_type') {
      const appCondMp = getAppCondWithSn(app, 'ac.appID', 'mp.appSN');
      const appCondRc = getAppCondWithSn(app, 'ac.appID', 'rc.appSN');

      const segCondMp = userSegment === "new"
        ? `AND toInt64OrZero(toString(mp.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(mp.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      const segCondRc = userSegment === "new"
        ? `AND toInt64OrZero(toString(rc.accountSN)) > wm.watermark`
        : userSegment === "returning"
        ? `AND (toInt64OrZero(toString(rc.accountSN)) <= wm.watermark OR wm.watermark IS NULL)`
        : ``;

      sql = `
        WITH distinct_mp AS (
          SELECT 
            mp.dt AS dt,
            mp.participationSN AS itemSN,
            upper(m.missionType) AS missionType,
            toUInt64(coalesce(mp.rewardAmount, 0)) AS rewardP,
            mp.accountSN AS accountSN
          FROM Performance.MissionParticipation_Raw AS mp
          INNER JOIN Performance.Mission_V AS m ON m.missionSN = mp.missionSN
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = mp.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE mp.dt >= '${from}' AND mp.dt <= '${to}'
            AND ${appCondMp}
            AND mp.status = 'COMPLETED'
            AND mp.rewardType IN ('POINT', 'DIRECT')
            AND mp.missionSN > 0
            ${segCondMp}
          GROUP BY dt, itemSN, missionType, rewardP, accountSN
        ),
        distinct_rc AS (
          SELECT 
            rc.dt AS dt,
            rc.seq AS itemSN,
            'RC' AS missionType,
            toUInt64(coalesce(rc.rewardAmount, 0)) AS rewardP,
            rc.accountSN AS accountSN
          FROM Performance.RCPayload_Raw AS rc
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = rc.appSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE rc.dt >= '${from}' AND rc.dt <= '${to}'
            AND ${appCondRc}
            AND rc.status = 2
            AND rc.subType BETWEEN 101 AND 112
            ${segCondRc}
          GROUP BY dt, itemSN, missionType, rewardP, accountSN
        ),
        combined AS (
          SELECT * FROM distinct_mp
          UNION ALL
          SELECT * FROM distinct_rc
        )
        SELECT 
          missionType,
          count(itemSN) AS completeCount,
          uniqExact(accountSN) AS uu,
          sum(rewardP) AS rewardAmount
        FROM combined
        GROUP BY missionType
        ORDER BY completeCount DESC
        SETTINGS max_partitions_to_read = 100
      `;
    } else if (type === 'attendance_daily') {
      const appCond = getAppCond(app, 'ac.appID');
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const segCond = userSegment === "all" ? "" : userSegment === "new"
        ? `AND cr.accountSN > wm.watermark AND ufs.firstEventDateKst >= '${from}' AND ufs.firstEventDateKst <= '${to}'`
        : `AND (cr.accountSN <= wm.watermark OR ufs.firstEventDateKst < '${from}' OR ufs.firstEventDateKst IS NULL)`;
      sql = `
        SELECT
          cr.dt AS dt,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 1) AS day1ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 2) AS day2ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 3) AS day3ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 4) AS day4ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 5) AS day5ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 6) AS day6ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 7) AS day7ClickUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay IN (3, 6) AND cr.hasAdReward = 1) AS adMoreUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay IN (3, 6) AND (cr.hasAdReward = 0 OR cr.hasAdReward IS NULL)) AS adSkipUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 3 AND cr.hasAdReward = 1) AS day3AdMoreUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 3 AND (cr.hasAdReward = 0 OR cr.hasAdReward IS NULL)) AS day3AdSkipUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 6 AND cr.hasAdReward = 1) AS day6AdMoreUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 6 AND (cr.hasAdReward = 0 OR cr.hasAdReward IS NULL)) AS day6AdSkipUserCount,
          uniqExact(cr.accountSN) AS completeUserCount
        FROM Performance.CheckInRecord_Raw AS cr
        LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
        LEFT JOIN Log.UserFirstSeen_V AS ufs ON ac.appID = ufs.appID AND toString(cr.accountSN) = ufs.accountSN
        LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
        WHERE ${appCond}
          AND cr.dt >= '${from}' AND cr.dt <= '${extendedTo}'
          ${segCond}
        GROUP BY dt
        ORDER BY dt DESC
      `;
    } else if (type === 'attendance_completion') {
      const appCond = getAppCond(app, 'ac.appID');
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const segCond = userSegment === "all" ? "" : userSegment === "new"
        ? `AND cr.accountSN > wm.watermark AND ufs.firstEventDateKst >= '${from}' AND ufs.firstEventDateKst <= '${to}'`
        : `AND (cr.accountSN <= wm.watermark OR ufs.firstEventDateKst < '${from}' OR ufs.firstEventDateKst IS NULL)`;
      sql = `
        SELECT 
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 1) AS day1CompleteUserCount,
          uniqExactIf(cr.accountSN, cr.consecutiveDay = 7) AS completeUserCount,
          if(day1CompleteUserCount > 0, completeUserCount / day1CompleteUserCount, 0) AS completionRate
        FROM Performance.CheckInRecord_Raw AS cr
        LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
        LEFT JOIN Log.UserFirstSeen_V AS ufs ON ac.appID = ufs.appID AND toString(cr.accountSN) = ufs.accountSN
        LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
        WHERE ${appCond}
          AND cr.dt >= '${from}' AND cr.dt <= '${extendedTo}'
          ${segCond}
      `;
    } else if (type === 'attendance_steps') {
      const appCond = getAppCond(app, 'ac.appID');
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const segCond = userSegment === "all" ? "" : userSegment === "new"
        ? `AND cr.accountSN > wm.watermark AND ufs.firstEventDateKst >= '${from}' AND ufs.firstEventDateKst <= '${to}'`
        : `AND (cr.accountSN <= wm.watermark OR ufs.firstEventDateKst < '${from}' OR ufs.firstEventDateKst IS NULL)`;
      sql = `
        SELECT 
          dayNo AS attendanceDayNo,
          completeUserCount,
          if(day1Count > 0, completeUserCount / day1Count, 0) AS reachRate
        FROM (
          SELECT 
            uniqExactIf(cr.accountSN, cr.consecutiveDay = 1) AS day1Count
          FROM Performance.CheckInRecord_Raw AS cr
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
          LEFT JOIN Log.UserFirstSeen_V AS ufs ON ac.appID = ufs.appID AND toString(cr.accountSN) = ufs.accountSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE ${appCond}
            AND cr.dt >= '${from}' AND cr.dt <= '${extendedTo}'
            ${segCond}
        ) AS base
        CROSS JOIN (
          SELECT 
            toUInt8(cr.consecutiveDay) AS dayNo,
            uniqExact(cr.accountSN) AS completeUserCount
          FROM Performance.CheckInRecord_Raw AS cr
          LEFT JOIN Performance.AppChannel_V AS ac ON ac.appSN = cr.appSN
          LEFT JOIN Log.UserFirstSeen_V AS ufs ON ac.appID = ufs.appID AND toString(cr.accountSN) = ufs.accountSN
          LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ac.appID = wm.appID
          WHERE ${appCond}
            AND cr.dt >= '${from}' AND cr.dt <= '${extendedTo}'
            AND cr.consecutiveDay BETWEEN 1 AND 7
            ${segCond}
          GROUP BY dayNo
        ) AS steps
        ORDER BY attendanceDayNo ASC
      `;
    } else if (type === 'earning_activity') {
      const appCond = getAppCond(app, 'ual.appID');
      let segCond = "";
      if (userSegment === "new") {
        segCond = `AND toInt64OrZero(ual.accountSN) > wm.watermark`;
      } else if (userSegment === "existing") {
        segCond = `AND (toInt64OrZero(ual.accountSN) <= wm.watermark OR wm.watermark IS NULL)`;
      }
      sql = `
        SELECT 
          toDate(toTimeZone(ual.ts, 'Asia/Seoul')) AS dt,
          uniqExact(ual.accountSN) AS earningUu
        FROM Log.UserActionLog AS ual
        LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ual.appID = wm.appID
        WHERE ual.env = 'prod' AND ${appCond}
          AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) >= '${from}'
          AND toDate(toTimeZone(ual.ts, 'Asia/Seoul')) <= '${to}'
          AND (ual.label LIKE 'reward_%' OR ual.label LIKE 'earn_%')
          ${segCond}
        GROUP BY dt
        ORDER BY dt DESC
      `;
    } else if (type === 'ad_revenue') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          dt,
          adCategory,
          network,
          round(sum(revenue), 2) AS revenue,
          sum(impression) AS impression
        FROM Performance.AdRevenueDaily_V
        WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}'
        GROUP BY dt, adCategory, network
        ORDER BY dt ASC, revenue DESC
      `;
    } else if (type === 'content_revenue') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          dt,
          sumMerge(contentRevenueCoin) AS revenueCoin,
          sumMerge(contentRevenueWon) AS revenueWon,
          uniqExactMerge(contentPayerUu) AS payerUu,
          sumMerge(chargeCoin) AS chargeCoin,
          sumMerge(chargeWon) AS chargeWon,
          round(revenueCoin / nullIf(payerUu, 0), 1) AS arppuCoin,
          round(revenueWon / nullIf(payerUu, 0)) AS arppuWon
        FROM Performance.CashDaily
        WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}'
        GROUP BY dt
        ORDER BY dt ASC
      `;
    } else if (type === 'content_view') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          v.eventDateKst AS dt,
          v.readerUu,
          v.episodeViewCount,
          round(v.episodeViewCount / nullIf(v.readerUu, 0), 2) AS avgEpisodesPerReader,
          v.nextEpisodeUu,
          round((v.nextEpisodeUu / nullIf(v.readerUu, 0)) * 100, 2) AS nextEpisodeContinueRate,
          p.waitfreeUu,
          round((p.waitfreeUu / nullIf(v.readerUu, 0)) * 100, 2) AS waitfreeEpisodeRate
        FROM
        (
          SELECT 
            eventDateKst,
            uniqExactMergeIf(uniqueUserCount, match(label, '^common_[a-z]+_episode[0-9]+_click$') OR match(label, '^common_[a-z]+_cta_click$') OR (label IN ('common_content_next_episode_click', 'common_content_prev_episode_click'))) AS readerUu,
            uniqExactMergeIf(eventCount, match(label, '^common_[a-z]+_episode[0-9]+_click$') OR match(label, '^common_[a-z]+_cta_click$') OR (label IN ('common_content_next_episode_click', 'common_content_prev_episode_click'))) AS episodeViewCount,
            uniqExactMergeIf(uniqueUserCount, label = 'common_content_next_episode_click') AS nextEpisodeUu
          FROM Log.DailyContentEvents
          WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}'
          GROUP BY eventDateKst
        ) AS v
        LEFT JOIN
        (
          SELECT 
            dt,
            uniqExactMerge(uu) AS waitfreeUu
          FROM Performance.ContentPurchaseDaily
          WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}' AND purchaseType = 11
          GROUP BY dt
        ) AS p ON p.dt = v.eventDateKst
        ORDER BY dt ASC
      `;
    } else if (type === 'content') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          contentType,
          genre,
          content,
          uniqExactMergeIf(eventCount, event = 'impression') AS impressionCount,
          uniqExactMergeIf(eventCount, event = 'click') AS clickCount,
          uniqExactMergeIf(uniqueUserCount, event = 'click') AS clickUserCount,
          round((clickCount / nullIf(impressionCount, 0)) * 100, 2) AS clickRate
        FROM Log.DailyContentEvents
        WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}' AND content != ''
        GROUP BY contentType, genre, content
        ORDER BY clickCount DESC
        LIMIT 2000
      `;
    } else if (type === 'genres') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          genre,
          uniqExactMergeIf(eventCount, event = 'impression') AS impressionCount,
          uniqExactMergeIf(eventCount, event = 'click') AS clickCount,
          uniqExactMergeIf(uniqueUserCount, event = 'click') AS clickUserCount,
          round((clickCount / nullIf(impressionCount, 0)) * 100, 2) AS clickRate
        FROM Log.DailyContentEvents
        WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}' AND genre != ''
        GROUP BY genre
        ORDER BY clickCount DESC
      `;
    } else if (type === 'content_purchase') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          dt,
          purchaseType,
          uniqExactMerge(cnt) AS cnt,
          uniqExactMerge(uu) AS uu
        FROM Performance.ContentPurchaseDaily
        WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}'
        GROUP BY dt, purchaseType
        ORDER BY dt ASC, purchaseType ASC
      `;
    } else if (type === 'service_total_revenue') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          dt,
          round(contentPayWon) AS contentPayRevenue,
          round(adTicketRevenue) AS adTicketRevenue,
          round(giftBoxRevenue) AS giftBoxRevenue,
          round((contentPayWon + adTicketRevenue) + giftBoxRevenue) AS serviceTotalRevenue
        FROM
        (
          SELECT 
            c.dt AS dt,
            sum(c.won) AS contentPayWon,
            sum(ifNull(a.adt, 0)) AS adTicketRevenue,
            sum(ifNull(g.gb, 0)) AS giftBoxRevenue
          FROM
          (
            SELECT 
              dt,
              sumMerge(contentRevenueWon) AS won
            FROM Performance.CashDaily
            WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}'
            GROUP BY dt
          ) AS c
          LEFT JOIN
          (
            SELECT 
              dt,
              sum(revenue) AS adt
            FROM Performance.AdRevenueDaily_V
            WHERE adCategory = 'adTicket' AND ${appCond} AND dt >= '${from}' AND dt <= '${to}'
            GROUP BY dt
          ) AS a ON a.dt = c.dt
          LEFT JOIN
          (
            SELECT 
              dt,
              sum(revenue) AS gb
            FROM Performance.AdRevenueDaily_V
            WHERE placeName LIKE '%toon_cafe%' AND ${appCond} AND dt >= '${from}' AND dt <= '${to}'
            GROUP BY dt
          ) AS g ON g.dt = c.dt
          GROUP BY c.dt
        )
        ORDER BY dt ASC
      `;
    } else if (type === 'earning') {
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          dt,
          sumMerge(exchangedPoints) AS exchangedPoints,
          uniqExactMerge(exchangeUu) AS exchangeUu,
          uniqExactMerge(maxBalanceReachUu) AS maxBalanceReachUu,
          sumMerge(paidRewardAmount) AS paidRewardAmount
        FROM Performance.EarningDaily
        WHERE ${appCond} AND dt >= '${from}' AND dt <= '${to}'
        GROUP BY dt
        ORDER BY dt ASC
      `;
    } else if (type === 'label_counts') {
      if (!label) {
        return NextResponse.json({ success: false, error: 'label parameter is required' }, { status: 400 });
      }
      const appCond = getAppCond(app, 'appID');
      sql = `
        SELECT 
          eventDateKst,
          event,
          label,
          uniqExactMerge(eventCount) AS eventCount,
          uniqExactMerge(uniqueUserCount) AS uniqueUserCount
        FROM Log.DailyEventCounts
        WHERE ${appCond} AND eventDateKst >= '${from}' AND eventDateKst <= '${to}' AND label LIKE '${label}'
        GROUP BY eventDateKst, event, label
        ORDER BY eventCount DESC
      `;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type parameter' }, { status: 400 });
    }

    const newUserRatio = userSegment !== 'all' ? await getNewUserRatio(app, from, to) : 1.0;

    let data = await queryClickHouse(sql);

    // Dynamic Live Raw Log Fallback & Complete Date Series Fill for 'overview' query
    if (type === 'overview') {
      const rowMap: Record<string, any> = {};
      if (Array.isArray(data)) {
        data.forEach((r: any) => {
          const d = String(r.eventDateKst || r.date || "").slice(0, 10);
          if (d) rowMap[d] = r;
        });
      }

      const appCondUal = getAppCond(app, 'appID');
      const rawDauSql = `
        SELECT 
          toDate(toTimeZone(ts, 'Asia/Seoul')) AS dt,
          uniqExact(accountSN) AS activeUserCount,
          count() AS eventCount
        FROM Log.UserActionLog
        WHERE env = 'prod' AND ${appCondUal}
          AND toDate(toTimeZone(ts, 'Asia/Seoul')) >= '${from}'
          AND toDate(toTimeZone(ts, 'Asia/Seoul')) <= '${to}'
        GROUP BY dt
      `;

      const appCondUfs = getAppCond(app, 'ufs.appID');
      const rawNewUserSql = `
        SELECT 
          ufs.firstEventDateKst AS dt,
          uniqExact(ufs.accountSN) AS newUserCount
        FROM Log.UserFirstSeen_V AS ufs
        LEFT JOIN Log.AppNewUserWatermark_V AS wm ON ufs.appID = wm.appID
        WHERE ${appCondUfs}
          AND toInt64OrZero(ufs.accountSN) > ifNull(wm.watermark, 0)
          AND ufs.firstEventDateKst >= '${from}'
          AND ufs.firstEventDateKst <= '${to}'
        GROUP BY dt
      `;

      try {
        const [rawDauRows, rawNewUserRows] = await Promise.all([
          queryClickHouse(rawDauSql).catch(() => []),
          queryClickHouse(rawNewUserSql).catch(() => []),
        ]);

        const rawDauMap: Record<string, any> = {};
        if (Array.isArray(rawDauRows)) {
          rawDauRows.forEach((r: any) => {
            const d = String(r.dt || "").slice(0, 10);
            if (d) rawDauMap[d] = r;
          });
        }

        const rawNewUserMap: Record<string, any> = {};
        if (Array.isArray(rawNewUserRows)) {
          rawNewUserRows.forEach((r: any) => {
            const d = String(r.dt || "").slice(0, 10);
            if (d) rawNewUserMap[d] = r;
          });
        }

        const dateList: string[] = [];
        const curDate = new Date(from);
        const endDate = new Date(to);
        while (curDate <= endDate) {
          const y = curDate.getFullYear();
          const m = String(curDate.getMonth() + 1).padStart(2, '0');
          const d = String(curDate.getDate()).padStart(2, '0');
          dateList.push(`${y}-${m}-${d}`);
          curDate.setDate(curDate.getDate() + 1);
        }

        data = dateList.map((dt) => {
          const existing = rowMap[dt];
          const rawDau = rawDauMap[dt];
          const rawNew = rawNewUserMap[dt];

          const activeUserCount = String(
            Math.max(
              Number(existing?.activeUserCount || 0),
              Number(rawDau?.activeUserCount || 0)
            )
          );
          const newUserCount = String(
            Math.max(
              Number(existing?.newUserCount || 0),
              Number(rawNew?.newUserCount || 0)
            )
          );
          const eventCount = String(
            Math.max(
              Number(existing?.eventCount || 0),
              Number(rawDau?.eventCount || 0)
            )
          );

          return {
            eventDateKst: dt,
            activeUserCount,
            newUserCount,
            eventCount,
          };
        });
      } catch (e) {
        console.warn("Failed complete date series overview fallback:", e);
      }
    }


    // Dynamic Live Raw Log Fallback for 'attendance_daily'
    if (type === 'attendance_daily' && (!Array.isArray(data) || data.length === 0)) {
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const appCondUal = getAppCond(app, 'appID');
      const fallbackSql = `
        WITH attendance_events AS (
          SELECT 
            accountSN,
            toDate(toTimeZone(ts, 'Asia/Seoul')) AS dt,
            extract(label, 'reward_attendance_day(\\d+)') AS dayStr,
            label
          FROM Log.UserActionLog
          WHERE ${appCondUal} AND env = 'prod'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) >= '${from}'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) <= '${extendedTo}'
            AND label LIKE 'reward_attendance_day%'
        )
        SELECT 
          dt,
          uniqExactIf(accountSN, dayStr = '1') AS day1ClickUserCount,
          uniqExactIf(accountSN, dayStr = '2') AS day2ClickUserCount,
          uniqExactIf(accountSN, dayStr = '3') AS day3ClickUserCount,
          uniqExactIf(accountSN, dayStr = '4') AS day4ClickUserCount,
          uniqExactIf(accountSN, dayStr = '5') AS day5ClickUserCount,
          uniqExactIf(accountSN, dayStr = '6') AS day6ClickUserCount,
          uniqExactIf(accountSN, dayStr = '7') AS day7ClickUserCount,
          uniqExactIf(accountSN, dayStr IN ('3', '6') AND label LIKE '%ad%') AS adMoreUserCount,
          uniqExactIf(accountSN, dayStr IN ('3', '6') AND label NOT LIKE '%ad%') AS adSkipUserCount,
          uniqExactIf(accountSN, dayStr = '3' AND label LIKE '%ad%') AS day3AdMoreUserCount,
          uniqExactIf(accountSN, dayStr = '3' AND label NOT LIKE '%ad%') AS day3AdSkipUserCount,
          uniqExactIf(accountSN, dayStr = '6' AND label LIKE '%ad%') AS day6AdMoreUserCount,
          uniqExactIf(accountSN, dayStr = '6' AND label NOT LIKE '%ad%') AS day6AdSkipUserCount,
          uniqExact(accountSN) AS completeUserCount
        FROM attendance_events
        GROUP BY dt
        ORDER BY dt DESC
      `;
      try {
        const fallbackData = await queryClickHouse(fallbackSql);
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          data = fallbackData;
        }
      } catch (e) {
        console.warn("Failed attendance_daily fallback:", e);
      }
    }

    // Dynamic Live Raw Log Fallback for 'attendance_completion'
    if (type === 'attendance_completion' && (!Array.isArray(data) || data.length === 0 || (data.length === 1 && !data[0].day1CompleteUserCount))) {
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const appCondUal = getAppCond(app, 'appID');
      const fallbackSql = `
        WITH attendance_events AS (
          SELECT 
            accountSN,
            extract(label, 'reward_attendance_day(\\d+)') AS dayStr
          FROM Log.UserActionLog
          WHERE ${appCondUal} AND env = 'prod'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) >= '${from}'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) <= '${extendedTo}'
            AND label LIKE 'reward_attendance_day%'
        )
        SELECT 
          uniqExactIf(accountSN, dayStr = '1') AS day1CompleteUserCount,
          uniqExactIf(accountSN, dayStr = '7') AS completeUserCount,
          if(day1CompleteUserCount > 0, completeUserCount / day1CompleteUserCount, 0) AS completionRate
        FROM attendance_events
      `;
      try {
        const fallbackData = await queryClickHouse(fallbackSql);
        if (Array.isArray(fallbackData) && fallbackData.length > 0 && fallbackData[0].day1CompleteUserCount > 0) {
          data = fallbackData;
        }
      } catch (e) {
        console.warn("Failed attendance_completion fallback:", e);
      }
    }

    // Dynamic Live Raw Log Fallback for 'attendance_steps'
    if (type === 'attendance_steps' && (!Array.isArray(data) || data.length === 0)) {
      const addDaysStr = (dStr: string, days: number) => {
        const d = new Date(dStr);
        d.setDate(d.getDate() + days);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const extendedTo = addDaysStr(to, 6);
      const appCondUal = getAppCond(app, 'appID');
      const fallbackSql = `
        WITH attendance_events AS (
          SELECT 
            accountSN,
            extract(label, 'reward_attendance_day(\\d+)') AS dayStr
          FROM Log.UserActionLog
          WHERE ${appCondUal} AND env = 'prod'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) >= '${from}'
            AND toDate(toTimeZone(ts, 'Asia/Seoul')) <= '${extendedTo}'
            AND label LIKE 'reward_attendance_day%'
        ),
        day_users AS (
          SELECT 
            toUInt8(dayStr) AS dayNo,
            uniqExact(accountSN) AS completeUserCount
          FROM attendance_events
          WHERE dayStr != '' AND toUInt8(dayStr) BETWEEN 1 AND 7
          GROUP BY dayNo
        ),
        day1_base AS (
          SELECT uniqExact(accountSN) AS day1Count
          FROM attendance_events
          WHERE dayStr = '1'
        )
        SELECT 
          d.dayNo AS attendanceDayNo,
          d.completeUserCount AS completeUserCount,
          if(b.day1Count > 0, round(d.completeUserCount / b.day1Count, 4), 0) AS reachRate
        FROM day_users AS d
        CROSS JOIN day1_base AS b
        ORDER BY attendanceDayNo ASC
      `;
      try {
        const fallbackData = await queryClickHouse(fallbackSql);
        if (Array.isArray(fallbackData) && fallbackData.length > 0) {
          data = fallbackData;
        }
      } catch (e) {
        console.warn("Failed attendance_steps fallback:", e);
      }
    }

    data = sanitizeDataset(type, data, userSegment, newUserRatio);

    if (type === 'ad_revenue') {
      data = mergeManualAdRevenue(app, from, to, data || []);
    }

    if (Array.isArray(data) && data.length > 0) {
      responseCache.set(cacheKey, { timestamp: Date.now(), data });
      updateGlobalStore(app, type, data, userSegment);
    } else {
      let sliced = sliceGlobalStore(app, type, from, to, userSegment);
      if (type === 'ad_revenue') {
        sliced = mergeManualAdRevenue(app, from, to, sliced || []);
      }
      if (sliced.length > 0) {
        data = sanitizeDataset(type, sliced, userSegment, newUserRatio);
        responseCache.set(cacheKey, { timestamp: Date.now(), data });
      }
    }

    return NextResponse.json({
      success: true,
      mode: Array.isArray(data) && data.length > 0 ? 'live' : 'sliced_fallback',
      data: data,
    });
  } catch (error: any) {
    console.error('ClickHouse fetch failed:', error);

    if (error?.message?.includes('QUOTA_EXCEEDED') || error?.message?.includes('Quota for user')) {
      isQuotaExceeded = true;
      quotaResetTime = Date.now() + 3 * 60 * 1000;
    }

    const newUserRatio = userSegment !== 'all' ? await getNewUserRatio(app, from, to) : 1.0;

    if (responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey)!;
      if (Array.isArray(cached.data) && cached.data.length > 0) {
        const sanitizedCached = sanitizeDataset(type, cached.data, userSegment, newUserRatio);
        return NextResponse.json({
          success: true,
          mode: 'cached_fallback',
          warning: 'ClickHouse quota limit reached. Using cached response.',
          data: sanitizedCached,
        });
      }
    }

    // Try Smart Local Date Range Slicing Fallback from appGlobalStore on error
    const sliced = sliceGlobalStore(app, type, from, to, userSegment);
    if (sliced.length > 0) {
      const sanitizedSliced = sanitizeDataset(type, sliced, userSegment, newUserRatio);
      return NextResponse.json({
        success: true,
        mode: 'sliced_fallback',
        warning: 'ClickHouse quota limit reached. Serving smart local date-sliced data.',
        data: sanitizedSliced,
      });
    }

    return NextResponse.json({
      success: false,
      mode: 'quota_exceeded',
      error: error.message || 'ClickHouse server error',
      data: [],
    }, { status: 200 });
  }
}
