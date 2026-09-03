import { NextRequest, NextResponse } from 'next/server';

function getDateChunks(startStr: string, endStr: string, chunkSizeDays: number = 7) {
  const chunks: { startDate: string; endDate: string }[] = [];

  const parseYyyyMmDd = (s: string) =>
    new Date(
      Date.UTC(
        parseInt(s.slice(0, 4), 10),
        parseInt(s.slice(4, 6), 10) - 1,
        parseInt(s.slice(6, 8), 10)
      )
    );

  const formatYyyyMmDd = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  let cur = parseYyyyMmDd(startStr);
  const end = parseYyyyMmDd(endStr);

  while (cur <= end) {
    const chunkEnd = new Date(cur.getTime());
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + (chunkSizeDays - 1));
    const actualEnd = chunkEnd > end ? end : chunkEnd;

    chunks.push({
      startDate: formatYyyyMmDd(cur),
      endDate: formatYyyyMmDd(actualEnd),
    });

    cur = new Date(actualEnd.getTime());
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return chunks;
}

// Temporary in-memory cache with short TTL (5 minutes) - NEVER saved permanently to disk
interface CacheEntry {
  timestamp: number;
  data: any;
}
const settlementDayStore = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes TTL to allow live API re-fetching of updated settlement figures

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from') || '';
    const toParam = searchParams.get('to') || '';
    const appSNParam = searchParams.get('appSN') || '';
    const forceRefresh = searchParams.get('refresh') === '1' || searchParams.get('force') === 'true';

    // Calculate KST yesterday limit (yyyyMMdd)
    const nowUtc = new Date();
    const kstOffsetMs = 9 * 60 * 60 * 1000;
    const kstDate = new Date(nowUtc.getTime() + kstOffsetMs);
    kstDate.setUTCDate(kstDate.getUTCDate() - 1); // Yesterday in KST

    const yyyy = kstDate.getUTCFullYear();
    const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getUTCDate()).padStart(2, '0');
    const maxKstYesterday = `${yyyy}${mm}${dd}`;

    // Format dates to yyyyMMdd
    let startDate = fromParam ? fromParam.replace(/-/g, '') : '20260101';
    let endDate = toParam ? toParam.replace(/-/g, '') : maxKstYesterday;

    // Enforce 2026-01-01 min constraint
    if (startDate < '20260101') {
      startDate = '20260101';
    }

    // Enforce max KST yesterday constraint
    if (endDate > maxKstYesterday) {
      endDate = maxKstYesterday;
    }

    // Enforce startDate <= endDate
    if (startDate > endDate) {
      startDate = endDate;
    }

    const startFormatted = `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
    const endFormatted = `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`;

    // Generate list of required YYYY-MM-DD dates in the range
    const requiredDates: string[] = [];
    let curDateObj = new Date(`${startFormatted}T00:00:00Z`);
    const endDateObj = new Date(`${endFormatted}T00:00:00Z`);
    while (curDateObj <= endDateObj) {
      const y = curDateObj.getUTCFullYear();
      const m = String(curDateObj.getUTCMonth() + 1).padStart(2, '0');
      const d = String(curDateObj.getUTCDate()).padStart(2, '0');
      requiredDates.push(`${y}-${m}-${d}`);
      curDateObj.setUTCDate(curDateObj.getUTCDate() + 1);
    }

    // Check which dates are missing or expired in settlementDayStore
    const now = Date.now();
    const missingDates = requiredDates.filter((d) => {
      if (forceRefresh) return true;
      const storeKey = `${d}_${appSNParam}`;
      const entry = settlementDayStore.get(storeKey);
      if (!entry) return true;
      if (now - entry.timestamp > CACHE_TTL_MS) return true; // Expired after 5 mins
      return false;
    });

    // IF ALL DATES ARE IN VALID UNEXPIRED MEMORY CACHE -> RETURN IMMEDIATELY
    if (missingDates.length === 0) {
      const cachedItems = requiredDates
        .map((d) => settlementDayStore.get(`${d}_${appSNParam}`)?.data)
        .filter(Boolean);

      return NextResponse.json({
        success: true,
        startDate: startFormatted,
        endDate: endFormatted,
        data: cachedItems,
        cached: true,
        instant: true,
      });
    }

    // FETCH MISSING OR EXPIRED DATE RANGES LIVE FROM EXTERNAL SETTLEMENT API
    const minMissingYyyyMmDd = missingDates[0].replace(/-/g, '');
    const maxMissingYyyyMmDd = missingDates[missingDates.length - 1].replace(/-/g, '');

    const channelId = process.env.SETTLEMENT_API_CHANNEL_ID || 'guru';
    const channelSecret = process.env.SETTLEMENT_API_CHANNEL_SECRET || '41697d0dad';
    const apiUrl = process.env.SETTLEMENT_API_URL || 'https://admin.treasurecomics.com/api/internal/v1/settlements/daily';
    const authHeader = `Basic ${Buffer.from(`${channelId}:${channelSecret}`).toString('base64')}`;

    const chunks = getDateChunks(minMissingYyyyMmDd, maxMissingYyyyMmDd, 7);

    const chunkFetchPromises = chunks.map(async (chunk) => {
      let targetUrl = `${apiUrl}?startDate=${chunk.startDate}&endDate=${chunk.endDate}`;
      if (appSNParam) {
        targetUrl += `&appSN=${encodeURIComponent(appSNParam)}`;
      }
      try {
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Settlement API Chunk Error (${chunk.startDate}~${chunk.endDate}):`, response.status, errorText);
          return [];
        }

        const json = await response.json();
        if (json && json.result === 'success' && json.data && Array.isArray(json.data.data)) {
          return json.data.data;
        }
        return [];
      } catch (err) {
        console.error(`Settlement API Chunk Exception (${chunk.startDate}~${chunk.endDate}):`, err);
        return [];
      }
    });

    const results = await Promise.all(chunkFetchPromises);
    const newlyFetched = results.flat();

    // Store newly fetched items into day store with current timestamp (5 min TTL)
    newlyFetched.forEach((item) => {
      if (item && item.date) {
        const storeKey = `${item.date}_${appSNParam}`;
        settlementDayStore.set(storeKey, {
          timestamp: Date.now(),
          data: item,
        });
      }
    });

    // Assemble final response containing all required dates
    const finalItems = requiredDates
      .map((d) => settlementDayStore.get(`${d}_${appSNParam}`)?.data)
      .filter(Boolean)
      .sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')));

    return NextResponse.json({
      success: true,
      startDate: startFormatted,
      endDate: endFormatted,
      data: finalItems,
    });
  } catch (error: any) {
    console.error('Settlement API Fetch Exception:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch settlement data',
        data: [],
      },
      { status: 500 }
    );
  }
}
