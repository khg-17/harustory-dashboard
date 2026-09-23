"use client";

import React, { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import { BarChart2, Table as TableIcon, Sliders } from "lucide-react";
import { PagePvUvItem, PageDauItem, ViewMode } from "@/types/dashboard";

interface PageDashboardProps {
  loading: boolean;
  pagePvUvData: PagePvUvItem[];
  pageDauData: PageDauItem[];
  selectedApp: string;
  fromDate: string;
  toDate: string;
}

const TAB_LABEL_MAP: Record<string, string> = {
  reward_tab_view: "리워드",
  today_tab_view: "오늘뭐볼까",
  free_tab_view: "무료작품",
  library_tab_view: "내서재",
  all_tab_view: "웹툰/웹소설",
};

const TAB_ORDER = [
  "reward_tab_view",
  "today_tab_view",
  "free_tab_view",
  "library_tab_view",
  "all_tab_view",
];

// Custom Chart.js Plugin to draw exact values right above each bar
const barValuePlugin = {
  id: "barValuePlugin",
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    chart.data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta || meta.hidden) return;

      meta.data.forEach((bar: any, index: number) => {
        const val = dataset.data[index];
        if (val === undefined || val === null || isNaN(val)) return;

        ctx.save();
        ctx.font = "bold 11px Pretendard, sans-serif";
        ctx.fillStyle = i === 0 ? "#1d4ed8" : "#047857";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";

        let formattedText = val >= 10000 ? `${(val / 10000).toFixed(1)}만` : val.toLocaleString();
        // Calculate Y position cleanly above bar
        const yPos = Math.min(bar.y - 4, chart.chartArea.bottom - 10);
        ctx.fillText(formattedText, bar.x, yPos);
        ctx.restore();
      });
    });
  },
};

