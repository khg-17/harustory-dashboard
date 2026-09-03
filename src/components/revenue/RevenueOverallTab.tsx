"use client";

import React from "react";
import { TrendingUp, RefreshCw, Table as TableIcon } from "lucide-react";
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
}

export const RevenueOverallTab: React.FC<RevenueOverallTabProps> = ({
  loading,
  revenueViewMode,
  revenueSummary,
  revenueChartData,
  revenueChartOptions,
}) => {
  const dailyTrend = revenueSummary?.dailyTrend || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#3182f6]" />
          <span>일별 콘텐츠 vs 광고 매출 통합 추이</span>
        </div>
        <span className="text-[11px] text-[#8b95a1] font-semibold">단위: 원 (KRW)</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 gap-2 text-[#8b95a1]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
          <span className="text-xs font-semibold">ClickHouse에서 매출 데이터를 계산하는 중입니다...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart View */}
          <div className="bg-[#f8f9fa] p-4 rounded-xl space-y-2">
            <div className="text-xs font-bold text-[#4e5968] flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#3182f6]" />
              <span>일별/기간별 통합 매출 추이 차트</span>
            </div>
            <div className="h-64 sm:h-72 md:h-80 pt-1 relative w-full">
              {dailyTrend.length > 0 ? (
                <Line data={revenueChartData} options={revenueChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                  조회된 기간 내 매출 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Table View (Placed directly below chart) */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-[#4e5968] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="w-3.5 h-3.5 text-[#3182f6]" />
                <span>일별/기간별 매출 상세 데이터</span>
              </div>
              <span className="text-[11px] text-[#8b95a1] font-normal">
                총 {dailyTrend.length}개 기록
              </span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#e5e8eb]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                    <th className="py-3.5 px-4">날짜 / 기간 (dt)</th>
                    <th className="py-3.5 px-4 text-right">콘텐츠 매출</th>
                    <th className="py-3.5 px-4 text-right">광고 매출</th>
                    <th className="py-3.5 px-4 text-right">전체 총 매출</th>
                    <th className="py-3.5 px-4 text-right">콘텐츠 비중 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                  {dailyTrend.map((row) => {
                    const ratio =
                      row.grossTotal > 0 ? ((row.serviceRev / row.grossTotal) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#191f28]">{row.dt}</td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968]">
                          {Math.round(row.serviceRev).toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968]">
                          {Math.round(row.adRev).toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#00c980]">
                          {Math.round(row.grossTotal).toLocaleString()}원
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#4e5968]">{ratio}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
