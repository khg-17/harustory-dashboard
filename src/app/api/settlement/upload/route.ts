import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.resolve(process.cwd(), "src/lib/manual_ad_revenue.json");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { app = "okcashback", records = [] } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, message: "업로드할 매출 데이터가 없습니다." },
        { status: 400 }
      );
    }

    let existingData: any[] = [];
    if (fs.existsSync(DATA_FILE)) {
      try {
        existingData = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      } catch (e) {
        existingData = [];
      }
    }

    // Set of keys to upsert (replace existing records for same app, dt, adUnit)
    const newKeys = new Set(
      records.map((r: any) => `${r.app || app}_${r.dt}_${r.adUnit || "default"}`)
    );

    const filteredExisting = existingData.filter(
      (item: any) => !newKeys.has(`${item.app}_${item.dt}_${item.adUnit || "default"}`)
    );

    const updatedData = [...filteredExisting, ...records];

    // Ensure directory exists
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2), "utf8");

    return NextResponse.json({
      success: true,
      message: `${records.length}건의 매체 광고 매출 데이터가 저장되었습니다.`,
      count: records.length,
    });
  } catch (err: any) {
    console.error("Upload settlement Exception:", err);
    return NextResponse.json(
      { success: false, message: err.message || "엑셀 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
      return NextResponse.json({ success: true, data });
    }
    return NextResponse.json({ success: true, data: [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, data: [] });
  }
}