export const PageDashboard: React.FC<PageDashboardProps> = ({
  loading,
  pagePvUvData,
  pageDauData,
  selectedApp,
  fromDate,
  toDate,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [scaleType, setScaleType] = useState<"linear" | "logarithmic">("linear");

  // Total PV
  const totalPV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.PV) || 0), 0);
  }, [pagePvUvData]);

  // Total UV
  const totalUV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.UV) || 0), 0);
  }, [pagePvUvData]);

  // Average & Peak DAU
  const { avgDAU, peakDAU } = useMemo(() => {
    if (!pageDauData || pageDauData.length === 0) return { avgDAU: 0, peakDAU: 0 };
    const sum = pageDauData.reduce((acc, curr) => acc + (Number(curr.DAU) || 0), 0);
    const avg = Math.round(sum / pageDauData.length);
    const peak = Math.max(...pageDauData.map((d) => Number(d.DAU) || 0));
    return { avgDAU: avg, peakDAU: peak };
  }, [pageDauData]);

  // Clean Ordered Labels Data (Ordered strictly: 리워드 > 오늘뭐볼까 > 무료작품 > 내서재 > 웹툰/웹소설)
  const orderedPvUvData = useMemo(() => {
    const map: Record<string, { label: string; PV: number; UV: number }> = {};
    pagePvUvData.forEach((item) => {
      const l = item.label;
      if (!map[l]) {
        map[l] = { label: l, PV: 0, UV: 0 };
      }
      map[l].PV += Number(item.PV) || 0;
      map[l].UV += Number(item.UV) || 0;
    });

    const list: { label: string; PV: number; UV: number }[] = [];

    TAB_ORDER.forEach((key) => {
      if (map[key]) {
        list.push(map[key]);
      }
    });

    Object.keys(map).forEach((key) => {
      if (!TAB_ORDER.includes(key)) {
        list.push(map[key]);
      }
    });

    return list;
  }, [pagePvUvData]);

  // Clean DAU Data Sorted Chronologically
  const sortedDauData = useMemo(() => {
    const map: Record<string, number> = {};
    pageDauData.forEach((item) => {
      const d = item.dt ? String(item.dt).split("T")[0] : "";
      if (!d) return;
      map[d] = (map[d] || 0) + (Number(item.DAU) || 0);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dt, DAU]) => ({ dt, DAU }));
  }, [pageDauData]);

  // Chart Data: PV & UV by Page Label (With minBarLength = 12 for guaranteed bar visibility)
  const pvUvChartData = useMemo(() => {
    const labels = orderedPvUvData.map((item) => TAB_LABEL_MAP[item.label] || item.label);
    const pvValues = orderedPvUvData.map((item) => item.PV);
    const uvValues = orderedPvUvData.map((item) => item.UV);

    return {
      labels,
      datasets: [
        {
          label: "페이지 뷰 (PV)",
          data: pvValues,
          backgroundColor: "rgba(49, 130, 246, 0.85)",
          borderColor: "#3182f6",
          borderWidth: 1,
          borderRadius: 6,
          minBarLength: 12,
        },
        {
          label: "순 방문자 (UV)",
          data: uvValues,
          backgroundColor: "rgba(0, 201, 128, 0.85)",
          borderColor: "#00c980",
          borderWidth: 1,
          borderRadius: 6,
          minBarLength: 12,
        },
      ],
    };
  }, [orderedPvUvData]);

  // Chart Data: DAU Daily Trend
  const dauChartData = useMemo(() => {
    const labels = sortedDauData.map((item) => item.dt);
    const values = sortedDauData.map((item) => item.DAU);

    return {
      labels,
      datasets: [
        {
          label: "일간 활성 유저 (DAU)",
          data: values,
          borderColor: "#3182f6",
          backgroundColor: "rgba(49, 130, 246, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: "#3182f6",
          pointHoverRadius: 6,
        },
      ],
    };
  }, [sortedDauData]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false, // Hovering ANYWHERE in the vertical column triggers tooltip!
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { font: { family: "Pretendard", size: 12 }, usePointStyle: true },
      },
      tooltip: {
        padding: 12,
        titleFont: { family: "Pretendard", size: 13, weight: "bold" as const },
        bodyFont: { family: "Pretendard", size: 12 },
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${Number(context.raw).toLocaleString()} 회/명`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "Pretendard", size: 12, weight: "bold" as const } },
      },
      y: {
        type: scaleType as any,
        beginAtZero: true,
        grid: { color: "#f2f4f6" },
        ticks: {
          font: { family: "Pretendard", size: 11 },
          callback: function (val: any) {
            const num = Number(val);
            if (num >= 10000) return `${(num / 10000).toFixed(0)}만`;
            return num.toLocaleString();
          },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        padding: 12,
        titleFont: { family: "Pretendard", size: 13, weight: "bold" as const },
        bodyFont: { family: "Pretendard", size: 12 },
        callbacks: {
          label: function (context: any) {
            return `DAU: ${Number(context.raw).toLocaleString()} 명`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "Pretendard", size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f2f4f6" },
        ticks: {
          font: { family: "Pretendard", size: 11 },
          callback: function (val: any) {
            const num = Number(val);
            if (num >= 10000) return `${(num / 10000).toFixed(0)}만`;
            return num.toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-2xs overflow-hidden">
      {/* 1. Header & Minimal KPI Banner */}
      <div className="p-6 border-b border-[#e5e8eb]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-[#191f28]">페이지 현황</h2>
              <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#e8f3ff] text-[#3182f6] rounded-md">
                {selectedApp === "tc" ? "전체 서비스" : selectedApp}
              </span>
            </div>
            <p className="text-xs text-[#8b95a1]">
              주요 탭별 페이지 뷰(PV), 순 방문자 수(UV) 및 일간 활성 유저(DAU) 현황입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Scale Type Toggle (Linear vs Logarithmic) */}
            {viewMode === "chart" && (
              <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-xl">
                <button
                  onClick={() => setScaleType("linear")}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    scaleType === "linear"
                      ? "bg-white text-[#191f28] shadow-2xs font-bold"
                      : "text-[#8b95a1] hover:text-[#4e5968]"
                  }`}
                  title="일반 선형 스케일"
                >
                  선형 축
                </button>
                <button
                  onClick={() => setScaleType("logarithmic")}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    scaleType === "logarithmic"
                      ? "bg-[#3182f6] text-white shadow-2xs font-bold"
                      : "text-[#8b95a1] hover:text-[#4e5968]"
                  }`}
                  title="작은 수치와 큰 수치를 한눈에 보기 쉬운 로그 스케일"
                >
                  로그 축
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-xl">
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "chart"
                    ? "bg-white text-[#191f28] shadow-2xs"
                    : "text-[#8b95a1] hover:text-[#4e5968]"
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>차트 보기</span>
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-[#191f28] shadow-2xs"
                    : "text-[#8b95a1] hover:text-[#4e5968]"
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>표 보기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Minimal Clean Metric Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#f2f4f6]">
          <div className="md:border-r border-[#f2f4f6] pr-4">
            <div className="text-[11px] font-semibold text-[#8b95a1]">총 페이지 뷰 (PV)</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : totalPV.toLocaleString()} <span className="text-xs font-normal text-[#8b95a1]">회</span>
            </div>
          </div>

          <div className="md:border-r border-[#f2f4f6] pr-4">
            <div className="text-[11px] font-semibold text-[#8b95a1]">총 순 방문자 (UV)</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : totalUV.toLocaleString()} <span className="text-xs font-normal text-[#8b95a1]">명</span>
            </div>
          </div>

          <div className="md:border-r border-[#f2f4f6] pr-4">
            <div className="text-[11px] font-semibold text-[#8b95a1]">평균 DAU</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : avgDAU.toLocaleString()} <span className="text-xs font-normal text-[#8b95a1]">명/일</span>
            </div>
          </div>

          <div className="pl-2">
            <div className="text-[11px] font-semibold text-[#8b95a1]">최고 DAU</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : peakDAU.toLocaleString()} <span className="text-xs font-normal text-[#8b95a1]">명</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-6 space-y-8">
        {/* Section A: PV & UV */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#191f28]">페이지별 PV & UV 현황</h3>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
              데이터를 불러오는 중입니다...
            </div>
          ) : viewMode === "chart" ? (
            <div className="h-80 w-full pt-4">
              <Bar data={pvUvChartData} options={barOptions} plugins={[barValuePlugin]} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e5e8eb]">
              <table className="w-full text-left text-xs text-[#333d4b]">
                <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                  <tr>
                    <th className="py-3 px-4">탭 명칭</th>
                    <th className="py-3 px-4 text-right">페이지 뷰 (PV)</th>
                    <th className="py-3 px-4 text-right">순 방문자 (UV)</th>
                    <th className="py-3 px-4 text-right">1인당 평균 PV</th>
                    <th className="py-3 px-4 text-right">PV 점유율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6]">
                  {orderedPvUvData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8b95a1]">
                        조회된 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    orderedPvUvData.map((item, idx) => {
                      const pv = item.PV;
                      const uv = item.UV;
                      const ratio = uv > 0 ? (pv / uv).toFixed(2) : "0";
                      const share = totalPV > 0 ? ((pv / totalPV) * 100).toFixed(1) : "0";
                      const name = TAB_LABEL_MAP[item.label] || item.label;

                      return (
                        <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                          <td className="py-3 px-4 font-bold text-[#3182f6]">
                            {name}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-[#191f28]">
                            {pv.toLocaleString()} 회
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[#00c980]">
                            {uv.toLocaleString()} 명
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                            {ratio} 회/명
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-[#8b95a1]">
                            {share}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section B: Daily DAU Trend */}
        <div className="space-y-3 pt-6 border-t border-[#f2f4f6]">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#191f28]">일자별 DAU 추이</h3>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
              데이터를 불러오는 중입니다...
            </div>
          ) : viewMode === "chart" ? (
            <div className="h-72 w-full pt-2">
              <Line data={dauChartData} options={lineOptions} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e5e8eb]">
              <table className="w-full text-left text-xs text-[#333d4b]">
                <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                  <tr>
                    <th className="py-3 px-4">날짜</th>
                    <th className="py-3 px-4 text-right">일간 활성 유저 (DAU)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6]">
                  {sortedDauData.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-[#8b95a1]">
                        조회된 DAU 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    [...sortedDauData]
                      .reverse()
                      .map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                          <td className="py-3 px-4 font-semibold text-[#191f28]">{item.dt}</td>
                          <td className="py-3 px-4 text-right font-bold text-[#3182f6]">
                            {item.DAU.toLocaleString()} 명
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
