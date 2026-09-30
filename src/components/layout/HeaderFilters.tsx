"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Calendar, Search, ChevronDown, Check, X } from "lucide-react";
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

  // Custom App Selector Dropdown State
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Selected App Object
  const currentAppObj = useMemo(() => {
    if (selectedApp === "tc") return { label: "전체 (통합 서비스)", value: "tc" };
    if (selectedApp === "general_all") return { label: "일반 (전체)", value: "general_all" };
    if (selectedApp === "ph_all") return { label: "포인트홈 (전체)", value: "ph_all" };
    return realAppList.find((a) => a.value === selectedApp) || {
      label: selectedApp,
      value: selectedApp,
    };
  }, [realAppList, selectedApp]);

  // Categorized App Lists: 전체 / 일반 / 포인트홈
  const { totalApp, generalApps, phApps, filteredList } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (term) {
      const filtered = realAppList.filter(
        (app) =>
          app.label.toLowerCase().includes(term) ||
          app.value.toLowerCase().includes(term)
      );
      return { totalApp: [], generalApps: [], phApps: [], filteredList: filtered };
    }

    const total: AppOption[] = [{ label: "전체 (통합 서비스)", value: "tc" }];
    const general: AppOption[] = [{ label: "일반 (전체)", value: "general_all" }];
    const ph: AppOption[] = [{ label: "포인트홈 (전체)", value: "ph_all" }];

    realAppList.forEach((app) => {
      if (app.value === "tc" || app.value === "general_all" || app.value === "ph_all") return;
      if (app.value.startsWith("ph-") || app.label.includes("포인트홈")) {
        ph.push(app);
      } else {
        general.push(app);
      }
    });

    return { totalApp: total, generalApps: general, phApps: ph, filteredList: [] };
  }, [realAppList, searchTerm]);

  // Active Category State
  const activeCategory = useMemo(() => {
    if (selectedApp === "tc") return "total";
    if (selectedApp === "ph_all" || selectedApp.startsWith("ph-") || currentAppObj.label.includes("포인트홈")) return "ph";
    return "general";
  }, [selectedApp, currentAppObj]);

  const handleCategoryPillClick = (cat: "total" | "general" | "ph") => {
    if (cat === "total") {
      setSelectedApp("tc");
    } else if (cat === "general") {
      if (activeCategory !== "general" || selectedApp === "general_all") {
        setSelectedApp("general_all");
      }
    } else if (cat === "ph") {
      if (activeCategory !== "ph" || selectedApp === "ph_all") {
        setSelectedApp("ph_all");
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs">
        {/* 1. App Selector Container */}
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          <Smartphone className="w-3.5 h-3.5 text-[#8b95a1]" />
          <span className="font-semibold text-[#8b95a1]">앱</span>

          {/* Quick Category Toggle Pills (전체 / 일반 / 포인트홈) */}
          <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5">
            <button
              onClick={() => handleCategoryPillClick("total")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                activeCategory === "total"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => handleCategoryPillClick("general")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                activeCategory === "general"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              일반
            </button>
            <button
              onClick={() => handleCategoryPillClick("ph")}
              className={`px-3 py-1 text-xs transition-all cursor-pointer rounded-lg whitespace-nowrap ${
                activeCategory === "ph"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              포인트홈
            </button>
          </div>

          {/* Searchable Dropdown Button Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 border border-[#e5e8eb] rounded-xl px-3 py-1.5 bg-[#f8f9fa] text-xs font-semibold text-[#191f28] hover:bg-[#f2f4f6] hover:border-[#d1d6db] transition-all cursor-pointer"
          >
            <span className="max-w-[160px] sm:max-w-[200px] truncate text-[#191f28]">
              {currentAppObj.label}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-[#8b95a1] transition-transform duration-200 ${isOpen ? "rotate-180 text-[#3182f6]" : ""}`} />
          </button>

          {/* Popover Dropdown Panel */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_12px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Search Bar */}
              <div className="p-2.5 border-b border-[#f2f4f6] bg-white sticky top-0 z-10">
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#f8f9fa] border border-[#e5e8eb] rounded-xl focus-within:border-[#3182f6] focus-within:bg-white transition-all">
                  <Search className="w-3.5 h-3.5 text-[#8b95a1]" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="앱 이름 또는 코드 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs bg-transparent outline-none text-[#191f28] placeholder-[#8b95a1]"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-[#8b95a1] hover:text-[#191f28] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Option Items */}
              <div className="max-h-72 overflow-y-auto p-1.5 space-y-3">
                {searchTerm ? (
                  /* Search Results */
                  <div>
                    <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                      검색 결과 ({filteredList.length})
                    </div>
                    {filteredList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8b95a1]">
                        검색 결과가 없습니다.
                      </div>
                    ) : (
                      filteredList.map((app) => (
                        <button
                          key={app.value}
                          onClick={() => {
                            setSelectedApp(app.value);
                            setIsOpen(false);
                            setSearchTerm("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                            selectedApp === app.value
                              ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                              : "hover:bg-[#f2f4f6] text-[#333d4b]"
                          }`}
                        >
                          <span className="truncate">{app.label}</span>
                          {selectedApp === app.value && (
                            <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                ) : (
                  /* Categorized Sections: 전체 / 일반 / 포인트홈 */
                  <>
                    {/* 1. 전체 Category View (모든 앱 합산 + 일반 앱 + 포인트홈 앱 모두 표시) */}
                    {activeCategory === "total" && (
                      <div className="space-y-3">
                        {totalApp.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                              통합
                            </div>
                            <div className="mt-0.5 space-y-0.5">
                              {totalApp.map((app) => (
                                <button
                                  key={app.value}
                                  onClick={() => {
                                    setSelectedApp(app.value);
                                    setIsOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                                    selectedApp === app.value
                                      ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                                      : "hover:bg-[#f2f4f6] text-[#333d4b]"
                                  }`}
                                >
                                  <span className="truncate">{app.label}</span>
                                  {selectedApp === app.value && (
                                    <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {generalApps.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                              일반 서비스 ({generalApps.length - 1}개 앱)
                            </div>
                            <div className="mt-0.5 space-y-0.5">
                              {generalApps.map((app) => (
                                <button
                                  key={app.value}
                                  onClick={() => {
                                    setSelectedApp(app.value);
                                    setIsOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                                    selectedApp === app.value
                                      ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                                      : "hover:bg-[#f2f4f6] text-[#333d4b]"
                                  }`}
                                >
                                  <span className="truncate">{app.label}</span>
                                  {selectedApp === app.value && (
                                    <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {phApps.length > 0 && (
                          <div>
                            <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                              포인트홈 서비스 ({phApps.length - 1}개 앱)
                            </div>
                            <div className="mt-0.5 space-y-0.5">
                              {phApps.map((app) => (
                                <button
                                  key={app.value}
                                  onClick={() => {
                                    setSelectedApp(app.value);
                                    setIsOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                                    selectedApp === app.value
                                      ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                                      : "hover:bg-[#f2f4f6] text-[#333d4b]"
                                  }`}
                                >
                                  <span className="truncate">{app.label}</span>
                                  {selectedApp === app.value && (
                                    <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. 일반 Category View (포인트홈 제외) */}
                    {activeCategory === "general" && generalApps.length > 0 && (
                      <div>
                        <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                          일반 서비스 ({generalApps.length - 1}개 앱)
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {generalApps.map((app) => (
                            <button
                              key={app.value}
                              onClick={() => {
                                setSelectedApp(app.value);
                                setIsOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                                selectedApp === app.value
                                  ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                                  : "hover:bg-[#f2f4f6] text-[#333d4b]"
                              }`}
                            >
                              <span className="truncate">{app.label}</span>
                              {selectedApp === app.value && (
                                <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. 포인트홈 Category View */}
                    {activeCategory === "ph" && phApps.length > 0 && (
                      <div>
                        <div className="px-2.5 py-1 text-[11px] font-bold text-[#8b95a1]">
                          포인트홈 서비스 ({phApps.length - 1}개 앱)
                        </div>
                        <div className="mt-0.5 space-y-0.5">
                          {phApps.map((app) => (
                            <button
                              key={app.value}
                              onClick={() => {
                                setSelectedApp(app.value);
                                setIsOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer ${
                                selectedApp === app.value
                                  ? "bg-[#e8f3ff] text-[#3182f6] font-bold"
                                  : "hover:bg-[#f2f4f6] text-[#333d4b]"
                              }`}
                            >
                              <span className="truncate">{app.label}</span>
                              {selectedApp === app.value && (
                                <Check className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
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

