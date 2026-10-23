"use client";

import React, { useMemo, useState } from "react";
import {
  Download,
  Calendar,
  Users,
  Award,
  TrendingUp,
  DollarSign,
  ArrowUpDown,
  RefreshCw,
  Info,
  Layers,
  Sparkles,
  Smartphone,
  CalendarDays,
} from "lucide-react";
import {
  DailySummaryRow,
  AppSummaryRow,
  RevenueSummary,
  SettlementDailyItem,
  AppOption,
} from "@/types/dashboard";
import { generateDateRange, extractDtStr } from "@/utils/revenueProcessors";
import { getSettlementDataForApp, getCanonicalAppCode } from "@/utils/settlementHelpers";

interface SummaryDashboardProps {
  loading: boolean;
  fromDate: string;
  toDate: string;
  selectedApp: string;
  realAppList?: AppOption[];
  overviewData: any[];
  missionTotalRaw?: any[];
  missionDailyTrendRaw?: any[];
  settlementRaw?: SettlementDailyItem[];
  revenueSummary: RevenueSummary;
  appsOverviewRaw?: any[];
  onRefreshData?: () => void;
}

const DEFAULT_REAL_APPS: AppOption[] = [
  { label: "비트버니 (bitbunny)", value: "bitbunny" },
  { label: "야핏무브 (yafit)", value: "yafit" },
  { label: "하루스토리 (harustory)", value: "harustory" },
  { label: "OK캐쉬백 (okcashback)", value: "okcashback" },
  { label: "토스 (toss)", value: "toss" },
  { label: "카카오페이 (kakaopay)", value: "kakaopay" },
  { label: "KB페이 (kbpay)", value: "kbpay" },
  { label: "디지로카 (digiloca)", value: "digiloca" },
  { label: "오락 (olock)", value: "olock" },
  { label: "PASS (pass)", value: "pass" },
  { label: "베네피아 (benepia)", value: "benepia" },
  { label: "포인트홈-하루날씨 (ph-hw)", value: "ph-hw" },
  { label: "포인트홈-메모지 (ph-mmg)", value: "ph-mmg" },
  { label: "포인트홈-핑크다이어리 (ph-pinkdiary)", value: "ph-pinkdiary" },
  { label: "포인트홈-스코어센터 (ph-scorecenter)", value: "ph-scorecenter" },
];

