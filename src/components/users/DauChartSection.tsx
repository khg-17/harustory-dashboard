"use client";

import React from "react";
import { Info, TrendingUp, Table, Download, Users, UserPlus, RefreshCw } from "lucide-react";
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
import { ChartProcessedItem, PeriodType, ViewMode } from "@/types/dashboard";

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

interface DauChartSectionProps {
  periodType: PeriodType;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  downloadCSV: () => void;
  avgDau: number;
  totalNewUsers: number;
  loading: boolean;
  chartProcessedData: ChartProcessedItem[];
  dauChartData: ChartData<"line">;
  dauChartOptions: any;
}

export const DauChartSection: React.FC<DauChartSectionProps> = ({
  periodType,
  viewMode,
  setViewMode,
  downloadCSV,
  avgDau,
  totalNewUsers,
  loading,
  chartProcessedData,
  dauChartData,
  dauChartOptions
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e8eb] pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[17px] font-bold text-[#191f28] tracking-[-0.02em]">
            {periodType === "day" ? "일별 DAU 및 신규 유저 현황" : periodType === "week" ? "주별 평균 DAU 및 신규 유저 현황" : "월별 평균 DAU 및 신규 유저 현황"}
          </h2>
          <div className="relative group">
            <Info className="w-4 h-4 text-[#8b95a1] cursor-pointer hover:text-[#4e5968] transition-colors" />
            <div className="absolute left-0 top-6 hidden group-hover:block z-50 w-72 p-3 bg-[#191f28] text-white text-xs rounded-xl shadow-xl border border-gray-700 font-normal leading-relaxed space-y-1.5 pointer-events-none transition-all">
              <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 flex items-center gap-1.5">
                <span>DAU 및 신규 유저 지표 안내</span>
              </div>
              <p className="text-[11px] text-gray-300">
                <strong className="text-[#8bb8ff]">DAU (활성 유저):</strong> 선택한 기간 동안 앱을 방문하여 이벤트를 발생시킨 중복 없는 실사용자 수입니다. (주별/월별 선택 시 일평균 DAU)
              </p>
              <p className="text-[11px] text-gray-300">
                <strong className="text-[#5ae4a7]">신규 가입 유저:</strong> 해당 기간 동안 앱을 최초 가입 및 설치한 신규 유저 수입니다.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs">
            <button 
              onClick={() => setViewMode("chart")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "chart"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>차트</span>
            </button>
            <button 
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>테이블</span>
            </button>
          </div>

          <button 
            onClick={downloadCSV}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#4e5968] bg-[#f8f9fa] hover:bg-[#f2f4f6] rounded-lg cursor-pointer transition-colors"
            title="CSV 데이터 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-[#8b95a1]" />
            <span>엑셀 다운로드</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#f0f6ff] rounded-xl text-[#3182f6]">
          <Users className="w-4 h-4" />
          <span className="font-medium">선택 기간 일평균 DAU</span>
          <span className="font-bold text-[15px] tracking-[-0.02em]">{avgDau.toLocaleString()}명</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#e8faf0] rounded-xl text-[#00a86b]">
          <UserPlus className="w-4 h-4" />
          <span className="font-medium">선택 기간 총 신규 가입 유저</span>
          <span className="font-bold text-[15px] tracking-[-0.02em]">{totalNewUsers.toLocaleString()}명</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 gap-2 text-[#8b95a1]">
          <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
          <span className="text-xs font-semibold">ClickHouse에서 지표 데이터를 조회하는 중입니다...</span>
        </div>
      ) : viewMode === "chart" ? (
        <div className="h-64 sm:h-72 md:h-80 pt-2 relative w-full">
          {chartProcessedData.length > 0 ? (
            <Line data={dauChartData} options={dauChartOptions} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs font-semibold text-[#8b95a1]">
              조회된 기간 내 데이터가 존재하지 않습니다.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl mt-2">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                <th className="py-3.5 px-4">날짜 / 기간</th>
                <th className="py-3.5 px-4 text-right">전체 DAU (활성 유저)</th>
                <th className="py-3.5 px-4 text-right">신규 유저 수</th>
                <th className="py-3.5 px-4 text-right">신규 비율 (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
              {chartProcessedData.length > 0 ? (
                chartProcessedData.map((row, idx) => {
                  const ratio = row.dau > 0 ? ((row.newUser / row.dau) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={idx} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#191f28]">{row.fullDate || row.label}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#3182f6]">{row.dau.toLocaleString()}명</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#00c980]">{row.newUser.toLocaleString()}명</td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#4e5968]">{ratio}%</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#8b95a1] font-medium">
                    조회된 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
