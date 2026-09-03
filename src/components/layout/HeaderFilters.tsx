"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Calendar, LogOut } from "lucide-react";
import { AppOption, DatePreset, PeriodType } from "@/types/dashboard";

interface HeaderFiltersProps {
  selectedApp: string;
  setSelectedApp: (app: string) => void;
  realAppList: AppOption[];
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  fromDate: string;
  setFromDate: (date: string) => void;
  toDate: string;
  setToDate: (date: string) => void;
  periodType: PeriodType;
  handlePeriodChange: (type: PeriodType) => void;
  handleDatePreset: (preset: "7d" | "30d" | "month") => void;
}

export const HeaderFilters: React.FC<HeaderFiltersProps> = ({
  selectedApp,
  setSelectedApp,
  realAppList,
  datePreset,
  setDatePreset,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  periodType,
  handlePeriodChange,
  handleDatePreset,
}) => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };
  return (
    <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* 1. App Selector */}
        <div className="flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-[#8b95a1]" />
          <span className="font-semibold text-[#8b95a1]">앱</span>
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            className="border border-[#e5e8eb] rounded-xl px-3 py-1.5 bg-[#f8f9fa] text-xs font-semibold text-[#191f28] outline-none cursor-pointer hover:bg-[#f2f4f6] transition-colors"
          >
            {realAppList.map((app) => (
              <option key={app.value} value={app.value}>
                {app.label}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block h-4 w-[1px] bg-[#e5e8eb]" />

        {/* 2. Date Quick Presets & Range */}
        <div className="flex flex-wrap items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-[#8b95a1]" />
          <span className="font-semibold text-[#8b95a1]">조회 기간</span>

          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 overflow-x-auto max-w-full">
            <button
              onClick={() => handleDatePreset("7d")}
              className={`px-2.5 sm:px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                datePreset === "7d"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              최근 7일
            </button>
            <button
              onClick={() => handleDatePreset("30d")}
              className={`px-2.5 sm:px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                datePreset === "30d"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              최근 30일
            </button>
            <button
              onClick={() => handleDatePreset("month")}
              className={`px-2.5 sm:px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                datePreset === "month"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              이번 달
            </button>
          </div>

          <div className="flex items-center border border-[#e5e8eb] rounded-xl px-2.5 py-1 bg-[#f8f9fa] text-xs font-medium text-[#4e5968] gap-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("custom");
              }}
              className="bg-transparent text-xs font-medium focus:outline-none w-24 sm:w-26 cursor-pointer text-[#4e5968]"
            />
            <span className="text-[#8b95a1]">~</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("custom");
              }}
              className="bg-transparent text-xs font-medium focus:outline-none w-24 sm:w-26 cursor-pointer text-[#4e5968]"
            />
          </div>
        </div>

        <div className="hidden sm:block h-4 w-[1px] bg-[#e5e8eb]" />

        {/* 3. Unit Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#8b95a1]">단위</span>
          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5">
            <button
              onClick={() => handlePeriodChange("day")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg ${
                periodType === "day"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              일별
            </button>
            <button
              onClick={() => handlePeriodChange("week")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg ${
                periodType === "week"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              주별
            </button>
            <button
              onClick={() => handlePeriodChange("month")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg ${
                periodType === "month"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              월별
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