const APP_DISPLAY_NAMES: Record<string, string> = {
  tc: "전체 (통합)",
  bitbunny: "비트버니",
  yafit: "야핏무브",
  kakaopay: "카카오페이",
  toss: "토스",
  okcashback: "OK캐쉬백",
  harustory: "하루스토리",
  kbpay: "KB페이",
  digiloca: "디지로카",
  olock: "오락",
  pass: "PASS",
  passbykt: "PASS by KT",
  benepia: "베네피아",
  benecafe: "베네카페",
  happytoon: "해피툰",
  haruweather: "하루날씨",
  pocketcu: "포켓CU",
  rround: "알라운드",
  wabank: "와뱅",
  zaritalk: "자리톡",
  zum: "줌",
  "3o3": "삼쩜삼",
  bitwalk: "비트워크",
  bppay: "BP페이",
  memog: "메모G",
  treasurer: "트레저러",
  upluspage: "유플러스페이지",
  "ph-hw": "포인트홈-하루날씨",
  "ph-mmg": "포인트홈-메모지",
  "ph-pinkdiary": "포인트홈-핑크다이어리",
  "ph-scorecenter": "포인트홈-스코어센터",
  "ph-whatisthisnumber": "포인트홈-뭐야이번호",
  "ph-schooltogether": "포인트홈-스쿨투게더",
  "ph-quizanswer": "포인트홈-퀴즈정답",
  "ph-walkingking": "포인트홈-걸음왕",
  "ph-specialchars": "포인트홈-특수문자",
  "ph-directblood": "포인트홈-지정헌혈",
  "ph-raisehand": "포인트홈-고발",
  "ph-tvdalin": "포인트홈-TV의달인",
  "ph-lottodraw": "포인트홈-로또드로잉",
  "ph-mbtitest": "포인트홈-MBTI테스트",
  "ph-probaseball": "포인트홈-프로야구",
  "ph-ddokddokvoca": "포인트홈-똑똑보카",
  "ph-cultureland": "포인트홈-컬쳐랜드",
  "ph-ggcurrency": "포인트홈-경기지역화폐",
};

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  loading,
  fromDate,
  toDate,
  selectedApp,
  realAppList = [],
  overviewData,
  missionTotalRaw = [],
  missionDailyTrendRaw = [],
  settlementRaw = [],
  revenueSummary,
  appsOverviewRaw = [],
  onRefreshData,
}) => {
  // View Toggle: "apps" (앱별 한눈에 보기) vs "daily" (일자별 종합 추이)
  const [subView, setSubView] = useState<"apps" | "daily">("apps");
  const [dailySortOrder, setDailySortOrder] = useState<"desc" | "asc">("desc");
  const [appsSortField, setAppsSortField] = useState<keyof AppSummaryRow>("missionCompleteCount");
  const [appsSortOrder, setAppsSortOrder] = useState<"desc" | "asc">("desc");
  // Category sub-filter inside Apps View: "all" (전체) | "general" (일반 앱) | "ph" (포인트홈)
  const [appCategoryFilter, setAppCategoryFilter] = useState<"all" | "general" | "ph">("all");

  // ── 1. Process Date-based Maps for Overview (Daily View) ──
  const overviewMap = useMemo(() => {
    const map = new Map<string, { dau: number; newUser: number }>();
    if (Array.isArray(overviewData)) {
      overviewData.forEach((item) => {
        const rawDate = item.eventDateKst
          ? String(item.eventDateKst).split("T")[0]
          : item.dt
          ? String(item.dt).slice(0, 10)
          : "";
        if (!rawDate) return;
        map.set(rawDate, {
          dau: Number(item.activeUserCount || item.dau || 0),
          newUser: Number(item.newUserCount || item.newUser || 0),
        });
      });
    }
    return map;
  }, [overviewData]);

  // ── 2. Process Mission Complete Count Map (Daily View) ──
  const missionMap = useMemo(() => {
    const map = new Map<string, number>();

    if (Array.isArray(missionTotalRaw) && missionTotalRaw.length > 0) {
      missionTotalRaw.forEach((row) => {
        const dt = extractDtStr(row.dt);
        if (!dt) return;
        const count = Number(row.totalCompleteCount || row.completeCount || 0);
        map.set(dt, (map.get(dt) || 0) + count);
      });
    }

    if (Array.isArray(missionDailyTrendRaw)) {
      const fallbackMap = new Map<string, number>();
      missionDailyTrendRaw.forEach((row) => {
        const dt = extractDtStr(row.dt);
        if (!dt) return;
        const count = Number(row.completeCount || 0);
        fallbackMap.set(dt, (fallbackMap.get(dt) || 0) + count);
      });

      fallbackMap.forEach((count, dt) => {
        if (!map.has(dt) || map.get(dt) === 0) {
          map.set(dt, count);
        }
      });
    }

    return map;
  }, [missionTotalRaw, missionDailyTrendRaw]);

  // ── 3. Process Revenue Map from revenueSummary.dailyTrend (Daily View) ──
  const revenueMap = useMemo(() => {
    const map = new Map<
      string,
      {
        serviceRev: number;
        adRev: number;
        mCost: number; // 적립 알바비 (P)
        eCost: number; // 포인트 환전액 (원)
      }
    >();

    const trend = revenueSummary?.dailyTrend || [];
    trend.forEach((row) => {
      if (!row?.dt) return;
      map.set(row.dt, {
        serviceRev: Math.round(row.serviceRev || 0),
        adRev: Math.round(row.adRev || 0),
        mCost: Math.round(row.mCost || 0),
        eCost: Math.round(row.eCost || 0),
      });
    });

    return map;
  }, [revenueSummary]);

  // ── 4. Build Unified Daily Rows ──
  const dailyRows = useMemo<DailySummaryRow[]>(() => {
    const allDates = generateDateRange(fromDate, toDate);
    if (allDates.length === 0) return [];

    const rows: DailySummaryRow[] = allDates.map((dt) => {
      const user = overviewMap.get(dt) || { dau: 0, newUser: 0 };
      const missionCount = missionMap.get(dt) || 0;
      const rev = revenueMap.get(dt) || {
        serviceRev: 0,
        adRev: 0,
        mCost: 0,
        eCost: 0,
      };

      const dau = user.dau;
      const newUser = user.newUser;
      const missionCompleteCount = missionCount;
      const contentRevenue = rev.serviceRev;
      const adRevenue = rev.adRev;
      const albaReward = rev.mCost;
      const exchangeReward = rev.eCost;

      // Formula 1: 미션 손익 = 광고 매출 - 알바비 (원)
      const missionProfit = adRevenue - albaReward;

      // Formula 2: 미션 참여 대비 매출 = 광고 매출 / 미션참여수 (원/회)
      const revPerMission =
        missionCompleteCount > 0
          ? Math.round((adRevenue / missionCompleteCount) * 10) / 10
          : 0;

      // Formula 3: 미션 참여 대비 리워드 = 알바비 / 미션참여수 (P/회)
      const rewardPerMission =
        missionCompleteCount > 0
          ? Math.round((albaReward / missionCompleteCount) * 10) / 10
          : 0;

      // Formula 4: 유저당 미션 참여수 = 미션참여수 / DAU (회/명)
      const missionPerDau =
        dau > 0 ? Math.round((missionCompleteCount / dau) * 100) / 100 : 0;

      return {
        dt,
        dau,
        newUser,
        missionCompleteCount,
        contentRevenue,
        adRevenue,
        albaReward,
        exchangeReward,
        missionProfit,
        revPerMission,
        rewardPerMission,
        missionPerDau,
      };
    });

    return rows.sort((a, b) => {
      return dailySortOrder === "desc"
        ? b.dt.localeCompare(a.dt)
        : a.dt.localeCompare(b.dt);
    });
  }, [fromDate, toDate, overviewMap, missionMap, revenueMap, dailySortOrder]);

  // ── 5. Build Unified Apps Rows (최근 일주일 / 선택 기간 앱별 한눈에 보기) ──
  // STRICT DOMAIN RULE: Only apps present in the header app selection dropdown (realAppList) are allowed!
  // Any strange or unconfigured apps from settlement or logs are strictly excluded.
  const appRows = useMemo<AppSummaryRow[]>(() => {
    // 1. Build authoritative allowed apps list STRICTLY from realAppList (Dropdown Box)
    const effectiveAppList =
      Array.isArray(realAppList) && realAppList.length > 0
        ? realAppList
        : DEFAULT_REAL_APPS;

    // Map each dropdown app to its canonical app code and clean Korean display name
    const allowedDropdownApps = new Map<string, { code: string; name: string }>();

    effectiveAppList.forEach((opt) => {
      const val = (opt.value || "").trim();
      // Exclude aggregate category options
      if (!val || val === "tc" || val === "general_all" || val === "ph_all") return;

      const canonicalCode = getCanonicalAppCode(val);
      if (!canonicalCode || canonicalCode === "tc") return;

      if (!allowedDropdownApps.has(canonicalCode)) {
        // Clean display name from label (e.g. "비트버니 (bitbunny)" -> "비트버니")
        const cleanName =
          (opt.label || "").replace(/\s*\([^)]*\)$/, "").trim() ||
          APP_DISPLAY_NAMES[canonicalCode] ||
          canonicalCode;

        allowedDropdownApps.set(canonicalCode, {
          code: canonicalCode,
          name: cleanName,
        });
      }
    });

    // 2. Map ClickHouse Apps Overview by canonical app key (ONLY for allowed dropdown apps)
    const chAppMap = new Map<
      string,
      { dau: number; newUser: number; completeCount: number }
    >();
    (appsOverviewRaw || []).forEach((item: any) => {
      const canonicalKey = getCanonicalAppCode(String(item.app || ""));
      // Strict exclusion: if not in allowedDropdownApps, completely ignore
      if (!canonicalKey || !allowedDropdownApps.has(canonicalKey)) return;

      const ex = chAppMap.get(canonicalKey) || { dau: 0, newUser: 0, completeCount: 0 };
      ex.dau += Number(item.dau || 0);
      ex.newUser += Number(item.newUser || 0);
      ex.completeCount += Number(item.missionCompleteCount || 0);
      chAppMap.set(canonicalKey, ex);
    });

    // 3. Aggregate Settlement Revenue per app ONLY for allowed dropdown apps
    const appSettlementMap = new Map<
      string,
      {
        contentRevenue: number;
        adRevenue: number;
        albaReward: number;
        exchangeReward: number;
      }
    >();

    allowedDropdownApps.forEach(({ code: appKey }) => {
      let contentRev = 0;
      let adRev = 0;
      let albaReward = 0;
      let exchangeReward = 0;

      (settlementRaw || []).forEach((item) => {
        const sData = getSettlementDataForApp(item, appKey);
        if (sData) {
          const { b, pop, forus, sense, cash, rc, toss } = sData.ad;
          const coupangSeller = Number(sData.ad.coupangSeller ?? 0);
          const coupangPartners = Number(sData.ad.coupangPartners ?? 0);
          const dayAd =
            b + pop + forus + sense + cash + rc + toss + coupangSeller + coupangPartners;

          const realContent =
            sData.contentRevenue && sData.contentRevenue > 0
              ? sData.contentRevenue
              : sData.paidCoin;

          contentRev += realContent;
          adRev += dayAd;
          albaReward += sData.missionRewardP || 0;
          exchangeReward += sData.usedReward || 0;
        }
      });

      appSettlementMap.set(appKey, {
        contentRevenue: Math.round(contentRev),
        adRevenue: Math.round(adRev),
        albaReward: Math.round(albaReward),
        exchangeReward: Math.round(exchangeReward),
      });
    });

    // 4. Combine into AppSummaryRow[] (strictly allowed apps only)
    const rows: AppSummaryRow[] = Array.from(allowedDropdownApps.values()).map(
      ({ code: appKey, name: appName }) => {
        const ch = chAppMap.get(appKey) || {
          dau: 0,
          newUser: 0,
          completeCount: 0,
        };
        const sett = appSettlementMap.get(appKey) || {
          contentRevenue: 0,
          adRevenue: 0,
          albaReward: 0,
          exchangeReward: 0,
        };

        const dau = ch.dau;
        const newUser = ch.newUser;
        const missionCompleteCount = ch.completeCount;
        const contentRevenue = sett.contentRevenue;
        const adRevenue = sett.adRevenue;
        const albaReward = sett.albaReward;
        const exchangeReward = sett.exchangeReward;

        // Formula 1: 미션 손익 = 광고 매출 - 알바비 (원)
        const missionProfit = adRevenue - albaReward;

        // Formula 2: 미션 참여 대비 매출 = 광고 매출 / 미션참여수 (원/회)
        const revPerMission =
          missionCompleteCount > 0
            ? Math.round((adRevenue / missionCompleteCount) * 10) / 10
            : 0;

        // Formula 3: 미션 참여 대비 리워드 = 알바비 / 미션참여수 (P/회)
        const rewardPerMission =
          missionCompleteCount > 0
            ? Math.round((albaReward / missionCompleteCount) * 10) / 10
            : 0;

        // Formula 4: 유저당 미션 참여수 = 미션참여수 / DAU (회/명)
        const missionPerDau =
          dau > 0 ? Math.round((missionCompleteCount / dau) * 100) / 100 : 0;

        return {
          app: appKey,
          appName,
          dau,
          newUser,
          missionCompleteCount,
          contentRevenue,
          adRevenue,
          albaReward,
          exchangeReward,
          missionProfit,
          revPerMission,
          rewardPerMission,
          missionPerDau,
        };
      }
    );

    // Filter by selectedApp or appCategoryFilter
    let categoryFiltered = rows;
    if (selectedApp === "general_all" || appCategoryFilter === "general") {
      categoryFiltered = categoryFiltered.filter(
        (r) => !r.app.startsWith("ph-") && !r.appName.includes("포인트홈")
      );
    } else if (selectedApp === "ph_all" || appCategoryFilter === "ph") {
      categoryFiltered = categoryFiltered.filter(
        (r) => r.app.startsWith("ph-") || r.appName.includes("포인트홈")
      );
    } else if (selectedApp && selectedApp !== "tc") {
      const canonSelected = getCanonicalAppCode(selectedApp);
      categoryFiltered = categoryFiltered.filter((r) => r.app === canonSelected);
    }

    // Filter out completely empty inactive apps to keep table clean
    const filteredRows = categoryFiltered.filter(
      (r) =>
        r.dau > 0 ||
        r.newUser > 0 ||
        r.missionCompleteCount > 0 ||
        r.adRevenue > 0 ||
        r.contentRevenue > 0 ||
        r.albaReward > 0 ||
        r.exchangeReward > 0
    );

    const resultRows =
      filteredRows.length > 0
        ? filteredRows
        : categoryFiltered.length > 0
        ? categoryFiltered
        : rows;

    // Sort by selected field
    return resultRows.sort((a, b) => {
      const valA = a[appsSortField] ?? 0;
      const valB = b[appsSortField] ?? 0;
      if (typeof valA === "string" && typeof valB === "string") {
        return appsSortOrder === "desc"
          ? valB.localeCompare(valA)
          : valA.localeCompare(valB);
      }
      return appsSortOrder === "desc"
        ? Number(valB) - Number(valA)
        : Number(valA) - Number(valB);
    });
  }, [
    realAppList,
    selectedApp,
    appCategoryFilter,
    appsOverviewRaw,
    settlementRaw,
    appsSortField,
    appsSortOrder,
  ]);

  // ── 6. Total Aggregates for Daily Table ──
  const dailyAggregates = useMemo(() => {
    if (dailyRows.length === 0) {
      return {
        avgDau: 0,
        totalNewUser: 0,
        totalMissionCount: 0,
        totalContentRev: 0,
        totalAdRev: 0,
        totalAlbaReward: 0,
        totalExchangeReward: 0,
        totalMissionProfit: 0,
        avgRevPerMission: 0,
        avgRewardPerMission: 0,
        avgMissionPerDau: 0,
        daysCount: 0,
      };
    }

    const daysCount = dailyRows.length;
    let sumDau = 0;
    let totalNewUser = 0;
    let totalMissionCount = 0;
    let totalContentRev = 0;
    let totalAdRev = 0;
    let totalAlbaReward = 0;
    let totalExchangeReward = 0;

    dailyRows.forEach((r) => {
      sumDau += r.dau;
      totalNewUser += r.newUser;
      totalMissionCount += r.missionCompleteCount;
      totalContentRev += r.contentRevenue;
      totalAdRev += r.adRevenue;
      totalAlbaReward += r.albaReward;
      totalExchangeReward += r.exchangeReward;
    });

    const avgDau = Math.round(sumDau / daysCount);
    const totalMissionProfit = totalAdRev - totalAlbaReward;
    const avgRevPerMission =
      totalMissionCount > 0
        ? Math.round((totalAdRev / totalMissionCount) * 10) / 10
        : 0;
    const avgRewardPerMission =
      totalMissionCount > 0
        ? Math.round((totalAlbaReward / totalMissionCount) * 10) / 10
        : 0;
    const avgMissionPerDau =
      sumDau > 0 ? Math.round((totalMissionCount / sumDau) * 100) / 100 : 0;

    return {
      avgDau,
      totalNewUser,
      totalMissionCount,
      totalContentRev,
      totalAdRev,
      totalAlbaReward,
      totalExchangeReward,
      totalMissionProfit,
      avgRevPerMission,
      avgRewardPerMission,
      avgMissionPerDau,
      daysCount,
    };
  }, [dailyRows]);

  // ── 7. Total Aggregates for Apps Table ──
  const appAggregates = useMemo(() => {
    let sumDau = 0;
    let totalNewUser = 0;
    let totalMissionCount = 0;
    let totalContentRev = 0;
    let totalAdRev = 0;
    let totalAlbaReward = 0;
    let totalExchangeReward = 0;

    appRows.forEach((r) => {
      sumDau += r.dau;
      totalNewUser += r.newUser;
      totalMissionCount += r.missionCompleteCount;
      totalContentRev += r.contentRevenue;
      totalAdRev += r.adRevenue;
      totalAlbaReward += r.albaReward;
      totalExchangeReward += r.exchangeReward;
    });

    const totalMissionProfit = totalAdRev - totalAlbaReward;
    const avgRevPerMission =
      totalMissionCount > 0
        ? Math.round((totalAdRev / totalMissionCount) * 10) / 10
        : 0;
    const avgRewardPerMission =
      totalMissionCount > 0
        ? Math.round((totalAlbaReward / totalMissionCount) * 10) / 10
        : 0;
    const avgMissionPerDau =
      sumDau > 0 ? Math.round((totalMissionCount / sumDau) * 100) / 100 : 0;

    return {
      sumDau,
      totalNewUser,
      totalMissionCount,
      totalContentRev,
      totalAdRev,
      totalAlbaReward,
      totalExchangeReward,
      totalMissionProfit,
      avgRevPerMission,
      avgRewardPerMission,
      avgMissionPerDau,
    };
  }, [appRows]);

  // ── 8. CSV Exporters ──
  const handleExportCSV = () => {
    if (subView === "apps") {
      if (appRows.length === 0) return;
      let csv =
        "앱명,앱코드,DAU,신규유저,미션참여수,콘텐츠매출(원),광고매출(원),알바비(P),리워드(원),미션손익(원),미션참여 대비 매출(원/회),미션참여 대비 리워드(P/회),유저당 미션 참여수(회/명)\n";

      // Summary Row
      csv += `"전체 합계","ALL",${appAggregates.sumDau},${appAggregates.totalNewUser},${appAggregates.totalMissionCount},${appAggregates.totalContentRev},${appAggregates.totalAdRev},${appAggregates.totalAlbaReward},${appAggregates.totalExchangeReward},${appAggregates.totalMissionProfit},${appAggregates.avgRevPerMission},${appAggregates.avgRewardPerMission},${appAggregates.avgMissionPerDau}\n`;

      appRows.forEach((r) => {
        csv += `"${r.appName}","${r.app}",${r.dau},${r.newUser},${r.missionCompleteCount},${r.contentRevenue},${r.adRevenue},${r.albaReward},${r.exchangeReward},${r.missionProfit},${r.revPerMission},${r.rewardPerMission},${r.missionPerDau}\n`;
      });

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `앱별_종합성과_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (dailyRows.length === 0) return;
      let csv =
        "일자,DAU,신규유저,미션참여수,콘텐츠매출(원),광고매출(원),알바비(P),리워드(원),미션손익(원),미션참여 대비 매출(원/회),미션참여 대비 리워드(P/회),유저당 미션 참여수(회/명)\n";

      // Summary Row
      csv += `"합계/평균",${dailyAggregates.avgDau},${dailyAggregates.totalNewUser},${dailyAggregates.totalMissionCount},${dailyAggregates.totalContentRev},${dailyAggregates.totalAdRev},${dailyAggregates.totalAlbaReward},${dailyAggregates.totalExchangeReward},${dailyAggregates.totalMissionProfit},${dailyAggregates.avgRevPerMission},${dailyAggregates.avgRewardPerMission},${dailyAggregates.avgMissionPerDau}\n`;

      dailyRows.forEach((r) => {
        csv += `"${r.dt}",${r.dau},${r.newUser},${r.missionCompleteCount},${r.contentRevenue},${r.adRevenue},${r.albaReward},${r.exchangeReward},${r.missionProfit},${r.revPerMission},${r.rewardPerMission},${r.missionPerDau}\n`;
      });

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `일별_종합지표_${selectedApp}_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAppSort = (field: keyof AppSummaryRow) => {
    if (appsSortField === field) {
      setAppsSortOrder(appsSortOrder === "desc" ? "asc" : "desc");
    } else {
      setAppsSortField(field);
      setAppsSortOrder("desc");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── 0. VIEW SWITCHER & TITLE BAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* Left: View Mode Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f2f4f6] rounded-xl">
          <button
            onClick={() => setSubView("apps")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subView === "apps"
                ? "bg-white text-[#191f28] shadow-xs"
                : "text-[#8b95a1] hover:text-[#191f28]"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#3182f6]" />
            <span>앱별 한눈에 보기</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#e8f3ff] text-[#3182f6]">
              {appRows.length}개 앱
            </span>
          </button>

          <button
            onClick={() => setSubView("daily")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subView === "daily"
                ? "bg-white text-[#191f28] shadow-xs"
                : "text-[#8b95a1] hover:text-[#191f28]"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#00c980]" />
            <span>일자별 종합 추이</span>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#e6fbf2] text-[#00c980]">
              {dailyRows.length}일
            </span>
          </button>
        </div>

        {/* Right: Date Range Indicator & CSV Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-[#8b95a1] font-medium bg-[#f8f9fa] px-3 py-1.5 rounded-xl border border-[#e5e8eb]">
            <Calendar className="w-3.5 h-3.5 text-[#8b95a1]" />
            <span className="font-semibold text-[#191f28]">
              {fromDate} ~ {toDate}
            </span>
          </div>

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e8eb] text-xs font-semibold text-[#4e5968] hover:bg-[#f8f9fa] transition-colors cursor-pointer disabled:opacity-50"
              title="데이터 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#3182f6]" : "text-[#8b95a1]"}`} />
              <span className="hidden sm:inline">실시간 갱신</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={subView === "apps" ? appRows.length === 0 : dailyRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3182f6] text-white text-xs font-semibold hover:bg-[#1b64da] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV 저장</span>
          </button>
        </div>
      </div>

      {/* ── 1. KPI SUMMARY CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 유저 현황 요약 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#3182f6]" />
              {subView === "apps" ? "전체 앱 합산 DAU" : "일평균 DAU"}
            </span>
            <span className="text-[11px] font-medium text-[#3182f6] bg-[#e8f3ff] px-2 py-0.5 rounded-md">
              유저 지표
            </span>
          </div>
          <div className="text-[24px] font-bold text-[#191f28] tracking-[-0.03em]">
            {(subView === "apps" ? appAggregates.sumDau : dailyAggregates.avgDau).toLocaleString()}
            <span className="text-[14px] font-normal text-[#4e5968] ml-1">명</span>
          </div>
          <div className="text-xs text-[#8b95a1] font-medium pt-0.5">
            총 신규 가입자:{" "}
            <span className="font-bold text-[#191f28]">
              {(subView === "apps"
                ? appAggregates.totalNewUser
                : dailyAggregates.totalNewUser
              ).toLocaleString()}
              명
            </span>
          </div>
        </div>

        {/* Card 2: 미션 참여수 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#00c980]" />
              총 미션 참여수
            </span>
            <span className="text-[11px] font-medium text-[#00c980] bg-[#e6fbf2] px-2 py-0.5 rounded-md">
              전체 통합
            </span>
          </div>
          <div className="text-[24px] font-bold text-[#191f28] tracking-[-0.03em]">
            {(subView === "apps"
              ? appAggregates.totalMissionCount
              : dailyAggregates.totalMissionCount
            ).toLocaleString()}
            <span className="text-[14px] font-normal text-[#4e5968] ml-1">회</span>
          </div>
          <div className="text-xs text-[#8b95a1] font-medium pt-0.5">
            유저당 평균 참여:{" "}
            <span className="font-bold text-[#191f28]">
              {(subView === "apps"
                ? appAggregates.avgMissionPerDau
                : dailyAggregates.avgMissionPerDau
              ).toFixed(2)}
              회/명
            </span>
          </div>
        </div>

        {/* Card 3: 총 광고 매출 & 콘텐츠 매출 */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-[#a98eff]" />
              총 광고 매출
            </span>
            <span className="text-[11px] font-medium text-[#a98eff] bg-[#f5f2ff] px-2 py-0.5 rounded-md">
              매출 지표
            </span>
          </div>
          <div className="text-[24px] font-bold text-[#191f28] tracking-[-0.03em]">
            {(subView === "apps"
              ? appAggregates.totalAdRev
              : dailyAggregates.totalAdRev
            ).toLocaleString()}
            <span className="text-[14px] font-normal text-[#4e5968] ml-1">원</span>
          </div>
          <div className="text-xs text-[#8b95a1] font-medium pt-0.5">
            콘텐츠 매출:{" "}
            <span className="font-bold text-[#191f28]">
              {(subView === "apps"
                ? appAggregates.totalContentRev
                : dailyAggregates.totalContentRev
              ).toLocaleString()}
              원
            </span>
          </div>
        </div>

        {/* Card 4: 미션 손익 (광고매출 - 알바비) */}
        <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[#8b95a1] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#f04452]" />
              미션 손익 (광고매출 - 알바비)
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                (subView === "apps"
                  ? appAggregates.totalMissionProfit
                  : dailyAggregates.totalMissionProfit) >= 0
                  ? "text-[#f04452] bg-[#fff0f1]"
                  : "text-[#3182f6] bg-[#e8f3ff]"
              }`}
            >
              {(subView === "apps"
                ? appAggregates.totalMissionProfit
                : dailyAggregates.totalMissionProfit) >= 0
                ? "흑자"
                : "적자"}
            </span>
          </div>
          <div
            className={`text-[24px] font-bold tracking-[-0.03em] ${
              (subView === "apps"
                ? appAggregates.totalMissionProfit
                : dailyAggregates.totalMissionProfit) >= 0
                ? "text-[#f04452]"
                : "text-[#3182f6]"
            }`}
          >
            {(subView === "apps"
              ? appAggregates.totalMissionProfit
              : dailyAggregates.totalMissionProfit) >= 0
              ? "+"
              : ""}
            {(subView === "apps"
              ? appAggregates.totalMissionProfit
              : dailyAggregates.totalMissionProfit
            ).toLocaleString()}
            <span className="text-[14px] font-normal text-[#4e5968] ml-1">원</span>
          </div>
          <div className="text-xs text-[#8b95a1] font-medium pt-0.5 flex items-center justify-between">
            <span>
              알바비:{" "}
              {(subView === "apps"
                ? appAggregates.totalAlbaReward
                : dailyAggregates.totalAlbaReward
              ).toLocaleString()}
              P
            </span>
            <span>
              환전:{" "}
              {(subView === "apps"
                ? appAggregates.totalExchangeReward
                : dailyAggregates.totalExchangeReward
              ).toLocaleString()}
              원
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. MAIN TABLE SECTION ── */}
      <div className="bg-white rounded-2xl border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 space-y-4">
        {/* Table Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#f2f4f6]">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#191f28] flex items-center gap-2">
              <span>
                {subView === "apps"
                  ? "최근 일주일 앱별 종합 현황"
                  : "일별 종합 성과 지표"}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#f2f4f6] text-[#4e5968]">
                {subView === "apps" ? `총 ${appRows.length}개 앱` : `총 ${dailyRows.length}일`}
              </span>
            </h2>
            <p className="text-xs text-[#8b95a1]">
              {subView === "apps"
                ? "상단 앱 선택 드롭다운에 등록된 서비스 앱들의 유저, 미션참여수, 매출 및 손익을 한눈에 비교합니다."
                : "유저(DAU, 신규), 미션참여, 매출(콘텐츠, 광고), 리워드 비용 및 손익을 날짜별로 통합 조회합니다."}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {subView === "apps" && (
              <div className="flex items-center gap-1 bg-[#f2f4f6] p-1 rounded-xl">
                <button
                  onClick={() => setAppCategoryFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    appCategoryFilter === "all"
                      ? "bg-white text-[#3182f6] shadow-xs"
                      : "text-[#8b95a1] hover:text-[#191f28]"
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setAppCategoryFilter("general")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    appCategoryFilter === "general"
                      ? "bg-white text-[#3182f6] shadow-xs"
                      : "text-[#8b95a1] hover:text-[#191f28]"
                  }`}
                >
                  일반 앱
                </button>
                <button
                  onClick={() => setAppCategoryFilter("ph")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    appCategoryFilter === "ph"
                      ? "bg-white text-[#3182f6] shadow-xs"
                      : "text-[#8b95a1] hover:text-[#191f28]"
                  }`}
                >
                  포인트홈
                </button>
              </div>
            )}

            {subView === "daily" && (
              <button
                onClick={() => setDailySortOrder(dailySortOrder === "desc" ? "asc" : "desc")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e8eb] text-xs font-semibold text-[#4e5968] hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                title="날짜 정렬 변경"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-[#8b95a1]" />
                <span>{dailySortOrder === "desc" ? "최신순" : "과거순"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-72 gap-2 text-[#8b95a1]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#3182f6]" />
            <span className="text-xs font-semibold">
              종합 성과 데이터를 계산하고 있습니다...
            </span>
          </div>
        ) : subView === "apps" ? (
          /* ── VIEW A: APPS COMPARISON TABLE ── */
          appRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-xs font-semibold text-[#8b95a1] gap-2">
              <span>선택한 기간 내 조회된 앱별 데이터가 없습니다.</span>
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  className="px-3.5 py-1.5 bg-[#3182f6] text-white rounded-xl text-xs font-semibold hover:bg-[#1b64da] transition-colors"
                >
                  실시간 갱신 실행하기
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#e5e8eb] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb] select-none whitespace-nowrap">
                    <th
                      onClick={() => handleAppSort("appName")}
                      className="py-3 px-3.5 sticky left-0 bg-[#f8f9fa] z-10 cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center gap-1">
                        <span>앱</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("dau")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>DAU</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("newUser")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>신규유저</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("missionCompleteCount")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>미션참여수</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("contentRevenue")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>콘텐츠매출</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("adRevenue")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>광고매출</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("albaReward")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>알바비</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("exchangeReward")}
                      className="py-3 px-3.5 text-right cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>리워드</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleAppSort("missionProfit")}
                      className="py-3 px-3.5 text-right bg-[#fff9fa] cursor-pointer hover:text-[#191f28]"
                    >
                      <div className="flex items-center justify-end gap-1 font-bold text-[#f04452]">
                        <span>미션손익</span>
                        <ArrowUpDown className="w-3 h-3 text-[#8b95a1]" />
                      </div>
                    </th>
                    <th className="py-3 px-3.5 text-right">미션참여 대비 매출</th>
                    <th className="py-3 px-3.5 text-right">미션참여 대비 리워드</th>
                    <th className="py-3 px-3.5 text-right">유저당 미션 참여수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                  {/* Summary Row */}
                  <tr className="bg-[#f0f6ff] font-bold text-[#191f28] border-b-2 border-[#d0e4ff] whitespace-nowrap">
                    <td className="py-3 px-3.5 sticky left-0 bg-[#f0f6ff] z-10 text-[#3182f6] font-bold">
                      전체 합계
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#3182f6]">
                      {appAggregates.sumDau.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {appAggregates.totalNewUser.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#00c980]">
                      {appAggregates.totalMissionCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold">
                      {appAggregates.totalContentRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {appAggregates.totalAdRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-[#8b95a1]">
                      {appAggregates.totalAlbaReward.toLocaleString()} P
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold">
                      {appAggregates.totalExchangeReward.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right bg-[#fff0f1]/60 font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          appAggregates.totalMissionProfit >= 0
                            ? "bg-[#fff0f1] text-[#f04452]"
                            : "bg-[#e8f3ff] text-[#3182f6]"
                        }`}
                      >
                        {appAggregates.totalMissionProfit >= 0 ? "+" : ""}
                        {appAggregates.totalMissionProfit.toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                      {appAggregates.avgRevPerMission.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">원/회</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-[#4e5968]">
                      {appAggregates.avgRewardPerMission.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">P/회</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                      {appAggregates.avgMissionPerDau.toFixed(2)}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">회/명</span>
                    </td>
                  </tr>

                  {/* App Rows */}
                  {appRows.map((row) => {
                    const isProfit = row.missionProfit >= 0;
                    return (
                      <tr
                        key={row.app}
                        className="hover:bg-[#f8f9fa] transition-colors whitespace-nowrap"
                      >
                        <td className="py-3 px-3.5 font-bold text-[#191f28] sticky left-0 bg-white hover:bg-[#f8f9fa] z-10 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3182f6]" />
                          <span>{row.appName}</span>
                          <span className="text-[10px] font-normal text-[#8b95a1]">
                            ({row.app})
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {row.dau.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.newUser.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-[#00c980]">
                          {row.missionCompleteCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.contentRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                          {row.adRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#8b95a1]">
                          {row.albaReward.toLocaleString()} P
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.exchangeReward.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold bg-[#fffdfd]">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${
                              isProfit
                                ? "bg-[#fff0f1] text-[#f04452]"
                                : "bg-[#e8f3ff] text-[#3182f6]"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {row.missionProfit.toLocaleString()}원
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {(row.revPerMission ?? 0).toLocaleString()}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">원/회</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {(row.rewardPerMission ?? 0).toLocaleString()}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">P/회</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {(row.missionPerDau ?? 0).toFixed(2)}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">회/명</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── VIEW B: DAILY TABLE ── */
          dailyRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-xs font-semibold text-[#8b95a1] gap-2">
              <span>선택한 기간 내 조회된 일자별 데이터가 없습니다.</span>
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  className="px-3.5 py-1.5 bg-[#3182f6] text-white rounded-xl text-xs font-semibold hover:bg-[#1b64da] transition-colors"
                >
                  실시간 갱신 실행하기
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#e5e8eb] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f8f9fa] font-bold text-[#4e5968] border-b border-[#e5e8eb] select-none whitespace-nowrap">
                    <th className="py-3 px-3.5 sticky left-0 bg-[#f8f9fa] z-10">일자</th>
                    <th className="py-3 px-3.5 text-right">DAU</th>
                    <th className="py-3 px-3.5 text-right">신규유저</th>
                    <th className="py-3 px-3.5 text-right">미션참여수</th>
                    <th className="py-3 px-3.5 text-right">콘텐츠매출</th>
                    <th className="py-3 px-3.5 text-right">광고매출</th>
                    <th className="py-3 px-3.5 text-right">알바비</th>
                    <th className="py-3 px-3.5 text-right">리워드</th>
                    <th className="py-3 px-3.5 text-right bg-[#fff9fa]">미션손익</th>
                    <th className="py-3 px-3.5 text-right">미션참여 대비 매출</th>
                    <th className="py-3 px-3.5 text-right">미션참여 대비 리워드</th>
                    <th className="py-3 px-3.5 text-right">유저당 미션 참여수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f2f4f6] font-medium text-[#4e5968]">
                  <tr className="bg-[#f0f6ff] font-bold text-[#191f28] border-b-2 border-[#d0e4ff] whitespace-nowrap">
                    <td className="py-3 px-3.5 sticky left-0 bg-[#f0f6ff] z-10 text-[#3182f6] font-bold">
                      합계 / 평균
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#3182f6]">
                      {dailyAggregates.avgDau.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">명(평균)</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {dailyAggregates.totalNewUser.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#00c980]">
                      {dailyAggregates.totalMissionCount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold">
                      {dailyAggregates.totalContentRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold">
                      {dailyAggregates.totalAdRev.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-[#8b95a1]">
                      {dailyAggregates.totalAlbaReward.toLocaleString()} P
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold">
                      {dailyAggregates.totalExchangeReward.toLocaleString()}원
                    </td>
                    <td className="py-3 px-3.5 text-right bg-[#fff0f1]/60 font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs ${
                          dailyAggregates.totalMissionProfit >= 0
                            ? "bg-[#fff0f1] text-[#f04452]"
                            : "bg-[#e8f3ff] text-[#3182f6]"
                        }`}
                      >
                        {dailyAggregates.totalMissionProfit >= 0 ? "+" : ""}
                        {dailyAggregates.totalMissionProfit.toLocaleString()}원
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                      {dailyAggregates.avgRevPerMission.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">원/회</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold text-[#4e5968]">
                      {dailyAggregates.avgRewardPerMission.toLocaleString()}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">P/회</span>
                    </td>
                    <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                      {dailyAggregates.avgMissionPerDau.toFixed(2)}
                      <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">회/명</span>
                    </td>
                  </tr>

                  {dailyRows.map((row) => {
                    const isProfit = row.missionProfit >= 0;
                    return (
                      <tr
                        key={row.dt}
                        className="hover:bg-[#f8f9fa] transition-colors whitespace-nowrap"
                      >
                        <td className="py-3 px-3.5 font-semibold text-[#191f28] sticky left-0 bg-white hover:bg-[#f8f9fa] z-10">
                          {row.dt}
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {row.dau.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.newUser.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-[#00c980]">
                          {row.missionCompleteCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.contentRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold text-[#191f28]">
                          {row.adRevenue.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#8b95a1]">
                          {row.albaReward.toLocaleString()} P
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.exchangeReward.toLocaleString()}원
                        </td>
                        <td className="py-3 px-3.5 text-right font-bold bg-[#fffdfd]">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${
                              isProfit
                                ? "bg-[#fff0f1] text-[#f04452]"
                                : "bg-[#e8f3ff] text-[#3182f6]"
                            }`}
                          >
                            {isProfit ? "+" : ""}
                            {row.missionProfit.toLocaleString()}원
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {row.revPerMission.toLocaleString()}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">원/회</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-medium text-[#4e5968]">
                          {row.rewardPerMission.toLocaleString()}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">P/회</span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-semibold text-[#191f28]">
                          {row.missionPerDau.toFixed(2)}
                          <span className="text-[10px] font-normal text-[#8b95a1] ml-0.5">회/명</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Table Footnote Guide */}
        <div className="bg-[#f8f9fa] rounded-xl p-3.5 border border-[#e5e8eb] text-[11.5px] text-[#8b95a1] space-y-1">
          <div className="font-bold text-[#4e5968] flex items-center gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5 text-[#3182f6]" />
            <span>컬럼별 산출 기준 및 공식 안내</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-4 pt-1">
            <li><strong>DAU & 신규유저</strong>: 앱별/일자별 활동 유저 및 신규 가입자 수</li>
            <li><strong>미션참여수</strong>: 미션 전체 통합 기준 총 완료 횟수</li>
            <li><strong>콘텐츠매출 & 광고매출</strong>: 서비스 콘텐츠 매출 및 확정 광고 매출액</li>
            <li><strong>알바비</strong>: 손익 마진율 기준 적립 알바비 (단위: P)</li>
            <li><strong>리워드</strong>: 포인트 환전 지급액 (단위: 원)</li>
            <li><strong>미션손익</strong>: 광고 매출 - 알바비 (원)</li>
            <li><strong>미션참여 대비 매출</strong>: 광고 매출 / 미션참여수 (원/회 단가)</li>
            <li><strong>미션참여 대비 리워드</strong>: 알바비 / 미션참여수 (P/회 단가)</li>
            <li><strong>유저당 미션 참여수</strong>: 미션참여수 / DAU (회/명)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
