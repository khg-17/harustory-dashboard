"use client";

import React, { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Eye,
  Users,
  TrendingUp,
  Calendar,
  Layers,
  BarChart2,
  Table as TableIcon,
  HelpCircle,
  FileText,
} from "lucide-react";
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
  all_tab_view: "전체 탭 (all_tab_view)",
  today_tab_view: "투데이 탭 (today_tab_view)",
  library_tab_view: "보관함 탭 (library_tab_view)",
  free_tab_view: "무료 탭 (free_tab_view)",
  reward_tab_view: "리워드 탭 (reward_tab_view)",
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
  const [tableSubMode, setTableSubMode] = useState<"summary" | "detail">("summary");
  const [selectedLabel, setSelectedLabel] = useState<string>("all");

  // Calculate high-level summary KPIs
  const totalPV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.PV) || 0), 0);
  }, [pagePvUvData]);

  const totalUV = useMemo(() => {
    return pagePvUvData.reduce((acc, curr) => acc + (Number(curr.UV) || 0), 0);
  }, [pagePvUvData]);

  const avgDAU = useMemo(() => {
    if (!pageDauData || pageDauData.length === 0) return 0;
    const sum = pageDauData.reduce((acc, curr) => acc + (Number(curr.DAU) || 0), 0);
    return Math.round(sum / pageDauData.length);
  }, [pageDauData]);

  const peakDAU = useMemo(() => {
    if (!pageDauData || pageDauData.length === 0) return 0;
    return Math.max(...pageDauData.map((d) => Number(d.DAU) || 0));
  }, [pageDauData]);

  // Aggregated PV/UV data by unique label (prevents tab names from repeating on chart x-axis)
  const labelAggregatedPvUvData = useMemo(() => {
    const map: Record<string, { label: string; PV: number; UV: number }> = {};
    pagePvUvData.forEach((item) => {
      const l = item.label;
      if (!map[l]) {
        map[l] = { label: l, PV: 0, UV: 0 };
      }
      map[l].PV += Number(item.PV) || 0;
      map[l].UV += Number(item.UV) || 0;
    });

    const orderedKeys = ["all_tab_view", "today_tab_view", "library_tab_view", "free_tab_view", "reward_tab_view"];
    const list: { label: string; PV: number; UV: number }[] = [];

    orderedKeys.forEach((key) => {
      if (map[key]) {
        list.push(map[key]);
      }
    });

    Object.keys(map).forEach((key) => {
      if (!orderedKeys.includes(key)) {
        list.push(map[key]);
      }
    });

    return list;
  }, [pagePvUvData]);

  // Filtered PV/UV raw data by selected label filter (for detail table)
  const filteredPvUvData = useMemo(() => {
    if (selectedLabel === "all") return pagePvUvData;
    return pagePvUvData.filter((item) => item.label === selectedLabel);
  }, [pagePvUvData, selectedLabel]);

  // Chart Data: Clean 5-bar PV & UV by Page Label
  const pvUvChartData = useMemo(() => {
    const targetData = selectedLabel === "all"
      ? labelAggregatedPvUvData
      : labelAggregatedPvUvData.filter((item) => item.label === selectedLabel);

    const labels = targetData.map((item) => TAB_LABEL_MAP[item.label] || item.label);
    const pvValues = targetData.map((item) => item.PV);
    const uvValues = targetData.map((item) => item.UV);

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
        },
        {
          label: "순 방문자 (UV)",
          data: uvValues,
          backgroundColor: "rgba(0, 201, 128, 0.85)",
          borderColor: "#00c980",
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }, [labelAggregatedPvUvData, selectedLabel]);

  // Chart Data: DAU Daily Trend
  const dauChartData = useMemo(() => {
    const sorted = [...pageDauData].sort((a, b) => (a.dt || "").localeCompare(b.dt || ""));
    const labels = sorted.map((item) => item.dt);
    const values = sorted.map((item) => Number(item.DAU) || 0);

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
  }, [pageDauData]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: { family: "Pretendard", size: 12 },
          usePointStyle: true,
        },
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
        ticks: { font: { family: "Pretendard", size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f2f4f6" },
        ticks: {
          font: { family: "Pretendard", size: 11 },
          callback: function (val: any) {
            return Number(val).toLocaleString();
          },
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
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
            return Number(val).toLocaleString();
          },
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Tab Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#e5e8eb] shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold text-[#191f28]">페이지 현황 (PV / UV / DAU)</h2>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#e8f3ff] text-[#3182f6] rounded-md">
              Log.UserActionLog
            </span>
          </div>
          <p className="text-xs text-[#8b95a1]">
            앱 내 탭(페이지) 노출 이벤트(`impression`)를 기반으로 한 PV, UV 및 페이지 통합 DAU 집계 현황입니다.
          </p>
        </div>

        {/* View Mode Toggle Button */}
        <div className="flex items-center gap-1.5 bg-[#f2f4f6] p-1 rounded-xl">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 1. 총 PV */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5e8eb] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b95a1] mb-2">
            <span className="text-xs font-semibold">총 페이지 뷰 (PV)</span>
            <Eye className="w-4 h-4 text-[#3182f6]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191f28]">
              {loading ? "-" : totalPV.toLocaleString()} <span className="text-sm font-normal text-[#8b95a1]">회</span>
            </div>
            <div className="text-[11px] text-[#8b95a1] mt-1">조회 탭 전체 누적 페이지 뷰</div>
          </div>
        </div>

        {/* 2. 총 UV */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5e8eb] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b95a1] mb-2">
            <span className="text-xs font-semibold">총 순 방문자 (UV)</span>
            <Users className="w-4 h-4 text-[#00c980]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191f28]">
              {loading ? "-" : totalUV.toLocaleString()} <span className="text-sm font-normal text-[#8b95a1]">명</span>
            </div>
            <div className="text-[11px] text-[#8b95a1] mt-1">중복 제거 유니크 수치합</div>
          </div>
        </div>

        {/* 3. 평균 DAU */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5e8eb] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b95a1] mb-2">
            <span className="text-xs font-semibold">평균 DAU</span>
            <TrendingUp className="w-4 h-4 text-[#ff9500]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191f28]">
              {loading ? "-" : avgDAU.toLocaleString()} <span className="text-sm font-normal text-[#8b95a1]">명/일</span>
            </div>
            <div className="text-[11px] text-[#8b95a1] mt-1">조회 기간 일평균 활성 유저</div>
          </div>
        </div>

        {/* 4. 최고 DAU */}
        <div className="bg-white p-5 rounded-2xl border border-[#e5e8eb] shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8b95a1] mb-2">
            <span className="text-xs font-semibold">최고 DAU</span>
            <Calendar className="w-4 h-4 text-[#8e54e9]" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#191f28]">
              {loading ? "-" : peakDAU.toLocaleString()} <span className="text-sm font-normal text-[#8b95a1]">명</span>
            </div>
            <div className="text-[11px] text-[#8b95a1] mt-1">기간 내 단일 일자 최고 기록</div>
          </div>
        </div>
      </div>

      {/* Label Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-[#4e5968] shrink-0">탭 선택:</span>
        <button
          onClick={() => setSelectedLabel("all")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
            selectedLabel === "all"
              ? "bg-[#191f28] text-white"
              : "bg-[#f2f4f6] text-[#4e5968] hover:bg-[#e5e8eb]"
          }`}
        >
          전체 (5개 기본 탭)
        </button>
        {Object.entries(TAB_LABEL_MAP).map(([key, labelName]) => (
          <button
            key={key}
            onClick={() => setSelectedLabel(key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer whitespace-nowrap ${
              selectedLabel === key
                ? "bg-[#3182f6] text-white"
                : "bg-[#f2f4f6] text-[#4e5968] hover:bg-[#e5e8eb]"
            }`}
          >
            {labelName}
          </button>
        ))}
      </div>

      {/* Section 1: Page Views (PV) & Unique Visitors (UV) */}
      <div className="bg-white p-6 rounded-2xl border border-[#e5e8eb] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#191f28]">페이지별 PV & UV 현황</h3>
            <p className="text-xs text-[#8b95a1] mt-0.5">
              각 탭별 총 페이지 뷰(PV)와 순 방문자 수(UV), 그리고 1인당 평균 방문 횟수를 비교합니다.
            </p>
          </div>

          {viewMode === "table" && (
            <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setTableSubMode("summary")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  tableSubMode === "summary"
                    ? "bg-white text-[#191f28] shadow-2xs font-bold"
                    : "text-[#8b95a1] hover:text-[#191f28]"
                }`}
              >
                통합 탭 요약
              </button>
              <button
                onClick={() => setTableSubMode("detail")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  tableSubMode === "detail"
                    ? "bg-white text-[#191f28] shadow-2xs font-bold"
                    : "text-[#8b95a1] hover:text-[#191f28]"
                }`}
              >
                앱별 상세 구분
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
            데이터를 불러오는 중입니다...
          </div>
        ) : viewMode === "chart" ? (
          <div className="h-72 w-full">
            <Bar data={pvUvChartData} options={barOptions} />
          </div>
        ) : tableSubMode === "summary" ? (
          /* 1. 통합 탭 요약 테이블 (중복 없는 5개 탭) */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#333d4b]">
              <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                <tr>
                  <th className="py-3 px-4">페이지 / 탭 라벨 (`label`)</th>
                  <th className="py-3 px-4 text-right">총 페이지 뷰 (PV)</th>
                  <th className="py-3 px-4 text-right">총 순 방문자 (UV)</th>
                  <th className="py-3 px-4 text-right">1인당 평균 PV (PV/UV)</th>
                  <th className="py-3 px-4 text-right">PV 점유율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6]">
                {labelAggregatedPvUvData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#8b95a1]">
                      조회된 페이지 뷰 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  (selectedLabel === "all"
                    ? labelAggregatedPvUvData
                    : labelAggregatedPvUvData.filter((item) => item.label === selectedLabel)
                  ).map((item, idx) => {
                    const pv = item.PV;
                    const uv = item.UV;
                    const ratio = uv > 0 ? (pv / uv).toFixed(2) : "0";
                    const share = totalPV > 0 ? ((pv / totalPV) * 100).toFixed(1) : "0";

                    return (
                      <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#3182f6]">
                          {TAB_LABEL_MAP[item.label] || item.label}
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
        ) : (
          /* 2. 앱별 상세 구분 테이블 */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#333d4b]">
              <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                <tr>
                  <th className="py-3 px-4">앱 ID (`appID`)</th>
                  <th className="py-3 px-4">페이지 / 탭 라벨 (`label`)</th>
                  <th className="py-3 px-4 text-right">페이지 뷰 (PV)</th>
                  <th className="py-3 px-4 text-right">순 방문자 (UV)</th>
                  <th className="py-3 px-4 text-right">1인당 평균 PV (PV/UV)</th>
                  <th className="py-3 px-4 text-right">PV 점유율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6]">
                {filteredPvUvData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8b95a1]">
                      조회된 페이지 뷰 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredPvUvData.map((item, idx) => {
                    const pv = Number(item.PV) || 0;
                    const uv = Number(item.UV) || 0;
                    const ratio = uv > 0 ? (pv / uv).toFixed(2) : "0";
                    const share = totalPV > 0 ? ((pv / totalPV) * 100).toFixed(1) : "0";

                    return (
                      <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3 px-4 font-medium text-[#191f28]">{item.appID}</td>
                        <td className="py-3 px-4 font-semibold text-[#3182f6]">
                          {TAB_LABEL_MAP[item.label] || item.label}
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

      {/* Section 2: Daily DAU Trend */}
      <div className="bg-white p-6 rounded-2xl border border-[#e5e8eb] shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#f2f4f6] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#191f28]">일자별 DAU 추이 (Daily Active Users)</h3>
            <p className="text-xs text-[#8b95a1] mt-0.5">
              지정된 탭 방문 이벤트를 발생시킨 일자별 중복 제거 순 유저 수(DAU) 추이입니다.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-xs text-[#8b95a1]">
            데이터를 불러오는 중입니다...
          </div>
        ) : viewMode === "chart" ? (
          <div className="h-72 w-full">
            <Line data={dauChartData} options={lineOptions} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#333d4b]">
              <thead className="bg-[#f9fafb] text-[#6b7684] font-semibold border-b border-[#e5e8eb]">
                <tr>
                  <th className="py-3 px-4">앱 ID</th>
                  <th className="py-3 px-4">날짜 (`dt`)</th>
                  <th className="py-3 px-4 text-right">일간 활성 유저 (DAU)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6]">
                {pageDauData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-[#8b95a1]">
                      조회된 DAU 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  [...pageDauData]
                    .sort((a, b) => (b.dt || "").localeCompare(a.dt || ""))
                    .map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="py-3 px-4 font-medium text-[#191f28]">{item.appID}</td>
                        <td className="py-3 px-4 font-semibold text-[#191f28]">{item.dt}</td>
                        <td className="py-3 px-4 text-right font-bold text-[#3182f6]">
                          {(Number(item.DAU) || 0).toLocaleString()} 명
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
  );
};
