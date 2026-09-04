"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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

import {
  ActiveTab,
  RevenueCategoryTab,
  FunnelCategoryTab,
  PeriodType,
  DatePreset,
  ViewMode,
  RetentionMode,
  RetentionDayMax,
  CustomTooltipState,
  AppOption,
  ChartProcessedItem,
  CohortRow,
  CombinedCohortRow,
  RevenueSummary,
  DailyRevenueTrendItem,
  DailyContentRevenueItem,
  FunnelItem,
  FunnelStepItem,
  EventCatalogItem,
  ContentItem,
  GenreItem,
  ContentViewItem,
  MissionByTypeItem,
  MissionDetailItem,
  MissionDailyTrendItem,
  AttendanceDailyItem,
  EarningActivityItem,
  AttendanceCompletionItem,
  AttendanceStepItem,
  UserSegment,
  MissionSubTab,
  SettlementDailyItem,
  SettlementAdData,
} from "@/types/dashboard";

function getPreviousMonthDateRange(fromDateStr: string, toDateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toDateStr)) {
    return { prevFromStr: fromDateStr, prevToStr: toDateStr, numDays: 0 };
  }

  const from = new Date(fromDateStr + "T00:00:00");
  const to = new Date(toDateStr + "T00:00:00");

  const diffTime = Math.abs(to.getTime() - from.getTime());
  const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevFrom = new Date(from);
  const originalDay = prevFrom.getDate();
  prevFrom.setMonth(prevFrom.getMonth() - 1);

  if (prevFrom.getDate() !== originalDay) {
    prevFrom.setDate(0);
  }

  const prevTo = new Date(prevFrom);
  prevTo.setDate(prevTo.getDate() + numDays - 1);

  const format = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    prevFromStr: format(prevFrom),
    prevToStr: format(prevTo),
    numDays,
  };
}

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
  // Dynamic Real ClickHouse Apps List
  const [realAppList, setRealAppList] = useState<AppOption[]>([
    { label: "전체 (통합 서비스)", value: "tc" },
    { label: "비트버니 (bitbunny)", value: "bitbunny" },
    { label: "야핏무브 (yafit)", value: "yafit" },
    { label: "하루스토리 (harustory)", value: "harustory" },
    { label: "토스 (toss)", value: "toss" },
    { label: "카카오페이 (kakaopay)", value: "kakaopay" },
    { label: "포인트홈-하루날씨 (ph-hw)", value: "ph-hw" },
  ]);

  // Fetch Dynamic ClickHouse Apps List on Mount
  useEffect(() => {
    fetch("/api/clickhouse?type=app_list")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setRealAppList(json.data);
        }
      })
      .catch((err) => console.warn("App list fetch failed:", err));
  }, []);

  const formatDateStr = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0.0");
    const day = String(d.getDate()).padStart(2, "0.0");
    return `${year}-${month}-${day}`;
  };

  const getYesterday = (daysBeforeYesterday: number = 0): Date => {
    const d = new Date();
    d.setDate(d.getDate() - 1 - daysBeforeYesterday);
    return d;
  };

  const getSettlementDataForApp = (item: SettlementDailyItem, selectedApp: string) => {
    if (!item) return null;

    const calcAdFree = (adFreeObj: any) => {
      if (!adFreeObj) return 0;
      return Number(adFreeObj.adcash || 0) +
             Number(adFreeObj.adforus || 0) +
             Number(adFreeObj.apWebCPC || 0) +
             Number(adFreeObj.buzzvil || 0) +
             Number(adFreeObj.tossMini || 0) +
             Number(adFreeObj.adsense || 0);
    };

    if (selectedApp === "tc") {
      if (Array.isArray(item.apps) && item.apps.length > 0) {
        let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0;
        let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0;

        item.apps.forEach((app) => {
          paidCoin += Number(app.payingCoin?.paidCoin ?? app.content?.payingCoin?.paidCoin ?? 0);
          freeCoin += Number(app.payingCoin?.freeCoin ?? app.content?.payingCoin?.freeCoin ?? 0);
          chargeCoin += Number(app.chargeCoin ?? app.content?.chargeCoin ?? 0);
          usedReward += Number(app.usedReward || 0);
          contentRevenue += Number(app.contentRevenue || 0);
          adFree += calcAdFree(app.adFree);

          const ad: Partial<SettlementAdData> = app.ad || {};
          b += Number(ad.buzzvil || 0);
          pop += Number(ad.apWebCPC ?? ad.adpopcorn ?? 0);
          forus += Number(ad.adforus || 0);
          sense += Number(ad.adsense || 0);
          cash += Number(ad.adcash || 0);
          rc += Number(ad.rc || 0);
          toss += Number(ad.tossMini || 0);
        });

        return {
          paidCoin,
          freeCoin,
          chargeCoin,
          usedReward,
          contentRevenue,
          adFree,
          ad: { b, pop, forus, sense, cash, rc, toss },
        };
      } else {
        const ad: Partial<SettlementAdData> = item.ad || {};
        return {
          paidCoin: Number(item.payingCoin?.paidCoin ?? item.content?.payingCoin?.paidCoin ?? 0),
          freeCoin: Number(item.payingCoin?.freeCoin ?? item.content?.payingCoin?.freeCoin ?? 0),
          chargeCoin: Number(item.chargeCoin ?? item.content?.chargeCoin ?? 0),
          usedReward: Number(item.usedReward || 0),
          contentRevenue: Number(item.contentRevenue || 0),
          adFree: calcAdFree(item.adFree),
          ad: {
            b: Number(ad.buzzvil || 0),
            pop: Number(ad.apWebCPC ?? ad.adpopcorn ?? 0),
            forus: Number(ad.adforus || 0),
            sense: Number(ad.adsense || 0),
            cash: Number(ad.adcash || 0),
            rc: Number(ad.rc || 0),
            toss: Number(ad.tossMini || 0),
          },
        };
      }
    }

    if (Array.isArray(item.apps) && item.apps.length > 0) {
      const selLower = selectedApp.toLowerCase();

      const APP_ALIAS_MAP: Record<string, string[]> = {
        bitbunny: ["bitbunny", "비트버니"],
        yafit: ["yafit", "야핏", "야핏무브"],
        harustory: ["harustory", "하루스토리"],
        toss: ["toss", "토스"],
        kakaopay: ["kakaopay", "카카오", "카카오페이"],
        kbpay: ["kbpay", "kb pay", "kb페이"],
        digiloca: ["digiloca", "디지로카"],
        olock: ["olock", "오락"],
        pass: ["pass"],
        passbykt: ["passbykt", "pass by kt", "kt pass"],
        okcashback: ["okcashback", "ok캐쉬백"],
        benepia: ["benepia", "베네피아"],
        benecafe: ["benecafe", "베네카페"],
        happytoon: ["happytoon", "해피툰"],
        haruweather: ["haruweather", "하루날씨"],
        pocketcu: ["pocketcu", "포켓cu"],
        rround: ["rround", "알라운드", "라운드"],
        wabank: ["wabank", "와뱅", "광주와뱅크"],
        zaritalk: ["zaritalk", "자리톡"],
        zum: ["zum", "줌"],
        "3o3": ["3o3", "삼쩜삼"],
        bitwalk: ["bitwalk", "비트워크"],
        bppay: ["bppay", "bp페이", "비플페이"],
        memog: ["memog", "메모g"],
        treasurer: ["treasurer", "트레저러"],
        upluspage: ["upluspage", "유플러스페이지"],
        "ph-hw": ["ph-hw", "하루날씨", "포인트홈", "point home", "포인트홈-하루날씨"],
      };

      const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, "");
      const targetAliases = (APP_ALIAS_MAP[selLower] || [selLower]).map(norm);

      const matchedApps = item.apps.filter((app) => {
        if (!app.appName) return false;
        const appNorm = norm(app.appName);
        return targetAliases.some(
          (alias) => appNorm.includes(alias) || alias.includes(appNorm)
        );
      });

      if (matchedApps.length > 0) {
        let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0;
        let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0;

        matchedApps.forEach((app) => {
          paidCoin += Number(app.payingCoin?.paidCoin ?? app.content?.payingCoin?.paidCoin ?? 0);
          freeCoin += Number(app.payingCoin?.freeCoin ?? app.content?.payingCoin?.freeCoin ?? 0);
          chargeCoin += Number(app.chargeCoin ?? app.content?.chargeCoin ?? 0);
          usedReward += Number(app.usedReward || 0);
          contentRevenue += Number(app.contentRevenue || 0);
          adFree += calcAdFree(app.adFree);

          const ad: Partial<SettlementAdData> = app.ad || {};
          b += Number(ad.buzzvil || 0);
          pop += Number(ad.apWebCPC ?? ad.adpopcorn ?? 0);
          forus += Number(ad.adforus || 0);
          sense += Number(ad.adsense || 0);
          cash += Number(ad.adcash || 0);
          rc += Number(ad.rc || 0);
          toss += Number(ad.tossMini || 0);
        });

        return {
          paidCoin,
          freeCoin,
          chargeCoin,
          usedReward,
          contentRevenue,
          adFree,
          ad: { b, pop, forus, sense, cash, rc, toss },
        };
      }
    }

    return null;
  };

  // Navigation Sidebar Active Tab ("users" = 유저 현황, "revenue" = 매출 현황)
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");

  // Revenue Sub-category Tab ("overall" | "ad" | "content" | "margin")
  const [revenueCategoryTab, setRevenueCategoryTab] = useState<RevenueCategoryTab>("overall");

  // Funnel Sub-category Tab ("detail" | "new_user")
  const [funnelCategoryTab, setFunnelCategoryTab] = useState<FunnelCategoryTab>("detail");

  const [selectedApp, setSelectedApp] = useState<string>("tc");
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");

  // Default date range: End date is always set to Yesterday (e.g. D-1), default: Recent 7 days (D-7 ~ D-1)
  const [fromDate, setFromDate] = useState<string>(() => formatDateStr(getYesterday(6)));
  const [toDate, setToDate] = useState<string>(() => formatDateStr(getYesterday(0)));

  // View Mode Switch for DAU & Revenue Cards (차트 vs 테이블)
  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [revenueViewMode, setRevenueViewMode] = useState<ViewMode>("chart");

  // Retention Mode (combined | retention | earning_activation)
  const [retentionMode, setRetentionMode] = useState<RetentionMode>("combined");

  // Day Range Selector for Retention (D7 / D14 / D30)
  const [retentionDayMax, setRetentionDayMax] = useState<RetentionDayMax>(30);

  // Collapsible Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Custom Heatmap Floating Tooltip State
  const [heatmapTooltip, setHeatmapTooltip] = useState<CustomTooltipState | null>(null);

  // Live Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<any[]>([]);
  const [visitRetentionRaw, setVisitRetentionRaw] = useState<any[]>([]);
  const [earningRetentionRaw, setEarningRetentionRaw] = useState<any[]>([]);

  // Revenue Live States
  const [serviceRevenueRaw, setServiceRevenueRaw] = useState<any[]>([]);
  const [adRevenueRaw, setAdRevenueRaw] = useState<any[]>([]);
  const [contentRevenueRaw, setContentRevenueRaw] = useState<any[]>([]);
  const [contentPurchaseRaw, setContentPurchaseRaw] = useState<any[]>([]);
  const [earningRaw, setEarningRaw] = useState<any[]>([]);
  const [missionTotalRaw, setMissionTotalRaw] = useState<any[]>([]);
  const [settlementRaw, setSettlementRaw] = useState<SettlementDailyItem[]>([]);


  // Funnel Live States
  const [funnelsRaw, setFunnelsRaw] = useState<FunnelItem[]>([]);
  const [funnelStepsRaw, setFunnelStepsRaw] = useState<FunnelStepItem[]>([]);
  const [eventCatalogRaw, setEventCatalogRaw] = useState<EventCatalogItem[]>([]);

  // Content / Works Live States
  const [contentRaw, setContentRaw] = useState<ContentItem[]>([]);
  const [genresRaw, setGenresRaw] = useState<GenreItem[]>([]);
  const [contentViewRaw, setContentViewRaw] = useState<ContentViewItem[]>([]);

  // Mission Live States
  const [userSegment, setUserSegment] = useState<UserSegment>("all");
  const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>("general");
  const [missionByTypeRaw, setMissionByTypeRaw] = useState<MissionByTypeItem[]>([]);
  const [missionsDetailRaw, setMissionsDetailRaw] = useState<MissionDetailItem[]>([]);
  const [missionDailyTrendRaw, setMissionDailyTrendRaw] = useState<MissionDailyTrendItem[]>([]);
  const [attendanceDailyRaw, setAttendanceDailyRaw] = useState<AttendanceDailyItem[]>([]);
  const [earningActivityRaw, setEarningActivityRaw] = useState<EarningActivityItem[]>([]);
  const [attendanceCompletionRaw, setAttendanceCompletionRaw] = useState<AttendanceCompletionItem[]>([]);
  const [attendanceStepsRaw, setAttendanceStepsRaw] = useState<AttendanceStepItem[]>([]);

  // Fetch Live Datasets from ClickHouse strictly based on Active Tab
  const fetchDashboardData = useCallback(async () => {
    // Prevent firing requests if dates are incomplete while typing
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return;
    }

    setLoading(true);
    const timestamp = Date.now();
    const fetchOpts = { cache: "no-store" as RequestCache };

    try {
      if (activeTab === "users") {
        setOverviewData([]);
        setVisitRetentionRaw([]);
        setEarningRetentionRaw([]);

        const [overviewRes, visitRes, earningActRes] = await Promise.all([
          fetch(`/api/clickhouse?type=overview&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=retention&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=earning_activation&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
        ]);

        const [overviewJson, visitJson, earningActJson] = await Promise.all([
          overviewRes.json(),
          visitRes.json(),
          earningActRes.json(),
        ]);

        setOverviewData(overviewJson.success ? overviewJson.data || [] : []);
        setVisitRetentionRaw(visitJson.success ? visitJson.data || [] : []);
        setEarningRetentionRaw(earningActJson.success ? earningActJson.data || [] : []);
      } else if (activeTab === "revenue") {
        const { prevFromStr } = getPreviousMonthDateRange(fromDate, toDate);
        const fetchFrom = prevFromStr || fromDate;

        const [
          serviceRevRes,
          adRevRes,
          contentRevRes,
          contentPurchaseRes,
          earningPointsRes,
          missionTotalRes,
          settlementRes,
        ] = await Promise.all([
          fetch(`/api/clickhouse?type=service_total_revenue&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=ad_revenue&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=content_revenue&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=content_purchase&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=earning&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=mission_total&app=${selectedApp}&from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/settlement?from=${fetchFrom}&to=${toDate}&_t=${timestamp}`, fetchOpts).catch(() => null),
        ]);

        const [
          serviceRevJson,
          adRevJson,
          contentRevJson,
          contentPurchaseJson,
          earningPointsJson,
          missionTotalJson,
          settlementJson,
        ] = await Promise.all([
          serviceRevRes.json(),
          adRevRes.json(),
          contentRevRes.json(),
          contentPurchaseRes.json(),
          earningPointsRes.json(),
          missionTotalRes.json(),
          settlementRes ? settlementRes.json().catch(() => null) : Promise.resolve(null),
        ]);

        if (serviceRevJson.success && Array.isArray(serviceRevJson.data)) setServiceRevenueRaw(serviceRevJson.data);
        if (adRevJson.success && Array.isArray(adRevJson.data)) setAdRevenueRaw(adRevJson.data);
        if (contentRevJson.success && Array.isArray(contentRevJson.data)) setContentRevenueRaw(contentRevJson.data);
        if (contentPurchaseJson.success && Array.isArray(contentPurchaseJson.data)) setContentPurchaseRaw(contentPurchaseJson.data);
        if (earningPointsJson.success && Array.isArray(earningPointsJson.data)) setEarningRaw(earningPointsJson.data);
        if (missionTotalJson.success && Array.isArray(missionTotalJson.data)) {
          setMissionTotalRaw(missionTotalJson.data);
        }

        if (settlementJson && settlementJson.success && Array.isArray(settlementJson.data)) {
          setSettlementRaw(settlementJson.data);
        } else {
          setSettlementRaw([]);
        }

      } else if (activeTab === "funnel") {
        setFunnelsRaw([]);
        setFunnelStepsRaw([]);
        setEventCatalogRaw([]);
        setOverviewData([]);

        const [funnelsRes, funnelStepsRes, eventCatalogRes, overviewRes] = await Promise.all([
          fetch(`/api/clickhouse?type=funnels&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=funnel_steps&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=event_catalog&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=overview&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
        ]);

        const [funnelsJson, funnelStepsJson, eventCatalogJson, overviewJson] = await Promise.all([
          funnelsRes.json(),
          funnelStepsRes.json(),
          eventCatalogRes.json(),
          overviewRes.json(),
        ]);

        if (funnelsJson.success && Array.isArray(funnelsJson.data)) setFunnelsRaw(funnelsJson.data);
        if (funnelStepsJson.success && Array.isArray(funnelStepsJson.data)) setFunnelStepsRaw(funnelStepsJson.data);
        if (eventCatalogJson.success && Array.isArray(eventCatalogJson.data)) setEventCatalogRaw(eventCatalogJson.data);
        if (overviewJson.success && Array.isArray(overviewJson.data)) setOverviewData(overviewJson.data);
      } else if (activeTab === "mission") {
        const segParam = `&userSegment=${userSegment}`;

        const [
          missionByTypeRes,
          missionsDetailRes,
          missionDailyTrendRes,
          attendanceDailyRes,
          earningActRes,
          attendanceCompRes,
          attendanceStepsRes,
          missionTotalRes,
          overviewRes,
        ] = await Promise.all([
          fetch(`/api/clickhouse?type=mission_by_type&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=missions_detail&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=mission_daily_trend&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=attendance_daily&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=earning_activity&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=attendance_completion&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=attendance_steps&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=mission_total&app=${selectedApp}&from=${fromDate}&to=${toDate}${segParam}&_t=${timestamp}`, fetchOpts),
          fetch(`/api/clickhouse?type=overview&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts),
        ]);

        const [
          missionByTypeJson,
          missionsDetailJson,
          missionDailyTrendJson,
          attendanceDailyJson,
          earningActJson,
          attendanceCompJson,
          attendanceStepsJson,
          missionTotalJson,
          overviewJson,
        ] = await Promise.all([
          missionByTypeRes.json(),
          missionsDetailRes.json(),
          missionDailyTrendRes.json(),
          attendanceDailyRes.json(),
          earningActRes.json(),
          attendanceCompRes.json(),
          attendanceStepsRes.json(),
          missionTotalRes.json(),
          overviewRes.json(),
        ]);

        if (missionByTypeJson.success && Array.isArray(missionByTypeJson.data)) setMissionByTypeRaw(missionByTypeJson.data);
        if (missionsDetailJson.success && Array.isArray(missionsDetailJson.data)) setMissionsDetailRaw(missionsDetailJson.data);
        if (missionDailyTrendJson.success && Array.isArray(missionDailyTrendJson.data)) setMissionDailyTrendRaw(missionDailyTrendJson.data);
        if (attendanceDailyJson.success && Array.isArray(attendanceDailyJson.data)) setAttendanceDailyRaw(attendanceDailyJson.data);
        if (earningActJson.success && Array.isArray(earningActJson.data)) setEarningActivityRaw(earningActJson.data);
        if (attendanceCompJson.success && Array.isArray(attendanceCompJson.data)) setAttendanceCompletionRaw(attendanceCompJson.data);
        if (attendanceStepsJson.success && Array.isArray(attendanceStepsJson.data)) setAttendanceStepsRaw(attendanceStepsJson.data);
        if (missionTotalJson.success && Array.isArray(missionTotalJson.data)) setMissionTotalRaw(missionTotalJson.data);
        if (overviewJson.success && Array.isArray(overviewJson.data)) setOverviewData(overviewJson.data);
      }
    } catch (error) {
      console.error("ClickHouse data fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedApp, fromDate, toDate, activeTab, userSegment]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Dynamic Date Preset Selection Handler
  const handleDatePreset = (preset: "7d" | "30d" | "month") => {
    setDatePreset(preset);
    // Rule: End date for date presets must always be Yesterday (금일 07.27 -> 어제 07.26)
    const end = getYesterday(0);
    let start = new Date(end);

    if (preset === "7d") {
      start.setDate(end.getDate() - 6);
    } else if (preset === "30d") {
      start.setDate(end.getDate() - 29);
    } else if (preset === "month") {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    }

    setFromDate(formatDateStr(start));
    setToDate(formatDateStr(end));
  };

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type);
  };

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
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0.0")}-${String(monday.getDate()).padStart(2, "0.0")} 주`;
      } else {
        key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0.0")}월`;
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

  // 2. Process Cohort Retention & Activation Datasets deterministically
  const processRawDataToMap = useCallback((rawData: any[], isActivation: boolean = false) => {
    if (!rawData || rawData.length === 0) return [];

    const dateMap: Record<string, { newUserCount: number; daysMap: Record<number, { rate: number; count: number }> }> = {};

    // Pass 1: Initialize all cohort dates and capture D0 new user counts
    rawData.forEach((item) => {
      const rawDateStr = item.cohortDate ? String(item.cohortDate).split("T")[0] : "";
      if (!rawDateStr) return;

      const dayN = Number(item.dayN || 0);
      const userCount = Number(item.retainedUserCount ?? item.activatedUu ?? 0);

      if (!dateMap[rawDateStr]) {
        dateMap[rawDateStr] = { newUserCount: 0, daysMap: {} };
      }

      if (dayN === 0 && (!isActivation || dateMap[rawDateStr].newUserCount === 0)) {
        dateMap[rawDateStr].newUserCount = userCount;
      }
    });

    // Pass 2: Calculate retention and activation rates deterministically
    rawData.forEach((item) => {
      const rawDateStr = item.cohortDate ? String(item.cohortDate).split("T")[0] : "";
      if (!rawDateStr || !dateMap[rawDateStr]) return;

      const dayN = Number(item.dayN || 0);
      const userCount = Number(item.retainedUserCount ?? item.activatedUu ?? 0);

      let rate = 0;
      if (item.activationRate !== undefined && item.activationRate !== null) {
        rate = Number(Number(item.activationRate).toFixed(1));
      } else if (item.retentionRate !== undefined && item.retentionRate !== null) {
        rate = Number(Number(item.retentionRate).toFixed(1));
      } else if (dayN === 0 && !isActivation) {
        rate = 100;
      } else {
        const d0Count = dateMap[rawDateStr].newUserCount;
        rate = d0Count > 0 ? Number(((userCount / d0Count) * 100).toFixed(1)) : 0;
      }

      dateMap[rawDateStr].daysMap[dayN] = { rate, count: userCount };
    });

    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cohortDate, val]) => {
        const dateObj = new Date(cohortDate + "T00:00:00");
        const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()} (${["일", "월", "화", "수", "목", "금", "토"][dateObj.getDay()]})`;
        return { cohortDate, formattedDate, newUserCount: val.newUserCount, daysMap: val.daysMap };
      });
  }, []);

  const visitRows = useMemo<CohortRow[]>(() => processRawDataToMap(visitRetentionRaw, false), [visitRetentionRaw, processRawDataToMap]);
  const earningRows = useMemo<CohortRow[]>(() => processRawDataToMap(earningRetentionRaw, true), [earningRetentionRaw, processRawDataToMap]);

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

  const avgVisitDecay = useMemo(() => {
    if (visitRows.length === 0) return dayNList.map(() => null);

    const maxDateStr = visitRows.reduce((max, r) => (r.cohortDate > max ? r.cohortDate : max), "");
    const maxDate = maxDateStr ? new Date(maxDateStr + "T00:00:00") : new Date();

    return dayNList.map((dayNum) => {
      if (dayNum === 0) return 100;

      const elapsedCohorts = visitRows.filter((r) => {
        const cDate = new Date(r.cohortDate + "T00:00:00");
        const ageInDays = Math.round((maxDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
        return dayNum <= ageInDays;
      });

      if (elapsedCohorts.length === 0) return null;

      const rates = elapsedCohorts.map((r) => r.daysMap[dayNum]?.rate ?? 0);
      const avgRate = rates.reduce((a, b) => a + b, 0) / elapsedCohorts.length;
      return Number(avgRate.toFixed(1));
    });
  }, [visitRows, dayNList]);

  const avgEarningDecay = useMemo(() => {
    if (earningRows.length === 0) return dayNList.map(() => null);

    const maxDateStr = earningRows.reduce((max, r) => (r.cohortDate > max ? r.cohortDate : max), "");
    const maxDate = maxDateStr ? new Date(maxDateStr + "T00:00:00") : new Date();

    return dayNList.map((dayNum) => {
      if (dayNum === 0) return 100;

      const elapsedCohorts = earningRows.filter((r) => {
        const cDate = new Date(r.cohortDate + "T00:00:00");
        const ageInDays = Math.round((maxDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
        return dayNum <= ageInDays;
      });

      if (elapsedCohorts.length === 0) return null;

      const rates = elapsedCohorts.map((r) => r.daysMap[dayNum]?.rate ?? 0);
      const avgRate = rates.reduce((a, b) => a + b, 0) / elapsedCohorts.length;
      return Number(avgRate.toFixed(1));
    });
  }, [earningRows, dayNList]);

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

  // Helper functions for ultra-robust field extraction across raw API datasets
  const parseRewardAmount = (row: any): number => {
    if (!row) return 0;
    const raw =
      row.totalRewardAmount ??
      row.total_reward_amount ??
      row.rewardAmount ??
      row.reward_amount ??
      row.reward ??
      row.totalReward ??
      row.total_reward ??
      row.rewardCost ??
      row.reward_cost ??
      row.total_reward_cost ??
      row.mCost ??
      row.missionReward ??
      row.totalMissionReward ??
      row.rewardSum ??
      row.total_reward_sum ??
      0;
    const num = Number(raw);
    if (!isNaN(num) && num > 0) return num;

    const keys = Object.keys(row);
    for (const k of keys) {
      const kLower = k.toLowerCase();
      if (kLower.includes("reward") || kLower === "mcost" || kLower.includes("mission")) {
        const val = Number(row[k]);
        if (!isNaN(val) && val > 0) return val;
      }
    }
    return !isNaN(num) ? num : 0;
  };

  const parseExchangedPoints = (row: any): number => {
    if (!row) return 0;
    const raw =
      row.exchangedPoints ??
      row.exchanged_points ??
      row.exchanged ??
      row.exchangedPoint ??
      row.exchanged_point ??
      row.eCost ??
      row.exchangeAmount ??
      row.exchange_amount ??
      0;
    const num = Number(raw);
    return !isNaN(num) ? num : 0;
  };

  const hasActiveSettlement = useMemo(() => {
    return (
      Array.isArray(settlementRaw) &&
      settlementRaw.length > 0 &&
      settlementRaw.some((item) => getSettlementDataForApp(item, selectedApp) !== null)
    );
  }, [settlementRaw, selectedApp]);

  // 3. Process Revenue Datasets
  const revenueSummary = useMemo<RevenueSummary>(() => {
    let contentPaySum = 0;
    let paidCoinSum = 0;
    let adTicketSum = 0;
    let giftBoxSum = 0;
    let serviceTotalSum = 0;

    let prevContentPaySum = 0;
    let prevPaidCoinSum = 0;
    let prevAdTicketSum = 0;
    let prevTotalAdRevenue = 0;
    let prevChargeWonSum = 0;

    const adCategoryMap: Record<string, { revenue: number; impression: number }> = {};
    const networkMap: Record<string, { revenue: number; impression: number }> = {};
    let totalAdRevenue = 0;
    let rewardAdRevenue = 0;
    let totalExchangedPoints = 0;

    const isPhApp = selectedApp.toLowerCase().includes("ph-");
    const { prevFromStr, prevToStr } = getPreviousMonthDateRange(fromDate, toDate);

    // Helper for robust date string extraction (YYYY-MM-DD)
    const extractDtStr = (rawDt: any): string => {
      if (!rawDt) return "";
      const str = String(rawDt).trim();
      if (str.includes("T")) return str.split("T")[0];
      if (str.length >= 10) return str.slice(0, 10);
      return str;
    };

    if (hasActiveSettlement) {
      settlementRaw.forEach((item) => {
        const dtStr = extractDtStr(item.date);
        if (!dtStr) return;
        const isCurrent = dtStr >= fromDate && dtStr <= toDate;
        const isPrev = dtStr >= prevFromStr && dtStr <= prevToStr;
        if (!isCurrent && !isPrev) return;

        const sData = getSettlementDataForApp(item, selectedApp);
        if (!sData) return;

        const { paidCoin, chargeCoin, usedReward, contentRevenue, adFree, ad } = sData;
        const { b, pop, forus, sense, cash, rc, toss } = ad;

        const dayTotalAd = b + pop + forus + sense + cash + rc + toss;
        const realContentRev = (contentRevenue && contentRevenue > 0) ? contentRevenue : paidCoin;

        if (isCurrent) {
          contentPaySum += realContentRev;
          paidCoinSum += paidCoin;
          adTicketSum += (adFree || 0);
          serviceTotalSum += realContentRev;
          totalAdRevenue += dayTotalAd;
          rewardAdRevenue += isPhApp ? (cash + rc) : (pop + forus + rc);
          totalExchangedPoints += usedReward;

          const netMap: Record<string, number> = {
            "Buzzvil": b,
            "apWebCPC": pop,
            "Adforus": forus,
            "AdCash": cash,
            "RC (비토스)": rc,
            "Toss Mini": toss,
          };
          if (sense > 0) netMap["AdSense"] = sense;

          Object.entries(netMap).forEach(([netName, rev]) => {
            if (!networkMap[netName]) networkMap[netName] = { revenue: 0, impression: 0 };
            networkMap[netName].revenue += rev;
          });

          const catMap: Record<string, number> = {
            "reward": b,
            "display": pop + forus + sense + cash + toss,
            "rc": rc,
          };
          Object.entries(catMap).forEach(([catName, rev]) => {
            if (!adCategoryMap[catName]) adCategoryMap[catName] = { revenue: 0, impression: 0 };
            adCategoryMap[catName].revenue += rev;
          });
        }

        if (isPrev) {
          prevContentPaySum += realContentRev;
          prevPaidCoinSum += paidCoin;
          prevAdTicketSum += (adFree || 0);
          prevTotalAdRevenue += dayTotalAd;
          prevChargeWonSum += (chargeCoin || 0);
        }
      });
    } else {
      serviceRevenueRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr) return;
        const isCurrent = dtStr >= fromDate && dtStr <= toDate;
        const isPrev = dtStr >= prevFromStr && dtStr <= prevToStr;

        const cPay = Number(row.contentPayRevenue || 0);
        const aTick = Number(row.adTicketRevenue || 0);
        const gBox = Number(row.giftBoxRevenue || 0);
        const sTot = Number(row.serviceTotalRevenue || 0);

        if (isCurrent) {
          contentPaySum += cPay;
          adTicketSum += aTick;
          giftBoxSum += gBox;
          serviceTotalSum += sTot;
        }

        if (isPrev) {
          prevContentPaySum += cPay;
          prevAdTicketSum += aTick;
        }
      });

      adRevenueRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr) return;
        const isCurrent = dtStr >= fromDate && dtStr <= toDate;
        const isPrev = dtStr >= prevFromStr && dtStr <= prevToStr;

        const rev = Number(row.revenue || 0);
        const imp = Number(row.impression || 0);
        const cat = String(row.adCategory || "기타");
        const net = String(row.network || "기타");

        if (isCurrent) {
          totalAdRevenue += rev;

          const catLower = cat.toLowerCase();
          const netLower = net.toLowerCase();
          const isRewardAd = isPhApp
            ? (catLower === "rc" || netLower === "adcash" || (catLower === "display" && netLower === "adcash"))
            : (catLower === "rc" || (catLower === "display" && (netLower === "adpopcorn" || netLower === "adforus")));

          if (isRewardAd) {
            rewardAdRevenue += rev;
          }

          if (!adCategoryMap[cat]) adCategoryMap[cat] = { revenue: 0, impression: 0 };
          adCategoryMap[cat].revenue += rev;
          adCategoryMap[cat].impression += imp;

          if (!networkMap[net]) networkMap[net] = { revenue: 0, impression: 0 };
          networkMap[net].revenue += rev;
          networkMap[net].impression += imp;
        }

        if (isPrev) {
          prevTotalAdRevenue += rev;
        }
      });

      earningRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (dtStr >= fromDate && dtStr <= toDate) {
          const val = parseExchangedPoints(row);
          totalExchangedPoints += val;
        }
      });
    }

    const grossRevenue = contentPaySum + totalAdRevenue;
    const prevGrossRevenue = prevContentPaySum + prevTotalAdRevenue;

    const grossGrowth = prevGrossRevenue > 0 ? ((grossRevenue - prevGrossRevenue) / prevGrossRevenue) * 100 : 0;
    const contentGrowth = prevContentPaySum > 0 ? ((contentPaySum - prevContentPaySum) / prevContentPaySum) * 100 : 0;
    const adGrowth = prevTotalAdRevenue > 0 ? ((totalAdRevenue - prevTotalAdRevenue) / prevTotalAdRevenue) * 100 : 0;
    const chargeGrowth = prevChargeWonSum > 0 ? ((contentPaySum - prevChargeWonSum) / prevChargeWonSum) * 100 : 0;
    const paidCoinGrowth = prevPaidCoinSum > 0 ? ((paidCoinSum - prevPaidCoinSum) / prevPaidCoinSum) * 100 : 0;
    const adTicketGrowth = prevAdTicketSum > 0 ? ((adTicketSum - prevAdTicketSum) / prevAdTicketSum) * 100 : 0;

    let totalMissionReward = 0;
    missionTotalRaw.forEach((row) => {
      const dtStr = extractDtStr(row.dt);
      if (dtStr >= fromDate && dtStr <= toDate) {
        const val = parseRewardAmount(row);
        totalMissionReward += val;
      }
    });

    const totalRewardCost = totalExchangedPoints;
    // Business Rule: Net Operating Margin (순 영업 마진) = Total Ad Revenue (총 광고 매출) - Exchanged Points Cost (포인트 환전액)
    const netProfit = totalAdRevenue - totalRewardCost;
    const marginRate = totalAdRevenue > 0 ? (netProfit / totalAdRevenue) * 100 : 0;

    // Generate strict date array between fromDate and toDate
    const generateDateRange = (fromStr: string, toStr: string): string[] => {
      const dates: string[] = [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) return dates;
      let curr = new Date(fromStr + "T00:00:00");
      const end = new Date(toStr + "T00:00:00");
      while (curr <= end) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, "0");
        const d = String(curr.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${d}`);
        curr.setDate(curr.getDate() + 1);
      }
      return dates;
    };

    // Gather all unique dates strictly within the selected range (fromDate ~ toDate)
    const allRevenueDates = generateDateRange(fromDate, toDate);

    const dailyMap: Record<string, DailyRevenueTrendItem> = {};
    allRevenueDates.forEach((dtStr) => {
      dailyMap[dtStr] = {
        dt: dtStr,
        formattedDt: dtStr.slice(5).replace("-", "/"),
        serviceRev: 0,
        adRev: 0,
        rewardAdRev: 0,
        grossTotal: 0,
        contentPay: 0,
        adTicket: 0,
        giftBox: 0,
        mCost: 0,
        eCost: 0,
        cost: 0,
        margin: 0,
        marginRate: 0,
      };
    });

    if (hasActiveSettlement) {
      settlementRaw.forEach((item) => {
        const dtStr = extractDtStr(item.date);
        if (!dtStr || !dailyMap[dtStr]) return;

        const sData = getSettlementDataForApp(item, selectedApp);
        if (!sData) return;

        const { paidCoin, chargeCoin, usedReward, contentRevenue, ad } = sData;
        const { b, pop, forus, sense, cash, rc, toss } = ad;

        const dayTotalAd = b + pop + forus + sense + cash + rc + toss;
        const realContentRev = (contentRevenue && contentRevenue > 0) ? contentRevenue : paidCoin;

        dailyMap[dtStr].serviceRev = realContentRev;
        dailyMap[dtStr].contentPay = realContentRev;
        dailyMap[dtStr].adRev = dayTotalAd;
        dailyMap[dtStr].rewardAdRev = isPhApp ? (cash + rc) : (pop + forus + rc);
        dailyMap[dtStr].eCost = usedReward;
      });

      // Populate mCost (적립 알바비 P) from missionTotalRaw even when active settlement is used for revenue
      missionTotalRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr || !dailyMap[dtStr]) return;
        const mRev = parseRewardAmount(row);
        dailyMap[dtStr].mCost += mRev;
      });
    } else {
      serviceRevenueRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr || !dailyMap[dtStr]) return;
        const cPay = Number(row.contentPayRevenue || 0);
        const aTick = Number(row.adTicketRevenue || 0);
        const gBox = Number(row.giftBoxRevenue || 0);
        dailyMap[dtStr].serviceRev += cPay;
        dailyMap[dtStr].contentPay += cPay;
        dailyMap[dtStr].adTicket += aTick;
        dailyMap[dtStr].giftBox += gBox;
      });

      adRevenueRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr || !dailyMap[dtStr]) return;
        const rev = Number(row.revenue || 0);
        dailyMap[dtStr].adRev += rev;

        const catLower = String(row.adCategory || "").toLowerCase();
        const netLower = String(row.network || "").toLowerCase();
        const isRewardAd = isPhApp
          ? (catLower === "rc" || netLower === "adcash" || (catLower === "display" && netLower === "adcash"))
          : (catLower === "rc" || (catLower === "display" && (netLower === "adpopcorn" || netLower === "adforus")));

        if (isRewardAd) {
          dailyMap[dtStr].rewardAdRev += rev;
        }
      });

      missionTotalRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr || !dailyMap[dtStr]) return;
        const mRev = parseRewardAmount(row);
        dailyMap[dtStr].mCost += mRev;
      });

      earningRaw.forEach((row) => {
        const dtStr = extractDtStr(row.dt);
        if (!dtStr || !dailyMap[dtStr]) return;
        const ePoints = parseExchangedPoints(row);
        dailyMap[dtStr].eCost += ePoints;
      });
    }

    Object.values(dailyMap).forEach((d) => {
      d.adRev = Math.round(d.adRev);
      d.rewardAdRev = Math.round(d.rewardAdRev);
      d.serviceRev = Math.round(d.serviceRev);
      d.grossTotal = Math.round(d.serviceRev + d.adRev);
      d.cost = Math.round(d.eCost);
      d.margin = Math.round(d.adRev - d.cost);
      d.marginRate = d.adRev > 0 ? Number(((d.margin / d.adRev) * 100).toFixed(1)) : 0;
    });

    const rawDailyTrend = Object.values(dailyMap).sort((a, b) => a.dt.localeCompare(b.dt));

    // Support dynamic PeriodType grouping (일별 / 주별 / 월별) for immediate button feedback
    let dailyTrend = rawDailyTrend;
    if (periodType !== "day" && rawDailyTrend.length > 0) {
      const groups: Record<string, DailyRevenueTrendItem & { count: number }> = {};
      rawDailyTrend.forEach((item) => {
        const dateObj = new Date(item.dt + "T00:00:00");
        let key = "";
        if (periodType === "week") {
          const day = dateObj.getDay();
          const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(dateObj.setDate(diffToMonday));
          const y = monday.getFullYear();
          const m = String(monday.getMonth() + 1).padStart(2, "0");
          const d = String(monday.getDate()).padStart(2, "0");
          key = `${y}-${m}-${d} 주`;
        } else {
          const y = dateObj.getFullYear();
          const m = String(dateObj.getMonth() + 1).padStart(2, "0");
          key = `${y}-${m}월`;
        }

        if (!groups[key]) {
          groups[key] = {
            dt: key,
            formattedDt: key,
            serviceRev: 0,
            adRev: 0,
            rewardAdRev: 0,
            grossTotal: 0,
            contentPay: 0,
            adTicket: 0,
            giftBox: 0,
            mCost: 0,
            eCost: 0,
            cost: 0,
            margin: 0,
            marginRate: 0,
            count: 0,
          };
        }

        groups[key].serviceRev += item.serviceRev;
        groups[key].adRev += item.adRev;
        groups[key].rewardAdRev += item.rewardAdRev;
        groups[key].grossTotal += item.grossTotal;
        groups[key].contentPay += item.contentPay;
        groups[key].adTicket += item.adTicket;
        groups[key].giftBox += item.giftBox;
        groups[key].mCost += item.mCost;
        groups[key].eCost += item.eCost;
        groups[key].cost += item.cost;
        groups[key].margin += item.margin;
        groups[key].count += 1;
      });

      dailyTrend = Object.values(groups).map((g) => {
        g.marginRate = g.adRev > 0 ? Number(((g.margin / g.adRev) * 100).toFixed(1)) : 0;
        return g;
      }).sort((a, b) => a.dt.localeCompare(b.dt));
    }

    let chargeWonSum = 0;
    let chargeCoinSum = 0;
    let totalPayerUu = 0;
    let totalArppuWonSum = 0;
    let contentDaysCount = 0;

    let contentDailyList: DailyContentRevenueItem[] = [];

    if (hasActiveSettlement) {
      const filteredSettlement = settlementRaw.filter((s) => {
        const dtStr = extractDtStr(s.date);
        return dtStr >= fromDate && dtStr <= toDate;
      });
      const sortedSettlement = [...filteredSettlement].sort((a, b) => a.date.localeCompare(b.date));
      contentDailyList = sortedSettlement.map((item) => {
        const dtStr = extractDtStr(item.date);
        const sData = getSettlementDataForApp(item, selectedApp);
        const paidWon = sData ? sData.paidCoin : 0;
        const chgWon = sData ? sData.chargeCoin : 0;
        const adTickWon = sData ? (sData.adFree || 0) : 0;
        const realContentRev = sData ? ((sData.contentRevenue && sData.contentRevenue > 0) ? sData.contentRevenue : paidWon) : 0;

        const chRow = contentRevenueRaw.find((r) => extractDtStr(r?.dt) === dtStr);
        const payer = chRow ? Number(chRow.payerUu || 0) : 0;
        const arppu = payer > 0 ? Math.round(realContentRev / payer) : 0;

        chargeWonSum += chgWon;
        chargeCoinSum += chgWon;
        totalPayerUu += payer;
        totalArppuWonSum += arppu;
        if (dtStr) contentDaysCount += 1;

        const totalContentRevenue = realContentRev;

        return {
          dt: dtStr,
          formattedDt: dtStr ? dtStr.slice(5).replace("-", "/") : "",
          totalContentRevenue,
          revenueWon: realContentRev,
          paidCoinWon: paidWon,
          chargeWon: chgWon,
          adTicketWon: adTickWon,
          payerUu: payer,
          arppuWon: arppu,
        };
      });
    } else {
      contentDailyList = contentRevenueRaw.map((row) => {
        const dtStr = row.dt ? String(row.dt).split("T")[0] : "";
        const revWon = Number(row.chargeWon || row.revenueWon || 0);
        const paidWon = Number(row.revenueWon || 0);
        const chgWon = Number(row.chargeWon || 0);
        const adTickWon = Number(row.adTicketRevenue || 0);
        const payer = Number(row.payerUu || 0);
        const arppu = Number(row.arppuWon || 0);
        const totalContentRevenue = paidWon + adTickWon;

        chargeWonSum += chgWon;
        chargeCoinSum += chgWon;
        totalPayerUu += payer;
        totalArppuWonSum += arppu;
        if (dtStr) contentDaysCount += 1;

        return {
          dt: dtStr,
          formattedDt: dtStr ? dtStr.slice(5).replace("-", "/") : "",
          totalContentRevenue,
          revenueWon: revWon,
          paidCoinWon: paidWon,
          chargeWon: chgWon,
          adTicketWon: adTickWon,
          payerUu: payer,
          arppuWon: arppu,
        };
      });
    }

    const avgPayerUu = contentDaysCount > 0 ? Math.round(totalPayerUu / contentDaysCount) : 0;
    const avgArppuWon = contentDaysCount > 0 ? Math.round(totalArppuWonSum / contentDaysCount) : 0;

    const purchaseTypeMap: Record<number, { cnt: number; uu: number }> = {};
    contentPurchaseRaw.forEach((row) => {
      const type = Number(row.purchaseType || 0);
      const cnt = Number(row.cnt || 0);
      const uu = Number(row.uu || 0);

      if (!purchaseTypeMap[type]) purchaseTypeMap[type] = { cnt: 0, uu: 0 };
      purchaseTypeMap[type].cnt += cnt;
      purchaseTypeMap[type].uu += uu;
    });

    // Calculate Ad Category & Network Daily Trends
    let adCategoryDailyTrend = { dates: [] as string[], categories: {} as Record<string, number[]> };
    let networkDailyTrend = { dates: [] as string[], networks: {} as Record<string, number[]> };

    if (hasActiveSettlement) {
      const sortedSettlement = [...settlementRaw].sort((a, b) => a.date.localeCompare(b.date));
      const dates = sortedSettlement.map((s) => s.date.slice(5).replace("-", "/"));

      const metricsList = sortedSettlement.map((s) => {
        const sData = getSettlementDataForApp(s, selectedApp);
        if (sData) return { ...sData.ad, adFree: sData.adFree || 0 };
        return { b: 0, pop: 0, forus: 0, sense: 0, cash: 0, rc: 0, toss: 0, adFree: 0 };
      });

      const netDaily: Record<string, number[]> = {
        "Buzzvil": metricsList.map((m) => m.b),
        "apWebCPC": metricsList.map((m) => m.pop),
        "Adforus": metricsList.map((m) => m.forus),
        "AdCash": metricsList.map((m) => m.cash),
        "RC (비토스)": metricsList.map((m) => m.rc),
        "Toss Mini": metricsList.map((m) => m.toss),
      };
      if (metricsList.some((m) => m.sense > 0)) {
        netDaily["AdSense"] = metricsList.map((m) => m.sense);
      }

      const catDaily: Record<string, number[]> = {
        reward: metricsList.map((m) => m.b),
        display: metricsList.map((m) => m.pop + m.forus + m.sense + m.cash + m.toss),
        rc: metricsList.map((m) => m.rc),
        adTicket: metricsList.map((m) => m.adFree),
      };

      adCategoryDailyTrend = { dates, categories: catDaily };
      networkDailyTrend = { dates, networks: netDaily };
    } else {
      const allAdDates = generateDateRange(fromDate, toDate);

      const adCategoryDailyMap: Record<string, number[]> = { reward: [], display: [], rc: [], adTicket: [] };
      const networkDailyMap: Record<string, number[]> = {};

      allAdDates.forEach((dt) => {
        const dtRows = adRevenueRaw.filter((r) => r.dt && String(r.dt).split("T")[0] === dt);

        ["reward", "display", "rc", "adTicket"].forEach((cat) => {
          const catRev = dtRows
            .filter((r) => String(r.adCategory) === cat)
            .reduce((sum, r) => sum + Number(r.revenue || 0), 0);
          adCategoryDailyMap[cat].push(Math.round(catRev));
        });

        dtRows.forEach((r) => {
          const net = String(r.network || "기타");
          if (!networkDailyMap[net]) networkDailyMap[net] = new Array(allAdDates.length).fill(0);
        });

        const dateIdx = allAdDates.indexOf(dt);
        Object.keys(networkDailyMap).forEach((net) => {
          const netRev = dtRows
            .filter((r) => String(r.network) === net)
            .reduce((sum, r) => sum + Number(r.revenue || 0), 0);
          networkDailyMap[net][dateIdx] = Math.round(netRev);
        });
      });

      adCategoryDailyTrend = {
        dates: allAdDates.map((d) => d.slice(5).replace("-", "/")),
        categories: adCategoryDailyMap,
      };

      networkDailyTrend = {
        dates: allAdDates.map((d) => d.slice(5).replace("-", "/")),
        networks: networkDailyMap,
      };
    }

    // Calculate Purchase Type Daily Trend
    const allPurchaseDates = generateDateRange(fromDate, toDate);

    const purchaseTypeDailyMap: Record<number, number[]> = { 10: [], 20: [], 11: [], 12: [], 13: [] };

    allPurchaseDates.forEach((dt) => {
      const dtRows = contentPurchaseRaw.filter((r) => r.dt && String(r.dt).split("T")[0] === dt);
      [10, 20, 11, 12, 13].forEach((t) => {
        const cnt = dtRows
          .filter((r) => Number(r.purchaseType) === t)
          .reduce((sum, r) => sum + Number(r.cnt || 0), 0);
        purchaseTypeDailyMap[t].push(cnt);
      });
    });

    const purchaseTypeDailyTrend = {
      dates: allPurchaseDates.map((d) => d.slice(5).replace("-", "/")),
      types: purchaseTypeDailyMap,
    };

    return {
      contentPaySum,
      paidCoinSum,
      adTicketSum,
      giftBoxSum,
      serviceTotalSum,
      totalAdRevenue,
      rewardAdRevenue,
      grossRevenue,
      totalMissionReward,
      totalExchangedPoints,
      totalRewardCost,
      netProfit,
      marginRate,
      adCategoryMap,
      networkMap,
      dailyTrend,
      chargeWonSum,
      chargeCoinSum,
      avgPayerUu,
      avgArppuWon,
      contentDailyList,
      purchaseTypeMap,
      adCategoryDailyTrend,
      networkDailyTrend,
      purchaseTypeDailyTrend,
      grossGrowth,
      contentGrowth,
      adGrowth,
      chargeGrowth,
      paidCoinGrowth,
      adTicketGrowth,
      prevPeriodRange: { from: prevFromStr, to: prevToStr },
    };
  }, [serviceRevenueRaw, adRevenueRaw, missionTotalRaw, earningRaw, contentRevenueRaw, contentPurchaseRaw, settlementRaw, selectedApp, periodType, fromDate, toDate]);

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
