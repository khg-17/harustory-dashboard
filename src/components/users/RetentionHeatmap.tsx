"use client";

import React from "react";
import { Layers, GitCompare, Users, Coins, TrendingUp, RefreshCw, Grid } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { CombinedCohortRow, CustomTooltipState, RetentionDayMax, RetentionMode } from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

interface RetentionHeatmapProps {
  retentionMode: RetentionMode;
  setRetentionMode: (mode: RetentionMode) => void;
  retentionDayMax: RetentionDayMax;
  setRetentionDayMax: (day: RetentionDayMax) => void;
  loading: boolean;
  visitRowsLength: number;
  decayChartData: ChartData<"line">;
  decayChartOptions: any;
  activeDayColumns: number[];
  combinedCohortRows: CombinedCohortRow[];
  setHeatmapTooltip: (tooltip: CustomTooltipState | null) => void;
}

export const RetentionHeatmap: React.FC<RetentionHeatmapProps> = ({
  retentionMode,
  setRetentionMode,
  retentionDayMax,
  setRetentionDayMax,
  loading,
  visitRowsLength,
  decayChartData,
  decayChartOptions,
  activeDayColumns,
  combinedCohortRows,
  setHeatmapTooltip,
}) => {
  const getHeatmapBg = (rate: number | undefined, isEarning: boolean = false) => {
    if (rate === undefined || rate === 0) return "#ffffff";
    if (isEarning) {
      if (rate >= 30) return "#7c3aed";
      if (rate >= 20) return "#8b5cf6";
      if (rate >= 15) return "#a98eff";
      if (rate >= 10) return "#ddd6fe";
      if (rate >= 5) return "#f3f0ff";
      return "#ffffff";
    }
    if (rate >= 30) return "#1b64da";
    if (rate >= 20) return "#3182f6";
    if (rate >= 15) return "#6aadff";
    if (rate >= 10) return "#c2ddff";
    if (rate >= 5) return "#f0f6ff";
    return "#ffffff";
  };

  const getHeatmapTextColor = (rate: number | undefined) => {
    if (rate === undefined || rate === 0) return "text-[#d1d5db] font-normal";
    return rate >= 15 ? "text-white font-bold" : "text-[#191f28] font-semibold";
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 space-y-6 relative">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e8eb] pb-4">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-[#3182f6]" />
          <h2 className="text-[17px] font-bold text-[#191f28] tracking-[-0.02em]">신규 유저 코호트 리텐션 분석</h2>

          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs ml-2">
            <button
              onClick={() => setRetentionMode("combined")}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionMode === "combined"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>전체</span>
            </button>
            <button
              onClick={() => setRetentionMode("retention")}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionMode === "retention"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>방문만</span>
            </button>
            <button
              onClick={() => setRetentionMode("earning_activation")}
              className={`flex items-center gap-1.5 px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionMode === "earning_activation"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>적립만</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs">
            <button
              onClick={() => setRetentionDayMax(7)}
              className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionDayMax === 7
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              D1 ~ D7
            </button>
            <button
              onClick={() => setRetentionDayMax(14)}
              className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionDayMax === 14
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              D1 ~ D14
            </button>
            <button
              onClick={() => setRetentionDayMax(30)}
              className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                retentionDayMax === 30
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              D1 ~ D30 (전체)
            </button>
          </div>
        </div>
      </div>

      {/* Decay Curve Chart */}
      <div className="space-y-2 bg-[#f8f9fa] p-4 rounded-xl">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3182f6]" />
            <span>Day N 평균 리텐션 차트</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-medium">

          </span>
        </div>

        <div className="h-56 sm:h-64 md:h-72 pt-1 relative w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8b95a1]">
              <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
            </div>
          ) : (visitRowsLength > 0 || combinedCohortRows.length > 0) ? (
            <Line data={decayChartData} options={decayChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
              조회된 코호트 데이터가 존재하지 않습니다.
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Table */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#3182f6]" />
            <span>날짜별 코호트 히트맵</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-semibold">
            셀 표기: <span className="font-bold text-[#3182f6]">상단: 방문%</span> /{" "}
            <span className="font-bold text-[#a98eff]">하단: 적립%</span>
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-[#8b95a1]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
            <span className="text-xs font-semibold">ClickHouse에서 코호트 데이터를 계산하는 중입니다...</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                  <th className="py-3 px-4 text-left whitespace-nowrap">가입일 (Cohort Date)</th>
                  <th className="py-3 px-4 whitespace-nowrap">신규 가입 수 (D0)</th>
                  {activeDayColumns.map((dayNum) => (
                    <th key={dayNum} className="py-3 px-2 whitespace-nowrap">
                      Day {dayNum}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6] font-medium">
                {combinedCohortRows.length > 0 ? (
                  combinedCohortRows.map(({ cohortDate, formattedDate, newUserCount, vRow, eRow }) => {
                    return (
                      <tr key={cohortDate} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3 px-4 text-left font-semibold text-[#191f28] whitespace-nowrap border-r border-[#f2f4f6]">
                          {formattedDate}
                        </td>
                        <td className="py-3 px-4 text-[#4e5968] font-semibold whitespace-nowrap border-r border-[#f2f4f6]">
                          {newUserCount.toLocaleString()}명
                        </td>

                        {activeDayColumns.map((dayNum) => {
                          if (retentionMode === "combined") {
                            const vData = vRow?.daysMap[dayNum];
                            const eData = eRow?.daysMap[dayNum];
                            const vRate = vData?.rate;
                            const eRate = eData?.rate;
                            const hasData = vRate !== undefined || eRate !== undefined;
                            const isDarkBg = vRate !== undefined && vRate >= 15;

                            return (
                              <td
                                key={dayNum}
                                className={`py-2 px-1.5 border border-[#f2f4f6]/60 whitespace-nowrap transition-colors cursor-pointer text-center ${
                                  !hasData ? "text-[#d1d5db] font-normal" : ""
                                }`}
                                style={{ backgroundColor: getHeatmapBg(vRate, false) }}
                                onMouseEnter={(e) => {
                                  if (vData || eData) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHeatmapTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 6,
                                      date: formattedDate,
                                      typeText: "방문 + 적립 통합",
                                      dayNum,
                                      newUserCount: newUserCount,
                                      visitCount: vData?.count || 0,
                                      visitRate: vRate ?? 0,
                                      earningCount: eData?.count || 0,
                                      earningRate: eRate ?? 0,
                                      isCombined: true,
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHeatmapTooltip(null)}
                              >
                                <div className="flex flex-col items-center justify-center leading-tight py-0.5">
                                  {hasData ? (
                                    <>
                                      <span
                                        className={`text-[11.5px] font-sans ${
                                          isDarkBg ? "text-white font-extrabold" : "text-[#191f28] font-extrabold"
                                        }`}
                                      >
                                        {vRate !== undefined ? `${vRate}%` : "-"}
                                      </span>
                                      {eRate !== undefined ? (
                                        <span
                                          className={`text-[10px] font-sans mt-0.5 ${
                                            isDarkBg ? "text-[#ddd6fe] font-bold" : "text-[#a98eff] font-bold"
                                          }`}
                                        >
                                          {eRate}%
                                        </span>
                                      ) : null}
                                    </>
                                  ) : (
                                    <span className="text-[#d1d5db] font-normal text-xs">-</span>
                                  )}
                                </div>
                              </td>
                            );
                          } else {
                            const targetRow = retentionMode === "earning_activation" ? eRow : vRow;
                            const cellData = targetRow?.daysMap[dayNum];
                            const rate = cellData?.rate;
                            const count = cellData?.count;

                            return (
                              <td
                                key={dayNum}
                                className={`py-3 px-2 border border-[#f2f4f6]/60 whitespace-nowrap transition-colors cursor-pointer ${getHeatmapTextColor(
                                  rate
                                )}`}
                                style={{
                                  backgroundColor: getHeatmapBg(
                                    rate,
                                    retentionMode === "earning_activation"
                                  ),
                                }}
                                onMouseEnter={(e) => {
                                  if (cellData && rate !== undefined) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHeatmapTooltip({
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 6,
                                      date: formattedDate,
                                      typeText: retentionMode === "retention" ? "방문 유저" : "적립 유저",
                                      dayNum,
                                      newUserCount: newUserCount,
                                      visitCount: count || 0,
                                      visitRate: rate || 0,
                                      earningCount: 0,
                                      earningRate: 0,
                                      isCombined: false,
                                    });
                                  }
                                }}
                                onMouseLeave={() => setHeatmapTooltip(null)}
                              >
                                {rate !== undefined ? `${rate}%` : "-"}
                              </td>
                            );
                          }
                        })}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={activeDayColumns.length + 2}
                      className="py-12 text-center text-[#8b95a1] font-medium"
                    >
                      조회된 기간 내 코호트 리텐션 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
