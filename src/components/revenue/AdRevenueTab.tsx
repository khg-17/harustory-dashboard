"use client";

import React from "react";
import { PieChart, Tv, TrendingUp } from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend
);

interface AdRevenueTabProps {
  revenueSummary: RevenueSummary;
  revenueViewMode: ViewMode;
}

export const AdRevenueTab: React.FC<AdRevenueTabProps> = ({ revenueSummary, revenueViewMode }) => {
  const { dates, categories } = revenueSummary.adCategoryDailyTrend || { dates: [], categories: {} };

  const adCategoryLineChartData: ChartData<"line"> = {
    labels: dates,
    datasets: [
      {
        label: "보상형 (Reward)",
        data: categories.reward || [],
        borderColor: "#a98eff",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#a98eff",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        tension: 0.35,
      },
      {
        label: "노출형 (Display)",
        data: categories.display || [],
        borderColor: "#3182f6",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#3182f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        tension: 0.35,
      },
      {
        label: "RC",
        data: categories.rc || [],
        borderColor: "#00c980",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#00c980",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        tension: 0.35,
      },
      {
        label: "광고티켓 (Ad Ticket)",
        data: categories.adTicket || [],
        borderColor: "#f59e0b",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#f59e0b",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        tension: 0.35,
      },
    ],
  };

  const { dates: netDates, networks } = revenueSummary.networkDailyTrend || { dates: [], networks: {} };
  const networkColors = ["#a98eff", "#3182f6", "#00c980", "#f59e0b", "#ec4899", "#6366f1"];

  const adNetworkLineChartData: ChartData<"line"> = {
    labels: netDates,
    datasets: Object.keys(networks).map((netName, idx) => ({
      label: netName,
      data: networks[netName],
      borderColor: networkColors[idx % networkColors.length],
      backgroundColor: "transparent",
      borderWidth: 2.5,
      pointBackgroundColor: networkColors[idx % networkColors.length],
      pointBorderColor: "#fff",
      pointBorderWidth: 1.5,
      pointRadius: 3.5,
      tension: 0.35,
    })),
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: { position: "top" as const, align: "end" as const, labels: { boxWidth: 12, usePointStyle: true, font: { family: "Pretendard", size: 11, weight: 600 } } },
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

  return (
    <div className="space-y-6">
      {/* Upper Section: Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Ad Category Daily Line Trend Chart */}
        <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#f2f4f6]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
            <TrendingUp className="w-4 h-4 text-[#a98eff]" />
            <span>일별 광고 유형/카테고리별 매출 추이</span>
          </div>
          <div className="h-72 pt-2">
            {dates.length > 0 ? (
              <Line data={adCategoryLineChartData} options={lineOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                조회된 일별 광고 카테고리 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Right: Ad Network Daily Line Trend Chart */}
        <div className="space-y-3 bg-[#f8f9fa] p-4 rounded-xl border border-[#f2f4f6]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
            <Tv className="w-4 h-4 text-[#a98eff]" />
            <span>일별 매체 네트워크별 매출 추이</span>
          </div>
          <div className="h-72 pt-2">
            {netDates.length > 0 ? (
              <Line data={adNetworkLineChartData} options={lineOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
                조회된 일별 매체 네트워크 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Section: Breakdown Tables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Left: Ad Category Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
            <PieChart className="w-4 h-4 text-[#a98eff]" />
            <span>광고 유형별 매출 상세</span>
          </div>
          <div className="overflow-x-auto border border-[#e5e8eb]/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                  <th className="py-3 px-4">광고 카테고리</th>
                  <th className="py-3 px-4 text-right">노출수</th>
                  <th className="py-3 px-4 text-right">매출 (원)</th>
                  <th className="py-3 px-4 text-right">비중 (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                {Object.entries(revenueSummary.adCategoryMap).map(([cat, val]) => {
                  const catName =
                    cat === "reward"
                      ? "보상형 광고"
                      : cat === "display"
                      ? "노출형 광고"
                      : cat === "rc"
                      ? "RC"
                      : cat === "adTicket"
                      ? "광고티켓"
                      : cat;
                  const share =
                    revenueSummary.totalAdRevenue > 0
                      ? ((val.revenue / revenueSummary.totalAdRevenue) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={cat} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#191f28]">{catName}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                        {val.impression > 0 ? `${val.impression.toLocaleString()}회` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                        {Math.round(val.revenue).toLocaleString()}원
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#a98eff]">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Ad Network Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#4e5968]">
            <Tv className="w-4 h-4 text-[#a98eff]" />
            <span>광고 매체사/네트워크별 매출 상세</span>
          </div>
          <div className="overflow-x-auto border border-[#e5e8eb]/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                  <th className="py-3 px-4">네트워크 매체</th>
                  <th className="py-3 px-4 text-right">노출수</th>
                  <th className="py-3 px-4 text-right">매출 (원)</th>
                  <th className="py-3 px-4 text-right">비중 (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                {Object.entries(revenueSummary.networkMap).map(([net, val]) => {
                  const share =
                    revenueSummary.totalAdRevenue > 0
                      ? ((val.revenue / revenueSummary.totalAdRevenue) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <tr key={net} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#191f28]">{net}</td>
                      <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                        {val.impression > 0 ? `${val.impression.toLocaleString()}회` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[#4e5968]">
                        {Math.round(val.revenue).toLocaleString()}원
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-[#a98eff]">{share}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
