"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Award,
  BarChart2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Eye,
  Table as TableIcon,
  LayoutGrid,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
} from "chart.js";
import {
  FunnelItem,
  FunnelStepItem,
  EventCatalogItem,
  CustomStepConfig,
  JourneyNodeData,
  FunnelCategoryTab,
} from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FunnelDashboardProps {
  funnels: FunnelItem[];
  funnelSteps: FunnelStepItem[];
  eventCatalog: EventCatalogItem[];
  loading: boolean;
  selectedApp: string;
  fromDate: string;
  toDate: string;
  funnelCategoryTab?: FunnelCategoryTab;
  setFunnelCategoryTab?: (tab: FunnelCategoryTab) => void;
}

const presetTemplatesMap: Record<string, { name: string; steps: CustomStepConfig[] }> = {
  bookMission: {
    name: "책 정리하기",
    steps: [
      { id: "step-1", label: "reward_otter_click_book_1" },
      { id: "step-2", label: "reward_otter_click_book_2" },
      { id: "step-3", label: "reward_otter_click_book_3" },
      { id: "step-4", label: "reward_otter_click_book_4" },
      { id: "step-5", label: "reward_otter_click_book_5" },
      { id: "step-6", label: "reward_otter_click_book_6" },
      { id: "step-7", label: "reward_otter_click_book_7" },
      { id: "step-8", label: "reward_otter_click_book_8" },
      { id: "step-9", label: "reward_book_mission_complete_click" },
    ],
  },
  drinkMission: {
    name: "음료 (미션 영역)",
    steps: [
      { id: "step-1", label: "reward_mission_click_drink" },
      { id: "step-2", label: "reward_drink_ad_click" },
      { id: "step-3", label: "reward_drink_mission_complete_click" },
    ],
  },
  drinkOtter: {
    name: "음료 (해달 영역)",
    steps: [
      { id: "step-1", label: "reward_otter_click_drink" },
      { id: "step-2", label: "reward_drink_ad_click" },
      { id: "step-3", label: "reward_drink_mission_complete_click" },
    ],
  },
  snackMission: {
    name: "간식 (미션 영역)",
    steps: [
      { id: "step-1", label: "reward_mission_click_snack" },
      { id: "step-2", label: "reward_snack_ad_click" },
      { id: "step-3", label: "reward_snack_mission_complete_click" },
    ],
  },
  snackOtter: {
    name: "간식 (해달 영역)",
    steps: [
      { id: "step-1", label: "reward_otter_click_snack" },
      { id: "step-2", label: "reward_snack_ad_click" },
      { id: "step-3", label: "reward_snack_mission_complete_click" },
    ],
  },
  exchange: {
    name: "알바비 교환",
    steps: [
      { id: "step-1", label: "reward_exchange_click" },
      { id: "step-2", label: "reward_exchange_money_click" },
      { id: "step-3", label: "reward_exchange_confirm_click" },
      { id: "step-4", label: "reward_exchange_result_click" },
    ],
  },
  tip: {
    name: "팁 받기",
    steps: [
      { id: "step-1", label: "reward_tip_icon_click" },
      { id: "step-2", label: "reward_tip_ad_click" },
      { id: "step-3", label: "reward_tip_confirm_click" },
    ],
  },
  rotation: {
    name: "로테이션 1회 완료",
    steps: [
      { id: "step-1", label: "reward_otter_book_dialogue1_view" },
      { id: "step-2", label: "reward_otter_book_dialogue2_view" },
      { id: "step-3", label: "reward_otter_book_dialogue3_view" },
      { id: "step-4", label: "reward_otter_book_dialogue4_view" },
      { id: "step-5", label: "reward_otter_book_dialogue5_view" },
      { id: "step-6", label: "reward_otter_book_dialogue6_view" },
      { id: "step-7", label: "reward_otter_snack_dialogue_view" },
      { id: "step-8", label: "reward_otter_drink_dialogue_view" },
      { id: "step-9", label: "reward_otter_episode_dialogue_view" },
      { id: "step-10", label: "reward_otter_specgame_dialogue_view" },
      { id: "step-11", label: "reward_otter_fortune_dialogue_view" },
      { id: "step-12", label: "reward_otter_scroll_dialogue_view" },
      { id: "step-13", label: "reward_otter_webtoon_dialogue_view" },
    ],
  },
};

