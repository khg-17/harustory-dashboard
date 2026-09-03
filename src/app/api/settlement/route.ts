import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

// Server-side granular per-day in-memory and persistent disk cache
const settlementDayStore = new Map<string, any>(); // Key: `${YYYY-MM-DD}_${appSNParam}`
const diskCachePath = path.resolve(process.cwd(), '.cache/settlement_disk_cache.json');

// Initialize & load disk cache on module load
try {
  const cacheDir = path.dirname(diskCachePath);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  if (fs.existsSync(diskCachePath)) {
    const rawDisk = fs.readFileSync(diskCachePath, 'utf8');
    const parsedDisk: Record<string, any> = JSON.parse(rawDisk);
    Object.entries(parsedDisk).forEach(([key, val]) => {
      if (key && val) {
        settlementDayStore.set(key, val);
      }
    });
    console.log(`[Settlement Cache] Loaded ${settlementDayStore.size} day items from disk cache.`);
  }
} catch (e) {
  console.warn('[Settlement Cache] Disk cache init warning:', e);
}

// Flush memory cache to disk asynchronously
function saveDiskCache() {
  try {
    const obj: Record<string, any> = {};
    settlementDayStore.forEach((val, key) => {
      obj[key] = val;
    });
    fs.writeFileSync(diskCachePath, JSON.stringify(obj), 'utf8');
  } catch (e) {
    console.warn('[Settlement Cache] Save to disk error:', e);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from') || '';
    const toParam = searchParams.get('to') || '';
    const appSNParam = searchParams.get('appSN') || '';

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

    // Check which dates are missing from settlementDayStore
    const missingDates = requiredDates.filter((d) => {
      const storeKey = `${d}_${appSNParam}`;
      return !settlementDayStore.has(storeKey);
    });

    // IF ALL DATES ARE ALREADY IN CACHE -> RETURN IMMEDIATELY (SUB-10ms INSTANT RESPONSE)
    if (missingDates.length === 0) {
      const cachedItems = requiredDates
        .map((d) => settlementDayStore.get(`${d}_${appSNParam}`))
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

    // FETCH ONLY MISSING DATE RANGES FROM EXTERNAL SETTLEMENT API
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

    // Store newly fetched items into day store
    let hasNewData = false;
    newlyFetched.forEach((item) => {
      if (item && item.date) {
        const storeKey = `${item.date}_${appSNParam}`;
        settlementDayStore.set(storeKey, item);
        hasNewData = true;
      }
    });

    // Save to disk if new items were stored
    if (hasNewData) {
      saveDiskCache();
    }

    // Assemble final response containing all required dates
    const finalItems = requiredDates
      .map((d) => settlementDayStore.get(`${d}_${appSNParam}`))
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
