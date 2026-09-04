"use client";

import React from "react";
import { PieChart, TrendingUp } from "lucide-react";
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
import { RevenueSummary } from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AdCategoryTabProps {
  revenueSummary: RevenueSummary;
}

export const AdCategoryTab: React.FC<AdCategoryTabProps> = ({ revenueSummary }) => {
  const { dates, categories } = revenueSummary.adCategoryDailyTrend || { dates: [], categories: {} };

  const categoryConfig = [
    { key: "reward", label: "보상형 광고", color: "#a98eff" },
    { key: "display", label: "노출형 광고", color: "#3182f6" },
    { key: "rc", label: "RC", color: "#00c980" },
    { key: "adTicket", label: "광고티켓", color: "#f59e0b" },
  ];

  const activeCategories = categoryConfig.filter(
    (cfg) => (categories[cfg.key] || []).some((v) => v > 0)
  );

  const displayCategories = activeCategories.length > 0 ? activeCategories : categoryConfig;

  const adCategoryLineChartData: ChartData<"line"> = {
    labels: dates,
    datasets: displayCategories.map((cfg) => ({
      label: cfg.label,
      data: categories[cfg.key] || [],
      borderColor: cfg.color,
      backgroundColor: "transparent",
      borderWidth: 2.5,
      pointBackgroundColor: "#fff",
      pointBorderColor: cfg.color,
      pointBorderWidth: 2,
      pointRadius: dates.length > 30 ? 0 : 2.5,
      pointHoverRadius: 6,
      pointHoverBorderWidth: 3,
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: cfg.color,
      tension: 0.4,
    })),
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        align: "end" as const,
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: "circle",
          padding: 16,
          color: "#4e5968",
          font: { family: "Pretendard, sans-serif", size: 12, weight: 600 },
        },
      },
      tooltip: {
        backgroundColor: "#191f28",
        titleColor: "#ffffff",
        bodyColor: "#b0b8c1",
        titleFont: { family: "Pretendard, sans-serif", size: 12, weight: "bold" as const },
        bodyFont: { family: "Pretendard, sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}원`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 } },
      },
      y: {
        border: { display: false },
        grid: { color: "#f2f4f6", drawTicks: false },
        ticks: {
          color: "#8b95a1",
          font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
          callback: (v: any) => `${Number(v).toLocaleString()}원`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Upper Section: Full-width Ad Category Line Chart */}
      <div className="space-y-3 bg-[#f8f9fa] p-5 rounded-2xl border border-[#e5e8eb]">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#a98eff]" />
            <span>일별 광고 유형/카테고리별 매출 추이 차트</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-semibold">단위: 원 (KRW)</span>
        </div>
        <div className="h-64 sm:h-72 md:h-80 pt-2 relative w-full">
          {dates.length > 0 ? (
            <Line data={adCategoryLineChartData} options={lineOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
              조회된 일별 광고 카테고리 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Lower Section: Full-width Daily Ad Category Revenue Trend Table */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#4e5968]">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#a98eff]" />
            <span>일별 광고 카테고리별 매출 상세 데이터</span>
          </div>
          <span className="text-[11px] text-[#8b95a1] font-normal">
            총 {dates.length}개 일자 기록
          </span>
        </div>
        <div className="overflow-x-auto border border-[#e5e8eb] rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                <th className="py-3.5 px-4 whitespace-nowrap">날짜 (dt)</th>
                {displayCategories.map((cfg) => (
                  <th key={cfg.key} className="py-3.5 px-4 text-right whitespace-nowrap">
                    {cfg.label} (원)
                  </th>
                ))}
                <th className="py-3.5 px-4 text-right whitespace-nowrap">일별 합계 (원)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
              {dates.map((dt, idx) => {
                let daySum = 0;
                return (
                  <tr key={dt} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#191f28] whitespace-nowrap">{dt}</td>
                    {displayCategories.map((cfg) => {
                      const val = categories[cfg.key]?.[idx] || 0;
                      daySum += val;
                      return (
                        <td key={cfg.key} className="py-3.5 px-4 text-right font-medium text-[#4e5968] whitespace-nowrap">
                          {Math.round(val).toLocaleString()}원
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-right font-bold text-[#191f28] whitespace-nowrap">
                      {Math.round(daySum).toLocaleString()}원
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
