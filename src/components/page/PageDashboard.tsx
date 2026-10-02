"use client";

import React, { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { BarChart2, Table as TableIcon, TrendingUp } from "lucide-react";
import { PagePvUvItem, PageDauItem, ViewMode } from "@/types/dashboard";
import { externalGlassTooltip } from "@/utils/chartGlassTooltip";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PageDashboardProps {
  loading: boolean;
  pagePvUvData: PagePvUvItem[];
  pageDauData?: PageDauItem[];
  selectedApp: string;
  fromDate: string;
  toDate: string;
}

const TAB_LABEL_MAP: Record<string, string> = {
  reward_tab_view: "리워드 탭",
  today_tab_view: "오늘뭐볼까 탭",
  free_tab_view: "무료작품 탭",
  library_tab_view: "내서재 탭",
  all_tab_view: "웹툰/웹소설 탭",
};

const TAB_COLOR_MAP: Record<string, { main: string; bg: string }> = {
  reward_tab_view: { main: "#3182f6", bg: "rgba(49, 130, 246, 0.15)" },
  today_tab_view: { main: "#8b5cf6", bg: "rgba(139, 92, 246, 0.15)" },
  free_tab_view: { main: "#10b981", bg: "rgba(16, 185, 129, 0.15)" },
  library_tab_view: { main: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" },
  all_tab_view: { main: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },
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
  selectedApp,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [dailyMetric, setDailyMetric] = useState<"pv" | "uv" | "combined">("pv");
  const [filterTab, setFilterTab] = useState<string>("all");

  // 1. Total PV across dataset
  const totalPV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.PV) || 0), 0);
  }, [pagePvUvData]);

  // 2. Total UV across dataset
  const totalUV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.UV) || 0), 0);
  }, [pagePvUvData]);

  // Unique dates count in current dataset
  const uniqueDates = useMemo(() => {
    const dates = new Set(pagePvUvData.map((d) => d.dt).filter(Boolean));
    return dates.size || 1;
  }, [pagePvUvData]);

  const avgDailyPV = useMemo(() => Math.round(totalPV / uniqueDates), [totalPV, uniqueDates]);
  const avgPvPerUv = useMemo(() => (totalUV > 0 ? (totalPV / totalUV).toFixed(2) : "0"), [totalPV, totalUV]);

  // 3. Clean Ordered Aggregated Labels Data (Summed over selected period)
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

  // 4. Daily Time Series Processing per Date & Tab
  const dailyTimeSeries = useMemo(() => {
    const dateMap: Record<string, Record<string, { PV: number; UV: number }>> = {};
    const dateSet = new Set<string>();

    pagePvUvData.forEach((item) => {
      const d = item.dt ? String(item.dt).split("T")[0] : "";
      if (!d) return;
      dateSet.add(d);
      if (!dateMap[d]) dateMap[d] = {};
      const l = item.label;
      dateMap[d][l] = {
        PV: Number(item.PV) || 0,
        UV: Number(item.UV) || 0,
      };
    });

    const sortedDates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));
    return { sortedDates, dateMap };
  }, [pagePvUvData]);

  // Bar Chart Data for Total PV & UV by Page Label
  const pvUvBarData = useMemo(() => {
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

  // Daily Line Chart Data for PV / UV Time Series
  const dailyLineData = useMemo(() => {
    const { sortedDates, dateMap } = dailyTimeSeries;

    if (filterTab !== "all") {
      // Single Tab Mode: Show both PV & UV for the selected tab
      const pvData = sortedDates.map((d) => dateMap[d]?.[filterTab]?.PV || 0);
      const uvData = sortedDates.map((d) => dateMap[d]?.[filterTab]?.UV || 0);
      const color = TAB_COLOR_MAP[filterTab] || { main: "#3182f6", bg: "rgba(49, 130, 246, 0.15)" };

      return {
        labels: sortedDates,
        datasets: [
          {
            label: `${TAB_LABEL_MAP[filterTab] || filterTab} (PV)`,
            data: pvData,
            borderColor: color.main,
            backgroundColor: color.bg,
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: `${TAB_LABEL_MAP[filterTab] || filterTab} (UV)`,
            data: uvData,
            borderColor: "#00c980",
            backgroundColor: "rgba(0, 201, 128, 0.15)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
        ],
      };
    }

    // All Tabs Mode (filterTab === "all")
    if (dailyMetric === "combined") {
      // Clean Comparison Mode: Aggregate total PV vs total UV across all tabs (2 clean lines!)
      const totalPvData = sortedDates.map((d) => {
        let sum = 0;
        TAB_ORDER.forEach((key) => {
          sum += dateMap[d]?.[key]?.PV || 0;
        });
        return sum;
      });

      const totalUvData = sortedDates.map((d) => {
        let sum = 0;
        TAB_ORDER.forEach((key) => {
          sum += dateMap[d]?.[key]?.UV || 0;
        });
        return sum;
      });

      return {
        labels: sortedDates,
        datasets: [
          {
            label: "전체 탭 통합 (PV)",
            data: totalPvData,
            borderColor: "#3182f6",
            backgroundColor: "rgba(49, 130, 246, 0.12)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#3182f6",
            pointHoverRadius: 6,
          },
          {
            label: "전체 탭 통합 (UV)",
            data: totalUvData,
            borderColor: "#00c980",
            backgroundColor: "rgba(0, 201, 128, 0.12)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#00c980",
            pointHoverRadius: 6,
          },
        ],
      };
    }

    // PV Trend / UV Trend Mode: 5 clean lines (one per tab)
    const datasets: any[] = [];

    TAB_ORDER.forEach((tabKey) => {
      const color = TAB_COLOR_MAP[tabKey] || { main: "#3182f6", bg: "rgba(49, 130, 246, 0.15)" };
      const tabLabel = TAB_LABEL_MAP[tabKey] || tabKey;

      if (dailyMetric === "pv") {
        const pvData = sortedDates.map((d) => dateMap[d]?.[tabKey]?.PV || 0);
        datasets.push({
          label: `${tabLabel} (PV)`,
          data: pvData,
          borderColor: color.main,
          backgroundColor: color.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        });
      } else if (dailyMetric === "uv") {
        const uvData = sortedDates.map((d) => dateMap[d]?.[tabKey]?.UV || 0);
        datasets.push({
          label: `${tabLabel} (UV)`,
          data: uvData,
          borderColor: color.main,
          backgroundColor: color.bg,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        });
      }
    });

    return {
      labels: sortedDates,
      datasets,
    };
  }, [dailyTimeSeries, filterTab, dailyMetric]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: { font: { family: "Pretendard", size: 12 }, usePointStyle: true },
      },
      tooltip: {
        enabled: false,
        external: externalGlassTooltip,
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
      legend: {
        position: "top" as const,
        labels: { font: { family: "Pretendard", size: 11, weight: 600 as const }, usePointStyle: true, boxWidth: 8 },
      },
      tooltip: {
        enabled: false,
        external: externalGlassTooltip,
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

  // Detailed Daily Flat List for Table View
  const dailyFlatList = useMemo(() => {
    const { sortedDates, dateMap } = dailyTimeSeries;
    const rows: { dt: string; label: string; tabName: string; PV: number; UV: number; ratio: string }[] = [];

    sortedDates.forEach((dt) => {
      TAB_ORDER.forEach((label) => {
        if (filterTab !== "all" && filterTab !== label) return;
        const item = dateMap[dt]?.[label];
        if (item && (item.PV > 0 || item.UV > 0)) {
          const ratio = item.UV > 0 ? (item.PV / item.UV).toFixed(2) : "0";
          rows.push({
            dt,
            label,
            tabName: TAB_LABEL_MAP[label] || label,
            PV: item.PV,
            UV: item.UV,
            ratio,
          });
        }
      });
    });

    return rows.reverse();
  }, [dailyTimeSeries, filterTab]);

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
              주요 탭별 페이지 뷰(PV), 순 방문자 수(UV) 및 일자별 추이 현황입니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
            <div className="text-[11px] font-semibold text-[#8b95a1]">1인당 평균 PV</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : avgPvPerUv} <span className="text-xs font-normal text-[#8b95a1]">회/명</span>
            </div>
          </div>

          <div className="pl-2">
            <div className="text-[11px] font-semibold text-[#8b95a1]">일평균 PV</div>
            <div className="text-xl font-bold text-[#191f28] mt-1">
              {loading ? "-" : avgDailyPV.toLocaleString()} <span className="text-xs font-normal text-[#8b95a1]">회/일</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Content Body */}
      <div className="p-6 space-y-8">
        {/* Section A: Period Aggregate PV & UV per Tab */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#191f28]">조회 기간 탭별 누적 PV & UV 점유율</h3>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
              데이터를 불러오는 중입니다...
            </div>
          ) : viewMode === "chart" ? (
            <div className="h-80 w-full pt-4">
              <Bar data={pvUvBarData} options={barOptions} plugins={[barValuePlugin]} />
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

        {/* Section B: Daily PV & UV Trend */}
        <div className="space-y-4 pt-6 border-t border-[#f2f4f6]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3182f6]" />
              <h3 className="text-base font-bold text-[#191f28]">일자별 PV & UV 추이 현황</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tab Selector Filter */}
              <select
                value={filterTab}
                onChange={(e) => setFilterTab(e.target.value)}
                className="bg-[#f2f4f6] text-[#191f28] text-xs font-semibold px-3 py-1.5 rounded-xl border-none outline-none cursor-pointer"
              >
                <option value="all">전체 탭 (통합)</option>
                {TAB_ORDER.map((tabKey) => (
                  <option key={tabKey} value={tabKey}>
                    {TAB_LABEL_MAP[tabKey] || tabKey}
                  </option>
                ))}
              </select>

              {/* Metric Toggle Buttons (PV / UV / Combined) */}
              {filterTab === "all" && (
                <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-xl">
                  <button
                    onClick={() => setDailyMetric("pv")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      dailyMetric === "pv"
                        ? "bg-white text-[#191f28] shadow-2xs font-bold"
                        : "text-[#8b95a1] hover:text-[#4e5968]"
                    }`}
                  >
                    PV 추이
                  </button>
                  <button
                    onClick={() => setDailyMetric("uv")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      dailyMetric === "uv"
                        ? "bg-[#00c980] text-white shadow-2xs font-bold"
                        : "text-[#8b95a1] hover:text-[#4e5968]"
                    }`}
                  >
                    UV 추이
                  </button>
                  <button
                    onClick={() => setDailyMetric("combined")}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      dailyMetric === "combined"
                        ? "bg-[#3182f6] text-white shadow-2xs font-bold"
                        : "text-[#8b95a1] hover:text-[#4e5968]"
                    }`}
                  >
                    PV & UV 비교
                  </button>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
              데이터를 불러오는 중입니다...
            </div>
          ) : viewMode === "chart" ? (
            <div className="h-80 w-full pt-2">
              <Line data={dailyLineData} options={lineOptions} />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e5e8eb]">
              <table className="w-full text-left text-xs text-[#333d4b]">
                <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                  <tr>
                    <th className="py-3 px-4">날짜</th>
                    <th className="py-3 px-4">탭 명칭</th>
                    <th className="py-3 px-4 text-right">페이지 뷰 (PV)</th>
                    <th className="py-3 px-4 text-right">순 방문자 (UV)</th>
                    <th className="py-3 px-4 text-right">1인당 평균 PV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6]">
                  {dailyFlatList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#8b95a1]">
                        조회된 일별 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    dailyFlatList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#191f28]">{item.dt}</td>
                        <td className="py-3 px-4 font-semibold text-[#3182f6]">{item.tabName}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#191f28]">
                          {item.PV.toLocaleString()} 회
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#00c980]">
                          {item.UV.toLocaleString()} 명
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                          {item.ratio} 회/명
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
