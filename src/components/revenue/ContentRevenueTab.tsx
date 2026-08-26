"use client";

import React from "react";
import { CreditCard, PieChart as PieChartIcon, ShoppingBag, Table, TrendingUp } from "lucide-react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { RevenueCategoryTab, RevenueSummary, ViewMode } from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ContentRevenueTabProps {
  revenueSummary: RevenueSummary;
  revenueViewMode?: ViewMode;
  revenueCategoryTab?: RevenueCategoryTab;
}

export const ContentRevenueTab: React.FC<ContentRevenueTabProps> = ({
  revenueSummary,
  revenueCategoryTab = "content_pay",
}) => {
  const isUsageTab = revenueCategoryTab === "content_usage";
  const contentDailyList = revenueSummary?.contentDailyList || [];
  const purchaseTypeMap = revenueSummary?.purchaseTypeMap || {};
  const contentPaySum = Number(revenueSummary?.contentPaySum || 0);
  const grossRevenue = Number(revenueSummary?.grossRevenue || 0);
  const chargeWonSum = Number(revenueSummary?.chargeWonSum || 0);
  const adTicketSum = Number(revenueSummary?.adTicketSum || 0);
  const avgArppuWon = Number(revenueSummary?.avgArppuWon || 0);
  const avgPayerUu = Number(revenueSummary?.avgPayerUu || 0);

  // 1. Content Coin Pay Chart Data
  const contentLineChartData: ChartData<"line"> = {
    labels: contentDailyList.map((d) => d.formattedDt || d.dt),
    datasets: [
      {
        label: "콘텐츠 코인 결제 매출 (원)",
        data: contentDailyList.map((d) => d.revenueWon),
        borderColor: "#3182f6",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderWidth: 2.5,
        pointBackgroundColor: "#3182f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
      {
        label: "현금 코인 충전 금액 (원)",
        data: contentDailyList.map((d) => d.chargeWon),
        borderColor: "#00c980",
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        borderWidth: 2.5,
        pointBackgroundColor: "#00c980",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: { boxWidth: 12, usePointStyle: true, font: { family: "Pretendard", size: 11, weight: 600 } },
      },
      tooltip: {
        backgroundColor: "#191f28",
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}원`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#8b95a1", font: { family: "Pretendard", size: 11 } } },
      y: {
        grid: { color: "#f2f4f6" },
        ticks: { color: "#8b95a1", font: { family: "Pretendard", size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}원` },
      },
    },
  };

  // 2. Purchase Type Ultra-Soft Light Stacked Area Chart & Doughnut Mix
  const { dates: purchaseDates = [], types: purchaseTypes = {} } = revenueSummary?.purchaseTypeDailyTrend || { dates: [], types: {} };

  const purchaseTypeLineChartData: ChartData<"line"> = {
    labels: purchaseDates,
    datasets: [
      {
        label: "유료대여",
        data: purchaseTypes[10] || [],
        borderColor: "#3182f6",
        backgroundColor: "rgba(59, 130, 246, 0.08)",
        borderWidth: 1.8,
        pointBackgroundColor: "#3182f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      },
      {
        label: "유료소장",
        data: purchaseTypes[20] || [],
        borderColor: "#a98eff",
        backgroundColor: "rgba(169, 142, 255, 0.08)",
        borderWidth: 1.8,
        pointBackgroundColor: "#a98eff",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      },
      {
        label: "기다무",
        data: purchaseTypes[11] || [],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        borderWidth: 1.8,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      },
      {
        label: "무료티켓",
        data: purchaseTypes[12] || [],
        borderColor: "#00c980",
        backgroundColor: "rgba(0, 201, 128, 0.08)",
        borderWidth: 1.8,
        pointBackgroundColor: "#00c980",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      },
      {
        label: "광고무",
        data: purchaseTypes[13] || [],
        borderColor: "#ec4899",
        backgroundColor: "rgba(236, 72, 153, 0.08)",
        borderWidth: 1.8,
        pointBackgroundColor: "#ec4899",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const purchaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: { boxWidth: 12, usePointStyle: true, font: { family: "Pretendard", size: 11, weight: 600 } },
      },
      tooltip: {
        backgroundColor: "#191f28",
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}건`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { color: "#8b95a1", font: { family: "Pretendard", size: 11 } } },
      y: {
        stacked: true,
        grid: { color: "#f2f4f6" },
        ticks: { color: "#8b95a1", font: { family: "Pretendard", size: 11 }, callback: (v: any) => `${Number(v).toLocaleString()}건` },
      },
    },
  };

  // 3. Purchase Type Doughnut Mix Chart Data
  const c10Total = purchaseTypeMap[10]?.cnt || 0;
  const c20Total = purchaseTypeMap[20]?.cnt || 0;
  const c11Total = purchaseTypeMap[11]?.cnt || 0;
  const c12Total = purchaseTypeMap[12]?.cnt || 0;
  const c13Total = purchaseTypeMap[13]?.cnt || 0;
  const allUsageTotal = c10Total + c20Total + c11Total + c12Total + c13Total;

  const doughnutData: ChartData<"doughnut"> = {
    labels: ["유료대여", "유료소장", "기다무", "무료티켓", "광고무"],
    datasets: [
      {
        data: [c10Total, c20Total, c11Total, c12Total, c13Total],
        backgroundColor: ["#3182f6", "#a98eff", "#f59e0b", "#00c980", "#ec4899"],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 10, usePointStyle: true, font: { family: "Pretendard", size: 10, weight: 600 } },
      },
      tooltip: {
        backgroundColor: "#191f28",
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context: any) => {
            const val = Number(context.raw);
            const pct = allUsageTotal > 0 ? ((val / allUsageTotal) * 100).toFixed(1) : "0.0";
            return ` ${context.label}: ${val.toLocaleString()}건 (${pct}%)`;
          },
        },
      },
    },
    cutout: "68%",
  };

  // --- SUB TAB 2: 회차 이용 구분별 View ---
  if (isUsageTab) {
    return (
      <div className="space-y-6">
        {/* Upper Section: Ultra-Soft Stacked Trend Area Chart + Doughnut Mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left (2 Cols): Soft Stacked Area Trend Chart */}
          <div className="lg:col-span-2 space-y-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#f2f4f6]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
              <TrendingUp className="w-4 h-4 text-[#3182f6]" />
              <span>일별 회차 이용 구분별 이용 건수 추이 차트</span>
            </div>
            <div className="h-72 pt-2">
              {purchaseDates.length > 0 ? (
                <Line data={purchaseTypeLineChartData} options={purchaseOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                  조회된 회차 이용 구분 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Right (1 Col): Doughnut Mix Chart & Share Analytics */}
          <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#f2f4f6] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-[#4e5968] border-b border-[#f2f4f6] pb-2">
              <div className="flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-[#a98eff]" />
                <span>회차 이용 믹스 비중 (%)</span>
              </div>
              <span className="text-[11px] text-[#8b95a1] font-normal">
                총 {allUsageTotal.toLocaleString()}건
              </span>
            </div>
            <div className="h-56 relative pt-1">
              {allUsageTotal > 0 ? (
                <Doughnut data={doughnutData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                  조회된 믹스 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Purchase Type Summary Cards */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold text-[#4e5968] flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-[#3182f6]" />
            <span>회차 이용 구분별 누적 이용 건수 및 이용 유저</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="bg-gray-50 p-3 rounded-xl border border-[#e5e8eb]/80">
              <div className="text-[#8b95a1] font-semibold">유료대여</div>
              <div className="text-base font-bold text-[#191f28] mt-1">
                {c10Total.toLocaleString()}건
              </div>
              <div className="text-[11px] text-[#3182f6] font-semibold mt-0.5">
                점유율: {allUsageTotal > 0 ? ((c10Total / allUsageTotal) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-[#e5e8eb]/80">
              <div className="text-[#8b95a1] font-semibold">유료소장</div>
              <div className="text-base font-bold text-[#191f28] mt-1">
                {c20Total.toLocaleString()}건
              </div>
              <div className="text-[11px] text-[#a98eff] font-semibold mt-0.5">
                점유율: {allUsageTotal > 0 ? ((c20Total / allUsageTotal) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-[#e5e8eb]/80">
              <div className="text-[#8b95a1] font-semibold">기다무</div>
              <div className="text-base font-bold text-[#191f28] mt-1">
                {c11Total.toLocaleString()}건
              </div>
              <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                점유율: {allUsageTotal > 0 ? ((c11Total / allUsageTotal) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-[#e5e8eb]/80">
              <div className="text-[#8b95a1] font-semibold">무료티켓</div>
              <div className="text-base font-bold text-[#191f28] mt-1">
                {c12Total.toLocaleString()}건
              </div>
              <div className="text-[11px] text-[#00c980] font-semibold mt-0.5">
                점유율: {allUsageTotal > 0 ? ((c12Total / allUsageTotal) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-xl border border-[#e5e8eb]/80">
              <div className="text-[#8b95a1] font-semibold">광고무</div>
              <div className="text-base font-bold text-[#191f28] mt-1">
                {c13Total.toLocaleString()}건
              </div>
              <div className="text-[11px] text-pink-600 font-semibold mt-0.5">
                점유율: {allUsageTotal > 0 ? ((c13Total / allUsageTotal) * 100).toFixed(1) : "0.0"}%
              </div>
            </div>
          </div>
        </div>

        {/* Lower Section: Daily Purchase Type Table */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-bold text-[#4e5968] flex items-center gap-2">
            <Table className="w-3.5 h-3.5 text-[#3182f6]" />
            <span>일별 회차 이용 구분별 상세 건수 데이터</span>
          </h3>
          <div className="overflow-x-auto border border-[#e5e8eb]/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                  <th className="py-3 px-4">날짜 (dt)</th>
                  <th className="py-3 px-4 text-right">유료대여</th>
                  <th className="py-3 px-4 text-right">유료소장</th>
                  <th className="py-3 px-4 text-right">기다무</th>
                  <th className="py-3 px-4 text-right">무료티켓</th>
                  <th className="py-3 px-4 text-right">광고무</th>
                  <th className="py-3 px-4 text-right">일별 총 이용건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                {purchaseDates.length > 0 ? (
                  purchaseDates.map((dt, idx) => {
                    const c10 = purchaseTypes[10]?.[idx] || 0;
                    const c20 = purchaseTypes[20]?.[idx] || 0;
                    const c11 = purchaseTypes[11]?.[idx] || 0;
                    const c12 = purchaseTypes[12]?.[idx] || 0;
                    const c13 = purchaseTypes[13]?.[idx] || 0;
                    const dayTotal = c10 + c20 + c11 + c12 + c13;
                    return (
                      <tr key={dt} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#191f28]">{dt}</td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">{c10.toLocaleString()}건</td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">{c20.toLocaleString()}건</td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">{c11.toLocaleString()}건</td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">{c12.toLocaleString()}건</td>
                        <td className="py-3 px-4 text-right font-medium text-[#4e5968]">{c13.toLocaleString()}건</td>
                        <td className="py-3 px-4 text-right font-bold text-[#191f28]">{dayTotal.toLocaleString()}건</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#8b95a1] font-semibold">
                      조회된 회차 이용 구분 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB TAB 1: 코인 결제 매출 View (Default) ---
  return (
    <div className="space-y-6">
      {/* Content KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
        <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5">
          <div className="text-[#8b95a1] font-semibold">코인 결제 매출</div>
          <div className="text-xl font-bold text-blue-700">
            {contentPaySum.toLocaleString()}원
          </div>
          <div className="text-[11px] text-[#3182f6] font-medium">
            코인결제 비중:{" "}
            {grossRevenue > 0
              ? ((contentPaySum / grossRevenue) * 100).toFixed(1)
              : 0}%
          </div>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-1.5">
          <div className="text-[#8b95a1] font-semibold">코인 충전 금액 (KRW)</div>
          <div className="text-xl font-bold text-emerald-700">
            {chargeWonSum.toLocaleString()}원
          </div>
          <div className="text-[11px] text-[#00c980] font-medium">유저 코인 충전 총액</div>
        </div>

        <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl space-y-1.5">
          <div className="text-[#8b95a1] font-semibold">광고무 지면 매출</div>
          <div className="text-xl font-bold text-purple-700">
            {adTicketSum.toLocaleString()}원
          </div>
          <div className="text-[11px] text-[#a98eff] font-medium">광고무 지면 수익</div>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-xl space-y-1.5">
          <div className="text-[#8b95a1] font-semibold">평균 ARPPU</div>
          <div className="text-xl font-bold text-amber-700">
            {avgArppuWon.toLocaleString()}원
          </div>
          <div className="text-[11px] text-amber-600 font-medium">
            일평균 Payer: {avgPayerUu.toLocaleString()}명
          </div>
        </div>
      </div>

      {/* Upper Section: Full Width Coin Revenue vs Charge Line Chart */}
      <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#f2f4f6]">
        <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
          <TrendingUp className="w-4 h-4 text-[#3182f6]" />
          <span>일별 코인 결제 매출 vs 현금 충전액 추이 차트</span>
        </div>
        <div className="h-72 pt-2">
          {contentDailyList.length > 0 ? (
            <Line data={contentLineChartData} options={lineChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
              조회된 콘텐츠 결제 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Lower Section: Daily Content Revenue Breakdown Table */}
      <div className="space-y-3 pt-1">
        <h3 className="text-xs font-bold text-[#4e5968] flex items-center gap-2">
          <Table className="w-3.5 h-3.5 text-[#3182f6]" />
          <span>일별 콘텐츠 결제 매출 및 충전 현황 상세 테이블</span>
        </h3>
        <div className="overflow-x-auto border border-[#e5e8eb]/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                <th className="py-3 px-4">날짜 (dt)</th>
                <th className="py-3 px-4 text-right">코인 결제 매출 (원)</th>
                <th className="py-3 px-4 text-right">사용 코인</th>
                <th className="py-3 px-4 text-right">코인 충전액 (원)</th>
                <th className="py-3 px-4 text-right">결제 유저 수</th>
                <th className="py-3 px-4 text-right">ARPPU (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
              {contentDailyList.length > 0 ? (
                contentDailyList.map((row) => (
                  <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#191f28]">{row.dt}</td>
                    <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                      {row.revenueWon.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                      {row.revenueCoin.toLocaleString()} 코인
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                      {row.chargeWon.toLocaleString()}원
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#191f28]">
                      {row.payerUu.toLocaleString()}명
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#191f28]">
                      {row.arppuWon.toLocaleString()}원
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8b95a1] font-semibold">
                    선택한 기간 내 상세 콘텐츠 매출 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
