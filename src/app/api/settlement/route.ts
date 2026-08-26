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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from') || '';
    const toParam = searchParams.get('to') || '';

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

    const channelId = process.env.SETTLEMENT_API_CHANNEL_ID || 'guru';
    const channelSecret = process.env.SETTLEMENT_API_CHANNEL_SECRET || '41697d0dad';
    const apiUrl = process.env.SETTLEMENT_API_URL || 'https://admin.treasurecomics.com/api/internal/v1/settlements/daily';

    const authHeader = `Basic ${Buffer.from(`${channelId}:${channelSecret}`).toString('base64')}`;

    // Chunk into 7-day requests to avoid external server timeouts/500 errors on long ranges
    const chunks = getDateChunks(startDate, endDate, 7);

    const chunkFetchPromises = chunks.map(async (chunk) => {
      const targetUrl = `${apiUrl}?startDate=${chunk.startDate}&endDate=${chunk.endDate}`;
      try {
        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          cache: 'no-store',
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
    const combinedData = results.flat();

    // Deduplicate by date in case of overlapping boundaries and sort by date ascending
    const dataMap = new Map<string, any>();
    combinedData.forEach((item) => {
      if (item && item.date) {
        dataMap.set(item.date, item);
      }
    });

    const sortedData = Array.from(dataMap.values()).sort((a, b) =>
      String(a?.date || "").localeCompare(String(b?.date || ""))
    );

    const startFormatted = `${startDate.slice(0, 4)}-${startDate.slice(4, 6)}-${startDate.slice(6, 8)}`;
    const endFormatted = `${endDate.slice(0, 4)}-${endDate.slice(4, 6)}-${endDate.slice(6, 8)}`;

    return NextResponse.json({
      success: true,
      startDate: startFormatted,
      endDate: endFormatted,
      data: sortedData,
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
