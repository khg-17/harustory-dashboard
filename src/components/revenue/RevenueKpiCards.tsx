"use client";

import React from "react";
import { RevenueSummary } from "@/types/dashboard";

interface RevenueKpiCardsProps {
  revenueSummary: RevenueSummary;
  selectedApp?: string;
}

export const RevenueKpiCards: React.FC<RevenueKpiCardsProps> = ({ revenueSummary, selectedApp = "tc" }) => {
  const isOkCashback =
    selectedApp === "ph-okcashback" ||
    selectedApp === "okcashback" ||
    selectedApp?.toLowerCase().includes("okcashback") ||
    selectedApp?.includes("ok캐쉬백") ||
    selectedApp?.includes("오케이캐쉬백");

  const grossRevenue = Number(revenueSummary?.grossRevenue || 0);
  const contentPaySum = Number(revenueSummary?.contentPaySum || 0);
  const totalAdRevenue = Number(revenueSummary?.totalAdRevenue || 0);
  const rawTotalAdRevenue = Number(revenueSummary?.rawTotalAdRevenue || totalAdRevenue);

  const contentRatio = grossRevenue > 0 ? ((contentPaySum / grossRevenue) * 100).toFixed(1) : "0.0";
  const adRatio = grossRevenue > 0 ? ((totalAdRevenue / grossRevenue) * 100).toFixed(1) : "0.0";

  const grossGrowth = revenueSummary?.grossGrowth ?? 0;
  const contentGrowth = revenueSummary?.contentGrowth ?? 0;
  const adGrowth = revenueSummary?.adGrowth ?? 0;

  const renderGrowthBadge = (growth: number) => {
    const isUp = growth >= 0;
    const absVal = Math.abs(growth).toFixed(1);
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-md ${
        isUp ? "bg-[#fff0f1] text-[#f04452]" : "bg-[#e8f3ff] text-[#3182f6]"
      }`}>
        {isUp ? `▲ +${absVal}%` : `▼ -${absVal}%`}
        <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">전월대비</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Gross Revenue Card */}
      <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#8b95a1]">
            전체 총 매출
          </span>
          {renderGrowthBadge(grossGrowth)}
        </div>
        <div className="text-[28px] font-bold text-[#191f28] tracking-[-0.04em]">
          {Math.round(grossRevenue).toLocaleString()}<span className="text-[18px] text-[#4e5968] ml-0.5">원</span>
        </div>
      </div>

      {/* 2. Content Revenue Card */}
      <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#8b95a1]">
            콘텐츠 매출 ({contentRatio}%)
          </span>
          {renderGrowthBadge(contentGrowth)}
        </div>
        <div className="text-[28px] font-bold text-[#191f28] tracking-[-0.04em]">
          {Math.round(contentPaySum).toLocaleString()}<span className="text-[18px] text-[#4e5968] ml-0.5">원</span>
        </div>
      </div>

      {/* 3. Ad Revenue Card */}
      <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#8b95a1]">
            광고 매출 ({adRatio}%)
            {isOkCashback && (
              <span className="ml-1.5 text-[10px] font-normal text-[#3182f6] bg-[#e8f3ff] px-1.5 py-0.5 rounded-md">
                RS 20%
              </span>
            )}
          </span>
          {renderGrowthBadge(adGrowth)}
        </div>
        <div className="text-[28px] font-bold text-[#191f28] tracking-[-0.04em]">
          {isOkCashback && (
            <span className="text-[14px] font-normal text-[#8b95a1] mr-1.5">
              ({Math.round(rawTotalAdRevenue).toLocaleString()}원)
            </span>
          )}
          {Math.round(totalAdRevenue).toLocaleString()}
          <span className="text-[18px] text-[#4e5968] ml-0.5">원</span>
        </div>
      </div>
    </div>
  );
};
