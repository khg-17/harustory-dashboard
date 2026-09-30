"use client";

import React, { useState, useMemo } from "react";
import { Upload, X, Check, FileSpreadsheet, AlertCircle, RefreshCw } from "lucide-react";

export interface ParsedAdRecord {
  dt: string;
  app: string;
  adUnit: string;
  grossRevenue: number;
  netRevenue: number;
  impressions: number;
  clicks: number;
}

interface ExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultApp?: string;
}

export const parseMediaReportText = (
  text: string,
  appCode: string = "okcashback",
  aggregateByDate: boolean = false
): ParsedAdRecord[] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Determine delimiter (Tab or Comma)
  const headerLine = lines[0];
  const delimiter = headerLine.includes("\t") ? "\t" : ",";
  const headers = headerLine.split(delimiter).map((h) => h.trim().toLowerCase());

  let dateIdx = headers.findIndex((h) => h.includes("date") || h.includes("날짜") || h === "dt");
  let appIdx = headers.findIndex((h) => h.includes("app") || h.includes("앱"));
  let unitIdx = headers.findIndex((h) => h.includes("unit") || h.includes("지면") || h.includes("ad"));
  let revIdx = headers.findIndex((h) => h.includes("earnings") || h.includes("revenue") || h.includes("수익") || h.includes("매출"));
  let impIdx = headers.findIndex((h) => h.includes("impression") || h.includes("노출"));
  let clickIdx = headers.findIndex((h) => h.includes("click") || h.includes("클릭"));

  // Fallbacks if header line is not present or non-standard
  if (dateIdx === -1) dateIdx = 2;
  if (unitIdx === -1) unitIdx = 1;
  if (revIdx === -1) revIdx = 3;
  if (impIdx === -1) impIdx = 9;
  if (clickIdx === -1) clickIdx = 11;

  const hasHeader = headers.some(
    (h) => h.includes("date") || h.includes("app") || h.includes("unit") || h.includes("earning") || h.includes("수익")
  );

  const startLineIdx = hasHeader ? 1 : 0;
  const rawRecords: ParsedAdRecord[] = [];

  for (let i = startLineIdx; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length < 3) continue;

    const rawDate = cols[dateIdx] || "";
    const dateMatch = rawDate.match(/\d{4}-\d{2}-\d{2}/);
    if (!dateMatch) continue;
    const dt = dateMatch[0];

    const rawUnit = cols[unitIdx] || "OK캐쉬백 매체 지면";
    const rawRev = parseFloat((cols[revIdx] || "0").replace(/,/g, "")) || 0;
    const rawImp = parseInt((cols[impIdx] || "0").replace(/,/g, ""), 10) || 0;
    const rawClick = parseInt((cols[clickIdx] || "0").replace(/,/g, ""), 10) || 0;

    const grossRev = Math.max(0, rawRev);

    rawRecords.push({
      dt,
      app: appCode,
      adUnit: rawUnit,
      grossRevenue: Math.round(grossRev * 100) / 100,
      netRevenue: Math.round(grossRev * 0.2 * 100) / 100,
      impressions: rawImp,
      clicks: rawClick,
    });
  }

  if (!aggregateByDate) {
    return rawRecords.sort((a, b) => b.dt.localeCompare(a.dt) || a.adUnit.localeCompare(b.adUnit));
  }

  // Optional Daily aggregate
  const dailyMap: Record<string, ParsedAdRecord> = {};
  rawRecords.forEach((r) => {
    if (!dailyMap[r.dt]) {
      dailyMap[r.dt] = {
        dt: r.dt,
        app: r.app,
        adUnit: "OK캐쉬백 매체 통합",
        grossRevenue: 0,
        netRevenue: 0,
        impressions: 0,
        clicks: 0,
      };
    }
    dailyMap[r.dt].grossRevenue += r.grossRevenue;
    dailyMap[r.dt].impressions += r.impressions;
    dailyMap[r.dt].clicks += r.clicks;
  });

  Object.values(dailyMap).forEach((r) => {
    r.grossRevenue = Math.round(r.grossRevenue * 100) / 100;
    r.netRevenue = Math.round(r.grossRevenue * 0.2 * 100) / 100;
  });

  return Object.values(dailyMap).sort((a, b) => b.dt.localeCompare(a.dt));
};

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultApp = "okcashback",
}) => {
  const [inputText, setInputText] = useState("");
  const [targetApp, setTargetApp] = useState(defaultApp);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const parsedRecords = useMemo(() => {
    return parseMediaReportText(inputText, targetApp);
  }, [inputText, targetApp]);

  const stats = useMemo(() => {
    let totalGross = 0;
    let totalNet = 0;
    const dateSet = new Set<string>();
    const unitSet = new Set<string>();

    parsedRecords.forEach((r) => {
      totalGross += r.grossRevenue;
      totalNet += r.netRevenue;
      dateSet.add(r.dt);
      unitSet.add(r.adUnit);
    });

    const sortedDates = Array.from(dateSet).sort();
    const dateRangeStr =
      sortedDates.length > 0
        ? `${sortedDates[0]} ~ ${sortedDates[sortedDates.length - 1]}`
        : "-";

    return {
      count: parsedRecords.length,
      days: dateSet.size,
      dateRangeStr,
      unitsCount: unitSet.size,
      totalGross: Math.round(totalGross),
      totalNet: Math.round(totalNet),
    };
  }, [parsedRecords]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleSave = async () => {
    if (parsedRecords.length === 0) {
      setMessage({ type: "error", text: "업로드/입력된 데이터 중 유효한 행이 없습니다." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settlement/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: targetApp,
          records: parsedRecords,
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Clear server memory cache so fresh data with uploaded revenue is fetched immediately
        try {
          await fetch("/api/clickhouse?type=clear_cache");
        } catch (e) {
          // Ignore cache clear error
        }

        setMessage({
          type: "success",
          text: `🎉 ${json.count}건의 엑셀 데이터가 DB에 정상 저장되었습니다!`,
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setMessage({ type: "error", text: json.message || "저장에 실패했습니다." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "네트워크 오류가 발생했습니다." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_16px_48px_rgba(0,0,0,0.18)] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e5e8eb] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#3182f6]" />
            <h3 className="text-base font-bold text-[#191f28]">
              외부 매체사 엑셀/TSV 정산 데이터 업로드 (OK캐쉬백)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-[#8b95a1] hover:text-[#191f28] hover:bg-[#e5e8eb] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Instructions & File Upload Zone */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#4e5968]">
                1. 엑셀 파일 선택 또는 텍스트/표 붙여넣기
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8b95a1]">적용 대상 앱:</span>
                <select
                  value={targetApp}
                  onChange={(e) => setTargetApp(e.target.value)}
                  className="bg-[#f8f9fa] border border-[#e5e8eb] rounded-lg px-2.5 py-1 text-xs font-bold text-[#191f28] focus:outline-none"
                >
                  <option value="okcashback">OK캐쉬백 (okcashback)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* File Input */}
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#b2d6ff] bg-[#f8f9fa] hover:bg-[#e8f3ff] rounded-2xl p-4 cursor-pointer transition-all text-center">
                <Upload className="w-6 h-6 text-[#3182f6] mb-1.5" />
                <span className="text-xs font-bold text-[#191f28]">엑셀/CSV 파일 선택</span>
                <span className="text-[11px] text-[#8b95a1] mt-0.5">.csv, .tsv, .txt 지원</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Paste helper note */}
              <div className="bg-[#f8f9fa] border border-[#e5e8eb] rounded-2xl p-3 text-xs text-[#4e5968] space-y-1 flex flex-col justify-center">
                <div className="font-bold text-[#191f28] flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#3182f6]" />
                  <span>엑셀에서 바로 복사/붙여넣기 가능</span>
                </div>
                <p className="text-[11px] text-[#8b95a1] leading-relaxed">
                  매체사 엑셀 표를 드래그 복사(Ctrl+C) 후 아래 텍스트 상자에 붙여넣기(Ctrl+V) 하시면 1초 만에 자동 파싱됩니다.
                </p>
              </div>
            </div>

            {/* Textarea for pasting raw text */}
            <textarea
              rows={4}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="엑셀 표 내용을 여기에 붙여넣으세요... (App, Ad unit, Date, Estimated earnings...)"
              className="w-full text-xs font-mono p-3 bg-[#f8f9fa] border border-[#e5e8eb] rounded-2xl focus:bg-white focus:border-[#3182f6] focus:outline-none transition-all text-[#191f28] placeholder-[#8b95a1]"
            />
          </div>

          {/* Real-time Summary Card */}
          {parsedRecords.length > 0 && (
            <div className="bg-gradient-to-r from-[#e8f3ff] to-[#f2f4f6] border border-[#b2d6ff] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1b64da] flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-[#3182f6]" />
                  파싱 완료: 일자별 통합 총 {stats.days}일치 데이터 감지
                </span>
                <span className="text-[11px] font-semibold text-[#4e5968]">
                  기간: {stats.dateRangeStr} ({stats.days}일간)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white/80 p-3 rounded-xl border border-[#d1e5ff]">
                <div>
                  <span className="text-[11px] text-[#8b95a1] block font-medium">매체 전체 총 매출 (100%)</span>
                  <span className="text-sm font-bold text-[#191f28]">
                    {stats.totalGross.toLocaleString()}원
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#3182f6] block font-bold">당사 실제 인식 매출 (20%)</span>
                  <span className="text-sm font-bold text-[#3182f6]">
                    {stats.totalNet.toLocaleString()}원
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-[#8b95a1] block font-medium">등록 일수</span>
                  <span className="text-sm font-bold text-[#4e5968]">
                    총 {stats.days}일치
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parsedRecords.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#4e5968] block">
                2. DB 저장 일별 합산 미리보기 목록 (총 {stats.days}일)
              </span>
              <div className="max-h-48 overflow-y-auto border border-[#e5e8eb] rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb] sticky top-0 bg-white">
                      <th className="py-2.5 px-3">날짜 (dt)</th>
                      <th className="py-2.5 px-3">구분</th>
                      <th className="py-2.5 px-3 text-right">매체 매출 (100%)</th>
                      <th className="py-2.5 px-3 text-right">당사 매출 (20%)</th>
                      <th className="py-2.5 px-3 text-right">총 노출수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                    {parsedRecords.slice(0, 50).map((r, idx) => (
                      <tr key={idx} className="hover:bg-[#f8f9fa]">
                        <td className="py-2 px-3 font-semibold text-[#191f28]">{r.dt}</td>
                        <td className="py-2 px-3 text-[#4e5968] max-w-[180px] truncate" title={r.adUnit}>
                          {r.adUnit}
                        </td>
                        <td className="py-2 px-3 text-right text-[#8b95a1]">
                          {Math.round(r.grossRevenue).toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-[#3182f6]">
                          {Math.round(r.netRevenue).toLocaleString()}원
                        </td>
                        <td className="py-2 px-3 text-right">{r.impressions.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Response Notification Message */}
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-[#e8f3ff] text-[#1b64da] border border-[#b2d6ff]"
                  : "bg-[#fff0f1] text-[#f04452] border border-[#ffb2b8]"
              }`}
            >
              <span>{message.text}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#e5e8eb] flex items-center justify-end gap-3 bg-[#f8f9fa]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#4e5968] bg-white border border-[#e5e8eb] hover:bg-[#f2f4f6] rounded-xl transition-all cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={submitting || parsedRecords.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-[#3182f6] hover:bg-[#1b64da] disabled:bg-[#8b95a1] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_2px_8px_rgba(49,130,246,0.2)]"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>DB 저장 중...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>ClickHouse DB에 {parsedRecords.length}건 저장하기</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
