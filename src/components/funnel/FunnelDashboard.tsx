import React, { useState, useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Search, ChevronDown, SlidersHorizontal, Maximize2, Minimize2 } from "lucide-react";
import {
  FunnelItem, FunnelStepItem, EventCatalogItem, CustomStepConfig, JourneyNodeData, FunnelCategoryTab
} from "@/types/dashboard";

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

export const FunnelDashboard: React.FC<FunnelDashboardProps> = ({
  funnels, funnelSteps, eventCatalog, loading, selectedApp, fromDate, toDate,
  funnelCategoryTab = "detail", setFunnelCategoryTab,
}) => {
  const [metricMode, setMetricMode] = useState<"users" | "sessions">("users");
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>("bookMission");
  const [stepSearches, setStepSearches] = useState<Record<string, string>>({});
  const [showEditSteps, setShowEditSteps] = useState<boolean>(false);
  const [isCompactView, setIsCompactView] = useState<boolean>(false);

  const [customSteps, setCustomSteps] = useState<CustomStepConfig[]>([
    { id: "step-1", label: "reward_otter_book_dialogue1_view" },
    { id: "step-2", label: "reward_otter_click_book_1" },
    { id: "step-3", label: "reward_otter_book_dialogue6_view" },
    { id: "step-4", label: "reward_book_mission_complete_click" },
  ]);

  React.useEffect(() => {
    try {
      const savedKey = `clickhouse_custom_funnel_${selectedApp}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) { setCustomSteps(parsed); setSelectedFunnelId("custom"); }
      }
    } catch (e) { console.warn("Failed to load saved funnel steps:", e); }
  }, [selectedApp]);

  const saveCustomStepsToStorage = (steps: CustomStepConfig[]) => {
    try { localStorage.setItem(`clickhouse_custom_funnel_${selectedApp}`, JSON.stringify(steps)); }
    catch (e) { console.warn("Failed to save funnel steps:", e); }
  };

  const presetTemplatesMap: Record<string, { name: string; steps: CustomStepConfig[] }> = {
    bookMission: { name: "책 정리하기", steps: [
      { id: "step-1", label: "reward_otter_click_book_1" }, { id: "step-2", label: "reward_otter_click_book_2" },
      { id: "step-3", label: "reward_otter_click_book_3" }, { id: "step-4", label: "reward_otter_click_book_4" },
      { id: "step-5", label: "reward_otter_click_book_5" }, { id: "step-6", label: "reward_otter_click_book_6" },
      { id: "step-7", label: "reward_otter_click_book_7" }, { id: "step-8", label: "reward_otter_click_book_8" },
      { id: "step-9", label: "reward_book_mission_complete_click" },
    ]},
    drinkMission: { name: "음료 (미션 영역)", steps: [
      { id: "step-1", label: "reward_mission_click_drink" }, { id: "step-2", label: "reward_drink_ad_click" },
      { id: "step-3", label: "reward_drink_mission_complete_click" },
    ]},
    drinkOtter: { name: "음료 (해달 영역)", steps: [
      { id: "step-1", label: "reward_otter_click_drink" }, { id: "step-2", label: "reward_drink_ad_click" },
      { id: "step-3", label: "reward_drink_mission_complete_click" },
    ]},
    snackMission: { name: "간식 (미션 영역)", steps: [
      { id: "step-1", label: "reward_mission_click_snack" }, { id: "step-2", label: "reward_snack_ad_click" },
      { id: "step-3", label: "reward_snack_mission_complete_click" },
    ]},
    snackOtter: { name: "간식 (해달 영역)", steps: [
      { id: "step-1", label: "reward_otter_click_snack" }, { id: "step-2", label: "reward_snack_ad_click" },
      { id: "step-3", label: "reward_snack_mission_complete_click" },
    ]},
    exchange: { name: "알바비 교환", steps: [
      { id: "step-1", label: "reward_exchange_click" }, { id: "step-2", label: "reward_exchange_money_click" },
      { id: "step-3", label: "reward_exchange_confirm_click" }, { id: "step-4", label: "reward_exchange_result_click" },
    ]},
    exchangeResult: { name: "교환 완료", steps: [
      { id: "step-1", label: "reward_exchange_click" }, { id: "step-2", label: "reward_exchange_money_click" },
      { id: "step-3", label: "reward_exchange_confirm_click" }, { id: "step-4", label: "reward_exchange_result_click" },
    ]},
    rotation: { name: "로테이션 1회 완료", steps: [
      { id: "step-1", label: "reward_otter_book_dialogue1_view" }, { id: "step-2", label: "reward_otter_book_dialogue2_view" },
      { id: "step-3", label: "reward_otter_book_dialogue3_view" }, { id: "step-4", label: "reward_otter_book_dialogue4_view" },
      { id: "step-5", label: "reward_otter_book_dialogue5_view" }, { id: "step-6", label: "reward_otter_book_dialogue6_view" },
      { id: "step-7", label: "reward_otter_snack_dialogue_view" }, { id: "step-8", label: "reward_otter_drink_dialogue_view" },
      { id: "step-9", label: "reward_otter_episode_dialogue_view" }, { id: "step-10", label: "reward_otter_specgame_dialogue_view" },
      { id: "step-11", label: "reward_otter_fortune_dialogue_view" }, { id: "step-12", label: "reward_otter_scroll_dialogue_view" },
      { id: "step-13", label: "reward_otter_webtoon_dialogue_view" },
    ]},
    rotationNoRC: { name: "로테이션 (RC 제외)", steps: [
      { id: "step-1", label: "reward_otter_book_dialogue1_view" }, { id: "step-2", label: "reward_otter_book_dialogue2_view" },
      { id: "step-3", label: "reward_otter_book_dialogue3_view" }, { id: "step-4", label: "reward_otter_book_dialogue4_view" },
      { id: "step-5", label: "reward_otter_book_dialogue5_view" }, { id: "step-6", label: "reward_otter_book_dialogue6_view" },
      { id: "step-7", label: "reward_otter_snack_dialogue_view" }, { id: "step-8", label: "reward_otter_drink_dialogue_view" },
      { id: "step-9", label: "reward_otter_episode_dialogue_view" }, { id: "step-10", label: "reward_otter_scroll_dialogue_view" },
      { id: "step-11", label: "reward_otter_webtoon_dialogue_view" },
    ]},
    tip: { name: "팁 받기", steps: [
      { id: "step-1", label: "reward_tip_icon_click" }, { id: "step-2", label: "reward_tip_ad_click" },
      { id: "step-3", label: "reward_tip_confirm_click" },
    ]},
  };

  const loadPresetTemplate = (presetKey: string) => {
    setSelectedFunnelId(presetKey);
    if (presetTemplatesMap[presetKey]) { setCustomSteps(presetTemplatesMap[presetKey].steps); }
    else if (presetKey === "custom") {
      try { const saved = localStorage.getItem(`clickhouse_custom_funnel_${selectedApp}`);
        if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed) && parsed.length >= 2) setCustomSteps(parsed); }
      } catch (e) { console.warn("Failed to load saved custom steps:", e); }
    } else {
      const dbSteps = funnelSteps.filter((s) => s.funnel === presetKey);
      if (dbSteps.length > 0) { setCustomSteps(dbSteps.map((s, idx) => ({ id: `step-${idx + 1}`, label: `Step ${s.step} (${presetKey})` }))); }
    }
  };

  const handleAddStep = () => { setSelectedFunnelId("custom"); const nextId = `step-${customSteps.length + 1}-${Date.now()}`; const defaultLabel = eventCatalog[customSteps.length % Math.max(1, eventCatalog.length)]?.label || ""; const updated = [...customSteps, { id: nextId, label: defaultLabel }]; setCustomSteps(updated); saveCustomStepsToStorage(updated); };
  const handleRemoveStep = (id: string) => { if (customSteps.length <= 2) return; setSelectedFunnelId("custom"); const updated = customSteps.filter((s) => s.id !== id); setCustomSteps(updated); saveCustomStepsToStorage(updated); };
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return; if (direction === "down" && index === customSteps.length - 1) return;
    setSelectedFunnelId("custom"); const newSteps = [...customSteps]; const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = newSteps[index]; newSteps[index] = newSteps[targetIdx]; newSteps[targetIdx] = temp; setCustomSteps(newSteps); saveCustomStepsToStorage(newSteps);
  };
  const handleStepLabelChange = (id: string, newLabel: string) => { setSelectedFunnelId("custom"); const updated = customSteps.map((s) => (s.id === id ? { ...s, label: newLabel } : s)); setCustomSteps(updated); saveCustomStepsToStorage(updated); };

  const [dynamicCustomFunnelSteps, setDynamicCustomFunnelSteps] = useState<FunnelStepItem[]>([]);

  React.useEffect(() => {
    if (customSteps.length < 2) { setDynamicCustomFunnelSteps([]); return; }
    const stepLabels = customSteps.map((s) => s.label).filter(Boolean);
    if (stepLabels.length < 2) return;
    let isMounted = true;
    const fetchCustomFunnel = async () => {
      try {
        const res = await fetch(`/api/clickhouse?type=custom_funnel&app=${selectedApp}&from=${fromDate}&to=${toDate}&steps=${encodeURIComponent(stepLabels.join(","))}`);
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) setDynamicCustomFunnelSteps(json.data);
      } catch (e) { console.warn("Failed to fetch dynamic custom funnel steps:", e); }
    };
    fetchCustomFunnel();
    return () => { isMounted = false; };
  }, [customSteps, selectedApp, fromDate, toDate]);

  const formatNum = (val: number | string | undefined | null) => { if (val === undefined || val === null) return "0.0"; const num = typeof val === "number" ? val : Number(val); return isNaN(num) ? "0.0" : num.toLocaleString(); };
  const formatPct = (val: number | string | undefined | null) => { if (val === undefined || val === null) return "0.0%"; const num = typeof val === "number" ? val : Number(val); return isNaN(num) ? "0.0%" : `${num.toFixed(1)}%`; };

  const journeyNodes: JourneyNodeData[] = useMemo(() => {
    if (customSteps.length === 0) return [];
    let step1Count = 0; let prevCount = 0; const nodes: JourneyNodeData[] = [];
    const activeFunnelSteps = dynamicCustomFunnelSteps.length > 0 ? dynamicCustomFunnelSteps : funnelSteps.filter((s) => s.funnel === selectedFunnelId);
    let prevUserVal = 0; let prevSessionVal = 0;
    customSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const dbMatch = activeFunnelSteps.find((s) => Number(s.step) === stepNum);
      let userCount = 0, sessionCount = 0;
      if (dbMatch) { userCount = Number(dbMatch.reachedUserCount) || 0; sessionCount = Number(dbMatch.reachedSessionCount) || 0; }
      else { let matched = eventCatalog.find((e) => e.label === step.label); if (!matched && step.label) matched = eventCatalog.find((e) => e.label.includes(step.label) || step.label.includes(e.label)); userCount = Number(matched?.totalEventCount) || 0; sessionCount = Math.round(userCount * 1.25); }
      let finalUserCount = userCount, finalSessionCount = sessionCount, dropUserCount = 0, dropSessionCount = 0;
      if (idx === 0) { prevUserVal = finalUserCount; prevSessionVal = finalSessionCount; }
      else { finalUserCount = Math.min(prevUserVal, finalUserCount); finalSessionCount = Math.min(prevSessionVal, finalSessionCount); dropUserCount = Math.max(0, prevUserVal - finalUserCount); dropSessionCount = Math.max(0, prevSessionVal - finalSessionCount); prevUserVal = finalUserCount; prevSessionVal = finalSessionCount; }
      const curCount = metricMode === "users" ? finalUserCount : finalSessionCount;
      if (idx === 0) { step1Count = curCount; prevCount = curCount; }
      let conversionRate = 100, cumConversionRate = 100, dropRate = 0;
      if (idx === 0) { dropUserCount = 0; dropSessionCount = 0; }
      else { cumConversionRate = step1Count > 0 ? Math.min(100, Math.max(0, (curCount / step1Count) * 100)) : 0; conversionRate = prevCount > 0 ? Math.min(100, Math.max(0, (curCount / prevCount) * 100)) : 0; dropRate = Math.max(0, 100 - cumConversionRate); }
      prevCount = curCount;
      nodes.push({ stepIndex: idx + 1, stepId: step.id, label: step.label || `Step ${idx + 1}`, eventName: step.label || `step_${idx + 1}`, userCount: finalUserCount, sessionCount: finalSessionCount, conversionRate, cumConversionRate, dropRate, dropUserCount, dropSessionCount });
    });
    return nodes;
  }, [customSteps, eventCatalog, funnelSteps, selectedFunnelId, metricMode]);

  const overallSummary = useMemo(() => {
    if (journeyNodes.length < 2) return null;
    const firstNode = journeyNodes[0]; const lastNode = journeyNodes[journeyNodes.length - 1];
    const startVal = metricMode === "users" ? firstNode.userCount : firstNode.sessionCount;
    const endVal = metricMode === "users" ? lastNode.userCount : lastNode.sessionCount;
    const overallConversion = startVal > 0 ? (endVal / startVal) * 100 : 0;
    return { firstLabel: firstNode.label, lastLabel: lastNode.label, startVal, endVal, overallConversion: Math.min(100, Math.max(0, overallConversion)), totalDrop: Math.max(0, startVal - endVal), stepCount: journeyNodes.length };
  }, [journeyNodes, metricMode]);

  const maxBarValue = useMemo(() => { if (journeyNodes.length === 0) return 1; return metricMode === "users" ? journeyNodes[0].userCount : journeyNodes[0].sessionCount; }, [journeyNodes, metricMode]);

  const TOSS_BLUE = "#3182F6";

  // Auto-detect if compact mode should be enabled based on step count
  const useCompactMode = isCompactView || customSteps.length >= 7;

  return (
    <div className="bg-white rounded-3xl border border-[#E5E8EB] overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      
      {/* ── UNIFIED CONTROL TOOLBAR ── */}
      <div className="px-6 py-5 border-b border-[#F2F4F6] flex flex-wrap items-center justify-between gap-4 bg-[#FAFBFD]">
        
        {/* Left: Template Selector */}
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-[#333D4B]">여정 템플릿:</span>
          <div className="relative">
            <select
              value={selectedFunnelId}
              onChange={(e) => loadPresetTemplate(e.target.value)}
              className="bg-white border border-[#D1D6DB] text-[13px] font-semibold text-[#191F28] rounded-xl px-3.5 py-1.5 pr-8 focus:ring-2 focus:ring-[#3182F6] focus:outline-none appearance-none cursor-pointer"
            >
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

          <button
            onClick={() => setShowEditSteps(!showEditSteps)}
            className={`px-3 py-1.5 rounded-xl text-[12px] font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              showEditSteps
                ? "bg-[#E8F3FF] border-[#3182F6] text-[#3182F6]"
                : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>단계 편집 ({customSteps.length}단계)</span>
          </button>

          <div className="flex items-center gap-0.5 p-1 bg-[#f2f4f6] rounded-xl text-xs">
            <button
              onClick={() => setMetricMode("users")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metricMode === "users"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              유저 기준 (UU)
            </button>
            <button
              onClick={() => setMetricMode("sessions")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                metricMode === "sessions"
                  ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  : "text-[#6b7684] font-medium hover:text-[#191f28]"
              }`}
            >
              세션 기준
            </button>
          </div>
        </div>

      </div>

      {/* ── STEP EDIT PANEL (Collapsible) ── */}
      {showEditSteps && (
        <div className="px-6 py-4 bg-[#F9FAFB] border-b border-[#F2F4F6] space-y-3">
          <p className="text-[12px] font-semibold text-[#4E5968]">이벤트 단계 커스텀</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customSteps.map((step, idx) => {
              const searchTerm = (stepSearches[step.id] || "").toLowerCase();
              const filteredCatalog = eventCatalog.filter((ev) => !searchTerm || ev.label.toLowerCase().includes(searchTerm) || ev.event.toLowerCase().includes(searchTerm));
              return (
                <div key={step.id} className="bg-white border border-[#E5E8EB] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-[#3182F6]">{idx + 1}단계</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleMoveStep(idx, "up")} disabled={idx === 0} className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleMoveStep(idx, "down")} disabled={idx === customSteps.length - 1} className="p-1 text-[#B0B8C1] hover:text-[#6B7684] disabled:opacity-20 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleRemoveStep(step.id)} disabled={customSteps.length <= 2} className="p-1 text-[#B0B8C1] hover:text-[#E8344E] disabled:opacity-20 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3 h-3 text-[#B0B8C1] absolute left-2.5 top-2" />
                    <input type="text" placeholder="이벤트 검색..." value={stepSearches[step.id] || ""}
                      onChange={(e) => setStepSearches({ ...stepSearches, [step.id]: e.target.value })}
                      className="w-full bg-white border border-[#E5E8EB] text-[11px] pl-7 pr-2 py-1 rounded-lg focus:ring-1 focus:ring-[#3182F6] focus:outline-none text-[#333D4B] placeholder-[#B0B8C1]" />
                  </div>
                  <select value={step.label} onChange={(e) => handleStepLabelChange(step.id, e.target.value)}
                    className="w-full bg-white border border-[#E5E8EB] text-[12px] text-[#333D4B] rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-[#3182F6] focus:outline-none">
                    {filteredCatalog.length === 0 ? (<option value="">검색 결과 없음</option>) :
                      filteredCatalog.map((ev) => (<option key={`left_${step.id}_${ev.label}`} value={ev.label}>[{ev.event}] {ev.label}</option>))}
                  </select>
                </div>
              );
            })}
          </div>
          <button onClick={handleAddStep}
            className="py-1.5 px-4 border border-dashed border-[#D1D6DB] text-[#4E5968] text-[12px] font-medium rounded-xl flex items-center gap-1.5 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> 단계 추가
          </button>
        </div>
      )}

      {/* ── UNIFIED SUMMARY METRICS BANNER ── */}
      {overallSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#F2F4F6] border-b border-[#F2F4F6]">
          <div className="p-5 space-y-1">
            <p className="text-[12px] text-[#8B95A1] font-medium">진입 수</p>
            <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{formatNum(overallSummary.startVal)}</p>
            <p className="text-[11px] text-[#B0B8C1]">{metricMode === "users" ? "명" : "세션"}</p>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-[12px] text-[#8B95A1] font-medium">완료 수</p>
            <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{formatNum(overallSummary.endVal)}</p>
            <p className="text-[11px] text-[#B0B8C1]">{metricMode === "users" ? "명" : "세션"}</p>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-[12px] text-[#8B95A1] font-medium">전환율</p>
            <p className="text-[24px] font-bold tracking-tight leading-none" style={{ color: TOSS_BLUE }}>{formatPct(overallSummary.overallConversion)}</p>
            <p className="text-[11px] text-[#B0B8C1]">1단계 → {overallSummary.stepCount}단계 완료</p>
          </div>
          <div className="p-5 space-y-1">
            <p className="text-[12px] text-[#8B95A1] font-medium">누적 이탈</p>
            <p className="text-[24px] font-bold text-[#191F28] tracking-tight leading-none">{formatNum(overallSummary.totalDrop)}</p>
            <p className="text-[11px] text-[#B0B8C1]">{metricMode === "users" ? "명" : "세션"}</p>
          </div>
        </div>
      )}

      {/* ── FUNNEL BARS SECTION (Adaptive Spacing) ── */}
      <div className={`p-5 md:p-6 ${useCompactMode ? "space-y-2.5" : "space-y-5"}`}>
        {journeyNodes.map((node, index) => {
          const curVal = metricMode === "users" ? node.userCount : node.sessionCount;
          const barRatio = maxBarValue > 0 ? (curVal / maxBarValue) * 100 : 0;
          return (
            <div key={node.stepId}>
              <div className={`flex items-baseline justify-between ${useCompactMode ? "mb-1" : "mb-2"}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-[#B0B8C1]">{node.stepIndex}</span>
                  <span className={`font-semibold text-[#333D4B] ${useCompactMode ? "text-[13px]" : "text-[14px]"}`}>{node.label}</span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className={`font-bold text-[#191F28] tabular-nums ${useCompactMode ? "text-[16px]" : "text-[20px]"}`}>{formatNum(curVal)}</span>
                  <span className={`font-semibold tabular-nums ${useCompactMode ? "text-[12px]" : "text-[13px]"}`} style={{ color: TOSS_BLUE }}>
                    {index === 0 ? "100.0%" : formatPct(node.cumConversionRate)}
                  </span>
                </div>
              </div>
              <div className={`w-full bg-[#F2F4F6] rounded-lg overflow-hidden ${useCompactMode ? "h-7" : "h-10 rounded-xl"}`}>
                <div className="h-full rounded-lg transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(2, barRatio)}%`, backgroundColor: index === 0 ? TOSS_BLUE : `rgba(49, 130, 246, ${Math.max(0.3, 0.85 - index * 0.04)})` }} />
              </div>
              {index < journeyNodes.length - 1 && node.dropUserCount > 0 && (
                <div className={`flex items-center justify-between px-1 ${useCompactMode ? "mt-0.5" : "mt-1.5 mb-1"}`}>
                  <span className="text-[10px] text-[#B0B8C1]">
                    이탈 <span className="text-[#8B95A1] font-medium">{formatNum(metricMode === "users" ? node.dropUserCount : node.dropSessionCount)}{metricMode === "users" ? "명" : "회"}</span>
                  </span>
                  <span className="text-[10px] text-[#E8344E] font-medium tabular-nums">
                    −{node.conversionRate < 100 ? (100 - node.conversionRate).toFixed(1) : "0.0"}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
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
                <th className="pb-2.5 pr-4 text-right font-medium">1단계 대비</th>
                <th className="pb-2.5 pr-4 text-right font-medium">이전 대비</th>
                <th className="pb-2.5 pr-4 text-right font-medium">누적 이탈률</th>
                <th className="pb-2.5 text-right font-medium">이탈 수</th>
              </tr>
            </thead>
            <tbody>
              {journeyNodes.map((node) => {
                const val = metricMode === "users" ? node.userCount : node.sessionCount;
                const dropVal = metricMode === "users" ? node.dropUserCount : node.dropSessionCount;
                return (
                  <tr key={`table_${node.stepId}`} className="border-b border-[#F9FAFB] last:border-0 hover:bg-[#F9FAFB]">
                    <td className="py-2.5 pr-4 text-[#8B95A1] font-medium">{node.stepIndex}</td>
                    <td className="py-2.5 pr-4 text-[#333D4B] font-medium">{node.label}</td>
                    <td className="py-2.5 pr-4 text-right text-[#191F28] font-semibold tabular-nums">{formatNum(val)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium" style={{ color: TOSS_BLUE }}>
                      {node.stepIndex === 1 ? "100.0%" : formatPct(node.cumConversionRate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#4E5968] tabular-nums font-medium">
                      {node.stepIndex === 1 ? "100.0%" : formatPct(node.conversionRate)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums font-medium" style={{ color: node.dropRate > 0 ? "#E8344E" : "#B0B8C1" }}>
                      {node.stepIndex === 1 ? "0.0%" : formatPct(node.dropRate)}
                    </td>
                    <td className="py-3 text-right tabular-nums font-medium" style={{ color: dropVal > 0 ? "#E8344E" : "#B0B8C1" }}>
                      {dropVal > 0 ? `−${formatNum(dropVal)}` : "—"}
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
