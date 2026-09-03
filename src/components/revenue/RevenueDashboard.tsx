"use client";

import React from "react";
import { Receipt, Download } from "lucide-react";
import { ChartData } from "chart.js";
import { RevenueKpiCards } from "./RevenueKpiCards";
import { RevenueOverallTab } from "./RevenueOverallTab";
import { AdCategoryTab } from "./AdCategoryTab";
import { AdNetworkTab } from "./AdNetworkTab";
import { ContentRevenueTab } from "./ContentRevenueTab";
import { MarginAnalysisTab } from "./MarginAnalysisTab";
import { RevenueCategoryTab, RevenueSummary, ViewMode } from "@/types/dashboard";

interface RevenueDashboardProps {
  revenueSummary: RevenueSummary;
  revenueCategoryTab: RevenueCategoryTab;
  setRevenueCategoryTab: (tab: RevenueCategoryTab) => void;
  revenueViewMode: ViewMode;
  setRevenueViewMode: (mode: ViewMode) => void;
  downloadRevenueCSV: () => void;
  loading: boolean;
  revenueChartData: ChartData<"line">;
  marginChartData: ChartData<"line">;
  revenueChartOptions: any;
  hasSettlementData?: boolean;
  selectedApp?: string;
}

export const RevenueDashboard: React.FC<RevenueDashboardProps> = ({
  revenueSummary,
  revenueCategoryTab,
  setRevenueCategoryTab,
  revenueViewMode,
  setRevenueViewMode,
  downloadRevenueCSV,
  loading,
  revenueChartData,
  marginChartData,
  revenueChartOptions,
  hasSettlementData = false,
  selectedApp = "tc",
}) => {
  return (
    <div className="space-y-6">
      {/* Settlement API Integration Active Badge */}
      {hasSettlementData && (
        <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-[#e8f3ff] to-[#f2f4f6] border border-[#b2d6ff] rounded-2xl px-5 py-3 text-xs font-semibold text-[#1b64da] shadow-[0_2px_8px_rgba(49,130,246,0.06)]">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3182f6] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#3182f6]"></span>
            </span>
            <span>
              {selectedApp === "tc"
                ? "전체(tc) 일별 정산 API v2 데이터가 연동되었습니다. (admin.treasurecomics.com 정산 원장 연동)"
                : `${selectedApp} 일별 정산 API v2 앱별 데이터가 연동되었습니다. (admin.treasurecomics.com 정산 원장 연동)`}
            </span>
          </div>
          <span className="text-[11px] text-[#4e5968] font-normal">D-1 기준 정산 원장 데이터 표출 중</span>
        </div>
      )}

      {/* 1. TOP KPI SUMMARY CARDS */}

      {/* 1. TOP KPI SUMMARY CARDS (Excluded in Content Revenue and Margin Analysis Tabs per user request) */}
      {revenueCategoryTab !== "margin" &&
        revenueCategoryTab !== "content" &&
        revenueCategoryTab !== "content_pay" &&
        revenueCategoryTab !== "content_usage" && (
          <RevenueKpiCards revenueSummary={revenueSummary} />
        )}

      {/* 2. REVENUE CATEGORY CONTAINER WITH CATEGORY BREAKDOWN TABS */}
      <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 space-y-6">
        {/* Category Sub-Navigation Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e8eb] pb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#3182f6]" />
            <h2 className="text-[17px] font-bold text-[#191f28] tracking-[-0.02em]">
              {revenueCategoryTab === "margin"
                ? "손익 마진율 분석"
                : revenueCategoryTab === "content" || revenueCategoryTab === "content_pay" || revenueCategoryTab === "content_usage"
                ? "콘텐츠 매출 상세 분석"
                : "광고 매출 상세 분석"}
            </h2>

            {/* Sub-category Tabs for 광고 매출 상세 */}
            {(revenueCategoryTab === "overall" || revenueCategoryTab === "ad_category" || revenueCategoryTab === "ad_network" || revenueCategoryTab === "ad") && (
              <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs ml-2 overflow-x-auto max-w-full">
                <button
                  onClick={() => setRevenueCategoryTab("overall")}
                  className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    revenueCategoryTab === "overall"
                      ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                  }`}
                >
                  전체 매출 추이
                </button>
                <button
                  onClick={() => setRevenueCategoryTab("ad_category")}
                  className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    revenueCategoryTab === "ad_category" || revenueCategoryTab === "ad"
                      ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                  }`}
                >
                  광고 카테고리별
                </button>
                <button
                  onClick={() => setRevenueCategoryTab("ad_network")}
                  className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    revenueCategoryTab === "ad_network"
                      ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                  }`}
                >
                  광고 매체사별
                </button>
              </div>
            )}

            {/* Sub-category Tabs for 콘텐츠 매출 상세 */}
            {(revenueCategoryTab === "content" || revenueCategoryTab === "content_pay" || revenueCategoryTab === "content_usage") && (
              <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs ml-2 overflow-x-auto max-w-full">
                <button
                  onClick={() => setRevenueCategoryTab("content_pay")}
                  className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    revenueCategoryTab === "content" || revenueCategoryTab === "content_pay"
                      ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                  }`}
                >
                  코인 결제 매출
                </button>
                <button
                  onClick={() => setRevenueCategoryTab("content_usage")}
                  className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                    revenueCategoryTab === "content_usage"
                      ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                  }`}
                >
                  회차 이용 구분별
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={downloadRevenueCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#4e5968] bg-[#f8f9fa] hover:bg-[#f2f4f6] rounded-lg cursor-pointer transition-colors"
              title="CSV 데이터 다운로드"
            >
              <Download className="w-3.5 h-3.5 text-[#8b95a1]" />
              <span>매출 엑셀 다운로드</span>
            </button>
          </div>
        </div>

        {/* REVENUE CATEGORY CONTENT VIEWS */}
        {revenueCategoryTab === "overall" && (
          <RevenueOverallTab
            loading={loading}
            revenueViewMode={revenueViewMode}
            revenueSummary={revenueSummary}
            revenueChartData={revenueChartData}
            revenueChartOptions={revenueChartOptions}
          />
        )}

        {(revenueCategoryTab === "ad_category" || revenueCategoryTab === "ad") && (
          <AdCategoryTab revenueSummary={revenueSummary} />
        )}

        {revenueCategoryTab === "ad_network" && (
          <AdNetworkTab revenueSummary={revenueSummary} />
        )}

        {(revenueCategoryTab === "content" || revenueCategoryTab === "content_pay" || revenueCategoryTab === "content_usage") && (
          <ContentRevenueTab revenueSummary={revenueSummary} revenueViewMode={revenueViewMode} revenueCategoryTab={revenueCategoryTab} />
        )}

        {revenueCategoryTab === "margin" && (
          <MarginAnalysisTab
            revenueViewMode={revenueViewMode}
            revenueSummary={revenueSummary}
            marginChartData={marginChartData}
            revenueChartOptions={revenueChartOptions}
            selectedApp={selectedApp}
          />
        )}
      </div>
    </div>
  );
};
