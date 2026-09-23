"use client";

import React, { useMemo } from "react";
import { RefreshCw, Menu } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";

import { Sidebar } from "@/components/layout/Sidebar";
import { HeaderFilters } from "@/components/layout/HeaderFilters";
import { UserDashboard } from "@/components/users/UserDashboard";
import { RevenueDashboard } from "@/components/revenue/RevenueDashboard";
import { FunnelDashboard } from "@/components/funnel/FunnelDashboard";
import { NewUserFunnelDashboard } from "@/components/funnel/NewUserFunnelDashboard";
import { MissionDashboard } from "@/components/mission/MissionDashboard";
import { PageDashboard } from "@/components/page/PageDashboard";

import {
  ChartProcessedItem,
  CohortRow,
  CombinedCohortRow,
} from "@/types/dashboard";

import { useDashboardFilters } from "@/hooks/useDashboardFilters";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getSettlementDataForApp } from "@/utils/settlementHelpers";
import { computeRevenueSummary } from "@/utils/revenueProcessors";
import { processRawDataToMap, computeAvgDecay } from "@/utils/retentionProcessors";

// Register Chart.js Modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// Global Chart.js Font Setup - Enforce Pretendard for all chart elements
ChartJS.defaults.font.family = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif";

export default function Dashboard() {
  const {
    realAppList,
    activeTab,
    setActiveTab,
    revenueCategoryTab,
    setRevenueCategoryTab,
    funnelCategoryTab,
    setFunnelCategoryTab,
    selectedApp,
    setSelectedApp,
    periodType,
    datePreset,
    setDatePreset,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    viewMode,
    setViewMode,
    revenueViewMode,
    setRevenueViewMode,
    retentionMode,
    setRetentionMode,
    retentionDayMax,
    setRetentionDayMax,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileOpen,
    setIsMobileOpen,
    heatmapTooltip,
    setHeatmapTooltip,
    userSegment,
    setUserSegment,
    missionSubTab,
    setMissionSubTab,
    handleDatePreset,
    handlePeriodChange,
  } = useDashboardFilters();

  const {
    loading,
    pagePvUvRaw,
    pageDauRaw,
    overviewData,
    visitRetentionRaw,
    earningRetentionRaw,
    serviceRevenueRaw,
    adRevenueRaw,
    contentRevenueRaw,
    contentPurchaseRaw,
    earningRaw,
    missionTotalRaw,
    settlementRaw,
    funnelsRaw,
    funnelStepsRaw,
    eventCatalogRaw,
    missionByTypeRaw,
    missionsDetailRaw,
    missionDailyTrendRaw,
    attendanceDailyRaw,
    earningActivityRaw,
    attendanceCompletionRaw,
    attendanceStepsRaw,
    fetchDashboardData,
  } = useDashboardData({
    activeTab,
    selectedApp,
    fromDate,
    toDate,
    userSegment,
  });

  // 1. Process Overview Data for DAU Charts & Tables
  const chartProcessedData = useMemo<ChartProcessedItem[]>(() => {
    if (!overviewData || overviewData.length === 0) return [];

    if (periodType === "day") {
      return overviewData.map((item) => {
        const rawDate = item.eventDateKst ? String(item.eventDateKst).split("T")[0] : "";
        const label = rawDate ? rawDate.slice(5).replace("-", "/") : "";
        return {
          label,
          fullDate: rawDate,
          dau: Number(item.activeUserCount || 0),
          newUser: Number(item.newUserCount || 0),
          eventCount: Number(item.eventCount || 0),
        };
      });
    }

    const groups: Record<string, { dauSum: number; newUserSum: number; count: number; events: number }> = {};

    overviewData.forEach((item) => {
      const rawDateStr = item.eventDateKst ? String(item.eventDateKst).split("T")[0] : "";
      if (!rawDateStr) return;

      const dateObj = new Date(rawDateStr);
      let key = "";

      if (periodType === "week") {
        const day = dateObj.getDay();
        const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(dateObj.setDate(diffToMonday));
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")} 주`;
      } else {
        key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}월`;
      }

      if (!groups[key]) {
        groups[key] = { dauSum: 0, newUserSum: 0, count: 0, events: 0 };
      }

      groups[key].dauSum += Number(item.activeUserCount || 0);
      groups[key].newUserSum += Number(item.newUserCount || 0);
      groups[key].events += Number(item.eventCount || 0);
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([label, data]) => ({
      label,
      fullDate: label,
      dau: Math.round(data.dauSum / data.count),
      newUser: data.newUserSum,
      eventCount: data.events,
    }));
  }, [overviewData, periodType]);

  const avgDau = useMemo(() => {
    if (chartProcessedData.length === 0) return 0;
    const total = chartProcessedData.reduce((acc, cur) => acc + cur.dau, 0);
    return Math.round(total / chartProcessedData.length);
  }, [chartProcessedData]);

  const totalNewUsers = useMemo(() => {
    return chartProcessedData.reduce((acc, cur) => acc + cur.newUser, 0);
  }, [chartProcessedData]);

  // DAU & New User Line Chart Configuration
  const dauChartData: ChartData<"line"> = {
    labels: chartProcessedData.map((d) => d.label),
    datasets: [
      {
        label: periodType === "day" ? "DAU (일별 활성 유저)" : "일평균 DAU",
        data: chartProcessedData.map((d) => d.dau),
        borderColor: "#3182f6",
        backgroundColor: "rgba(49, 130, 246, 0.08)",
        borderWidth: 2.5,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#3182f6",
        pointBorderWidth: 2,
        pointRadius: chartProcessedData.length > 30 ? 0 : 2.5,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#3182f6",
        tension: 0.4,
        fill: true,
      },
      {
        label: "신규 가입 유저",
        data: chartProcessedData.map((d) => d.newUser),
        borderColor: "#00c980",
        backgroundColor: "rgba(0, 201, 128, 0.05)",
        borderWidth: 2.5,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#00c980",
        pointBorderWidth: 2,
        pointRadius: chartProcessedData.length > 30 ? 0 : 2.5,
        pointHoverRadius: 6,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#00c980",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const dauChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
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
        titleFont: { family: "Pretendard, sans-serif", size: 12, weight: "bold" },
        bodyFont: { family: "Pretendard, sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        boxWidth: 8,
        boxHeight: 8,
        usePointStyle: true,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}명`,
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
        ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 }, callback: (v: any) => Number(v).toLocaleString() },
      },
    },
  };

  // CSV Exporter for DAU
  const downloadCSV = () => {
    if (chartProcessedData.length === 0) return;
    let csv = "날짜/기간,전체 DAU (활성 유저),신규 유저 수,신규 비율(%)\n";
    chartProcessedData.forEach((row) => {
      const ratio = row.dau > 0 ? ((row.newUser / row.dau) * 100).toFixed(1) : "0.0";
      csv += `"${row.fullDate || row.label}",${row.dau},${row.newUser},${ratio}%\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `DAU_Report_${selectedApp}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Process Cohort Retention & Activation Datasets
  const visitRows = useMemo<CohortRow[]>(() => processRawDataToMap(visitRetentionRaw, false), [visitRetentionRaw]);
  const earningRows = useMemo<CohortRow[]>(() => processRawDataToMap(earningRetentionRaw, true), [earningRetentionRaw]);

  const activeDayColumns = useMemo(() => {
    const list: number[] = [];
    for (let i = 1; i <= retentionDayMax; i++) list.push(i);
    return list;
  }, [retentionDayMax]);

  const combinedCohortRows = useMemo<CombinedCohortRow[]>(() => {
    const dates = Array.from(new Set([...visitRows.map((r) => r.cohortDate), ...earningRows.map((r) => r.cohortDate)])).sort((a, b) => a.localeCompare(b));

    return dates.map((d) => {
      const vRow = visitRows.find((r) => r.cohortDate === d);
      const eRow = earningRows.find((r) => r.cohortDate === d);
      const newUserCount = vRow?.newUserCount || eRow?.newUserCount || 0;
      const formattedDate = vRow?.formattedDate || eRow?.formattedDate || d;

      return { cohortDate: d, formattedDate, newUserCount, vRow, eRow };
    });
  }, [visitRows, earningRows]);

  const dayNList = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= retentionDayMax; i++) arr.push(i);
    return arr;
  }, [retentionDayMax]);

  const avgVisitDecay = useMemo(() => computeAvgDecay(visitRows, dayNList), [visitRows, dayNList]);
  const avgEarningDecay = useMemo(() => computeAvgDecay(earningRows, dayNList), [earningRows, dayNList]);

  const decayChartData = useMemo<ChartData<"line">>(() => {
    const visitDataset = {
      label: "방문 리텐션 평균 (Visit)",
      data: avgVisitDecay,
      borderColor: "#3182f6",
      backgroundColor: "rgba(49, 130, 246, 0.12)",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: "#3182f6",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      tension: 0.1,
      fill: "origin",
      spanGaps: false,
    };

    const earningDataset = {
      label: "적립 수행 리텐션 평균 (Earning)",
      data: avgEarningDecay,
      borderColor: "#a98eff",
      backgroundColor: "rgba(169, 142, 255, 0.12)",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: "#a98eff",
      pointHoverBorderColor: "#fff",
      pointHoverBorderWidth: 2,
      tension: 0.1,
      fill: "origin",
      spanGaps: false,
    };

    let datasets: any[] = [];
    if (retentionMode === "retention") {
      datasets = [visitDataset];
    } else if (retentionMode === "earning_activation") {
      datasets = [earningDataset];
    } else {
      datasets = [visitDataset, earningDataset];
    }

    return {
      labels: dayNList.map((d) => `DAY ${d}`),
      datasets,
    };
  }, [dayNList, avgVisitDecay, avgEarningDecay, retentionMode]);

  const decayChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: { position: "top" as const, align: "end" as const, labels: { boxWidth: 12, usePointStyle: true, font: { family: "Pretendard, sans-serif", size: 11, weight: 600 } } },
      tooltip: {
        backgroundColor: "#191f28",
        titleFont: { family: "Pretendard, sans-serif", size: 12, weight: "bold" },
        bodyFont: { family: "Pretendard, sans-serif", size: 12 },
        padding: 10,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.raw !== null ? context.raw + "%" : "-"}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: "#e5e8eb",
          borderDash: [3, 3],
        },
        ticks: {
          color: "#8b95a1",
          font: { family: "Pretendard, sans-serif", size: 10.5 },
          maxRotation: 0,
          callback: (val: any, index: number) => {
            return index % 2 === 0 ? `DAY ${index}` : "";
          },
        },
        border: {
          display: true,
          color: "#8b95a1",
          width: 1,
        },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          display: true,
          color: "#e5e8eb",
          borderDash: [3, 3],
        },
        ticks: {
          stepSize: 20,
          color: "#8b95a1",
          font: { family: "Pretendard, sans-serif", size: 10.5 },
          callback: (v: any) => `${v}%`,
        },
        border: {
          display: true,
          color: "#8b95a1",
          width: 1,
        },
      },
    },
  };

  const hasActiveSettlement = useMemo(() => {
    return (
      Array.isArray(settlementRaw) &&
      settlementRaw.length > 0 &&
      settlementRaw.some((item) => getSettlementDataForApp(item, selectedApp) !== null)
    );
  }, [settlementRaw, selectedApp]);

  // 3. Process Revenue Datasets
  const revenueSummary = useMemo(() => {
    return computeRevenueSummary({
      serviceRevenueRaw,
      adRevenueRaw,
      missionTotalRaw,
      earningRaw,
      contentRevenueRaw,
      contentPurchaseRaw,
      settlementRaw,
      selectedApp,
      periodType,
      fromDate,
      toDate,
      hasActiveSettlement,
    });
  }, [serviceRevenueRaw, adRevenueRaw, missionTotalRaw, earningRaw, contentRevenueRaw, contentPurchaseRaw, settlementRaw, selectedApp, periodType, fromDate, toDate, hasActiveSettlement]);

  // Overall Revenue Line Chart Configuration
  const revenueChartData: ChartData<"line"> = {
    labels: (revenueSummary.dailyTrend || []).map((d) => d.formattedDt || d.dt),
    datasets: [
      {
        label: "전체 총 매출 (Gross Revenue)",
        data: (revenueSummary.dailyTrend || []).map((d) => d.grossTotal),
        borderColor: "#00c980",
        backgroundColor: "rgba(0, 201, 128, 0.06)",
        borderWidth: 3,
        pointBackgroundColor: "#00c980",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
      {
        label: "콘텐츠 매출",
        data: (revenueSummary.dailyTrend || []).map((d) => d.serviceRev),
        borderColor: "#3182f6",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#3182f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
      },
      {
        label: "광고 매출",
        data: (revenueSummary.dailyTrend || []).map((d) => d.adRev),
        borderColor: "#a98eff",
        backgroundColor: "transparent",
        borderWidth: 2.5,
        pointBackgroundColor: "#a98eff",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3.5,
        pointHoverRadius: 6,
        tension: 0.35,
      },
    ],
  };

  // Margin Analysis Line Chart Configuration
  const marginChartData: ChartData<"line"> = {
    labels: (revenueSummary.dailyTrend || []).map((d) => d.formattedDt || d.dt),
    datasets: [
      {
        label: "총 광고 매출",
        data: (revenueSummary.dailyTrend || []).map((d) => Math.round(d.adRev)),
        borderColor: "#00c980",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointBackgroundColor: "#00c980",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.35,
      },
      {
        label: "포인트 환전 비용",
        data: (revenueSummary.dailyTrend || []).map((d) => Math.round(d.cost)),
        borderColor: "#f04452",
        backgroundColor: "transparent",
        borderWidth: 2,
        pointBackgroundColor: "#f04452",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        tension: 0.35,
      },
      {
        label: "순 영업 마진",
        data: (revenueSummary.dailyTrend || []).map((d) => Math.round(d.margin)),
        borderColor: "#3182f6",
        backgroundColor: "rgba(49, 130, 246, 0.06)",
        borderWidth: 3,
        pointBackgroundColor: "#3182f6",
        pointBorderColor: "#fff",
        pointBorderWidth: 1.5,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
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
        titleFont: { family: "Pretendard, sans-serif", size: 12, weight: "bold" },
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
        ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 }, callback: (v: any) => `${Number(v).toLocaleString()}원` },
      },
    },
  };

  // CSV Exporter for Revenue
  const downloadRevenueCSV = () => {
    if (revenueSummary.dailyTrend.length === 0) return;
    let csv = "날짜(dt),콘텐츠매출(원),광고매출(원),전체총매출(원),미션리워드비용(원),포인트환전비용(원),총비용(원),순영업마진(원),손익마진율(%)\n";

    revenueSummary.dailyTrend.forEach((row) => {
      csv += `"${row.dt}",${row.serviceRev},${row.adRev},${row.grossTotal},${row.mCost},${row.eCost},${row.cost},${row.margin},${row.marginRate}%\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Revenue_Report_${selectedApp}_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-[#f2f4f6] text-[#191f28] font-sans antialiased relative">
      {/* Sidebar Frame - Collapsible Component */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        revenueCategoryTab={revenueCategoryTab}
        setRevenueCategoryTab={setRevenueCategoryTab}
        funnelCategoryTab={funnelCategoryTab}
        setFunnelCategoryTab={setFunnelCategoryTab}
        missionSubTab={missionSubTab}
        setMissionSubTab={setMissionSubTab}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 overflow-y-auto w-full max-w-none">
        {/* Mobile Top Header Bar */}
        <div className="md:hidden flex items-center justify-between bg-white p-3.5 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-2xl">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6] rounded-xl cursor-pointer"
            title="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold text-[#191f28] tracking-widest font-sans uppercase">GURU COMPANY</span>
            <span className="text-[9.5px] text-[#8b95a1] font-semibold">대시보드 모바일 뷰</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="p-2 text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6] rounded-xl cursor-pointer"
            title="실시간 갱신"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#3182f6]" : ""}`} />
          </button>
        </div>

        {/* Title Row */}
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {activeTab === "users"
              ? "유저 현황"
              : activeTab === "mission"
                ? "미션 현황"
                : activeTab === "funnel"
                  ? funnelCategoryTab === "new_user"
                    ? "신규 유저 퍼널"
                    : "퍼널 분석 상세"
                  : revenueCategoryTab === "margin"
                    ? "손익 마진율"
                    : "매출 현황"}
          </h1>
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4e5968] hover:text-[#191f28] transition-colors cursor-pointer bg-white px-3.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3182f6]" : ""}`} />
            <span>실시간 갱신</span>
          </button>
        </div>

        {/* Global Filter Bar Component */}
        <HeaderFilters
          realAppList={realAppList}
          selectedApp={selectedApp}
          setSelectedApp={setSelectedApp}
          datePreset={datePreset}
          setDatePreset={setDatePreset}
          fromDate={fromDate}
          setFromDate={setFromDate}
          toDate={toDate}
          setToDate={setToDate}
          periodType={periodType}
          handlePeriodChange={handlePeriodChange}
          handleDatePreset={handleDatePreset}
        />

        {/* TAB 1: USER ANALYTICS ("유저 현황") */}
        {activeTab === "users" && (
          <UserDashboard
            periodType={periodType}
            viewMode={viewMode}
            setViewMode={setViewMode}
            downloadCSV={downloadCSV}
            avgDau={avgDau}
            totalNewUsers={totalNewUsers}
            loading={loading}
            chartProcessedData={chartProcessedData}
            dauChartData={dauChartData}
            dauChartOptions={dauChartOptions}
            retentionMode={retentionMode}
            setRetentionMode={setRetentionMode}
            retentionDayMax={retentionDayMax}
            setRetentionDayMax={setRetentionDayMax}
            visitRowsLength={visitRows.length}
            decayChartData={decayChartData}
            decayChartOptions={decayChartOptions}
            activeDayColumns={activeDayColumns}
            combinedCohortRows={combinedCohortRows}
            setHeatmapTooltip={setHeatmapTooltip}
          />
        )}

        {/* TAB 2: REVENUE ANALYTICS ("매출 현황") */}
        {activeTab === "revenue" && (
          <RevenueDashboard
            revenueSummary={revenueSummary}
            revenueCategoryTab={revenueCategoryTab}
            setRevenueCategoryTab={setRevenueCategoryTab}
            revenueViewMode={revenueViewMode}
            setRevenueViewMode={setRevenueViewMode}
            downloadRevenueCSV={downloadRevenueCSV}
            loading={loading}
            revenueChartData={revenueChartData}
            marginChartData={marginChartData}
            revenueChartOptions={revenueChartOptions}
            hasSettlementData={hasActiveSettlement}
            selectedApp={selectedApp}
          />
        )}

        {/* TAB 3: FUNNEL ANALYTICS ("퍼널 분석") */}
        {activeTab === "funnel" && (
          funnelCategoryTab === "new_user" ? (
            <NewUserFunnelDashboard
              funnels={funnelsRaw}
              funnelSteps={funnelStepsRaw}
              eventCatalog={eventCatalogRaw}
              overviewData={overviewData}
              loading={loading}
              selectedApp={selectedApp}
              fromDate={fromDate}
              toDate={toDate}
              funnelCategoryTab={funnelCategoryTab}
              setFunnelCategoryTab={setFunnelCategoryTab}
            />
          ) : (
            <FunnelDashboard
              funnels={funnelsRaw}
              funnelSteps={funnelStepsRaw}
              eventCatalog={eventCatalogRaw}
              loading={loading}
              selectedApp={selectedApp}
              fromDate={fromDate}
              toDate={toDate}
              funnelCategoryTab={funnelCategoryTab}
              setFunnelCategoryTab={setFunnelCategoryTab}
            />
          )
        )}

        {/* TAB 5: MISSION ANALYTICS ("미션 현황") */}
        {activeTab === "mission" && (
          <MissionDashboard
            fromDate={fromDate}
            toDate={toDate}
            loading={loading}
            subTab={missionSubTab}
            onSubTabChange={setMissionSubTab}
            userSegment={userSegment}
            onUserSegmentChange={setUserSegment}
            missionByTypeRaw={missionByTypeRaw}
            missionsDetailRaw={missionsDetailRaw}
            missionDailyTrendRaw={missionDailyTrendRaw}
            attendanceDailyRaw={attendanceDailyRaw}
            earningActivityRaw={earningActivityRaw}
            missionTotalRaw={missionTotalRaw}
            attendanceCompletionRaw={attendanceCompletionRaw}
            attendanceStepsRaw={attendanceStepsRaw}
            overviewData={overviewData}
          />
        )}

        {/* TAB 6: PAGE STATUS ("페이지 현황") */}
        {activeTab === "page" && (
          <PageDashboard
            loading={loading}
            pagePvUvData={pagePvUvRaw}
            pageDauData={pageDauRaw}
            selectedApp={selectedApp}
            fromDate={fromDate}
            toDate={toDate}
          />
        )}
      </div>

      {/* MINIMALIST ULTRA-CLEAN CORPORATE TOOLTIP */}
      {heatmapTooltip && (
        <div
          className="fixed z-50 transform -translate-x-1/2 -translate-y-full mb-1.5 bg-[#191f28] text-white px-3 py-2 rounded-xl shadow-lg text-xs font-sans pointer-events-none transition-all duration-75 space-y-1"
          style={{ left: `${heatmapTooltip.x}px`, top: `${heatmapTooltip.y}px` }}
        >
          <div className="font-semibold text-gray-300 text-[11px] border-b border-gray-700 pb-1">
            {heatmapTooltip.date} 가입자 · Day {heatmapTooltip.dayNum}
          </div>
          {heatmapTooltip.isCombined ? (
            <div className="space-y-0.5 text-[11px] font-medium">
              <div className="text-[#8bb8ff]">
                방문: <span className="font-bold">{heatmapTooltip.visitCount.toLocaleString()}명</span> ({heatmapTooltip.visitRate}%)
              </div>
              <div className="text-[#d4b8ff]">
                적립: <span className="font-bold">{heatmapTooltip.earningCount.toLocaleString()}명</span> ({heatmapTooltip.earningRate}%)
              </div>
            </div>
          ) : (
            <div className="text-gray-300 text-[11px] font-medium whitespace-nowrap">
              {heatmapTooltip.typeText}: <span className="font-bold text-white">{heatmapTooltip.visitCount.toLocaleString()}명</span> / 가입{" "}
              <span className="font-bold text-white">{heatmapTooltip.newUserCount.toLocaleString()}명</span> ({heatmapTooltip.visitRate}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
