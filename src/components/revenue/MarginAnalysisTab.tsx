"use client";

import React from "react";
import { Award, TrendingUp } from "lucide-react";
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

interface MarginAnalysisTabProps {
  revenueViewMode: ViewMode;
  revenueSummary: RevenueSummary;
  marginChartData: ChartData<"line">;
  revenueChartOptions: any;
  selectedApp?: string;
}

export const MarginAnalysisTab: React.FC<MarginAnalysisTabProps> = ({
  revenueViewMode,
  revenueSummary,
  marginChartData,
  revenueChartOptions,
  selectedApp = "tc",
}) => {
  const totalAdRevenue = Number(revenueSummary?.totalAdRevenue || 0);
  const rewardAdRevenue = Number(revenueSummary?.rewardAdRevenue || 0);
  const totalMissionReward = Number(revenueSummary?.totalMissionReward || 0);
  const totalExchangedPoints = Number(revenueSummary?.totalExchangedPoints || 0);
  const netProfit = Number(revenueSummary?.netProfit || 0);
  const marginRate = Number(revenueSummary?.marginRate || 0);
  const dailyTrend = revenueSummary?.dailyTrend || [];
  const isLoss = netProfit < 0;

  const isPhApp = (selectedApp || "").toLowerCase().includes("ph-");

  return (
    <div className="space-y-6">
      {/* ── 4-CARD TOSS KPI GRID (CRISP BORDER & SHADOW) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 총 광고 매출 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            총 광고 매출
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {Math.round(totalAdRevenue).toLocaleString()}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">원</span>
          </div>
        </div>

        {/* Card 2: 적립 알바비 (P) */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            적립 알바비 (P)
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {totalMissionReward.toLocaleString()}
            <span className="text-[16px] font-medium text-[#8b95a1] ml-0.5">P</span>
          </div>
        </div>

        {/* Card 3: 포인트 환전 지급액 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            포인트 환전 지급액
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {totalExchangedPoints.toLocaleString()}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">원</span>
          </div>
        </div>

        {/* Card 4: 순 영업 마진 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8b95a1]">
              {isLoss ? "순 영업 마진 (역마진)" : "순 영업 마진"}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              isLoss ? "bg-[#e8f3ff] text-[#3182f6]" : "bg-[#fff0f1] text-[#f04452]"
            }`}>
              {marginRate > 0 ? `+${marginRate.toFixed(1)}` : marginRate.toFixed(1)}%
            </span>
          </div>
          <div className={`text-[26px] font-bold tracking-[-0.04em] ${isLoss ? "text-[#3182f6]" : "text-[#f04452]"}`}>
            {netProfit > 0 ? `+${Math.round(netProfit).toLocaleString()}` : Math.round(netProfit).toLocaleString()}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">원</span>
          </div>
        </div>
      </div>

      {/* ── 1. MARGIN TREND CHART SECTION ── */}
      <div className="bg-[#f8f9fa] border border-[#e5e8eb] p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3182f6]" />
            <span>일별 총 광고 매출 vs 환전 비용 vs 순 영업 마진 추이</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-semibold">단위: 원 (KRW)</span>
        </div>
        <div className="h-64 sm:h-72 md:h-80 pt-1 relative w-full">
          <Line data={marginChartData} options={revenueChartOptions} />
        </div>
      </div>

      {/* ── 2. DAILY MARGIN TRANSACTION TABLE ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#3182f6]" />
            <span>일별 손익 마진 상세 데이터</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-normal">
            총 {dailyTrend.length}개 일자 기록
          </span>
        </div>

        <div className="overflow-x-auto border border-[#e5e8eb] rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                <th className="py-3.5 px-4">날짜 (dt)</th>
                <th className="py-3.5 px-4 text-right">총 광고 매출 (원)</th>
                <th className="py-3.5 px-4 text-right">미션 광고 매출 (원)</th>
                <th className="py-3.5 px-4 text-right">적립 알바비 (P)</th>
                <th className="py-3.5 px-4 text-right">포인트 환전 (원)</th>
                <th className="py-3.5 px-4 text-right">순 영업 마진 (원)</th>
                <th className="py-3.5 px-4 text-right">손익 마진율 (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
              {dailyTrend.map((row) => {
                const isRowLoss = row.margin < 0;
                return (
                  <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#191f28]">{row.dt}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#191f28]">
                      {Math.round(row.adRev).toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#191f28]">
                      {Math.round(row.rewardAdRev).toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#4e5968]">
                      {Math.round(row.mCost).toLocaleString()} P
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#191f28]">
                      {Math.round(row.eCost).toLocaleString()}원
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-xs inline-block ${
                        isRowLoss ? "bg-[#e8f3ff] text-[#3182f6]" : "bg-[#fff0f1] text-[#f04452]"
                      }`}>
                        {row.margin > 0 ? `+${Math.round(row.margin).toLocaleString()}` : Math.round(row.margin).toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-xs inline-block ${
                        isRowLoss ? "bg-[#e8f3ff] text-[#3182f6]" : "bg-[#fff0f1] text-[#f04452]"
                      }`}>
                        {row.marginRate > 0 ? `+${row.marginRate}` : row.marginRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