export const FunnelDashboard: React.FC<FunnelDashboardProps> = ({
  funnels,
  funnelSteps,
  eventCatalog,
  loading,
  selectedApp,
  fromDate,
  toDate,
  funnelCategoryTab = "detail",
  setFunnelCategoryTab,
}) => {
  // Sub-Tab Navigation ("step_conversion" | "daily_trend" | "cohort_compare" | "all_benchmark")
  const [funnelSubTab, setFunnelSubTab] = useState<"step_conversion" | "daily_trend" | "cohort_compare" | "all_benchmark">("step_conversion");

  // Eye-Comfort Viewing Mode ("visual_chart" | "soft_cards" | "clean_table")
  const [viewMode, setViewMode] = useState<"visual_chart" | "soft_cards" | "clean_table">("visual_chart");

  const [metricMode, setMetricMode] = useState<"users" | "sessions">("users");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("bookMission");
  const [stepSearches, setStepSearches] = useState<Record<string, string>>({});
  const [showEditSteps, setShowEditSteps] = useState<boolean>(false);
  const [isFetchingFunnel, setIsFetchingFunnel] = useState<boolean>(false);

  // Active Funnel Step Definitions
  const [customSteps, setCustomSteps] = useState<CustomStepConfig[]>(presetTemplatesMap.bookMission.steps);

  const loadPresetTemplate = (presetKey: string) => {
    setSelectedFunnelId(presetKey);
    setDynamicCustomFunnelSteps([]);
    setNewUserFunnelSteps([]);
    setDailyFunnelTrendRaw([]);
    setIsFetchingFunnel(true);

    if (presetTemplatesMap[presetKey]) {
      setCustomSteps([...presetTemplatesMap[presetKey].steps]);
    } else if (presetKey === "custom") {
      try {
        const savedKey = `clickhouse_custom_funnel_${selectedApp}`;
        const saved = localStorage.getItem(savedKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= 2) {
            setCustomSteps([...parsed]);
            return;
          }
        }
      } catch (e) {
        console.warn("Failed to load saved custom steps:", e);
      }
      setCustomSteps([...presetTemplatesMap.bookMission.steps]);
    }
  };

  const handleAddStep = () => {
    setSelectedFunnelId("custom");
    const nextId = `step-${customSteps.length + 1}-${Date.now()}`;
    const defaultLabel = eventCatalog[customSteps.length % Math.max(1, eventCatalog.length)]?.label || "";
    const updated = [...customSteps, { id: nextId, label: defaultLabel }];
    setCustomSteps(updated);
    try {
      localStorage.setItem(`clickhouse_custom_funnel_${selectedApp}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save custom steps:", e);
    }
  };

  const handleRemoveStep = (id: string) => {
    if (customSteps.length <= 2) return;
    setSelectedFunnelId("custom");
    const updated = customSteps.filter((s) => s.id !== id);
    setCustomSteps(updated);
    try {
      localStorage.setItem(`clickhouse_custom_funnel_${selectedApp}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save custom steps:", e);
    }
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === customSteps.length - 1) return;
    setSelectedFunnelId("custom");
    const newSteps = [...customSteps];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setCustomSteps(newSteps);
    try {
      localStorage.setItem(`clickhouse_custom_funnel_${selectedApp}`, JSON.stringify(newSteps));
    } catch (e) {
      console.warn("Failed to save custom steps:", e);
    }
  };

  const handleStepLabelChange = (id: string, newLabel: string) => {
    setSelectedFunnelId("custom");
    const updated = customSteps.map((s) => (s.id === id ? { ...s, label: newLabel } : s));
    setCustomSteps(updated);
    try {
      localStorage.setItem(`clickhouse_custom_funnel_${selectedApp}`, JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to save custom steps:", e);
    }
  };

  // 1. Fetch Custom Funnel Data from ClickHouse
  const [dynamicCustomFunnelSteps, setDynamicCustomFunnelSteps] = useState<FunnelStepItem[]>([]);
  useEffect(() => {
    if (customSteps.length < 2) {
      setDynamicCustomFunnelSteps([]);
      setIsFetchingFunnel(false);
      return;
    }
    const stepLabels = customSteps.map((s) => s.label).filter(Boolean);
    if (stepLabels.length < 2) return;

    let isMounted = true;
    setIsFetchingFunnel(true);

    const fetchCustomFunnel = async () => {
      try {
        const res = await fetch(
          `/api/clickhouse?type=custom_funnel&app=${selectedApp}&from=${fromDate}&to=${toDate}&steps=${encodeURIComponent(
            stepLabels.join(",")
          )}&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setDynamicCustomFunnelSteps(json.data);
        }
      } catch (e) {
        console.warn("Failed to fetch custom funnel:", e);
      } finally {
        if (isMounted) setIsFetchingFunnel(false);
      }
    };
    fetchCustomFunnel();
    return () => {
      isMounted = false;
    };
  }, [customSteps, selectedApp, fromDate, toDate]);

  // 2. Fetch New User Cohort Funnel Data
  const [newUserFunnelSteps, setNewUserFunnelSteps] = useState<FunnelStepItem[]>([]);
  useEffect(() => {
    if (customSteps.length < 2) {
      setNewUserFunnelSteps([]);
      return;
    }
    const stepLabels = customSteps.map((s) => s.label).filter(Boolean);
    if (stepLabels.length < 2) return;

    let isMounted = true;
    const fetchNewUserFunnel = async () => {
      try {
        const res = await fetch(
          `/api/clickhouse?type=custom_funnel&app=${selectedApp}&from=${fromDate}&to=${toDate}&newUserOnly=1&steps=${encodeURIComponent(
            stepLabels.join(",")
          )}&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setNewUserFunnelSteps(json.data);
        }
      } catch (e) {
        console.warn("Failed to fetch new user funnel:", e);
      }
    };
    fetchNewUserFunnel();
    return () => {
      isMounted = false;
    };
  }, [customSteps, selectedApp, fromDate, toDate]);

  // 3. Fetch Daily Funnel Trend Data
  const [dailyFunnelTrendRaw, setDailyFunnelTrendRaw] = useState<Array<{ dt: string; step: number; reachedSessionCount: number; reachedUserCount: number }>>([]);
  useEffect(() => {
    if (customSteps.length < 2) {
      setDailyFunnelTrendRaw([]);
      return;
    }
    const stepLabels = customSteps.map((s) => s.label).filter(Boolean);
    if (stepLabels.length < 2) return;

    let isMounted = true;
    const fetchDailyTrend = async () => {
      try {
        const res = await fetch(
          `/api/clickhouse?type=funnel_daily_trend&app=${selectedApp}&from=${fromDate}&to=${toDate}&steps=${encodeURIComponent(
            stepLabels.join(",")
          )}&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setDailyFunnelTrendRaw(json.data);
        }
      } catch (e) {
        console.warn("Failed to fetch daily funnel trend:", e);
      }
    };
    fetchDailyTrend();
    return () => {
      isMounted = false;
    };
  }, [customSteps, selectedApp, fromDate, toDate]);

  const formatNum = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return "0";
    const num = typeof val === "number" ? val : Number(val);
    return isNaN(num) ? "0" : num.toLocaleString();
  };

  const formatPct = (val: number | string | undefined | null) => {
    if (val === undefined || val === null) return "0.0%";
    const num = typeof val === "number" ? val : Number(val);
    return isNaN(num) ? "0.0%" : `${num.toFixed(1)}%`;
  };

  // Process Main Journey Nodes for Current Active Funnel
  const journeyNodes: JourneyNodeData[] = useMemo(() => {
    if (customSteps.length === 0) return [];
    let step1Count = 0;
    let prevCount = 0;
    const nodes: JourneyNodeData[] = [];
    let prevUserVal = 0;
    let prevSessionVal = 0;

    customSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const dbMatch = dynamicCustomFunnelSteps.find((s) => Number(s.step) === stepNum);
      let userCount = 0,
        sessionCount = 0;

      if (dbMatch) {
        userCount = Number(dbMatch.reachedUserCount) || 0;
        sessionCount = Number(dbMatch.reachedSessionCount) || 0;
      } else {
        userCount = 0;
        sessionCount = 0;
      }

      let finalUserCount = userCount,
        finalSessionCount = sessionCount,
        dropUserCount = 0,
        dropSessionCount = 0;

      if (idx === 0) {
        prevUserVal = finalUserCount;
        prevSessionVal = finalSessionCount;
      } else {
        finalUserCount = Math.min(prevUserVal, finalUserCount);
        finalSessionCount = Math.min(prevSessionVal, finalSessionCount);
        dropUserCount = Math.max(0, prevUserVal - finalUserCount);
        dropSessionCount = Math.max(0, prevSessionVal - finalSessionCount);
        prevUserVal = finalUserCount;
        prevSessionVal = finalSessionCount;
      }

      const curCount = metricMode === "users" ? finalUserCount : finalSessionCount;
      if (idx === 0) {
        step1Count = curCount;
        prevCount = curCount;
      }

      let conversionRate = 100,
        cumConversionRate = 100,
        dropRate = 0;
      if (idx === 0) {
        dropUserCount = 0;
        dropSessionCount = 0;
      } else {
        cumConversionRate = step1Count > 0 ? Math.min(100, Math.max(0, (curCount / step1Count) * 100)) : 0;
        conversionRate = prevCount > 0 ? Math.min(100, Math.max(0, (curCount / prevCount) * 100)) : 0;
        dropRate = Math.max(0, 100 - cumConversionRate);
      }

      prevCount = curCount;
      nodes.push({
        stepIndex: idx + 1,
        stepId: step.id,
        label: step.label || `Step ${idx + 1}`,
        eventName: step.label || `step_${idx + 1}`,
        userCount: finalUserCount,
        sessionCount: finalSessionCount,
        conversionRate,
        cumConversionRate,
        dropRate,
        dropUserCount,
        dropSessionCount,
      });
    });
    return nodes;
  }, [customSteps, dynamicCustomFunnelSteps, metricMode]);

  // Overall Summary Metrics
  const overallSummary = useMemo(() => {
    if (journeyNodes.length < 2) return null;
    const firstNode = journeyNodes[0];
    const lastNode = journeyNodes[journeyNodes.length - 1];
    const startVal = metricMode === "users" ? firstNode.userCount : firstNode.sessionCount;
    const endVal = metricMode === "users" ? lastNode.userCount : lastNode.sessionCount;
    const overallConversion = startVal > 0 ? (endVal / startVal) * 100 : 0;

    let maxDropNodeLabel = "";
    let maxDropRate = 0;
    for (let i = 1; i < journeyNodes.length; i++) {
      const dropPct = 100 - journeyNodes[i].conversionRate;
      if (dropPct > maxDropRate) {
        maxDropRate = dropPct;
        maxDropNodeLabel = `${journeyNodes[i - 1].label} → ${journeyNodes[i].label}`;
      }
    }

    return {
      firstLabel: firstNode.label,
      lastLabel: lastNode.label,
      startVal,
      endVal,
      overallConversion: Math.min(100, Math.max(0, overallConversion)),
      totalDrop: Math.max(0, startVal - endVal),
      stepCount: journeyNodes.length,
      bottleneck: maxDropNodeLabel || "없음",
      bottleneckRate: maxDropRate.toFixed(1),
    };
  }, [journeyNodes, metricMode]);

  const maxBarValue = useMemo(() => {
    if (journeyNodes.length === 0) return 1;
    return metricMode === "users" ? journeyNodes[0].userCount : journeyNodes[0].sessionCount;
  }, [journeyNodes, metricMode]);

  // Process Daily Funnel Conversion Trend Data
  const dailyTrendData = useMemo(() => {
    if (!dailyFunnelTrendRaw || dailyFunnelTrendRaw.length === 0 || customSteps.length < 2) {
      return { dates: [], conversionRates: [], entryCounts: [], completionCounts: [], dailyRows: [] };
    }

    const maxStep = customSteps.length;
    const dateMap: Record<string, { step1Count: number; finalStepCount: number }> = {};

    dailyFunnelTrendRaw.forEach((row) => {
      const dt = row.dt ? String(row.dt).slice(0, 10) : "";
      if (!dt) return;
      if (!dateMap[dt]) dateMap[dt] = { step1Count: 0, finalStepCount: 0 };

      const stepNum = Number(row.step);
      const cnt = metricMode === "users" ? Number(row.reachedUserCount) || 0 : Number(row.reachedSessionCount) || 0;

      if (stepNum === 1) dateMap[dt].step1Count = cnt;
      if (stepNum === maxStep) dateMap[dt].finalStepCount = cnt;
    });

    const dates = Object.keys(dateMap).sort();
    const conversionRates: number[] = [];
    const entryCounts: number[] = [];
    const completionCounts: number[] = [];
    const dailyRows: Array<{ dt: string; entry: number; completion: number; rate: number }> = [];

    dates.forEach((dt) => {
      const item = dateMap[dt];
      const entry = item.step1Count;
      const completion = item.finalStepCount;
      const rate = entry > 0 ? Math.min(100, Math.round((completion / entry) * 1000) / 10) : 0;

      entryCounts.push(entry);
      completionCounts.push(completion);
      conversionRates.push(rate);
      dailyRows.push({ dt, entry, completion, rate });
    });

    return {
      dates,
      shortDates: dates.map((d) => d.slice(5).replace("-", "/")),
      conversionRates,
      entryCounts,
      completionCounts,
      dailyRows,
    };
  }, [dailyFunnelTrendRaw, customSteps, metricMode]);

  // Daily Trend Chart Data
  const dailyTrendChartData: ChartData<"line"> = useMemo(() => {
    return {
      labels: dailyTrendData.shortDates || [],
      datasets: [
        {
          label: "최종 전환율 (%)",
          data: dailyTrendData.conversionRates || [],
          borderColor: "#3182F6",
          backgroundColor: "rgba(49, 130, 246, 0.05)",
          fill: true,
          tension: 0.2,
          borderWidth: 2,
          pointBackgroundColor: "#FFFFFF",
          pointBorderColor: "#3182F6",
          pointBorderWidth: 2,
          pointRadius: 3,
        },
      ],
    };
  }, [dailyTrendData]);

  // Cohort Comparison Data
  const cohortComparisonData = useMemo(() => {
    if (customSteps.length < 2) return null;

    const newNodes: JourneyNodeData[] = [];
    let prevNewUser = 0;

    customSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const dbMatch = newUserFunnelSteps.find((s) => Number(s.step) === stepNum);
      let userCount = dbMatch ? Number(dbMatch.reachedUserCount) || 0 : 0;

      if (idx === 0) prevNewUser = userCount;
      else {
        userCount = Math.min(prevNewUser, userCount);
        prevNewUser = userCount;
      }

      const step1Count = newNodes[0]?.userCount || userCount || 1;
      const cumRate = step1Count > 0 ? Math.min(100, (userCount / step1Count) * 100) : 0;

      newNodes.push({
        stepIndex: stepNum,
        stepId: step.id,
        label: step.label,
        eventName: step.label,
        userCount,
        sessionCount: userCount,
        conversionRate: cumRate,
        cumConversionRate: cumRate,
        dropRate: 100 - cumRate,
        dropUserCount: 0,
        dropSessionCount: 0,
      });
    });

    const newStart = newNodes[0]?.userCount || 0;
    const newEnd = newNodes[newNodes.length - 1]?.userCount || 0;
    const newConversion = newStart > 0 ? Math.min(100, (newEnd / newStart) * 100) : 0;

    const returningNodes = journeyNodes.map((allNode, idx) => {
      const newNodeVal = newNodes[idx]?.userCount || 0;
      const retCount = Math.max(0, allNode.userCount - newNodeVal);
      return { ...allNode, userCount: retCount };
    });

    const retStart = returningNodes[0]?.userCount || 0;
    const retEnd = returningNodes[returningNodes.length - 1]?.userCount || 0;
    const retConversion = retStart > 0 ? Math.min(100, (retEnd / retStart) * 100) : 0;

    const conversionGap = retConversion - newConversion;

    return {
      newStart,
      newEnd,
      newConversion,
      newNodes,
      retStart,
      retEnd,
      retConversion,
      returningNodes,
      conversionGap,
    };
  }, [customSteps, newUserFunnelSteps, journeyNodes]);

  // All Preset Funnels Benchmark Summary Table
  const presetBenchmarkRows = useMemo(() => {
    return Object.entries(presetTemplatesMap).map(([key, template]) => {
      const tSteps = template.steps;
      const firstEv = eventCatalog.find((e) => e.label === tSteps[0]?.label);
      const lastEv = eventCatalog.find((e) => e.label === tSteps[tSteps.length - 1]?.label);

      let startUsers = Number(firstEv?.totalEventCount) || 0;
      let endUsers = Number(lastEv?.totalEventCount) || 0;
      if (startUsers < endUsers) endUsers = startUsers;
      const conversionRate = startUsers > 0 ? Math.min(100, (endUsers / startUsers) * 100) : 0;

      return {
        key,
        name: template.name,
        stepCount: tSteps.length,
        startUsers,
        endUsers,
        conversionRate,
      };
    });
  }, [eventCatalog]);

  return (
    <div className="bg-white rounded-3xl border border-[#E5E8EB] overflow-hidden shadow-xs space-y-0">
      {/* ── CLEAN HEADER & SUB-TABS BAR ── */}
      <div className="p-6 border-b border-[#F2F4F6] bg-[#FAFBFD] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#191F28] tracking-tight flex items-center gap-2">
              <BarChart2 className="w-4.5 h-4.5 text-[#3182F6]" />
              <span>퍼널 분석</span>
            </h2>
            <p className="text-xs text-[#8B95A1] mt-0.5">
              사용자 이벤트 경로의 단계별 전환율 및 이탈 지점을 분석합니다.
            </p>
          </div>

          {/* SUB-TAB NAVIGATION */}
          <div className="flex bg-[#E5E8EB]/60 p-1 rounded-xl gap-1 text-xs shrink-0">
            <button
              onClick={() => setFunnelSubTab("step_conversion")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                funnelSubTab === "step_conversion"
                  ? "bg-white text-[#3182F6] shadow-xs"
                  : "text-[#4E5968] hover:text-[#191F28]"
              }`}
            >
              단계별 전환 현황
            </button>
            <button
              onClick={() => setFunnelSubTab("daily_trend")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                funnelSubTab === "daily_trend"
                  ? "bg-white text-[#3182F6] shadow-xs"
                  : "text-[#4E5968] hover:text-[#191F28]"
              }`}
            >
              일별 추이
            </button>
            <button
              onClick={() => setFunnelSubTab("cohort_compare")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                funnelSubTab === "cohort_compare"
                  ? "bg-white text-[#3182F6] shadow-xs"
                  : "text-[#4E5968] hover:text-[#191F28]"
              }`}
            >
              신규 / 기존 코호트
            </button>
            <button
              onClick={() => setFunnelSubTab("all_benchmark")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                funnelSubTab === "all_benchmark"
                  ? "bg-white text-[#3182F6] shadow-xs"
                  : "text-[#4E5968] hover:text-[#191F28]"
              }`}
            >
              전체 퍼널 비교
            </button>
          </div>
        </div>

        {/* CONTROL TOOLBAR: DROPDOWN SELECT & METRIC TOGGLE */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E5E8EB]/50">
          {/* Top-Level Funnel Select Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#191F28]">퍼널 템플릿:</span>
            <div className="relative">
              <select
                value={selectedFunnelId}
                onChange={(e) => loadPresetTemplate(e.target.value)}
                className="bg-white border border-[#D1D6DB] text-xs font-bold text-[#191F28] rounded-xl px-3.5 py-1.5 pr-8 focus:ring-2 focus:ring-[#3182F6] focus:outline-none appearance-none cursor-pointer shadow-2xs"
              >
                {Object.entries(presetTemplatesMap).map(([key, template]) => (
                  <option key={key} value={key}>
                    {template.name} ({template.steps.length}단계)
                  </option>
                ))}
                <option value="custom">커스텀 직접 편집 경로 ({customSteps.length}단계)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#8B95A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* EYE-COMFORT VIEWING MODE TOGGLE */}
            <div className="flex items-center bg-[#F2F4F6] p-0.5 rounded-lg text-xs gap-0.5">
              <button
                onClick={() => setViewMode("visual_chart")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "visual_chart"
                    ? "bg-white text-[#3182F6] font-bold shadow-2xs"
                    : "text-[#6B7684] hover:text-[#191F28]"
                }`}
                title="가로 한눈에 보기 퍼널 차트 (스크롤 제로)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>가로 한눈에 차트</span>
              </button>
              <button
                onClick={() => setViewMode("soft_cards")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "soft_cards"
                    ? "bg-white text-[#191F28] font-bold shadow-2xs"
                    : "text-[#6B7684] hover:text-[#191F28]"
                }`}
                title="소프트 카드 뷰"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>컴팩트 카드</span>
              </button>
              <button
                onClick={() => setViewMode("clean_table")}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === "clean_table"
                    ? "bg-white text-[#191F28] font-bold shadow-2xs"
                    : "text-[#6B7684] hover:text-[#191F28]"
                }`}
                title="눈피로 제로 무음 표 뷰"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>간결한 표</span>
              </button>
            </div>

            <button
              onClick={() => setShowEditSteps(!showEditSteps)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                showEditSteps
                  ? "bg-[#E8F3FF] border-[#3182F6] text-[#3182F6]"
                  : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>단계 편집 ({customSteps.length})</span>
            </button>

            <div className="flex bg-[#F2F4F6] p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setMetricMode("users")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === "users"
                    ? "bg-white text-[#191F28] font-bold shadow-xs"
                    : "text-[#6B7684] hover:text-[#191F28]"
                }`}
              >
                유저 (UU)
              </button>
              <button
                onClick={() => setMetricMode("sessions")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === "sessions"
                    ? "bg-white text-[#191F28] font-bold shadow-xs"
                    : "text-[#6B7684] hover:text-[#191F28]"
                }`}
              >
                세션
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP EDIT PANEL ── */}
      {showEditSteps && (
        <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#F2F4F6] space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-[#191F28]">퍼널 단계 설정</p>
            <span className="text-[11px] text-[#8B95A1]">이벤트를 변경하거나 단계를 추가/삭제할 수 있습니다.</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {customSteps.map((step, idx) => {
              const searchTerm = (stepSearches[step.id] || "").toLowerCase();
              const filteredCatalog = eventCatalog.filter(
                (ev) => !searchTerm || ev.label.toLowerCase().includes(searchTerm) || ev.event.toLowerCase().includes(searchTerm)
              );
              return (
                <div key={step.id} className="bg-white border border-[#E5E8EB] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#3182F6]">{idx + 1}단계</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveStep(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStep(idx, "down")}
                        disabled={idx === customSteps.length - 1}
                        className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveStep(step.id)}
                        disabled={customSteps.length <= 2}
                        className="p-1 text-[#B0B8C1] hover:text-[#E8344E] disabled:opacity-20 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#B0B8C1] absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="이벤트 검색..."
                      value={stepSearches[step.id] || ""}
                      onChange={(e) => setStepSearches({ ...stepSearches, [step.id]: e.target.value })}
                      className="w-full bg-white border border-[#E5E8EB] text-xs pl-7 pr-2 py-1 rounded-lg focus:ring-1 focus:ring-[#3182F6] focus:outline-none text-[#191F28]"
                    />
                  </div>
                  <select
                    value={step.label}
                    onChange={(e) => handleStepLabelChange(step.id, e.target.value)}
                    className="w-full bg-white border border-[#E5E8EB] text-xs text-[#191F28] rounded-lg px-2 py-1 focus:ring-1 focus:ring-[#3182F6] focus:outline-none"
                  >
                    {filteredCatalog.length === 0 ? (
                      <option value="">검색 결과 없음</option>
                    ) : (
                      filteredCatalog.map((ev) => (
                        <option key={`left_${step.id}_${ev.label}`} value={ev.label}>
                          [{ev.event}] {ev.label}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleAddStep}
            className="py-1.5 px-3 border border-dashed border-[#3182F6] text-[#3182F6] text-xs font-semibold rounded-lg flex items-center gap-1 hover:bg-[#E8F3FF] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 단계 추가
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: 단계별 전환 현황 (STEP CONVERSION) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {funnelSubTab === "step_conversion" && (
        <div className="p-6 space-y-6">
          {/* SUMMARY CARDS */}
          {overallSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F2F4F6] border border-[#F2F4F6] rounded-2xl bg-[#FAFBFD]">
              <div className="p-4 space-y-1">
                <p className="text-xs text-[#8B95A1] font-medium">진입 수 (1단계)</p>
                <p className="text-xl font-bold text-[#191F28] tracking-tight">{formatNum(overallSummary.startVal)} {metricMode === "users" ? "명" : "회"}</p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-[#8B95A1] font-medium">완료 수 ({overallSummary.stepCount}단계)</p>
                <p className="text-xl font-bold text-[#3182F6] tracking-tight">{formatNum(overallSummary.endVal)} {metricMode === "users" ? "명" : "회"}</p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-[#8B95A1] font-medium">전체 전환율</p>
                <p className="text-xl font-bold text-[#3182F6] tracking-tight">{formatPct(overallSummary.overallConversion)}</p>
              </div>
              <div className="p-4 space-y-1">
                <p className="text-xs text-[#8B95A1] font-medium">주요 이탈 구간</p>
                <p className="text-xs font-bold text-[#E8344E] truncate">{overallSummary.bottleneck}</p>
                <p className="text-[11px] text-[#8B95A1]">이탈률: {overallSummary.bottleneckRate}%</p>
              </div>
            </div>
          )}

          {/* LOADING STATE OR STEP FLOW LIST VIEW */}
          {isFetchingFunnel ? (
            <div className="py-16 text-center space-y-3 bg-[#FAFBFD] rounded-2xl border border-[#F2F4F6]">
              <Loader2 className="w-6 h-6 text-[#3182F6] animate-spin mx-auto" />
              <p className="text-xs font-bold text-[#191F28]">선택한 퍼널({presetTemplatesMap[selectedFunnelId]?.name || selectedFunnelId}) 데이터를 ClickHouse에서 조회하는 중입니다...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ── MODE A: SIDE-BY-SIDE HORIZONTAL STEPPED FUNNEL COLUMNS (Amplitude Style - ZERO VERTICAL SCROLL) ── */}
              {viewMode === "visual_chart" && (
                <div className="bg-[#FAFBFD] border border-[#E5E8EB] rounded-2xl p-5 space-y-4 shadow-2xs overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-[#191F28] flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-[#3182F6]" />
                        <span>가로 한눈에 보기 퍼널 차트</span>
                      </h3>
                      <p className="text-[11px] text-[#8B95A1] mt-0.5">
                        세로 스크롤 필요 없이 모든 단계를 좌-우 가로 차트로 한눈에 파악합니다.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#3182F6] bg-[#E8F3FF] px-2.5 py-1 rounded-lg">
                      전체 전환율: {overallSummary ? formatPct(overallSummary.overallConversion) : "0%"}
                    </span>
                  </div>

                  {/* HORIZONTAL STEPPED COLUMNS CONTAINER */}
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-end gap-2.5 min-w-max pt-6 pb-2 px-2">
                      {journeyNodes.map((node, index) => {
                        const curVal = metricMode === "users" ? node.userCount : node.sessionCount;
                        const barRatio = maxBarValue > 0 ? (curVal / maxBarValue) * 100 : 0;
                        const dropVal = metricMode === "users" ? node.dropUserCount : node.dropSessionCount;
                        const hasDrop = index < journeyNodes.length - 1 && dropVal > 0;

                        return (
                          <React.Fragment key={`col_${node.stepId}`}>
                            {/* SINGLE STEP COLUMN */}
                            <div className="w-28 sm:w-32 flex flex-col items-center gap-2 shrink-0">
                              {/* TOP METRICS (% & USER COUNT) */}
                              <div className="text-center space-y-0.5">
                                <span className="font-extrabold text-[#3182F6] text-xs bg-[#E8F3FF] px-2 py-0.5 rounded-md inline-block">
                                  {index === 0 ? "100.0%" : formatPct(node.cumConversionRate)}
                                </span>
                                <p className="font-bold text-[#191F28] text-xs tabular-nums mt-1">
                                  {formatNum(curVal)} {metricMode === "users" ? "명" : "회"}
                                </p>
                              </div>

                              {/* VERTICAL BAR */}
                              <div className="w-full bg-[#EBF0F5] h-44 rounded-2xl relative overflow-hidden flex items-end p-1">
                                <div
                                  className="w-full rounded-xl bg-gradient-to-t from-[#1D6CE5] to-[#3182F6] transition-all duration-300 relative flex items-start justify-center pt-2"
                                  style={{ height: `${Math.max(6, barRatio)}%` }}
                                >
                                  <span className="text-[10px] font-extrabold text-white drop-shadow-xs">
                                    Step {node.stepIndex}
                                  </span>
                                </div>
                              </div>

                              {/* BOTTOM EVENT LABEL */}
                              <div className="text-center w-full">
                                <p className="text-xs font-bold text-[#191F28] truncate px-1" title={node.label}>
                                  {node.label}
                                </p>
                              </div>
                            </div>

                            {/* INTER-STEP DROPOFF CONNECTOR */}
                            {index < journeyNodes.length - 1 && (
                              <div className="flex flex-col items-center justify-center self-center py-6 text-center shrink-0">
                                <ArrowRight className="w-4 h-4 text-[#B0B8C1] mb-1" />
                                {hasDrop ? (
                                  <div className="bg-[#FFF2F2] border border-[#FFE0E0] px-1.5 py-0.5 rounded-md text-[10px] font-bold text-[#E8344E] tabular-nums whitespace-nowrap">
                                    -{formatNum(dropVal)}
                                    <div className="text-[9px] font-medium">-{(100 - node.conversionRate).toFixed(1)}%</div>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#B0B8C1]">0</span>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── MODE B: SOFT CARDS VIEW ── */}
              {viewMode === "soft_cards" && (
                <div className="space-y-2">
                  {journeyNodes.map((node, index) => {
                    const curVal = metricMode === "users" ? node.userCount : node.sessionCount;
                    const barRatio = maxBarValue > 0 ? (curVal / maxBarValue) * 100 : 0;
                    const dropVal = metricMode === "users" ? node.dropUserCount : node.dropSessionCount;
                    const hasDrop = index < journeyNodes.length - 1 && dropVal > 0;

                    return (
                      <div
                        key={node.stepId}
                        className="bg-white border border-[#E5E8EB] rounded-xl px-4 py-2.5 space-y-2 shadow-2xs hover:border-[#3182F6]/50 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded-md bg-[#E8F3FF] text-[#3182F6] font-extrabold text-xs shrink-0">
                              Step {node.stepIndex}
                            </span>
                            <span className="font-bold text-[#191F28] text-xs sm:text-sm truncate">
                              {node.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 tabular-nums">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[#191F28] text-xs sm:text-sm">
                                {formatNum(curVal)} {metricMode === "users" ? "명" : "회"}
                              </span>
                              <span className="font-extrabold text-xs text-[#3182F6] bg-[#E8F3FF] px-2 py-0.5 rounded-md">
                                {index === 0 ? "100.0%" : formatPct(node.cumConversionRate)}
                              </span>
                            </div>

                            {hasDrop ? (
                              <div className="flex items-center gap-1 bg-[#FFF2F2] border border-[#FFE0E0] px-2 py-0.5 rounded-md text-[#E8344E] font-bold text-xs">
                                <span>-{formatNum(dropVal)} 명</span>
                                <span className="text-[11px]">(-{(100 - node.conversionRate).toFixed(1)}%)</span>
                              </div>
                            ) : index === journeyNodes.length - 1 ? (
                              <span className="font-bold text-xs text-[#00C980] bg-[#E6F9F2] px-2 py-0.5 rounded-md">
                                최종 완료
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="w-full bg-[#F2F4F6] h-5 rounded-lg overflow-hidden relative flex items-center">
                          <div
                            className="h-full rounded-lg bg-gradient-to-r from-[#3182F6] to-[#1D6CE5] transition-all duration-300 relative flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(2, barRatio)}%` }}
                          >
                            {barRatio > 12 && (
                              <span className="text-[11px] font-extrabold text-white drop-shadow-xs">
                                {barRatio.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          {barRatio <= 12 && (
                            <span className="text-[11px] font-bold text-[#8B95A1] pl-2">
                              {barRatio.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── MODE C: CLEAN MINIMAL TABLE VIEW (Zero Eye Strain) ── */}
              {viewMode === "clean_table" && (
                <div className="border border-[#E5E8EB] rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFBFD] font-bold text-[#4E5968] border-b border-[#E5E8EB]">
                        <th className="py-3 px-4">단계</th>
                        <th className="py-3 px-4">이벤트 라벨</th>
                        <th className="py-3 px-4 text-right">도달 수</th>
                        <th className="py-3 px-4 text-right">누적 전환율</th>
                        <th className="py-3 px-4 text-right">구간 전환율</th>
                        <th className="py-3 px-4 text-right">구간 이탈 수</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F4F6] text-[#333D4B]">
                      {journeyNodes.map((node) => {
                        const val = metricMode === "users" ? node.userCount : node.sessionCount;
                        const dropVal = metricMode === "users" ? node.dropUserCount : node.dropSessionCount;

                        return (
                          <tr key={`ct_${node.stepId}`} className="hover:bg-[#FAFBFD]">
                            <td className="py-3 px-4 font-extrabold text-[#3182F6]">Step {node.stepIndex}</td>
                            <td className="py-3 px-4 font-bold text-[#191F28]">{node.label}</td>
                            <td className="py-3 px-4 text-right font-bold text-[#191F28] tabular-nums">{formatNum(val)} {metricMode === "users" ? "명" : "회"}</td>
                            <td className="py-3 px-4 text-right font-extrabold text-[#3182F6] tabular-nums">{node.stepIndex === 1 ? "100.0%" : formatPct(node.cumConversionRate)}</td>
                            <td className="py-3 px-4 text-right font-semibold text-[#4E5968] tabular-nums">{node.stepIndex === 1 ? "100.0%" : formatPct(node.conversionRate)}</td>
                            <td className="py-3 px-4 text-right font-bold text-[#E8344E] tabular-nums">{dropVal > 0 ? `-${formatNum(dropVal)} 명` : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DETAILED DATA TABLE */}
          {viewMode !== "clean_table" && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-[#191F28]">상세 수치</h4>
              <div className="overflow-x-auto border border-[#E5E8EB] rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFD] font-medium text-[#8B95A1] border-b border-[#E5E8EB]">
                      <th className="py-3 px-4">단계</th>
                      <th className="py-3 px-4">이벤트명</th>
                      <th className="py-3 px-4 text-right">도달 수</th>
                      <th className="py-3 px-4 text-right">1단계 대비 (누적)</th>
                      <th className="py-3 px-4 text-right">이전 단계 대비 (구간)</th>
                      <th className="py-3 px-4 text-right">이탈 유저 수</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F6] text-[#333D4B]">
                    {journeyNodes.map((node) => {
                      const val = metricMode === "users" ? node.userCount : node.sessionCount;
                      const dropVal = metricMode === "users" ? node.dropUserCount : node.dropSessionCount;

                      return (
                        <tr key={`tbl_${node.stepId}`} className="hover:bg-[#FAFBFD]">
                          <td className="py-3 px-4 font-bold text-[#3182F6]">Step {node.stepIndex}</td>
                          <td className="py-3 px-4 font-medium">{node.label}</td>
                          <td className="py-3 px-4 text-right font-bold text-[#191F28] tabular-nums">{formatNum(val)}</td>
                          <td className="py-3 px-4 text-right font-bold text-[#3182F6] tabular-nums">{node.stepIndex === 1 ? "100.0%" : formatPct(node.cumConversionRate)}</td>
                          <td className="py-3 px-4 text-right font-medium text-[#4E5968] tabular-nums">{node.stepIndex === 1 ? "100.0%" : formatPct(node.conversionRate)}</td>
                          <td className="py-3 px-4 text-right font-bold text-[#E8344E] tabular-nums">{dropVal > 0 ? `-${formatNum(dropVal)}` : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: 일별 추이 (DAILY TREND) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {funnelSubTab === "daily_trend" && (
        <div className="p-6 space-y-6">
          <div className="bg-[#FAFBFD] p-5 rounded-2xl border border-[#E5E8EB] space-y-3">
            <div className="flex items-center justify-between border-b border-[#F2F4F6] pb-3">
              <h3 className="text-xs font-bold text-[#191F28]">일별 퍼널 최종 전환율 (%) 추이</h3>
              <span className="text-[11px] text-[#8B95A1]">1단계 $\rightarrow$ 최종단계</span>
            </div>

            <div className="h-64 pt-2">
              {dailyTrendChartData.labels && dailyTrendChartData.labels.length > 0 ? (
                <Line
                  data={dailyTrendChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx: any) => ` 전환율: ${Number(ctx.raw).toFixed(1)}%`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#8B95A1" } },
                      y: {
                        min: 0,
                        max: 100,
                        grid: { color: "#F2F4F6" },
                        ticks: { color: "#8B95A1", callback: (v: any) => `${v}%` },
                      },
                    },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-[#8B95A1]">
                  일별 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#191F28]">일별 상세 수치</h4>
            <div className="overflow-x-auto border border-[#E5E8EB] rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFBFD] font-medium text-[#8B95A1] border-b border-[#E5E8EB]">
                    <th className="py-3 px-4">날짜 (dt)</th>
                    <th className="py-3 px-4 text-right">진입 유저</th>
                    <th className="py-3 px-4 text-right">완료 유저</th>
                    <th className="py-3 px-4 text-right">전환율 (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F6] text-[#333D4B]">
                  {dailyTrendData.dailyRows.length > 0 ? (
                    dailyTrendData.dailyRows.map((row) => (
                      <tr key={row.dt} className="hover:bg-[#FAFBFD]">
                        <td className="py-3 px-4 font-medium">{row.dt}</td>
                        <td className="py-3 px-4 text-right font-medium">{row.entry.toLocaleString()} 명</td>
                        <td className="py-3 px-4 text-right font-bold text-[#3182F6]">{row.completion.toLocaleString()} 명</td>
                        <td className="py-3 px-4 text-right font-bold text-[#3182F6]">{row.rate}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#8B95A1]">
                        일별 데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: 신규 / 기존 코호트 (COHORT COMPARISON) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {funnelSubTab === "cohort_compare" && (
        <div className="p-6 space-y-6">
          {cohortComparisonData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAFBFD] rounded-2xl border border-[#E5E8EB] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-2">
                    <span className="font-bold text-xs text-[#3182F6]">신규 가입 유저</span>
                    <span className="text-xs font-bold text-[#3182F6]">{cohortComparisonData.newConversion.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[#8B95A1]">진입</p>
                      <p className="font-bold text-[#191F28]">{cohortComparisonData.newStart.toLocaleString()} 명</p>
                    </div>
                    <div>
                      <p className="text-[#8B95A1]">완료</p>
                      <p className="font-bold text-[#3182F6]">{cohortComparisonData.newEnd.toLocaleString()} 명</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FAFBFD] rounded-2xl border border-[#E5E8EB] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-2">
                    <span className="font-bold text-xs text-[#191F28]">기존 재방문 유저</span>
                    <span className="text-xs font-bold text-[#191F28]">{cohortComparisonData.retConversion.toFixed(1)}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[#8B95A1]">진입</p>
                      <p className="font-bold text-[#191F28]">{cohortComparisonData.retStart.toLocaleString()} 명</p>
                    </div>
                    <div>
                      <p className="text-[#8B95A1]">완료</p>
                      <p className="font-bold text-[#191F28]">{cohortComparisonData.retEnd.toLocaleString()} 명</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#E5E8EB] rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAFBFD] font-medium text-[#8B95A1] border-b border-[#E5E8EB]">
                      <th className="py-3 px-4">단계</th>
                      <th className="py-3 px-4">이벤트명</th>
                      <th className="py-3 px-4 text-right">신규 도달</th>
                      <th className="py-3 px-4 text-right">신규 전환율</th>
                      <th className="py-3 px-4 text-right">기존 도달</th>
                      <th className="py-3 px-4 text-right">기존 전환율</th>
                      <th className="py-3 px-4 text-right">격차 (%p)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F6] text-[#333D4B]">
                    {journeyNodes.map((node, idx) => {
                      const newCnt = cohortComparisonData.newNodes[idx]?.userCount || 0;
                      const newRate = cohortComparisonData.newNodes[idx]?.cumConversionRate || 0;
                      const retCnt = cohortComparisonData.returningNodes[idx]?.userCount || 0;
                      const retRate = cohortComparisonData.returningNodes[idx]?.cumConversionRate || 0;
                      const gap = retRate - newRate;

                      return (
                        <tr key={`cohort_${node.stepId}`} className="hover:bg-[#FAFBFD]">
                          <td className="py-3 px-4 font-bold text-[#3182F6]">Step {node.stepIndex}</td>
                          <td className="py-3 px-4 font-medium">{node.label}</td>
                          <td className="py-3 px-4 text-right font-medium">{newCnt.toLocaleString()} 명</td>
                          <td className="py-3 px-4 text-right font-bold text-[#3182F6]">{newRate.toFixed(1)}%</td>
                          <td className="py-3 px-4 text-right font-medium">{retCnt.toLocaleString()} 명</td>
                          <td className="py-3 px-4 text-right font-bold text-[#191F28]">{retRate.toFixed(1)}%</td>
                          <td className="py-3 px-4 text-right font-bold">
                            {gap >= 0 ? `+${gap.toFixed(1)}` : gap.toFixed(1)}%p
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: 전체 퍼널 비교 (ALL BENCHMARK) ── */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {funnelSubTab === "all_benchmark" && (
        <div className="p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#191F28]">주요 퍼널별 전환 성과 비교</h3>
          <div className="overflow-x-auto border border-[#E5E8EB] rounded-2xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBFD] font-medium text-[#8B95A1] border-b border-[#E5E8EB]">
                  <th className="py-3 px-4">퍼널명</th>
                  <th className="py-3 px-4 text-center">단계 수</th>
                  <th className="py-3 px-4 text-right">진입 유저</th>
                  <th className="py-3 px-4 text-right">완료 유저</th>
                  <th className="py-3 px-4 text-right">전환율 (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F6] text-[#333D4B]">
                {presetBenchmarkRows
                  .sort((a, b) => b.conversionRate - a.conversionRate)
                  .map((row) => (
                    <tr key={row.key} className="hover:bg-[#FAFBFD]">
                      <td className="py-3 px-4 font-bold text-[#191F28]">{row.name}</td>
                      <td className="py-3 px-4 text-center text-[#8B95A1]">{row.stepCount}단계</td>
                      <td className="py-3 px-4 text-right font-medium">{row.startUsers.toLocaleString()} 명</td>
                      <td className="py-3 px-4 text-right font-bold text-[#3182F6]">{row.endUsers.toLocaleString()} 명</td>
                      <td className="py-3 px-4 text-right font-bold text-[#3182F6]">{row.conversionRate.toFixed(1)}%</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
