"use client";

import React, { useState, useMemo } from "react";
import { Info, PieChart as PieChartIcon, BarChart3, Users, CheckCircle2, Layers, TrendingUp, Calendar, Grid, ArrowUp, ArrowDown, Gift } from "lucide-react";
import { Doughnut, Bar, Line } from "react-chartjs-2";
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
import {
  MissionByTypeItem,
  MissionDetailItem,
  MissionDailyTrendItem,
  AttendanceDailyItem,
  EarningActivityItem,
  AttendanceCompletionItem,
  AttendanceStepItem,
  MissionSubTab,
  UserSegment,
} from "@/types/dashboard";

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

ChartJS.defaults.font.family = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif";

interface MissionDashboardProps {
  loading: boolean;
  subTab?: MissionSubTab;
  onSubTabChange?: (tab: MissionSubTab) => void;
  userSegment?: UserSegment;
  onUserSegmentChange?: (segment: UserSegment) => void;
  missionByTypeRaw: MissionByTypeItem[];
  missionsDetailRaw?: MissionDetailItem[];
  missionDailyTrendRaw?: MissionDailyTrendItem[];
  attendanceDailyRaw: AttendanceDailyItem[];
  earningActivityRaw: EarningActivityItem[];
  missionTotalRaw?: any[];
  overviewData?: any[];
  attendanceCompletionRaw?: AttendanceCompletionItem[];
  attendanceStepsRaw?: AttendanceStepItem[];
  fromDate?: string;
  toDate?: string;
}

const MISSION_LABEL_MAP: Record<string, string> = {
  CLEANING: "책 정리",
  SNACK: "간식",
  DRINK: "음료",
  RECOMMENDATION: "추천작",
  TIP: "팁",
  SCROLL: "스크롤",
  RC: "RC",
};

const SPECIFIC_MISSION_NAME_MAP: Record<string, string> = {
  CLEANING: "책 정리",
  SNACK: "간식",
  DRINK: "음료",
  RECOMMENDATION: "추천작",
  TIP: "팁",
  SCROLL: "스크롤",
  RC: "RC",
  cleaning_book: "책 정리",
  snack_ad: "간식",
  drink_ad: "음료",
  recommendation_ad: "추천작",
  tip_ad: "팁",
  scroll_30s: "스크롤",
  reward_mission_click_drink: "음료",
  reward_otter_click_drink: "음료",
  reward_mission_click_snack: "간식",
  reward_otter_click_snack: "간식",
  reward_mission_click_episode: "추천작",
  reward_otter_click_episode: "추천작",
  reward_mission_click_scroll: "스크롤",
  reward_otter_click_scroll: "스크롤",
  reward_tip_confirm_click: "팁",
};

const getMissionName = (label: string, rawName?: string): string => {
  if (SPECIFIC_MISSION_NAME_MAP[label]) return SPECIFIC_MISSION_NAME_MAP[label];
  if (rawName && rawName.trim() && rawName !== label && !rawName.startsWith("미션 #")) return rawName;
  return label
    .replace(/^reward_/, "")
    .replace(/^mission_click_/, "")
    .replace(/^otter_click_/, "")
    .replace(/_/g, " ")
    .toUpperCase();
};

