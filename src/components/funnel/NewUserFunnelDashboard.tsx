import React, { useState, useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, SlidersHorizontal, Maximize2, Minimize2, ArrowRight } from "lucide-react";
import { 
  FunnelItem, 
  FunnelStepItem, 
  EventCatalogItem, 
  CustomStepConfig, 
  FunnelCategoryTab 
} from "@/types/dashboard";

interface NewUserFunnelDashboardProps {
  funnels: FunnelItem[];
  funnelSteps: FunnelStepItem[];
  eventCatalog: EventCatalogItem[];
  overviewData?: any[];
  loading: boolean;
  selectedApp: string;
  fromDate: string;
  toDate: string;
  funnelCategoryTab: FunnelCategoryTab;
  setFunnelCategoryTab: (tab: FunnelCategoryTab) => void;
}

export const NewUserFunnelDashboard: React.FC<NewUserFunnelDashboardProps> = ({
  funnelSteps,
  eventCatalog,
  overviewData = [],
  selectedApp,
  fromDate,
  toDate,
  funnelCategoryTab,
  setFunnelCategoryTab,
}) => {
  const [subTabMode, setSubTabMode] = useState<"default_funnel" | "top_paths">("default_funnel");
  const [metricMode, setMetricMode] = useState<"users" | "sessions">("users");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("defaultFunnel");
  const [showEditSteps, setShowEditSteps] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);

  const defaultStepsForApp = useMemo(() => {
    const isPh = (selectedApp || "").toLowerCase().includes("ph-");
    if (isPh) {
      return [
        { id: "step-1", label: "today_total_timer_impression" },
        { id: "step-2", label: "reward_attendance_sheet_view" },
        { id: "step-3", label: "reward_attendance_day_any" },
        { id: "step-4", label: "reward_mission_complete_any" },
      ];
    }
    return [
      { id: "step-1", label: "common_bridge_view" },
      { id: "step-2", label: "reward_attendance_sheet_view" },
      { id: "step-3", label: "reward_attendance_day_any" },
      { id: "step-4", label: "reward_mission_complete_any" },
    ];
  }, [selectedApp]);

  const [customSteps, setCustomSteps] = useState<CustomStepConfig[]>(defaultStepsForApp);

  const formatEventLabel = (label: string) => {
    if (label === "today_total_timer_impression") return "타이머 메인 진입 (홈)";
    if (label === "reward_mission_complete_any" || label === "any_mission_complete" || label === "mission_complete_any") return "미션 완료 (전체)";
    if (label === "reward_attendance_day_any" || label === "reward_attendance_day{n}_click") return "출석 클릭 (전체 일차)";
    if (label.startsWith("reward_attendance_day") && label.endsWith("_click")) {
      const dayNum = label.replace("reward_attendance_day", "").replace("_click", "");
      return `출석 ${dayNum}일차 클릭`;
    }
    if (label.startsWith("reward_")) return label.replace("reward_", "");
    if (label.startsWith("common_")) return label.replace("common_", "");
    return label;
  };

  const VIRTUAL_EVENTS = [
    { label: "today_total_timer_impression", displayName: "타이머 메인 진입 (ph- 메인)" },
    { label: "reward_mission_complete_any", displayName: "미션 완료 (전체 통합)" },
    { label: "reward_attendance_day_any", displayName: "출석 클릭 (1~7일차 통합)" },
    { label: "reward_attendance_day1_click", displayName: "출석 1일차 클릭" },
    { label: "reward_attendance_day2_click", displayName: "출석 2일차 클릭" },
    { label: "reward_attendance_day3_click", displayName: "출석 3일차 클릭" },
    { label: "reward_attendance_day4_click", displayName: "출석 4일차 클릭" },
    { label: "reward_attendance_day5_click", displayName: "출석 5일차 클릭" },
    { label: "reward_attendance_day6_click", displayName: "출석 6일차 클릭" },
    { label: "reward_attendance_day7_click", displayName: "출석 7일차 클릭" },
  ];

  React.useEffect(() => {
    try {
      const savedKey = `clickhouse_new_user_funnel_${selectedApp}`;
      const saved = localStorage.getItem(savedKey);
      const isPh = (selectedApp || "").toLowerCase().includes("ph-");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const hasInvalidLabel = parsed.some((s: CustomStepConfig) =>
            s.label === "reward_book_mission_complete_click" ||
            s.label === "reward_drink_mission_complete_click" ||
            s.label === "reward_snack_mission_complete_click" ||
            (isPh && s.label === "common_bridge_view")
          );
          if (hasInvalidLabel) {
            localStorage.removeItem(savedKey);
            setCustomSteps(defaultStepsForApp);
            setSelectedFunnelId("defaultFunnel");
            return;
          }
          setCustomSteps(parsed);
          setSelectedFunnelId("custom");
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to load saved new user funnel steps:", e);
    }
    setCustomSteps(defaultStepsForApp);
    setSelectedFunnelId("defaultFunnel");
  }, [selectedApp, defaultStepsForApp]);

  const saveCustomStepsToStorage = (steps: CustomStepConfig[]) => {
    try {
      const savedKey = `clickhouse_new_user_funnel_${selectedApp}`;
      localStorage.setItem(savedKey, JSON.stringify(steps));
    } catch (e) {
      console.warn("Failed to save new user funnel steps:", e);
    }
  };

  const presetTemplatesMap: Record<string, { name: string; description?: string; steps: CustomStepConfig[] }> = {
    bookMission: {
      name: "책 정리하기",
      description: "책1~8 터치 후 책 미션 완료",
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
      ]
    },
    drinkMission: {
      name: "음료 (미션 영역)",
      description: "미션 음료 클릭 → 광고 → 완료",
      steps: [
        { id: "step-1", label: "reward_mission_click_drink" },
        { id: "step-2", label: "reward_drink_ad_click" },
        { id: "step-3", label: "reward_drink_mission_complete_click" },
      ]
    },
    drinkOtter: {
      name: "음료 (해달 영역)",
      description: "해달 음료 클릭 → 광고 → 완료",
      steps: [
        { id: "step-1", label: "reward_otter_click_drink" },
        { id: "step-2", label: "reward_drink_ad_click" },
        { id: "step-3", label: "reward_drink_mission_complete_click" },
      ]
    },
    snackMission: {
      name: "간식 (미션 영역)",
      description: "미션 간식 클릭 → 광고 → 완료",
      steps: [
        { id: "step-1", label: "reward_mission_click_snack" },
        { id: "step-2", label: "reward_snack_ad_click" },
        { id: "step-3", label: "reward_snack_mission_complete_click" },
      ]
    },
    snackOtter: {
      name: "간식 (해달 영역)",
      description: "해달 간식 클릭 → 광고 → 완료",
      steps: [
        { id: "step-1", label: "reward_otter_click_snack" },
        { id: "step-2", label: "reward_snack_ad_click" },
        { id: "step-3", label: "reward_snack_mission_complete_click" },
      ]
    },
    exchange: {
      name: "알바비 교환",
      description: "교환 클릭 → 포인트 클릭 → 확인 → 결과",
      steps: [
        { id: "step-1", label: "reward_exchange_click" },
        { id: "step-2", label: "reward_exchange_money_click" },
        { id: "step-3", label: "reward_exchange_confirm_click" },
        { id: "step-4", label: "reward_exchange_result_click" },
      ]
    },
    exchangeResult: {
      name: "교환 완료",
      description: "교환 클릭 → 포인트 클릭 → 확인 → 결과",
      steps: [
        { id: "step-1", label: "reward_exchange_click" },
        { id: "step-2", label: "reward_exchange_money_click" },
        { id: "step-3", label: "reward_exchange_confirm_click" },
        { id: "step-4", label: "reward_exchange_result_click" },
      ]
    },
    rotation: {
      name: "로테이션 1회 완료",
      description: "도서 1~6 → 간식 → 음료 → 에피소드 → 게임 → 운세 → 스크롤 → 웹툰",
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
      ]
    },
    rotationNoRC: {
      name: "로테이션 (RC 제외)",
      description: "도서 1~6 → 간식 → 음료 → 에피소드 → 스크롤 → 웹툰",
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
        { id: "step-10", label: "reward_otter_scroll_dialogue_view" },
        { id: "step-11", label: "reward_otter_webtoon_dialogue_view" },
      ]
    },
    tip: {
      name: "팁 받기",
      description: "팁 아이콘 → 광고 → 확인",
      steps: [
        { id: "step-1", label: "reward_tip_icon_click" },
        { id: "step-2", label: "reward_tip_ad_click" },
        { id: "step-3", label: "reward_tip_confirm_click" },
      ]
    }
  };

  const catalogMap = useMemo(() => {
    const map = new Map<string, number>();
    (eventCatalog || []).forEach((item) => { map.set(item.label, Number(item.totalEventCount) || 0); });
    return map;
  }, [eventCatalog]);

  const [dynamicCustomFunnelSteps, setDynamicCustomFunnelSteps] = useState<FunnelStepItem[]>([]);

  React.useEffect(() => {
    if (customSteps.length < 2) { setDynamicCustomFunnelSteps([]); return; }
    const stepLabels = customSteps.map((s) => s.label).filter(Boolean);
    if (stepLabels.length < 2) return;
    let isMounted = true;
    const fetchCustomFunnel = async () => {
      try {
        const stepsQuery = stepLabels.join(",");
        const res = await fetch(
          `/api/clickhouse?type=custom_funnel&app=${selectedApp}&from=${fromDate}&to=${toDate}&steps=${encodeURIComponent(stepsQuery)}&newUserOnly=1&_t=${Date.now()}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setDynamicCustomFunnelSteps(json.data);
        }
      } catch (e) {
        console.warn("Failed to fetch dynamic custom funnel steps for new users:", e);
      }
    };
    fetchCustomFunnel();
    return () => { isMounted = false; };
  }, [customSteps, selectedApp, fromDate, toDate]);

  const totalAppNewUsers = useMemo(() => {
    if (!overviewData || !Array.isArray(overviewData)) return 0;
    return overviewData.reduce((acc, cur) => acc + (Number(cur.newUserCount) || 0), 0);
  }, [overviewData]);

  const computedJourney = useMemo(() => {
    if (customSteps.length === 0) return [];
    let initialCount = 0;
    let prevCount = 0;
    return customSteps.map((stepConfig, index) => {
      const stepNum = index + 1;
      const dbMatch = dynamicCustomFunnelSteps.find((s) => Number(s.step) === stepNum);
      let userVal = 0, sessionVal = 0;
      if (dbMatch) {
        userVal = Number(dbMatch.reachedUserCount) || 0;
        sessionVal = Number(dbMatch.reachedSessionCount) || 0;
      }
      const rawVal = metricMode === "users" ? userVal : sessionVal;
      let currentVal = rawVal;
      if (index === 0) { initialCount = rawVal > 0 ? rawVal : 1; currentVal = rawVal; prevCount = currentVal; }
      else { currentVal = Math.min(prevCount, rawVal); }
      const overallRate = initialCount > 0 ? (currentVal / initialCount) * 100 : 0;
      const stepRate = prevCount > 0 ? (currentVal / prevCount) * 100 : 0;
      const dropOffCount = Math.max(0, prevCount - currentVal);
      const dropOffRate = prevCount > 0 ? (dropOffCount / prevCount) * 100 : 0;
      prevCount = currentVal;
      return { id: stepConfig.id, label: stepConfig.label, stepNumber: index + 1, count: currentVal,
        overallRate: Math.min(100, Math.max(0, overallRate)), stepRate: Math.min(100, Math.max(0, stepRate)),
        dropOffCount, dropOffRate: Math.min(100, Math.max(0, dropOffRate)) };
    });
  }, [customSteps, dynamicCustomFunnelSteps, metricMode]);

  const summaryKpi = useMemo(() => {
    if (computedJourney.length === 0) return { startVal: 0, endVal: 0, totalConversionRate: 0, totalDropRate: 0, entryRate: 0 };
    const startVal = computedJourney[0]?.count || 0;
    const endVal = computedJourney[computedJourney.length - 1]?.count || 0;
    const totalConversionRate = startVal > 0 ? (endVal / startVal) * 100 : 0;
    const entryRate = totalAppNewUsers > 0 ? Math.min(100, (startVal / totalAppNewUsers) * 100) : 0;
    return { startVal, endVal, totalConversionRate: Math.min(100, totalConversionRate), totalDropRate: Math.min(100, Math.max(0, 100 - totalConversionRate)), entryRate };
  }, [computedJourney, totalAppNewUsers]);

  const loadPresetTemplate = (templateKey: string) => {
    setSelectedFunnelId(templateKey);
    if (presetTemplatesMap[templateKey]) setCustomSteps(presetTemplatesMap[templateKey].steps);
  };
  const handleUpdateStepLabel = (id: string, newLabel: string) => { const updated = customSteps.map((s) => (s.id === id ? { ...s, label: newLabel } : s)); setCustomSteps(updated); setSelectedFunnelId("custom"); saveCustomStepsToStorage(updated); };
  const handleAddStep = () => { const newId = `step-${Date.now()}`; const defaultLabel = eventCatalog[0]?.label || "common_bridge_view"; const updated = [...customSteps, { id: newId, label: defaultLabel }]; setCustomSteps(updated); setSelectedFunnelId("custom"); saveCustomStepsToStorage(updated); };
  const handleRemoveStep = (id: string) => { if (customSteps.length <= 2) return; const updated = customSteps.filter((s) => s.id !== id); setCustomSteps(updated); setSelectedFunnelId("custom"); saveCustomStepsToStorage(updated); };
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === customSteps.length - 1)) return;
    const updated = [...customSteps]; const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index]; updated[index] = updated[targetIndex]; updated[targetIndex] = temp;
    setCustomSteps(updated); setSelectedFunnelId("custom"); saveCustomStepsToStorage(updated);
  };

  const TOSS_BLUE = "#3182F6";
  const maxBarWidth = computedJourney.length > 0 ? computedJourney[0]?.count || 1 : 1;

  // Auto-detect if compact mode should be enabled based on step count
  const useCompactMode = isCompactView || customSteps.length >= 7;

  return (
    <div className="bg-white rounded-3xl border border-[#E5E8EB] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      
      {/* ── UNIFIED CONTROL TOOLBAR ── */}
      <div className="px-6 py-5 border-b border-[#F2F4F6] flex flex-wrap items-center justify-between gap-4 bg-[#FAFBFD]">
        
        {/* Left: Integrated Segmented Tabs + Path Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-[#EAEFF7] rounded-xl">
            <button
              onClick={() => {
                setSubTabMode("default_funnel");
                setSelectedFunnelId("defaultFunnel");
                setCustomSteps([
                  { id: "step-1", label: "common_bridge_view" },
                  { id: "step-2", label: "reward_attendance_sheet_view" },
                  { id: "step-3", label: "reward_attendance_day_any" },
                  { id: "step-4", label: "reward_mission_complete_any" },
                ]);
              }}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                subTabMode === "default_funnel" ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-[#6B7684] hover:text-[#191F28]"
              }`}
            >
              온보딩 퍼널
            </button>
            <button
              onClick={() => {
                setSubTabMode("top_paths");
                setSelectedFunnelId("bookMission");
                setCustomSteps(presetTemplatesMap["bookMission"].steps);
              }}
              className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                subTabMode === "top_paths" ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-[#6B7684] hover:text-[#191F28]"
              }`}
            >
              주요 경로
            </button>
          </div>

          {/* Preset dropdown selector */}
          <div className="relative">
            <select
              value={selectedFunnelId}
              onChange={(e) => {
                const key = e.target.value;
                setSelectedFunnelId(key);
                setDynamicCustomFunnelSteps([]);
                if (presetTemplatesMap[key]) {
                  setCustomSteps(presetTemplatesMap[key].steps);
                } else if (key === "defaultFunnel") {
                  setCustomSteps(defaultStepsForApp);
                }
              }}
              className="bg-white border border-[#D1D6DB] text-[13px] font-semibold text-[#191F28] rounded-xl px-3.5 py-1.5 pr-8 focus:ring-2 focus:ring-[#3182F6] focus:outline-none appearance-none cursor-pointer"
            >
              <option value="defaultFunnel">기본 온보딩 퍼널 (4단계)</option>
              {Object.entries(presetTemplatesMap).map(([key, template]) => (
                <option key={key} value={key}>
                  {template.name} ({template.steps.length}단계)
                </option>
              ))}
              {selectedFunnelId === "custom" && <option value="custom">커스텀 편집 경로</option>}
            </select>
            <ChevronDown className="w-4 h-4 text-[#8B95A1] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Right: View Mode Toggle + Metric Toggle + Step Edit Toggle */}
        <div className="flex items-center gap-2">
          {/* View Density Toggle Button */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
              useCompactMode
                ? "bg-[#F2F4F6] border-[#D1D6DB] text-[#191F28]"
                : "bg-white border-[#E5E8EB] text-[#6B7684] hover:bg-[#F2F4F6]"
            }`}
            title={useCompactMode ? "넓게 보기로 전환" : "한눈에 보기로 전환"}
          >
            {useCompactMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{useCompactMode ? "한눈에 보기 적용 됨" : "한눈에 보기"}</span>
          </button>

          {subTabMode === "top_paths" && (
            <button
              onClick={() => setShowEditSteps(!showEditSteps)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showEditSteps
                  ? "bg-[#E8F3FF] border-[#3182F6] text-[#3182F6]"
                  : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>단계 편집</span>
            </button>
          )}

          <div className="flex items-center gap-1 p-1 bg-[#EAEFF7] rounded-xl">
            <button
              onClick={() => setMetricMode("users")}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                metricMode === "users" ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-[#6B7684]"
              }`}
            >
              유저 기준 (UU)
            </button>
            <button
              onClick={() => setMetricMode("sessions")}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${
                metricMode === "sessions" ? "bg-white text-[#191F28] shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-[#6B7684]"
              }`}
            >
              세션 기준
            </button>
          </div>
        </div>

      </div>

      {/* ── STEP EDIT PANEL (Collapsible) ── */}
      {subTabMode === "top_paths" && showEditSteps && (
        <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#F2F4F6] space-y-3">
          <p className="text-[12px] font-semibold text-[#4E5968]">이벤트 단계 커스텀</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customSteps.map((step, idx) => (
              <div key={step.id} className="bg-white border border-[#E5E8EB] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-[#3182F6]">{idx + 1}단계</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleMoveStep(idx, "up")} disabled={idx === 0} className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleMoveStep(idx, "down")} disabled={idx === customSteps.length - 1} className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleRemoveStep(step.id)} disabled={customSteps.length <= 2} className="p-1 text-[#B0B8C1] hover:text-[#E8344E] disabled:opacity-20 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <select value={step.label} onChange={(e) => handleUpdateStepLabel(step.id, e.target.value)}
                  className="w-full text-[12px] bg-white border border-[#E5E8EB] rounded-lg px-2.5 py-1.5 text-[#333D4B] focus:ring-1 focus:ring-[#3182F6] focus:outline-none">
                  <optgroup label="통합 이벤트">
                    {VIRTUAL_EVENTS.map((ve) => (<option key={ve.label} value={ve.label}>{ve.displayName}</option>))}
                  </optgroup>
                  <optgroup label="전체 이벤트">
                    {(eventCatalog || []).map((item) => (<option key={item.label} value={item.label}>{item.label} ({Number(item.totalEventCount).toLocaleString()})</option>))}
                  </optgroup>
                </select>
              </div>
            ))}
          </div>
          <button onClick={handleAddStep}
            className="py-1.5 px-4 border border-dashed border-[#D1D6DB] text-[#4E5968] text-[12px] font-medium rounded-xl flex items-center gap-1.5 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> 단계 추가
          </button>
        </div>
      )}

      {/* ── UNIFIED SUMMARY METRICS BANNER ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#F2F4F6] border-b border-[#F2F4F6]">
        <div className="p-5 space-y-1">
          <p className="text-[12px] text-[#8B95A1] font-medium">전체 신규 유저</p>
          <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{totalAppNewUsers.toLocaleString()}</p>
          <p className="text-[11px] text-[#B0B8C1]">기간 총 신규 가입</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-[12px] text-[#8B95A1] font-medium">퍼널 진입 수 (1단계)</p>
          <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{summaryKpi.startVal.toLocaleString()}</p>
          <p className="text-[11px] text-[#B0B8C1]">{metricMode === "users" ? "명 (신규)" : "세션 (신규)"}</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-[12px] text-[#8B95A1] font-medium">신규 진입률</p>
          <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{summaryKpi.entryRate.toFixed(1)}%</p>
          <p className="text-[11px] text-[#B0B8C1]">신규 유저 중 1단계 진입</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-[12px] text-[#8B95A1] font-medium">퍼널 완료 수</p>
          <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{summaryKpi.endVal.toLocaleString()}</p>
          <p className="text-[11px] text-[#B0B8C1]">{metricMode === "users" ? "명 완료" : "세션 완료"}</p>
        </div>
        <div className="p-5 space-y-1">
          <p className="text-[12px] text-[#8B95A1] font-medium">최종 전환율</p>
          <p className="text-[24px] font-bold tracking-tight leading-none" style={{ color: TOSS_BLUE }}>{summaryKpi.totalConversionRate.toFixed(1)}%</p>
          <p className="text-[11px] text-[#B0B8C1]">1단계 → {customSteps.length}단계 완료</p>
        </div>
      </div>

      {/* ── FUNNEL BARS SECTION (Side-by-Side Stepped Funnel Columns - Zero Vertical Scroll) ── */}
      <div className="p-5 md:p-6">
        <div className="bg-[#FAFBFD] border border-[#E5E8EB] rounded-2xl p-5 space-y-4 shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-3">
            <div>
              <h3 className="text-xs font-bold text-[#191F28] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#3182F6]" />
                <span>신규 유저 퍼널 가로 한눈에 차트</span>
              </h3>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">
                세로 스크롤 없이 모든 퍼널 단계를 좌-우 가로 스텝 막대로 한눈에 비교합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-[#3182F6] bg-[#E8F3FF] px-2.5 py-1 rounded-lg">
              신규 전환율: {summaryKpi.totalConversionRate.toFixed(1)}%
            </span>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="flex items-end gap-2.5 min-w-max pt-6 pb-2 px-2">
              {computedJourney.map((step, index) => {
                const barRatio = maxBarWidth > 0 ? (step.count / maxBarWidth) * 100 : 0;
                const hasDrop = index < computedJourney.length - 1 && step.dropOffCount > 0;

                return (
                  <React.Fragment key={step.id}>
                    <div className="w-28 sm:w-32 flex flex-col items-center gap-2 shrink-0">
                      <div className="text-center space-y-0.5">
                        <span className="font-extrabold text-[#3182F6] text-xs bg-[#E8F3FF] px-2 py-0.5 rounded-md inline-block">
                          {index === 0 ? "100.0%" : `${step.overallRate.toFixed(1)}%`}
                        </span>
                        <p className="font-bold text-[#191F28] text-xs tabular-nums mt-1">
                          {step.count.toLocaleString()} {metricMode === "users" ? "명" : "회"}
                        </p>
                      </div>

                      <div className="w-full bg-[#EBF0F5] h-44 rounded-2xl relative overflow-hidden flex items-end p-1">
                        <div
                          className="w-full rounded-xl bg-gradient-to-t from-[#1D6CE5] to-[#3182F6] transition-all duration-300 relative flex items-start justify-center pt-2"
                          style={{ height: `${Math.max(6, barRatio)}%` }}
                        >
                          <span className="text-[10px] font-extrabold text-white drop-shadow-xs">
                            Step {step.stepNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-center w-full">
                        <p className="text-xs font-bold text-[#191F28] truncate px-1" title={formatEventLabel(step.label)}>
                          {formatEventLabel(step.label)}
                        </p>
                      </div>
                    </div>

                    {index < computedJourney.length - 1 && (
                      <div className="flex flex-col items-center justify-center self-center py-6 text-center shrink-0">
                        <ArrowRight className="w-4 h-4 text-[#B0B8C1] mb-1" />
                        {hasDrop ? (
                          <div className="bg-[#FFF2F2] border border-[#FFE0E0] px-1.5 py-0.5 rounded-md text-[10px] font-bold text-[#E8344E] tabular-nums whitespace-nowrap">
                            -{step.dropOffCount.toLocaleString()}
                            <div className="text-[9px] font-medium">-{step.dropOffRate.toFixed(1)}%</div>
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
      </div>

      {/* ── DETAIL TABLE SECTION ── */}
      <div className="px-6 md:px-8 pb-6 pt-4 border-t border-[#F2F4F6]">
        <p className="text-[13px] font-semibold text-[#333D4B] mb-3">상세 수치</p>
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 bg-white shadow-2xs z-10">
              <tr className="border-b border-[#F2F4F6] text-[#8B95A1]">
                <th className="pb-2.5 pr-4 font-medium">단계</th>
                <th className="pb-2.5 pr-4 font-medium">이벤트</th>
                <th className="pb-2.5 pr-4 text-right font-medium">도달 수</th>
                <th className="pb-2.5 pr-4 text-right font-medium">이전 대비</th>
                <th className="pb-2.5 pr-4 text-right font-medium">전체 대비</th>
                <th className="pb-2.5 text-right font-medium">이탈</th>
              </tr>
            </thead>
            <tbody>
              {computedJourney.map((row) => (
                <tr key={row.id} className="border-b border-[#F9FAFB] last:border-0 hover:bg-[#F9FAFB]">
                  <td className="py-2.5 pr-4 text-[#8B95A1] font-medium">{row.stepNumber}</td>
                  <td className="py-2.5 pr-4 text-[#333D4B] font-medium">{formatEventLabel(row.label)}</td>
                  <td className="py-2.5 pr-4 text-right text-[#191F28] font-semibold tabular-nums">
                    {row.count.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums font-medium" style={{ color: TOSS_BLUE }}>
                    {row.stepRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[#4E5968] tabular-nums font-medium">
                    {row.overallRate.toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right tabular-nums font-medium" style={{ color: row.dropOffCount > 0 ? "#E8344E" : "#B0B8C1" }}>
                    {row.dropOffCount > 0 ? `−${row.dropOffCount.toLocaleString()}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
