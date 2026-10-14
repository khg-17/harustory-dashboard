"use client";

import React from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
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
import { RevenueSummary, ViewMode } from "@/types/dashboard";

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

interface RevenueOverallTabProps {
  loading: boolean;
  revenueViewMode: ViewMode;
  revenueSummary: RevenueSummary;
  revenueChartData: ChartData<"line">;
  revenueChartOptions: any;
  selectedApp?: string;
}

export const RevenueOverallTab: React.FC<RevenueOverallTabProps> = ({
  loading,
  revenueViewMode,
  revenueSummary,
  revenueChartData,
  revenueChartOptions,
  selectedApp = "tc",
}) => {
  const dailyTrend = revenueSummary?.dailyTrend || [];

  const isOkCashback =
    selectedApp === "ph-okcashback" ||
    selectedApp === "okcashback" ||
    selectedApp?.toLowerCase().includes("okcashback") ||
    selectedApp?.includes("ok캐쉬백") ||
    selectedApp?.includes("오케이캐쉬백");

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 gap-2 text-[#8b95a1]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
          <span className="text-xs font-semibold">ClickHouse에서 매출 데이터를 계산하는 중입니다...</span>
        </div>
      ) : (
        <>
          {/* Upper Section: Full-width Line Chart Box */}
          <div className="space-y-3 bg-[#f8f9fa] p-5 rounded-2xl border border-[#e5e8eb]">
            <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3182f6]" />
                <span>일별/기간별 통합 매출 추이 차트</span>
              </div>
              <span className="text-[11px] text-[#8b95a1] font-semibold">단위: 원 (KRW)</span>
            </div>
            <div className="h-64 sm:h-72 md:h-80 pt-2 relative w-full">
              {dailyTrend.length > 0 ? (
                <Line data={revenueChartData} options={revenueChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                  조회된 기간 내 매출 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Lower Section: Full-width Revenue Trend Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#3182f6]" />
                <span>일별/기간별 통합 매출 상세 데이터</span>
                {isOkCashback && (
                  <span className="text-[11px] font-normal text-[#3182f6] bg-[#e8f3ff] px-2 py-0.5 rounded-md ml-1">
                    OK캐쉬백 RS (8:2) 적용 - (전체 매출) 실제 매출 20%
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#8b95a1] font-normal">
                총 {dailyTrend.length}개 일자 기록
              </span>
            </div>
            <div className="overflow-x-auto border border-[#e5e8eb] rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                    <th className="py-3.5 px-4 whitespace-nowrap">날짜 / 기간 (dt)</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">콘텐츠 매출</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">
                      {isOkCashback ? "광고 매출 (전체 / 실제 20%)" : "광고 매출"}
                    </th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">전체 총 매출</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">콘텐츠 비중 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                  {dailyTrend.map((row) => {
                    const grossAdRev = isOkCashback ? Math.round(row.adRev / 0.2) : row.adRev;
                    const netAdRev = row.adRev;
                    const effectiveTotal = row.grossTotal;

                    const ratio =
                      effectiveTotal > 0 ? ((row.serviceRev / effectiveTotal) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#191f28] whitespace-nowrap">{row.dt}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968] whitespace-nowrap">
                          {Math.round(row.serviceRev).toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968] whitespace-nowrap">
                          {isOkCashback ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[#8b95a1] font-normal text-[11px]">
                                ({Math.round(grossAdRev).toLocaleString()}원)
                              </span>
                              <span className="font-bold text-[#191f28]">
                                {Math.round(netAdRev).toLocaleString()}원
                              </span>
                            </div>
                          ) : (
                            `${Math.round(row.adRev).toLocaleString()}원`
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#00c980] whitespace-nowrap">
                          {Math.round(effectiveTotal).toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968] whitespace-nowrap">{ratio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
