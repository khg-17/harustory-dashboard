"use client";

import React from "react";
import { RevenueSummary } from "@/types/dashboard";

interface RevenueKpiCardsProps {
  revenueSummary: RevenueSummary;
}

export const RevenueKpiCards: React.FC<RevenueKpiCardsProps> = ({ revenueSummary }) => {
  const grossRevenue = Number(revenueSummary?.grossRevenue || 0);
  const contentPaySum = Number(revenueSummary?.contentPaySum || 0);
  const totalAdRevenue = Number(revenueSummary?.totalAdRevenue || 0);
  const dailyTrend = revenueSummary?.dailyTrend || [];

  const contentRatio = grossRevenue > 0 ? ((contentPaySum / grossRevenue) * 100).toFixed(1) : "0.0";
  const adRatio = grossRevenue > 0 ? ((totalAdRevenue / grossRevenue) * 100).toFixed(1) : "0.0";

  // Calculate Growth Rate vs Previous Period (전기/전월 대비 증감률)
  const len = dailyTrend.length;
  let prevGross = 0, recentGross = 0;
  let prevContent = 0, recentContent = 0;
  let prevAd = 0, recentAd = 0;

  if (len >= 2) {
    const mid = Math.floor(len / 2);
    const prevPart = dailyTrend.slice(0, mid);
    const recentPart = dailyTrend.slice(mid);

    prevGross = prevPart.reduce((sum, d) => sum + (d.grossTotal || 0), 0);
    recentGross = recentPart.reduce((sum, d) => sum + (d.grossTotal || 0), 0);

    prevContent = prevPart.reduce((sum, d) => sum + (d.serviceRev || 0), 0);
    recentContent = recentPart.reduce((sum, d) => sum + (d.serviceRev || 0), 0);

    prevAd = prevPart.reduce((sum, d) => sum + (d.adRev || 0), 0);
    recentAd = recentPart.reduce((sum, d) => sum + (d.adRev || 0), 0);
  }

  const grossGrowth = prevGross > 0 ? ((recentGross - prevGross) / prevGross) * 100 : 0;
  const contentGrowth = prevContent > 0 ? ((recentContent - prevContent) / prevContent) * 100 : 0;
  const adGrowth = prevAd > 0 ? ((recentAd - prevAd) / prevAd) * 100 : 0;

  const renderGrowthBadge = (growth: number) => {
    const isUp = growth >= 0;
    const absVal = Math.abs(growth).toFixed(1);
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-md ${
        isUp ? "bg-[#e8f3ff] text-[#3182f6]" : "bg-[#fff0f1] text-[#f04452]"
      }`}>
        {isUp ? `▲ +${absVal}%` : `▼ -${absVal}%`}
        <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">전월대비</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </span>
          {renderGrowthBadge(adGrowth)}
        </div>
        <div className="text-[28px] font-bold text-[#191f28] tracking-[-0.04em]">
          {Math.round(totalAdRevenue).toLocaleString()}<span className="text-[18px] text-[#4e5968] ml-0.5">원</span>
        </div>
      </div>
    </div>
  );
};