const TOSS_COLORS = [
  "#3182f6", // Toss Blue
  "#00c980", // Toss Green
  "#a98eff", // Toss Purple
  "#f97316", // Toss Orange
  "#f04452", // Toss Red
  "#6b7280", // Gray
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

// Custom HTML External Tooltip Handler for authentic iOS Frosted Glass Effect
const externalGlassTooltip = (context: any) => {
  let tooltipEl = document.getElementById("chartjs-tooltip-glass");

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "chartjs-tooltip-glass";
    tooltipEl.style.position = "absolute";
    tooltipEl.style.pointerEvents = "none";
    tooltipEl.style.transition = "all 0.12s ease-out";
    tooltipEl.style.zIndex = "9999";
    tooltipEl.style.padding = "10px 14px";
    tooltipEl.style.borderRadius = "16px";
    tooltipEl.style.background = "rgba(255, 255, 255, 0.82)";
    tooltipEl.style.backdropFilter = "blur(20px) saturate(180%)";
    (tooltipEl.style as any).webkitBackdropFilter = "blur(20px) saturate(180%)";
    tooltipEl.style.border = "1px solid rgba(255, 255, 255, 0.85)";
    tooltipEl.style.boxShadow = "0 12px 36px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)";
    tooltipEl.style.color = "#191f28";
    tooltipEl.style.fontSize = "11.5px";
    tooltipEl.style.fontFamily = "Pretendard, -apple-system, sans-serif";
    document.body.appendChild(tooltipEl);
  }

  const tooltipModel = context.tooltip;
  if (tooltipModel.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  if (tooltipModel.body) {
    const titleLines = tooltipModel.title || [];
    const bodyLines = tooltipModel.body.map((b: any) => b.lines);

    let innerHtml = "";
    if (titleLines.length) {
      innerHtml += `<div style="font-weight:700;font-size:12px;color:#191f28;margin-bottom:4px;letter-spacing:-0.02em;">${titleLines.join(" ")}</div>`;
    }

    bodyLines.forEach((body: string[], i: number) => {
      const colors = tooltipModel.labelColors[i] || { backgroundColor: "#3182f6" };
      const dot = `<span style="background:${colors.backgroundColor};width:8px;height:8px;display:inline-block;border-radius:50%;margin-right:6px;box-shadow:0 1px 3px ${colors.backgroundColor}60;"></span>`;
      innerHtml += `<div style="display:flex;align-items:center;font-size:11.5px;font-weight:600;color:#333d4b;margin-top:3px;">${dot}${body.join(" ")}</div>`;
    });

    tooltipEl.innerHTML = innerHtml;
  }

  const position = context.chart.canvas.getBoundingClientRect();
  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = position.left + window.scrollX + tooltipModel.caretX + "px";
  tooltipEl.style.top = position.top + window.scrollY + tooltipModel.caretY - 10 + "px";
  tooltipEl.style.transform = "translate(-50%, -100%)";
};

// Helper Component for Info Tooltip (Authentic iOS Frosted Glass)
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="relative group inline-block ml-1 align-middle">
    <Info className="w-3.5 h-3.5 text-[#8b95a1] hover:text-[#3182f6] transition-colors cursor-pointer" />
    <div
      className="absolute left-1/2 -translate-x-1/2 top-6 hidden group-hover:block z-[9999] w-72 p-3.5 rounded-2xl text-[11.5px] font-medium leading-relaxed pointer-events-none transition-all duration-200"
      style={{
        background: "rgba(25, 31, 40, 0.88)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 16px 40px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
        color: "#ffffff",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 text-[#3182f6] font-bold text-xs border-b border-white/10 pb-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 text-[#3182f6]" />
        <span>지표 설명 안내</span>
      </div>
      <div className="text-[#d1d5db] font-normal leading-relaxed">{text}</div>
    </div>
  </div>
);

// Helper for Attendance Retention Heatmap Background
const getCohortBg = (rate: number | undefined) => {
  if (rate === undefined) return "#ffffff";
  if (rate >= 60) return "#1b64da"; // Deep Toss Blue
  if (rate >= 45) return "#3182f6"; // Toss Blue
  if (rate >= 30) return "#6aadff"; // Light Blue
  if (rate >= 15) return "#c2ddff"; // Very Light Blue
  if (rate > 0) return "#f0f6ff";   // Subtlest Blue
  return "#ffffff";
};

const getCohortTextColor = (rate: number | undefined) => {
  if (rate === undefined) return "text-[#d1d5db] font-normal";
  return rate >= 30 ? "text-white font-bold" : "text-[#191f28] font-semibold";
};

// Date offset helper (date string YYYY-MM-DD + N days)
const addDaysToStr = (dateStr: string, days: number): string => {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const MissionDashboard: React.FC<MissionDashboardProps> = ({
  loading,
  subTab: subTabProp,
  onSubTabChange,
  userSegment = "all",
  onUserSegmentChange,
  missionByTypeRaw,
  missionsDetailRaw = [],
  missionDailyTrendRaw = [],
  attendanceDailyRaw,
  earningActivityRaw,
  missionTotalRaw = [],
  overviewData = [],
  attendanceCompletionRaw = [],
  attendanceStepsRaw = [],
  fromDate,
  toDate,
}) => {
  // Sub-Tab Switcher State ("general" | "attendance")
  const [subTab, setSubTab] = useState<MissionSubTab>(subTabProp || "general");

  React.useEffect(() => {
    if (subTabProp) setSubTab(subTabProp);
  }, [subTabProp]);

  // Reset filter states when date range changes
  React.useEffect(() => {
    setSelectedRankingDate("ALL");
    setSelectedRewardMission("ALL");
    setSelectedRewardPerCompleteMission("ALL");
    setSelectedTrendMission("ALL");
  }, [fromDate, toDate]);

  const handleSubTabChange = (tab: MissionSubTab) => {
    setSubTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  // Trend Chart Mission Filter State ("ALL" | specific mission label)
  const [selectedTrendMission, setSelectedTrendMission] = useState<string>("ALL");
  const [selectedAvgPerUserTrendMission, setSelectedAvgPerUserTrendMission] = useState<string>("ALL");
  const [selectedRewardMission, setSelectedRewardMission] = useState<string>("ALL");
  const [generalTrendMetric, setGeneralTrendMetric] = useState<"count" | "uu">("count");
  const [selectedRewardPerCompleteMission, setSelectedRewardPerCompleteMission] = useState<string>("ALL");
  const [selectedRankingDate, setSelectedRankingDate] = useState<string>("ALL");
  const [rewardTrendMetric, setRewardTrendMetric] = useState<"totalP" | "perComplete">("totalP");
  const [trendChartStyle, setTrendChartStyle] = useState<"area" | "stackedBar" | "bar">("area");

  // Attendance Cohort Matrix View Mode ("rate" | "count")
  const [cohortViewMode, setCohortViewMode] = useState<"rate" | "count">("rate");
  // Attendance Option Claim Day Filter ("all" | "day3" | "day6")
  const [optionDayFilter, setOptionDayFilter] = useState<"all" | "day3" | "day6">("all");
  // Sort Orders for Attendance Tables ("desc" | "asc")
  const [cohortSortOrder, setCohortSortOrder] = useState<"desc" | "asc">("desc");
  const [dailySortOrder, setDailySortOrder] = useState<"desc" | "asc">("desc");

  // ── 1. GENERAL MISSIONS DATA PROCESSING ──
  const generalMissionsData = useMemo(() => {
    let completeCountSum = 0;
    let rewardAmountP = 0;

    const typeGroupMap: Record<string, { completeCount: number; rewardP: number; uuSum: number }> = {};
    const dateMap: Record<string, { completeCount: number; rewardP: number; earningUu: number }> = {};

    const rawRows = (missionDailyTrendRaw && missionDailyTrendRaw.length > 0)
      ? missionDailyTrendRaw
      : (missionByTypeRaw && missionByTypeRaw.length > 0)
        ? missionByTypeRaw
        : [];

    if (rawRows.length > 0) {
      rawRows.forEach((row: any) => {
        const typeKey = row.missionType || row.label || "기타";
        if (typeKey === "ATTENDANCE") return;

        const cCount = Number(row.completeCount) || 0;
        const rP = Number(row.rewardAmount) || (cCount * 2);
        const uuVal = Number(row.uu) || 0;

        completeCountSum += cCount;
        rewardAmountP += rP;

        if (!typeGroupMap[typeKey]) {
          typeGroupMap[typeKey] = { completeCount: 0, rewardP: 0, uuSum: 0 };
        }
        typeGroupMap[typeKey].completeCount += cCount;
        typeGroupMap[typeKey].rewardP += rP;
        typeGroupMap[typeKey].uuSum += uuVal;

        const dtStr = row.dt ? String(row.dt).slice(0, 10) : "";
        if (dtStr) {
          if (!dateMap[dtStr]) dateMap[dtStr] = { completeCount: 0, rewardP: 0, earningUu: 0 };
          dateMap[dtStr].completeCount += cCount;
          dateMap[dtStr].rewardP += rP;
        }
      });
    } else if (missionsDetailRaw && missionsDetailRaw.length > 0) {
      missionsDetailRaw.forEach((row) => {
        const typeKey = row.label || "기타";
        const cCount = Number(row.completeCount) || 0;
        const uuVal = Number(row.uu) || 0;
        const rP = cCount * 2;

        completeCountSum += cCount;
        rewardAmountP += rP;

        if (!typeGroupMap[typeKey]) {
          typeGroupMap[typeKey] = { completeCount: 0, rewardP: 0, uuSum: 0 };
        }
        typeGroupMap[typeKey].completeCount += cCount;
        typeGroupMap[typeKey].rewardP += rP;
        typeGroupMap[typeKey].uuSum += uuVal;
      });
    }

    let totalEarningUu = 0;
    let avgUu = 0;

    if (missionTotalRaw && missionTotalRaw.length > 0) {
      missionTotalRaw.forEach((row) => {
        const dtStr = row.dt ? String(row.dt).slice(0, 10) : "";
        const uCount = Number(row.totalParticipantUu || row.earningUu) || 0;
        totalEarningUu += uCount;
        if (dtStr) {
          if (!dateMap[dtStr]) dateMap[dtStr] = { completeCount: 0, rewardP: 0, earningUu: 0 };
          dateMap[dtStr].earningUu = uCount;
        }
      });
      avgUu = Math.round(totalEarningUu / missionTotalRaw.length);
    } else {
      earningActivityRaw.forEach((row) => {
        const dtStr = row.dt || row.eventDateKst ? String(row.dt || row.eventDateKst).slice(0, 10) : "";
        const uCount = Number(row.earningUu) || 0;
        totalEarningUu += uCount;
        if (dtStr) {
          if (!dateMap[dtStr]) dateMap[dtStr] = { completeCount: 0, rewardP: 0, earningUu: 0 };
          dateMap[dtStr].earningUu = uCount;
        }
      });
      avgUu = earningActivityRaw.length > 0 ? Math.round(totalEarningUu / earningActivityRaw.length) : 0;
    }

    const typeKeys = Object.keys(typeGroupMap);
    const typeLabels = typeKeys.map((k) => MISSION_LABEL_MAP[k] || SPECIFIC_MISSION_NAME_MAP[k] || k);
    const rewardValues = typeKeys.map((k) => typeGroupMap[k].rewardP);
    const completionValues = typeKeys.map((k) => typeGroupMap[k].completeCount);

    const rewardShareChart: ChartData<"doughnut"> = {
      labels: typeLabels,
      datasets: [
        {
          data: rewardValues,
          backgroundColor: TOSS_COLORS.slice(0, typeKeys.length),
          borderWidth: 0,
        },
      ],
    };

    const completionCountChart: ChartData<"bar"> = {
      labels: typeLabels,
      datasets: [
        {
          label: "완료 건수 (회)",
          data: completionValues,
          backgroundColor: "#3182f6",
          borderRadius: 8,
        },
      ],
    };

    const dailyRows = Object.entries(dateMap)
      .map(([dt, vals]) => ({ dt, ...vals }))
      .sort((a, b) => b.dt.localeCompare(a.dt));

    let totalDauSum = 0;
    if (overviewData && overviewData.length > 0) {
      overviewData.forEach((row: any) => {
        totalDauSum += Number(row.activeUserCount) || 0;
      });
    }

    const effectiveDau = Math.max(totalDauSum, totalEarningUu);
    const dauShareRate = effectiveDau > 0
      ? Math.min(100, Math.round((totalEarningUu / effectiveDau) * 1000) / 10)
      : 0;

    return {
      totalCompleteCount: completeCountSum,
      totalRewardAmountP: rewardAmountP,
      avgEarningUu: avgUu,
      dauShareRate,
      missionTypeData: typeGroupMap,
      dailyTableData: dailyRows,
      rewardShareChart,
      completionCountChart,
    };
  }, [missionByTypeRaw, missionDailyTrendRaw, missionsDetailRaw, earningActivityRaw]);

  // Daily Reward P Line Chart Data
  const rewardTrendChartData = useMemo(() => {
    if (!missionDailyTrendRaw || missionDailyTrendRaw.length === 0) {
      return { labels: [], datesList: [], datasets: [] } as ChartData<"line"> & { datesList?: string[] };
    }

    const datesSet = new Set<string>();
    const missionNameMap: Record<string, string> = {};
    const dateMissionPMap: Record<string, Record<string, number>> = {};
    const dateTotalPMap: Record<string, number> = {};

    missionDailyTrendRaw.forEach((row) => {
      const dt = row.dt ? String(row.dt).slice(0, 10) : "";
      if (!dt) return;
      datesSet.add(dt);

      const mKey = row.label || row.missionType || "기타";
      const mName = getMissionName(mKey, row.missionName);
      missionNameMap[mKey] = mName;

      const cCount = Number(row.completeCount) || 0;
      const rP = Number((row as any).rewardAmount) || (cCount * 2);

      if (!dateMissionPMap[dt]) dateMissionPMap[dt] = {};
      dateMissionPMap[dt][mKey] = (dateMissionPMap[dt][mKey] || 0) + rP;
      dateTotalPMap[dt] = (dateTotalPMap[dt] || 0) + rP;
    });

    const datesList = Array.from(datesSet).sort();
    const shortDatesList = datesList.map((dt) => (dt ? dt.slice(5).replace("-", "/") : ""));
    const isManyPoints = datesList.length > 30;

    let datasets: any[] = [];
    if (selectedRewardMission === "ALL") {
      const dataPoints = datesList.map((dt) => dateTotalPMap[dt] || 0);
      datasets = [
        {
          label: "전체 미션 통합 지급 리워드 (P)",
          data: dataPoints,
          borderColor: "#3182f6",
          backgroundColor: "rgba(49, 130, 246, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3182f6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#3182f6",
        },
      ];
    } else {
      const mName = missionNameMap[selectedRewardMission] || selectedRewardMission;
      const dataPoints = datesList.map((dt) => dateMissionPMap[dt]?.[selectedRewardMission] || 0);
      datasets = [
        {
          label: `${mName} 지급 리워드 (P)`,
          data: dataPoints,
          borderColor: "#3182f6",
          backgroundColor: "rgba(49, 130, 246, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3182f6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#3182f6",
        },
      ];
    }

    return {
      labels: shortDatesList,
      datesList,
      datasets,
    };
  }, [missionDailyTrendRaw, selectedRewardMission]);

  // Daily Reward Per Complete Line Chart Data
  const rewardPerCompleteTrendChartData = useMemo(() => {
    if (!missionDailyTrendRaw || missionDailyTrendRaw.length === 0) {
      return { labels: [], datesList: [], datasets: [] } as ChartData<"line"> & { datesList?: string[] };
    }

    const datesSet = new Set<string>();
    const missionNameMap: Record<string, string> = {};
    const dateMissionMap: Record<string, Record<string, { rP: number; cCount: number }>> = {};
    const dateTotalPMap: Record<string, number> = {};
    const dateTotalCountMap: Record<string, number> = {};

    missionDailyTrendRaw.forEach((row) => {
      const dt = row.dt ? String(row.dt).slice(0, 10) : "";
      if (!dt) return;
      datesSet.add(dt);

      const mKey = row.label || row.missionType || "기타";
      const mName = getMissionName(mKey, row.missionName);
      missionNameMap[mKey] = mName;

      const cCount = Number(row.completeCount) || 0;
      const rP = Number((row as any).rewardAmount) || (cCount * 2);

      if (!dateMissionMap[dt]) dateMissionMap[dt] = {};
      if (!dateMissionMap[dt][mKey]) dateMissionMap[dt][mKey] = { rP: 0, cCount: 0 };
      dateMissionMap[dt][mKey].rP += rP;
      dateMissionMap[dt][mKey].cCount += cCount;

      dateTotalPMap[dt] = (dateTotalPMap[dt] || 0) + rP;
      dateTotalCountMap[dt] = (dateTotalCountMap[dt] || 0) + cCount;
    });

    const datesList = Array.from(datesSet).sort();
    const shortDatesList = datesList.map((dt) => (dt ? dt.slice(5).replace("-", "/") : ""));
    const isManyPoints = datesList.length > 30;

    let datasets: any[] = [];
    if (selectedRewardPerCompleteMission === "ALL") {
      const dataPoints = datesList.map((dt) => {
        const totalC = dateTotalCountMap[dt] || 0;
        const totalP = dateTotalPMap[dt] || 0;
        return totalC > 0 ? Math.round((totalP / totalC) * 10) / 10 : 0;
      });
      datasets = [
        {
          label: "전체 미션 통합 1회당 평균 리워드 (P/회)",
          data: dataPoints,
          borderColor: "#00c980",
          backgroundColor: "rgba(0, 201, 128, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#00c980",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#00c980",
        },
      ];
    } else {
      const mName = missionNameMap[selectedRewardPerCompleteMission] || selectedRewardPerCompleteMission;
      const dataPoints = datesList.map((dt) => {
        const item = dateMissionMap[dt]?.[selectedRewardPerCompleteMission];
        if (!item || item.cCount === 0) return 0;
        return Math.round((item.rP / item.cCount) * 10) / 10;
      });
      datasets = [
        {
          label: `${mName} 1회당 평균 리워드 (P/회)`,
          data: dataPoints,
          borderColor: "#00c980",
          backgroundColor: "rgba(0, 201, 128, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#00c980",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#00c980",
        },
      ];
    }

    return {
      labels: shortDatesList,
      datesList,
      datasets,
    };
  }, [missionDailyTrendRaw, selectedRewardPerCompleteMission]);

  // Processed Mission Reward Performance Ranking Data (Filterable by Date)
  const processedRewardDetail = useMemo(() => {
    if (selectedRankingDate === "ALL") {
      if (!generalMissionsData || !generalMissionsData.missionTypeData) return [];
      const totalP = generalMissionsData.totalRewardAmountP || 1;

      return Object.entries(generalMissionsData.missionTypeData)
        .map(([key, data]) => {
          const missionName = MISSION_LABEL_MAP[key] || SPECIFIC_MISSION_NAME_MAP[key] || key;
          const rewardP = data.rewardP;
          const uu = data.uuSum || 1;
          const completeCount = data.completeCount;
          const rewardPerUser = Math.round((rewardP / Math.max(1, uu)) * 10) / 10;
          const rewardPerComplete = Math.round((rewardP / Math.max(1, completeCount)) * 10) / 10;
          const shareRate = Math.min(100, Math.round((rewardP / totalP) * 1000) / 10);

          return {
            key,
            missionName,
            rewardP,
            uu,
            completeCount,
            rewardPerUser,
            rewardPerComplete,
            shareRate,
          };
        })
        .sort((a, b) => b.rewardP - a.rewardP);
    }

    // Filter by selected single date
    const dateGroupMap: Record<string, { completeCount: number; rewardP: number; uuSum: number }> = {};
    let dateTotalP = 0;

    const rawRows = (missionDailyTrendRaw && missionDailyTrendRaw.length > 0)
      ? missionDailyTrendRaw
      : (missionByTypeRaw && missionByTypeRaw.length > 0)
        ? missionByTypeRaw
        : [];

    rawRows.forEach((row: any) => {
      const dtStr = row.dt ? String(row.dt).slice(0, 10) : "";
      if (dtStr !== selectedRankingDate) return;

      const key = row.label || row.missionType || "기타";
      if (key === "ATTENDANCE") return;

      const cCount = Number(row.completeCount) || 0;
      const rP = Number(row.rewardAmount) || (cCount * 2);
      const uuVal = Number(row.uu) || 0;

      if (!dateGroupMap[key]) {
        dateGroupMap[key] = { completeCount: 0, rewardP: 0, uuSum: 0 };
      }
      dateGroupMap[key].completeCount += cCount;
      dateGroupMap[key].rewardP += rP;
      dateGroupMap[key].uuSum += uuVal;
      dateTotalP += rP;
    });

    const safeTotalP = dateTotalP || 1;

    return Object.entries(dateGroupMap)
      .map(([key, data]) => {
        const missionName = MISSION_LABEL_MAP[key] || SPECIFIC_MISSION_NAME_MAP[key] || key;
        const rewardP = data.rewardP;
        const uu = data.uuSum || 1;
        const completeCount = data.completeCount;
        const rewardPerUser = Math.round((rewardP / Math.max(1, uu)) * 10) / 10;
        const rewardPerComplete = Math.round((rewardP / Math.max(1, completeCount)) * 10) / 10;
        const shareRate = Math.min(100, Math.round((rewardP / safeTotalP) * 1000) / 10);

        return {
          key,
          missionName,
          rewardP,
          uu,
          completeCount,
          rewardPerUser,
          rewardPerComplete,
          shareRate,
        };
      })
      .sort((a, b) => b.rewardP - a.rewardP);
  }, [generalMissionsData, missionDailyTrendRaw, missionByTypeRaw, selectedRankingDate]);

  // ── 2. ATTENDANCE CONSECUTIVE COHORT MATRIX & VISUAL CHARTS ──
  const attendanceData = useMemo(() => {
    let day1StartSum = 0;
    let day7CompleteSum = 0;
    let adMoreSum = 0;
    let adSkipSum = 0;
    let day3AdMoreSum = 0;
    let day3AdSkipSum = 0;
    let day6AdMoreSum = 0;
    let day6AdSkipSum = 0;

    const dayStepSums = [0, 0, 0, 0, 0, 0, 0];

    attendanceDailyRaw.forEach((row) => {
      day1StartSum += Number(row.day1ClickUserCount) || 0;
      day7CompleteSum += Number(row.day7ClickUserCount) || 0;
      adMoreSum += Number(row.adMoreUserCount) || 0;
      adSkipSum += Number(row.adSkipUserCount) || 0;
      day3AdMoreSum += Number(row.day3AdMoreUserCount) || 0;
      day3AdSkipSum += Number(row.day3AdSkipUserCount) || 0;
      day6AdMoreSum += Number(row.day6AdMoreUserCount) || 0;
      day6AdSkipSum += Number(row.day6AdSkipUserCount) || 0;

      dayStepSums[0] += Number(row.day1ClickUserCount) || 0;
      dayStepSums[1] += Number(row.day2ClickUserCount) || 0;
      dayStepSums[2] += Number(row.day3ClickUserCount) || 0;
      dayStepSums[3] += Number(row.day4ClickUserCount) || 0;
      dayStepSums[4] += Number(row.day5ClickUserCount) || 0;
      dayStepSums[5] += Number(row.day6ClickUserCount) || 0;
      dayStepSums[6] += Number(row.day7ClickUserCount) || 0;
    });

    // Check Report.AttendanceCompletion response
    let completionRate = 0;
    if (attendanceCompletionRaw.length > 0 && Number(attendanceCompletionRaw[0].day1CompleteUserCount) > 0) {
      day1StartSum = Number(attendanceCompletionRaw[0].day1CompleteUserCount) || 0;
      day7CompleteSum = Number(attendanceCompletionRaw[0].completeUserCount) || 0;
      const rawRate = Number(attendanceCompletionRaw[0].completionRate) || 0;
      completionRate = rawRate > 1 ? Math.round(rawRate * 10) / 10 : Math.round(rawRate * 1000) / 10;
    } else {
      completionRate = day1StartSum > 0 ? Math.round((day7CompleteSum / day1StartSum) * 1000) / 10 : 0;
    }

    // Step-by-step consecutive reach array
    const stepCohortList = Array.from({ length: 7 }, (_, i) => {
      const dayNo = i + 1;
      let count = dayStepSums[i];
      let reachRate = 0;

      if (attendanceStepsRaw.length > 0) {
        const item = attendanceStepsRaw.find((s) => Number(s.attendanceDayNo) === dayNo);
        if (item) {
          count = Number(item.completeUserCount) || 0;
          const rawReach = Number(item.reachRate) || 0;
          reachRate = rawReach > 1 ? Math.round(rawReach * 10) / 10 : Math.round(rawReach * 1000) / 10;
        } else {
          const base = dayStepSums[0] || 1;
          reachRate = Math.round((count / base) * 1000) / 10;
        }
      } else {
        const base = dayStepSums[0] || 1;
        reachRate = Math.round((count / base) * 1000) / 10;
      }

      const prevCount = i === 0 ? count : (attendanceStepsRaw.length > 0 ? Number(attendanceStepsRaw[i - 1]?.completeUserCount) || dayStepSums[i - 1] : dayStepSums[i - 1]);
      const stepRetentionRate = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 100;

      return {
        dayNo,
        count,
        reachRate,
        stepRetentionRate,
      };
    });

    const totalOptionClaims = adMoreSum + adSkipSum;
    const adMoreRate = totalOptionClaims > 0 ? Math.round((adMoreSum / totalOptionClaims) * 100) : 0;

    // Daily attendance raw list (All fetched dates, including extended lookahead dates)
    const allDailyRows = [...attendanceDailyRaw]
      .map((row) => {
        const dtStr = row.dt || row.eventDateKst ? String(row.dt || row.eventDateKst).slice(0, 10) : "";
        return {
          dt: dtStr,
          day1: Number(row.day1ClickUserCount) || 0,
          day2: Number(row.day2ClickUserCount) || 0,
          day3: Number(row.day3ClickUserCount) || 0,
          day4: Number(row.day4ClickUserCount) || 0,
          day5: Number(row.day5ClickUserCount) || 0,
          day6: Number(row.day6ClickUserCount) || 0,
          day7: Number(row.day7ClickUserCount) || 0,
          adMore: Number(row.adMoreUserCount) || 0,
          adSkip: Number(row.adSkipUserCount) || 0,
          claims: Number(row.completeUserCount) || 0,
        };
      })
      .filter((r) => r.dt)
      .sort((a, b) => b.dt.localeCompare(a.dt));

    // Create Map of Date String -> Daily Record
    const dailyMapByDate: Record<string, (typeof allDailyRows)[0]> = {};
    allDailyRows.forEach((item) => {
      dailyMapByDate[item.dt] = item;
    });

    // Filter dailyRows strictly to the selected range [fromDate, toDate]
    const dailyRows = allDailyRows.filter((r) => {
      if (!fromDate || !toDate) return true;
      return r.dt >= fromDate && r.dt <= toDate;
    });

    // Compute True Date Cohort Retention Matrix (Tracking Day N on Date D + N-1)
    const cohortMatrixRows = dailyRows.map((row) => {
      const dtStr = row.dt;
      const d1 = row.day1;

      // Day N is claimed on Date D + (N-1)
      const d2Row = dailyMapByDate[addDaysToStr(dtStr, 1)];
      const d3Row = dailyMapByDate[addDaysToStr(dtStr, 2)];
      const d4Row = dailyMapByDate[addDaysToStr(dtStr, 3)];
      const d5Row = dailyMapByDate[addDaysToStr(dtStr, 4)];
      const d6Row = dailyMapByDate[addDaysToStr(dtStr, 5)];
      const d7Row = dailyMapByDate[addDaysToStr(dtStr, 6)];

      const d2 = d2Row !== undefined ? d2Row.day2 : undefined;
      const d3 = d3Row !== undefined ? d3Row.day3 : undefined;
      const d4 = d4Row !== undefined ? d4Row.day4 : undefined;
      const d5 = d5Row !== undefined ? d5Row.day5 : undefined;
      const d6 = d6Row !== undefined ? d6Row.day6 : undefined;
      const d7 = d7Row !== undefined ? d7Row.day7 : undefined;

      const base = d1 > 0 ? d1 : 1;

      return {
        dt: dtStr,
        d1,
        d2,
        d3,
        d4,
        d5,
        d6,
        d7,
        d1Rate: d1 > 0 ? 100 : 0,
        d2Rate: d2 !== undefined && d1 > 0 ? Math.min(100, Math.round((d2 / base) * 1000) / 10) : undefined,
        d3Rate: d3 !== undefined && d1 > 0 ? Math.min(100, Math.round((d3 / base) * 1000) / 10) : undefined,
        d4Rate: d4 !== undefined && d1 > 0 ? Math.min(100, Math.round((d4 / base) * 1000) / 10) : undefined,
        d5Rate: d5 !== undefined && d1 > 0 ? Math.min(100, Math.round((d5 / base) * 1000) / 10) : undefined,
        d6Rate: d6 !== undefined && d1 > 0 ? Math.min(100, Math.round((d6 / base) * 1000) / 10) : undefined,
        d7Rate: d7 !== undefined && d1 > 0 ? Math.min(100, Math.round((d7 / base) * 1000) / 10) : undefined,
      };
    });

    // ── CHARTS DATA FOR ATTENDANCE VISUALIZATION ──
    const stepFunnelChartData: ChartData<"bar"> = {
      labels: stepCohortList.map((s) => `Day ${s.dayNo}`),
      datasets: [
        {
          label: "연속 출석 유저 수 (명)",
          data: stepCohortList.map((s) => s.count),
          backgroundColor: stepCohortList.map((s) => (s.dayNo === 7 ? "#00c980" : "#3182f6")),
          borderRadius: 8,
        },
      ],
    };

    const currentAdMore = optionDayFilter === "day3" ? day3AdMoreSum : optionDayFilter === "day6" ? day6AdMoreSum : adMoreSum;
    const currentAdSkip = optionDayFilter === "day3" ? day3AdSkipSum : optionDayFilter === "day6" ? day6AdSkipSum : adSkipSum;
    const currentTotalOptions = currentAdMore + currentAdSkip;
    const currentAdMoreRate = currentTotalOptions > 0 ? Math.round((currentAdMore / currentTotalOptions) * 1000) / 10 : 0;
    const currentAdSkipRate = currentTotalOptions > 0 ? Math.round((currentAdSkip / currentTotalOptions) * 1000) / 10 : 0;

    const optionDoughnutChartData: ChartData<"doughnut"> = {
      labels: ["광고 보고 더 받기", "그냥 받기 (Skip)"],
      datasets: [
        {
          data: [currentAdMore, currentAdSkip],
          backgroundColor: ["#3182f6", "#8b95a1"],
          borderWidth: 0,
        },
      ],
    };

    const sortedDaily = [...dailyRows].reverse();
    const shortDtList = sortedDaily.map((d) => (d.dt ? String(d.dt).slice(5).replace("-", "/") : ""));
    const fullDtList = sortedDaily.map((d) => (d.dt ? String(d.dt).slice(0, 10) : ""));
    const isManyPoints = sortedDaily.length > 30;

    const dailyTrendChartData: ChartData<"line"> = {
      labels: shortDtList,
      datasets: [
        {
          label: "총 출석 수령 유저",
          data: sortedDaily.map((d) => d.claims),
          borderColor: "#3182f6",
          backgroundColor: "rgba(49, 130, 246, 0.08)",
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3182f6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#3182f6",
        },
        {
          label: "7일차 완주 유저",
          data: sortedDaily.map((d) => d.day7),
          borderColor: "#00c980",
          backgroundColor: "rgba(0, 201, 128, 0.05)",
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#00c980",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#00c980",
        },
        {
          label: "1일차 시작 유저",
          data: sortedDaily.map((d) => d.day1),
          borderColor: "#a98eff",
          backgroundColor: "rgba(169, 142, 255, 0.05)",
          fill: false,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#a98eff",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#a98eff",
        },
      ],
    };

    return {
      day1StartSum,
      day7CompleteSum,
      completionRate,
      adMoreSum,
      adSkipSum,
      adMoreRate,
      day3AdMoreSum,
      day3AdSkipSum,
      day6AdMoreSum,
      day6AdSkipSum,
      currentAdMore,
      currentAdSkip,
      currentTotalOptions,
      currentAdMoreRate,
      currentAdSkipRate,
      stepCohortList,
      dailyRows,
      cohortMatrixRows,
      stepFunnelChartData,
      optionDoughnutChartData,
      dailyTrendChartData,
      fullDtList,
    };
  }, [attendanceDailyRaw, attendanceCompletionRaw, attendanceStepsRaw, optionDayFilter]);

  const sortedCohortMatrixRows = useMemo(() => {
    return [...attendanceData.cohortMatrixRows].sort((a, b) =>
      cohortSortOrder === "desc" ? b.dt.localeCompare(a.dt) : a.dt.localeCompare(b.dt)
    );
  }, [attendanceData.cohortMatrixRows, cohortSortOrder]);

  const sortedDailyRows = useMemo(() => {
    return [...attendanceData.dailyRows].sort((a, b) =>
      dailySortOrder === "desc" ? b.dt.localeCompare(a.dt) : a.dt.localeCompare(b.dt)
    );
  }, [attendanceData.dailyRows, dailySortOrder]);

  // ── 3. PER-MISSION DETAILED BREAKDOWN PROCESSING ──
  const processedMissionsDetail = useMemo(() => {
    let sourceList: Array<{ label: string; missionName?: string; completeCount: number; uu: number }> = [];

    if (missionsDetailRaw && missionsDetailRaw.length > 0) {
      sourceList = missionsDetailRaw.map((item) => ({
        label: item.label,
        missionName: item.missionName,
        completeCount: Number(item.completeCount) || 0,
        uu: Number(item.uu) || 0,
      }));
    } else if (missionDailyTrendRaw && missionDailyTrendRaw.length > 0) {
      const map: Record<string, { label: string; missionName?: string; completeCount: number; uuMax: number }> = {};
      missionDailyTrendRaw.forEach((row: any) => {
        const key = row.label || row.missionType || "기타";
        if (!map[key]) {
          map[key] = {
            label: key,
            missionName: row.missionName,
            completeCount: 0,
            uuMax: 0,
          };
        }
        map[key].completeCount += Number(row.completeCount) || 0;
        map[key].uuMax = Math.max(map[key].uuMax, Number(row.uu) || 0);
      });
      sourceList = Object.values(map).map((v) => ({
        label: v.label,
        missionName: v.missionName,
        completeCount: v.completeCount,
        uu: v.uuMax,
      }));
    }

    if (sourceList.length === 0) return [];

    let totalCountSum = 0;
    sourceList.forEach((m) => {
      totalCountSum += m.completeCount;
    });

    return sourceList
      .map((item) => {
        const cnt = item.completeCount;
        const uu = item.uu;
        const avgPerUser = uu > 0 ? (cnt / uu).toFixed(1) : "0.0";
        const shareRate = totalCountSum > 0 ? Math.round((cnt / totalCountSum) * 1000) / 10 : 0;

        return {
          label: item.label,
          missionName: getMissionName(item.label, item.missionName),
          completeCount: cnt,
          uu,
          avgPerUser,
          shareRate,
        };
      })
      .sort((a, b) => b.completeCount - a.completeCount);
  }, [missionsDetailRaw, missionDailyTrendRaw]);

  // ── 4. DAILY TRENDS DATA PROCESSING (PER-MISSION & AVG PER USER) ──
  const dailyTrendsData = useMemo(() => {
    if (!missionDailyTrendRaw || missionDailyTrendRaw.length === 0) {
      return {
        distinctMissions: [],
        perMissionTrendChart: { labels: [], datasets: [] } as ChartData<"line">,
        perMissionUuTrendChart: { labels: [], datasets: [] } as ChartData<"line">,
        avgPerUserTrendChart: { labels: [], datasets: [] } as ChartData<"line">,
      };
    }

    const datesSet = new Set<string>();
    const missionNameMap: Record<string, string> = {};
    const dateMissionMap: Record<string, Record<string, { completeCount: number; uu: number; avgPerUser: number }>> = {};
    const dateOverallMap: Record<string, { totalCompleteCount: number; totalUu: number }> = {};

    if (missionTotalRaw && missionTotalRaw.length > 0) {
      missionTotalRaw.forEach((row: any) => {
        const dt = row.dt ? String(row.dt).slice(0, 10) : "";
        if (!dt) return;
        datesSet.add(dt);
        dateOverallMap[dt] = {
          totalCompleteCount: Number(row.totalCompleteCount) || 0,
          totalUu: Number(row.totalParticipantUu || row.earningUu) || 0,
        };
      });
    }

    missionDailyTrendRaw.forEach((row) => {
      const dt = row.dt ? String(row.dt).slice(0, 10) : "";
      if (!dt) return;
      datesSet.add(dt);

      const mKey = row.label || row.missionType || "기타";
      const mName = getMissionName(mKey, row.missionName);
      missionNameMap[mKey] = mName;

      const cCount = Number(row.completeCount) || 0;
      const uuVal = Number(row.uu) || 0;
      const avgVal = Number(row.avgPerUser) || (uuVal > 0 ? cCount / uuVal : 0);

      if (!dateMissionMap[dt]) dateMissionMap[dt] = {};
      dateMissionMap[dt][mKey] = { completeCount: cCount, uu: uuVal, avgPerUser: avgVal };

      if (!dateOverallMap[dt]) {
        dateOverallMap[dt] = { totalCompleteCount: cCount, totalUu: uuVal };
      }
    });

    const datesList = Array.from(datesSet).sort();
    const shortDatesList = datesList.map((dt) => (dt ? dt.slice(5).replace("-", "/") : ""));

    const distinctMissions = Object.keys(missionNameMap).map((key) => ({
      key,
      name: missionNameMap[key],
    }));

    const isManyPoints = datesList.length > 30;

    // 1. Per-Mission Daily Completion Trend Chart
    let perMissionDatasets: any[] = [];
    if (selectedTrendMission === "ALL") {
      const dataPoints = datesList.map((dt) => {
        if (dateOverallMap[dt]?.totalCompleteCount) return dateOverallMap[dt].totalCompleteCount;
        let sum = 0;
        Object.values(dateMissionMap[dt] || {}).forEach((item) => {
          sum += item.completeCount || 0;
        });
        return sum;
      });
      perMissionDatasets = [
        {
          label: "전체 미션 통합 완료 횟수 (회)",
          data: dataPoints,
          borderColor: "#3182f6",
          backgroundColor: trendChartStyle === "area" ? "rgba(49, 130, 246, 0.08)" : "#3182f6",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3182f6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#3182f6",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    } else {
      const mName = missionNameMap[selectedTrendMission] || selectedTrendMission;
      const dataPoints = datesList.map((dt) => dateMissionMap[dt]?.[selectedTrendMission]?.completeCount || 0);
      perMissionDatasets = [
        {
          label: `${mName} (완료 횟수 회)`,
          data: dataPoints,
          borderColor: "#3182f6",
          backgroundColor: trendChartStyle === "area" ? "rgba(49, 130, 246, 0.08)" : "#3182f6",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#3182f6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#3182f6",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    }

    const perMissionTrendChart: ChartData<"line"> = {
      labels: shortDatesList,
      datasets: perMissionDatasets,
    };

    // 1-B. Per-Mission Daily Completion UU Trend Chart (완료 명수)
    let perMissionUuDatasets: any[] = [];
    if (selectedTrendMission === "ALL") {
      const dataPoints = datesList.map((dt) => {
        if (dateOverallMap[dt]?.totalUu) return dateOverallMap[dt].totalUu;
        let sum = 0;
        Object.values(dateMissionMap[dt] || {}).forEach((item) => {
          sum += item.uu || 0;
        });
        return sum;
      });
      perMissionUuDatasets = [
        {
          label: "전체 미션 통합 완료 명수 (명)",
          data: dataPoints,
          borderColor: "#8b5cf6",
          backgroundColor: trendChartStyle === "area" ? "rgba(139, 92, 246, 0.08)" : "#8b5cf6",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#8b5cf6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#8b5cf6",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    } else {
      const mName = missionNameMap[selectedTrendMission] || selectedTrendMission;
      const dataPoints = datesList.map((dt) => dateMissionMap[dt]?.[selectedTrendMission]?.uu || 0);
      perMissionUuDatasets = [
        {
          label: `${mName} (완료 명수 명)`,
          data: dataPoints,
          borderColor: "#8b5cf6",
          backgroundColor: trendChartStyle === "area" ? "rgba(139, 92, 246, 0.08)" : "#8b5cf6",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#8b5cf6",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#8b5cf6",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    }

    const perMissionUuTrendChart: ChartData<"line"> = {
      labels: shortDatesList,
      datasets: perMissionUuDatasets,
    };

    // 2. Daily Trend Chart for Average Completion Per User (회/명)
    let avgPerUserDatasets: any[] = [];
    if (selectedAvgPerUserTrendMission === "ALL") {
      const dataPoints = datesList.map((dt) => {
        let totalCount = dateOverallMap[dt]?.totalCompleteCount || 0;
        let totalUu = dateOverallMap[dt]?.totalUu || 0;
        if (totalCount === 0 || totalUu === 0) {
          Object.values(dateMissionMap[dt] || {}).forEach((item) => {
            totalCount += item.completeCount || 0;
            totalUu = Math.max(totalUu, item.uu || 0);
          });
        }
        return totalUu > 0 ? Math.round((totalCount / totalUu) * 10) / 10 : 0;
      });
      avgPerUserDatasets = [
        {
          label: "전체 미션 통합 1인당 평균 완료 횟수 (회/명)",
          data: dataPoints,
          borderColor: "#00c980",
          backgroundColor: trendChartStyle === "area" ? "rgba(0, 201, 128, 0.05)" : "#00c980",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#00c980",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#00c980",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    } else {
      const mName = missionNameMap[selectedAvgPerUserTrendMission] || selectedAvgPerUserTrendMission;
      const dataPoints = datesList.map((dt) => {
        const item = dateMissionMap[dt]?.[selectedAvgPerUserTrendMission];
        if (!item) return 0;
        return item.avgPerUser || (item.uu > 0 ? Math.round((item.completeCount / item.uu) * 100) / 100 : 0);
      });
      avgPerUserDatasets = [
        {
          label: `${mName} (1인당 평균 완료 회/명)`,
          data: dataPoints,
          borderColor: "#00c980",
          backgroundColor: trendChartStyle === "area" ? "rgba(0, 201, 128, 0.05)" : "#00c980",
          fill: trendChartStyle === "area",
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#00c980",
          pointBorderWidth: 2,
          pointRadius: isManyPoints ? 0 : 2.5,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#00c980",
          borderRadius: trendChartStyle !== "area" ? 6 : 0,
        },
      ];
    }

    const avgPerUserTrendChart: ChartData<"line"> = {
      labels: shortDatesList,
      datasets: avgPerUserDatasets,
    };

    return {
      datesList,
      distinctMissions,
      perMissionTrendChart,
      perMissionUuTrendChart,
      avgPerUserTrendChart,
    };
  }, [missionDailyTrendRaw, selectedTrendMission, selectedAvgPerUserTrendMission, trendChartStyle]);

  return (
    <div className="space-y-6 font-sans">
      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-TAB 1: 일반 미션 상세 (GENERAL MISSIONS) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {subTab === "general" && (
        <div className="space-y-6">
          {/* ── UNIFIED MASTER PANEL: CONTROL + KPI RIBBON + TREND CHARTS ── */}
          <div className="bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-6">

            {/* TOP HEADER & USER SEGMENT FILTER SWITCHER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#ecf4fe] flex items-center justify-center text-[#3182f6]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#191f28] tracking-tight">미션 참여 현황 대시보드</h2>
                </div>
              </div>

              {/* USER SEGMENT SWITCHER */}
              <div className="flex items-center gap-2 bg-[#f8f9fa] border border-[#e5e8eb] p-1 rounded-2xl shrink-0">
                <span className="text-[11px] font-semibold text-[#8b95a1] px-2 hidden md:inline">유저 분류</span>
                <div className="flex bg-[#f2f4f6] p-0.5 rounded-xl gap-1 text-xs">
                  <button
                    onClick={() => onUserSegmentChange?.("all")}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${userSegment === "all"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                        : "text-[#4e5968] hover:text-[#191f28]"
                      }`}
                  >
                    전체 유저
                  </button>
                  <button
                    onClick={() => onUserSegmentChange?.("existing")}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${userSegment === "existing"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                        : "text-[#4e5968] hover:text-[#191f28]"
                      }`}
                  >
                    기존 유저
                  </button>
                  <button
                    onClick={() => onUserSegmentChange?.("new")}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${userSegment === "new"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                        : "text-[#4e5968] hover:text-[#191f28]"
                      }`}
                  >
                    신규 유저
                  </button>
                </div>
              </div>
            </div>



            {/* UNIFIED KPI RIBBON BAR (3 METRICS IN ONE INTEGRATED ROW) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#f8f9fa] border border-[#f2f4f6] rounded-2xl p-4 divide-y sm:divide-y-0 sm:divide-x divide-[#e5e8eb]">
              <div className="px-3 py-1 space-y-1">
                <div className="text-xs font-semibold text-[#8b95a1] flex items-center gap-1">
                  <span>총 일반 미션 완료 건수</span>
                  <InfoTooltip text="조회 기간 내 간식/음료/스크롤/팁/RC 전체 미션 성공 건수의 합계입니다." />
                </div>
                <div className="text-2xl font-bold text-[#191f28] tracking-[-0.03em]">
                  {loading ? "..." : generalMissionsData.totalCompleteCount.toLocaleString()}
                  <span className="text-sm font-normal text-[#4e5968] ml-1">회</span>
                </div>
              </div>

              <div className="px-3 py-1 space-y-1 sm:pl-6">
                <div className="text-xs font-semibold text-[#8b95a1] flex items-center gap-1">
                  <span>총 미션 지급 리워드</span>
                  <InfoTooltip text="일반 미션 성공으로 유저에게 실제 지급된 총 포인트(P)입니다." />
                </div>
                <div className="text-2xl font-bold text-[#3182f6] tracking-[-0.03em]">
                  {loading ? "..." : generalMissionsData.totalRewardAmountP.toLocaleString()}
                  <span className="text-sm font-semibold text-[#3182f6] ml-1">P</span>
                </div>
              </div>

              <div className="px-3 py-1 space-y-1 sm:pl-6">
                <div className="text-xs font-semibold text-[#8b95a1] flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span>적립 참여 유저</span>
                    <InfoTooltip text="조회 기간 동안 미션·출석·RC를 통해 실제 포인트를 적립한 순 유저(UU) 수입니다." />
                  </div>
                  {generalMissionsData.dauShareRate > 0 && (
                    <span className="text-[11px] font-bold text-[#3182f6] bg-[#ecf4fe] px-2 py-0.5 rounded-md">
                      DAU 대비 {generalMissionsData.dauShareRate}%
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-[#191f28] tracking-[-0.03em] flex items-baseline justify-between">
                  <div>
                    {loading ? "..." : generalMissionsData.avgEarningUu.toLocaleString()}
                    <span className="text-sm font-normal text-[#4e5968] ml-1">명</span>
                  </div>
                </div>
              </div>
            </div>

            {/* INTEGRATED TREND CHARTS SECTION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-1 border-b border-[#f2f4f6]">
                <h3 className="text-sm font-bold text-[#191f28]">일별 완료 횟수 및 1인당 평균 완료 추이</h3>
              </div>

              <div className="space-y-6">
                {/* CHART A: 개별 미션별 일별 완료 횟수 (회) 및 완료 명수 (명) 추이 */}
                <div className="bg-[#f8f9fa] rounded-2xl border border-[#f2f4f6] p-5 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2 border-b border-[#e5e8eb]">
                    {/* METRIC SWITCHER TABS */}
                    <div className="flex items-center gap-1.5 bg-[#e5e8eb] p-1 rounded-2xl shrink-0">
                      <button
                        onClick={() => setGeneralTrendMetric("count")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          generalTrendMetric === "count"
                            ? "bg-white text-[#3182f6] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                            : "text-[#4e5968] hover:text-[#191f28]"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#3182f6]" />
                        <span>일별 완료 횟수 (회) 추이</span>
                      </button>

                      <button
                        onClick={() => setGeneralTrendMetric("uu")}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          generalTrendMetric === "uu"
                            ? "bg-white text-[#8b5cf6] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                            : "text-[#4e5968] hover:text-[#191f28]"
                        }`}
                      >
                        <Users className="w-3.5 h-3.5 text-[#8b5cf6]" />
                        <span>일별 완료 명수 (명) 추이</span>
                      </button>
                    </div>

                    {/* MISSION PILL FILTER BUTTONS */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedTrendMission("ALL")}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          selectedTrendMission === "ALL"
                            ? generalTrendMetric === "count"
                              ? "bg-[#3182f6] text-white shadow-sm font-bold"
                              : "bg-[#8b5cf6] text-white shadow-sm font-bold"
                            : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                        }`}
                      >
                        전체 통합
                      </button>
                      {dailyTrendsData.distinctMissions.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setSelectedTrendMission(m.key)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedTrendMission === m.key
                              ? generalTrendMetric === "count"
                                ? "bg-[#3182f6] text-white shadow-sm font-bold"
                                : "bg-[#8b5cf6] text-white shadow-sm font-bold"
                              : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[380px] pt-1">
                    {generalTrendMetric === "count" ? (
                      dailyTrendsData.perMissionTrendChart.labels?.length ? (
                        trendChartStyle === "area" ? (
                          <Line
                            data={dailyTrendsData.perMissionTrendChart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: { mode: "index", intersect: false },
                              plugins: {
                                legend: {
                                  position: "top" as const,
                                  align: "end" as const,
                                  labels: {
                                    boxWidth: 8,
                                    boxHeight: 8,
                                    usePointStyle: true,
                                    pointStyle: "circle",
                                    padding: 12,
                                    color: "#4e5968",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                  },
                                },
                                tooltip: {
                                  enabled: false,
                                  external: externalGlassTooltip,
                                  callbacks: {
                                    title: (items: any[]) => {
                                      if (!items.length) return "";
                                      const idx = items[0].dataIndex;
                                      const fullDt = dailyTrendsData.datesList?.[idx];
                                      return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                    },
                                    label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}회`,
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
                                    callback: (v: any) => `${Number(v).toLocaleString()}회`,
                                  },
                                },
                              },
                            }}
                          />
                        ) : (
                          <Bar
                            data={dailyTrendsData.perMissionTrendChart as any}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: { mode: "index", intersect: false },
                              plugins: {
                                legend: {
                                  position: "top" as const,
                                  align: "end" as const,
                                  labels: {
                                    boxWidth: 8,
                                    boxHeight: 8,
                                    usePointStyle: true,
                                    pointStyle: "circle",
                                    padding: 12,
                                    color: "#4e5968",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                  },
                                },
                                tooltip: {
                                  enabled: false,
                                  external: externalGlassTooltip,
                                  callbacks: {
                                    title: (items: any[]) => {
                                      if (!items.length) return "";
                                      const idx = items[0].dataIndex;
                                      const fullDt = dailyTrendsData.datesList?.[idx];
                                      return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                    },
                                    label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}회`,
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  stacked: trendChartStyle === "stackedBar",
                                  border: { display: false },
                                  grid: { display: false },
                                  ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 } },
                                },
                                y: {
                                  stacked: trendChartStyle === "stackedBar",
                                  border: { display: false },
                                  grid: { color: "#f2f4f6", drawTicks: false },
                                  ticks: {
                                    color: "#8b95a1",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                                    callback: (v: any) => `${Number(v).toLocaleString()}회`,
                                  },
                                },
                              },
                            }}
                          />
                        )
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-[#8b95a1] font-medium">
                          조회된 미션 일별 완료 횟수 데이터가 없습니다.
                        </div>
                      )
                    ) : (
                      dailyTrendsData.perMissionUuTrendChart.labels?.length ? (
                        trendChartStyle === "area" ? (
                          <Line
                            data={dailyTrendsData.perMissionUuTrendChart}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: { mode: "index", intersect: false },
                              plugins: {
                                legend: {
                                  position: "top" as const,
                                  align: "end" as const,
                                  labels: {
                                    boxWidth: 8,
                                    boxHeight: 8,
                                    usePointStyle: true,
                                    pointStyle: "circle",
                                    padding: 12,
                                    color: "#4e5968",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                  },
                                },
                                tooltip: {
                                  enabled: false,
                                  external: externalGlassTooltip,
                                  callbacks: {
                                    title: (items: any[]) => {
                                      if (!items.length) return "";
                                      const idx = items[0].dataIndex;
                                      const fullDt = dailyTrendsData.datesList?.[idx];
                                      return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                    },
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
                                  ticks: {
                                    color: "#8b95a1",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                                    callback: (v: any) => `${Number(v).toLocaleString()}명`,
                                  },
                                },
                              },
                            }}
                          />
                        ) : (
                          <Bar
                            data={dailyTrendsData.perMissionUuTrendChart as any}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              interaction: { mode: "index", intersect: false },
                              plugins: {
                                legend: {
                                  position: "top" as const,
                                  align: "end" as const,
                                  labels: {
                                    boxWidth: 8,
                                    boxHeight: 8,
                                    usePointStyle: true,
                                    pointStyle: "circle",
                                    padding: 12,
                                    color: "#4e5968",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                  },
                                },
                                tooltip: {
                                  enabled: false,
                                  external: externalGlassTooltip,
                                  callbacks: {
                                    title: (items: any[]) => {
                                      if (!items.length) return "";
                                      const idx = items[0].dataIndex;
                                      const fullDt = dailyTrendsData.datesList?.[idx];
                                      return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                    },
                                    label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()}명`,
                                  },
                                },
                              },
                              scales: {
                                x: {
                                  stacked: trendChartStyle === "stackedBar",
                                  border: { display: false },
                                  grid: { display: false },
                                  ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 } },
                                },
                                y: {
                                  stacked: trendChartStyle === "stackedBar",
                                  border: { display: false },
                                  grid: { color: "#f2f4f6", drawTicks: false },
                                  ticks: {
                                    color: "#8b95a1",
                                    font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                                    callback: (v: any) => `${Number(v).toLocaleString()}명`,
                                  },
                                },
                              },
                            }}
                          />
                        )
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-[#8b95a1] font-medium">
                          조회된 미션 일별 완료 명수 데이터가 없습니다.
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* CHART B: 1인당 평균 완료 횟수 일별 추이 (회/명) */}
                <div className="bg-[#f8f9fa] rounded-2xl border border-[#f2f4f6] p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#e5e8eb]">
                    <h3 className="text-xs font-bold text-[#191f28] flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-[#00c980]" />
                      <span>1인당 평균 완료 횟수 일별 추이</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => setSelectedAvgPerUserTrendMission("ALL")}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          selectedAvgPerUserTrendMission === "ALL"
                            ? "bg-[#00c980] text-white shadow-sm font-bold"
                            : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                        }`}
                      >
                        전체 통합
                      </button>
                      {dailyTrendsData.distinctMissions.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setSelectedAvgPerUserTrendMission(m.key)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            selectedAvgPerUserTrendMission === m.key
                              ? "bg-[#00c980] text-white shadow-sm font-bold"
                              : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[380px] pt-1">
                    {dailyTrendsData.avgPerUserTrendChart.labels?.length ? (
                      trendChartStyle === "area" ? (
                        <Line
                          data={dailyTrendsData.avgPerUserTrendChart}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: "index", intersect: false },
                            plugins: {
                              legend: {
                                position: "top" as const,
                                align: "end" as const,
                                labels: {
                                  boxWidth: 8,
                                  boxHeight: 8,
                                  usePointStyle: true,
                                  pointStyle: "circle",
                                  padding: 12,
                                  color: "#4e5968",
                                  font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                },
                              },
                              tooltip: {
                                enabled: false,
                                external: externalGlassTooltip,
                                callbacks: {
                                  title: (items: any[]) => {
                                    if (!items.length) return "";
                                    const idx = items[0].dataIndex;
                                    const fullDt = dailyTrendsData.datesList?.[idx];
                                    return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                  },
                                  label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toFixed(1)}회/명`,
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
                                  callback: (v: any) => `${Number(v).toFixed(1)}회`,
                                },
                              },
                            },
                          }}
                        />
                      ) : (
                        <Bar
                          data={dailyTrendsData.avgPerUserTrendChart as any}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: "index", intersect: false },
                            plugins: {
                              legend: {
                                position: "top" as const,
                                align: "end" as const,
                                labels: {
                                  boxWidth: 8,
                                  boxHeight: 8,
                                  usePointStyle: true,
                                  pointStyle: "circle",
                                  padding: 12,
                                  color: "#4e5968",
                                  font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                                },
                              },
                              tooltip: {
                                enabled: false,
                                external: externalGlassTooltip,
                                callbacks: {
                                  title: (items: any[]) => {
                                    if (!items.length) return "";
                                    const idx = items[0].dataIndex;
                                    const fullDt = dailyTrendsData.datesList?.[idx];
                                    return fullDt ? `날짜: ${fullDt}` : items[0].label;
                                  },
                                  label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toFixed(1)}회/명`,
                                },
                              },
                            },
                            scales: {
                              x: {
                                stacked: trendChartStyle === "stackedBar",
                                border: { display: false },
                                grid: { display: false },
                                ticks: { color: "#8b95a1", font: { family: "Pretendard, sans-serif", size: 11, weight: 500 } },
                              },
                              y: {
                                stacked: trendChartStyle === "stackedBar",
                                border: { display: false },
                                grid: { color: "#f2f4f6", drawTicks: false },
                                ticks: {
                                  color: "#8b95a1",
                                  font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                                  callback: (v: any) => `${Number(v).toFixed(1)}회`,
                                },
                              },
                            },
                          }}
                        />
                      )
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-[#8b95a1] font-medium">
                        조회된 1인당 평균 완료 횟수 데이터가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-TAB 2: 미션 리워드 현황 (MISSION REWARDS) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {subTab === "reward" && (
        <div className="space-y-6">
          {/* SECTION: CATEGORY SHARE & INDIVIDUAL MISSION PERFORMANCE RANKINGS */}
          <div className="bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-2">
                <div>
                  <h3 className="text-base font-bold text-[#191f28]">미션별 리워드 지급 성과 및 지급 랭킹</h3>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#3182f6] bg-[#ecf4fe] px-3 py-1 rounded-full shrink-0">
                총 {processedMissionsDetail.length}개 미션 집계됨
              </span>
            </div>

            {/* ELEGANT FULL-WIDTH REWARD TREND CARD (WITH METRIC TOGGLE: TOTAL P vs PER COMPLETE) */}
            <div className="bg-[#f8f9fa] rounded-2xl border border-[#f2f4f6] p-5 space-y-4">
              {/* HEADER WITH METRIC TOGGLE TABS & MISSION PILL FILTERS */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-[#e5e8eb]">
                {/* METRIC SWITCHER TABS */}
                <div className="flex items-center gap-1.5 bg-[#e5e8eb] p-1 rounded-2xl shrink-0">
                  <button
                    onClick={() => setRewardTrendMetric("totalP")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rewardTrendMetric === "totalP"
                        ? "bg-white text-[#3182f6] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                        : "text-[#4e5968] hover:text-[#191f28]"
                    }`}
                  >
                    총 지급 리워드
                  </button>

                  <button
                    onClick={() => setRewardTrendMetric("perComplete")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rewardTrendMetric === "perComplete"
                        ? "bg-white text-[#00c980] shadow-[0_2px_6px_rgba(0,0,0,0.06)]"
                        : "text-[#4e5968] hover:text-[#191f28]"
                    }`}
                  >
                    1회당 평균 지급 리워드
                  </button>
                </div>

                {/* MISSION PILL FILTER BUTTONS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (rewardTrendMetric === "totalP") setSelectedRewardMission("ALL");
                      else setSelectedRewardPerCompleteMission("ALL");
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      (rewardTrendMetric === "totalP" ? selectedRewardMission === "ALL" : selectedRewardPerCompleteMission === "ALL")
                        ? rewardTrendMetric === "totalP"
                          ? "bg-[#3182f6] text-white shadow-sm font-bold"
                          : "bg-[#00c980] text-white shadow-sm font-bold"
                        : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                    }`}
                  >
                    전체 통합
                  </button>
                  {dailyTrendsData.distinctMissions.map((m) => {
                    const isSelected = rewardTrendMetric === "totalP"
                      ? selectedRewardMission === m.key
                      : selectedRewardPerCompleteMission === m.key;

                    return (
                      <button
                        key={m.key}
                        onClick={() => {
                          if (rewardTrendMetric === "totalP") setSelectedRewardMission(m.key);
                          else setSelectedRewardPerCompleteMission(m.key);
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? rewardTrendMetric === "totalP"
                              ? "bg-[#3182f6] text-white shadow-sm font-bold"
                              : "bg-[#00c980] text-white shadow-sm font-bold"
                            : "bg-white text-[#4e5968] border border-[#e5e8eb] hover:bg-[#f2f4f6]"
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FULL-WIDTH LINE CHART CANVAS */}
              <div className="h-[380px] pt-1">
                {rewardTrendMetric === "totalP" ? (
                  rewardTrendChartData.labels && rewardTrendChartData.labels.length > 0 ? (
                    <Line
                      data={rewardTrendChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        plugins: {
                          legend: {
                            position: "top" as const,
                            align: "end" as const,
                            labels: {
                              boxWidth: 8,
                              boxHeight: 8,
                              usePointStyle: true,
                              pointStyle: "circle",
                              padding: 12,
                              color: "#4e5968",
                              font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                            },
                          },
                          tooltip: {
                            enabled: false,
                            external: externalGlassTooltip,
                            callbacks: {
                              title: (items: any[]) => {
                                if (!items.length) return "";
                                const idx = items[0].dataIndex;
                                const fullDt = rewardTrendChartData.datesList?.[idx];
                                return fullDt ? `날짜: ${fullDt}` : items[0].label;
                              },
                              label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()} P`,
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
                              callback: (v: any) => `${Number(v).toLocaleString()} P`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#8b95a1] font-medium">
                      조회된 일별 리워드 추이 데이터가 없습니다.
                    </div>
                  )
                ) : (
                  rewardPerCompleteTrendChartData.labels && rewardPerCompleteTrendChartData.labels.length > 0 ? (
                    <Line
                      data={rewardPerCompleteTrendChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: "index", intersect: false },
                        plugins: {
                          legend: {
                            position: "top" as const,
                            align: "end" as const,
                            labels: {
                              boxWidth: 8,
                              boxHeight: 8,
                              usePointStyle: true,
                              pointStyle: "circle",
                              padding: 12,
                              color: "#4e5968",
                              font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                            },
                          },
                          tooltip: {
                            enabled: false,
                            external: externalGlassTooltip,
                            callbacks: {
                              title: (items: any[]) => {
                                if (!items.length) return "";
                                const idx = items[0].dataIndex;
                                const fullDt = rewardPerCompleteTrendChartData.datesList?.[idx];
                                return fullDt ? `날짜: ${fullDt}` : items[0].label;
                              },
                              label: (context: any) => ` ${context.dataset.label}: ${Number(context.raw).toLocaleString()} P/회`,
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
                            min: 0,
                            suggestedMax: 5,
                            border: { display: false },
                            grid: { color: "#f2f4f6", drawTicks: false },
                            ticks: {
                              color: "#8b95a1",
                              font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                              callback: (v: any) => `${Number(v).toFixed(1)} P/회`,
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-[#8b95a1] font-medium">
                      조회된 일별 1회당 평균 리워드 추이 데이터가 없습니다.
                    </div>
                  )
                )}
              </div>
            </div>



            {/* LOWER ROW: MISSION REWARD PERFORMANCE RANKING TABLE */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-[#191f28] flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-[#3182f6]" />
                <span>미션별 리워드 지급 성과 랭킹 표</span>
              </div>
              <div className="overflow-x-auto border border-[#f2f4f6] rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                      <th className="py-3.5 px-4">미션명</th>
                      <th className="py-3.5 px-4 text-right">총 지급 리워드 (P)</th>
                      <th className="py-3.5 px-4 text-right">참여 완료 건수 (회)</th>
                      <th className="py-3.5 px-4 text-right">1회당 평균 지급 리워드 (P/회)</th>
                      <th className="py-3.5 px-4 text-right">1인당 평균 획득 리워드 (P/명)</th>
                      <th className="py-3.5 px-4 text-right">전체 리워드 지급 점유율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                    {processedRewardDetail.length > 0 ? (
                      processedRewardDetail.map((row) => (
                        <tr key={row.key} className="hover:bg-[#f8f9fa] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#191f28] text-sm">
                            {row.missionName}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#3182f6] text-sm">
                            {row.rewardP.toLocaleString()} P
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#191f28]">
                            {row.completeCount.toLocaleString()} 회
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#3182f6]">
                            {row.rewardPerComplete.toLocaleString()} P/회
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-[#4e5968]">
                            {row.rewardPerUser.toLocaleString()} P/명
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <div className="w-24 bg-[#f2f4f6] h-2 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="bg-[#3182f6] h-full rounded-full transition-all"
                                  style={{ width: `${Math.min(100, row.shareRate)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-[#191f28] text-xs w-12 text-right shrink-0">
                                {row.shareRate}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#8b95a1] font-medium">
                          조회 기간 내 리워드 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-TAB 2: 출석체크 상세 (ATTENDANCE CONSECUTIVE COHORT) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {subTab === "attendance" && (
        <div className="space-y-6">

          {/* 4-KPI CARDS FOR ATTENDANCE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6">
            <div className="space-y-2 sm:pr-4">
              <div className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1">
                <span>1일차 출석 시작 유저 (Day 1)</span>
                <InfoTooltip text="출석체크를 1일차부터 새로 시작한 총 순 유저 수(UU)입니다." />
              </div>
              <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
                {loading ? "..." : Number(attendanceData.day1StartSum).toLocaleString()}
                <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">명</span>
              </div>
            </div>

            <div className="space-y-2 sm:px-4 border-t sm:border-t-0 sm:border-l border-[#f2f4f6] pt-3 sm:pt-0">
              <div className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1">
                <span>7일차 출석 완주 유저 (Day 7)</span>
                <InfoTooltip text="7일 연속으로 이탈 없이 출석을 지속하여 최종 완주한 유저 수(UU)입니다." />
              </div>
              <div className="text-[26px] font-bold text-[#3182f6] tracking-[-0.04em]">
                {loading ? "..." : Number(attendanceData.day7CompleteSum).toLocaleString()}
                <span className="text-[16px] font-medium text-[#3182f6] ml-0.5">명</span>
              </div>
            </div>

            <div className="space-y-2 sm:px-4 border-t sm:border-t-0 sm:border-l border-[#f2f4f6] pt-3 sm:pt-0">
              <div className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1">
                <span>7일 연속 출석 최종 완주율</span>
                <InfoTooltip text="Day 1 시작 유저 대비 7일 연속으로 이탈 없이 완주에 성공한 유저 비율입니다." />
              </div>
              <div className="text-[26px] font-bold text-[#00c980] tracking-[-0.04em]">
                {loading ? "..." : `${attendanceData.completionRate}`}
                <span className="text-[16px] font-semibold text-[#00c980] ml-0.5">%</span>
              </div>
            </div>

            <div className="space-y-2 sm:pl-4 border-t sm:border-t-0 sm:border-l border-[#f2f4f6] pt-3 sm:pt-0">
              <div className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1">
                <span>'광고 더 받기' 선택율</span>
                <InfoTooltip text="출석체크 보상 수령 시 광고 시청 후 추가 보상을 선택한 유저 비중입니다." />
              </div>
              <div className="text-[26px] font-bold text-[#a98eff] tracking-[-0.04em]">
                {loading ? "..." : `${attendanceData.adMoreRate}`}
                <span className="text-[16px] font-semibold text-[#a98eff] ml-0.5">%</span>
              </div>
            </div>
          </div>

          {/* ── SECTION 1: ATTENDANCE COHORT RETENTION & REACH ANALYSIS PANEL ── */}
          <div className="bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f2f4f6] pb-3">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-[#191f28]">
                  날짜별 출석 코호트
                </h2>
                <InfoTooltip text="날짜별 1일차 시작 유저가 결석 없이 다음 날(D+1) 2일차, 다다음 날(D+2) 3일차... 7일차까지 연속 출석을 유지한 실제 날짜별 코호트 잔존율을 추적합니다. (미도달 경과일은 '-' 표시)" />
              </div>

              {/* View Switcher: Rate (%) vs Count (명) */}
              <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs">
                <button
                  onClick={() => setCohortViewMode("rate")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${cohortViewMode === "rate"
                      ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                    }`}
                >
                  비율 (%)
                </button>
                <button
                  onClick={() => setCohortViewMode("count")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${cohortViewMode === "count"
                      ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                      : "text-[#6b7684] font-medium hover:text-[#191f28]"
                    }`}
                >
                  유저 수 (명)
                </button>
              </div>
            </div>

            {/* BLOCK A: HEATMAP MATRIX TABLE */}
            <div className="overflow-x-auto border border-[#f2f4f6] rounded-2xl">
              <table className="w-full text-center border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                    <th
                      onClick={() => setCohortSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                      className="py-3 px-3 text-left w-32 cursor-pointer select-none hover:bg-[#eef5ff] transition-colors"
                      title="클릭하여 오름차순/내림차순 정렬"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>출석 시작일</span>
                        {cohortSortOrder === "desc" ? (
                          <ArrowDown className="w-3.5 h-3.5 text-[#3182f6]" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-[#3182f6]" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right border-r border-[#e5e8eb] w-28">1일차 (Base)</th>
                    <th className="py-3 px-2">1일차</th>
                    <th className="py-3 px-2">2일차</th>
                    <th className="py-3 px-2">3일차</th>
                    <th className="py-3 px-2">4일차</th>
                    <th className="py-3 px-2">5일차</th>
                    <th className="py-3 px-2">6일차</th>
                    <th className="py-3 px-2 bg-[#f0f6ff] text-[#3182f6]">7일차 (완주)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                  {sortedCohortMatrixRows.length > 0 ? (
                    sortedCohortMatrixRows.map((row) => (
                      <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#191f28] text-left">{row.dt}</td>
                        <td className="py-2.5 px-3 font-bold text-[#191f28] text-right border-r border-[#e5e8eb]">
                          {row.d1.toLocaleString()}명
                        </td>

                        {[
                          { cnt: row.d1, rate: row.d1Rate },
                          { cnt: row.d2, rate: row.d2Rate },
                          { cnt: row.d3, rate: row.d3Rate },
                          { cnt: row.d4, rate: row.d4Rate },
                          { cnt: row.d5, rate: row.d5Rate },
                          { cnt: row.d6, rate: row.d6Rate },
                          { cnt: row.d7, rate: row.d7Rate },
                        ].map((cell, idx) => (
                          <td
                            key={idx}
                            className={`py-2 px-2.5 transition-all ${cohortViewMode === "rate" ? getCohortTextColor(cell.rate) : "text-[#191f28]"
                              }`}
                            style={{
                              backgroundColor: cohortViewMode === "rate" ? getCohortBg(cell.rate) : undefined,
                            }}
                          >
                            {cell.cnt !== undefined ? (
                              cohortViewMode === "rate" ? (
                                <span>{cell.rate}%</span>
                              ) : (
                                <span>{cell.cnt.toLocaleString()}명</span>
                              )
                            ) : (
                              <span className="text-[#c2c7d0] font-normal">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-[#8b95a1] font-medium">
                        조회 기간 내 출석체크 코호트 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* BLOCK B: OPTION CLAIM SHARE (ALL / DAY 3 / DAY 6) */}
            <div className="bg-[#f8f9fa] rounded-2xl border border-[#f2f4f6] p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e5e8eb]">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#3182f6]" />
                  <h3 className="text-sm font-bold text-[#191f28]">
                    출석 수령 형태 옵션 비중
                  </h3>
                </div>

                {/* Day Filter Switcher: All vs Day 3 vs Day 6 */}
                <div className="flex bg-[#e5e8eb]/70 p-1 rounded-xl gap-1 text-xs">
                  <button
                    onClick={() => setOptionDayFilter("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${optionDayFilter === "all"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#6b7684] font-medium hover:text-[#191f28]"
                      }`}
                  >
                    전체 (통합)
                  </button>
                  <button
                    onClick={() => setOptionDayFilter("day3")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${optionDayFilter === "day3"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#6b7684] font-medium hover:text-[#191f28]"
                      }`}
                  >
                    3일차 옵션
                  </button>
                  <button
                    onClick={() => setOptionDayFilter("day6")}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${optionDayFilter === "day6"
                        ? "bg-white text-[#3182f6] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                        : "text-[#6b7684] font-medium hover:text-[#191f28]"
                      }`}
                  >
                    6일차 옵션
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                {/* Left: Doughnut Chart */}
                <div className="relative h-56 flex items-center justify-center bg-white rounded-2xl border border-[#e5e8eb] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                  {attendanceData.currentTotalOptions > 0 ? (
                    <Doughnut
                      data={attendanceData.optionDoughnutChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11, weight: "bold" } } },
                          tooltip: {
                            enabled: false,
                            external: externalGlassTooltip,
                            callbacks: {
                              label: (context: any) => {
                                const val = Number(context.raw) || 0;
                                const total = attendanceData.currentTotalOptions || 1;
                                const pct = Math.round((val / total) * 1000) / 10;
                                return ` ${context.label}: ${val.toLocaleString()}명 (${pct}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="text-xs text-[#8b95a1] font-medium">조회된 출석 옵션 데이터가 없습니다.</div>
                  )}
                </div>

                {/* Right: 2 KPI Metrics Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-[#3182f6]/20 p-4 space-y-1.5 shadow-[0_2px_10px_rgba(49,130,246,0.04)]">
                    <div className="text-xs font-semibold text-[#8b95a1] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#3182f6]" />
                      <span>광고 보고 더 받기</span>
                    </div>
                    <div className="text-xl font-bold text-[#3182f6] tracking-[-0.03em]">
                      {attendanceData.currentAdMore.toLocaleString()}
                      <span className="text-xs font-normal text-[#4e5968] ml-1">명</span>
                    </div>
                    <div className="text-xs font-bold text-[#3182f6] bg-[#ecf4fe] inline-block px-2 py-0.5 rounded-md">
                      비중: {attendanceData.currentAdMoreRate}%
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#e5e8eb] p-4 space-y-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                    <div className="text-xs font-semibold text-[#8b95a1] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#8b95a1]" />
                      <span>그냥 받기 (Skip)</span>
                    </div>
                    <div className="text-xl font-bold text-[#191f28] tracking-[-0.03em]">
                      {attendanceData.currentAdSkip.toLocaleString()}
                      <span className="text-xs font-normal text-[#4e5968] ml-1">명</span>
                    </div>
                    <div className="text-xs font-bold text-[#6b7684] bg-[#f2f4f6] inline-block px-2 py-0.5 rounded-md">
                      비중: {attendanceData.currentAdSkipRate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>

          {/* ── SECTION 2: DAILY TRENDS & RAW LOG DATA PANEL ── */}
          <div className="bg-white rounded-3xl border border-[#e5e8eb] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#f2f4f6]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#191f28]">
                  일별 출석 세부 현황
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#4e5968] bg-[#f8f9fa] px-3 py-1 rounded-full shrink-0">

              </span>
            </div>

            {/* BLOCK A: DAILY TREND LINE CHART */}
            <div className="bg-[#f8f9fa] rounded-2xl border border-[#f2f4f6] p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#e5e8eb]">
                <h3 className="text-xs font-bold text-[#191f28] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#00c980]" />
                  <span>일별 출석체크 시작·완주·총 수령 유저 추이</span>
                </h3>
                <span className="text-[11px] font-semibold text-[#8b95a1]">단위: 명 (일별 UU)</span>
              </div>
              <div className="h-64 pt-2">
                {attendanceData.dailyRows.length > 0 ? (
                  <Line
                    data={attendanceData.dailyTrendChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: {
                        legend: {
                          position: "top" as const,
                          align: "end" as const,
                          labels: {
                            boxWidth: 8,
                            boxHeight: 8,
                            usePointStyle: true,
                            pointStyle: "circle",
                            padding: 12,
                            color: "#4e5968",
                            font: { family: "Pretendard, sans-serif", size: 11, weight: 600 },
                          },
                        },
                        tooltip: {
                          enabled: false,
                          external: externalGlassTooltip,
                          callbacks: {
                            title: (items: any[]) => {
                              if (!items.length) return "";
                              const idx = items[0].dataIndex;
                              const fullDt = attendanceData.fullDtList?.[idx];
                              return fullDt ? `날짜: ${fullDt}` : items[0].label;
                            },
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
                          grid: { color: "#e5e8eb", drawTicks: false },
                          ticks: {
                            color: "#8b95a1",
                            font: { family: "Pretendard, sans-serif", size: 11, weight: 500 },
                            callback: (v: any) => Number(v).toLocaleString(),
                          },
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="text-xs text-[#8b95a1] font-medium">조회된 추이 데이터가 없습니다.</div>
                )}
              </div>
            </div>

            {/* BLOCK B: DAILY DETAILED ATTENDANCE TABLE */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-[#191f28] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3182f6]" />
                <span>일별 당일 출석 단계 수령 유저 상세 로그</span>
              </div>
              <div className="bg-white overflow-x-auto border border-[#e5e8eb] rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb]">
                      <th
                        onClick={() => setDailySortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
                        className="py-3.5 px-4 cursor-pointer select-none hover:bg-[#eef5ff] transition-colors"
                        title="클릭하여 오름차순/내림차순 정렬"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>날짜 (dt)</span>
                          {dailySortOrder === "desc" ? (
                            <ArrowDown className="w-3.5 h-3.5 text-[#3182f6]" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-[#3182f6]" />
                          )}
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-right">1일차 시작 (Day 1)</th>
                      <th className="py-3.5 px-4 text-right">7일차 완주 (Day 7)</th>
                      <th className="py-3.5 px-4 text-right">광고 더 받기 (명)</th>
                      <th className="py-3.5 px-4 text-right">그냥 받기 (명)</th>
                      <th className="py-3.5 px-4 text-right">총 수령 유저 (명)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                    {sortedDailyRows.length > 0 ? (
                      sortedDailyRows.map((row) => (
                        <tr key={row.dt} className="hover:bg-[#f8f9fa] transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-[#191f28]">{row.dt}</td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#191f28]">
                            {row.day1.toLocaleString()}명
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#00c980]">
                            {row.day7.toLocaleString()}명
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#3182f6]">
                            {row.adMore.toLocaleString()}명
                          </td>
                          <td className="py-3.5 px-4 text-right font-medium text-[#4e5968]">
                            {row.adSkip.toLocaleString()}명
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#191f28]">
                            {row.claims.toLocaleString()}명
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#8b95a1] font-medium">
                          조회 기간 내 출석체크 데이터가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
