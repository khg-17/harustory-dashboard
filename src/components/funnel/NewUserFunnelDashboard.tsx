import React, { useState, useMemo } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, SlidersHorizontal, Maximize2, Minimize2, ArrowRight } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { 
  FunnelItem, 
  FunnelStepItem, 
  EventCatalogItem, 
  CustomStepConfig, 
  FunnelCategoryTab 
} from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

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

const TOSS_BLUE = "#3182F6";

const DEFAULT_STEPS_BY_APP: Record<string, { label: string }[]> = {
  tc: [
    { label: "reward_otter_click_book_1" },
    { label: "reward_otter_click_book_2" },
    { label: "reward_otter_click_book_3" },
    { label: "reward_otter_click_book_4" },
    { label: "reward_otter_click_book_5" },
    { label: "reward_otter_click_book_6" },
    { label: "reward_otter_click_book_7" },
    { label: "reward_otter_click_book_8" },
    { label: "reward_book_mission_complete_click" },
  ],
  bitbunny: [
    { label: "app_open" },
    { label: "attendance_check" },
    { label: "coin_exchange" },
  ],
  yafit: [
    { label: "app_open" },
    { label: "mileage_get" },
    { label: "shop_view" },
  ],
  harustory: [
    { label: "app_open" },
    { label: "reward_claim" },
    { label: "cash_exchange" },
  ],
};

const VIRTUAL_EVENTS = [
  { label: "v_all_mission_complete", displayName: "미션 완료 전체" },
  { label: "v_all_ad_reward", displayName: "광고 시청 리워드 전체" },
  { label: "v_all_exchange_confirm", displayName: "재화/상품 교환 확정 전체" },
  { label: "v_all_attendance", displayName: "출석체크 전체" },
];

export const NewUserFunnelDashboard: React.FC<NewUserFunnelDashboardProps> = ({
  funnelSteps,
  eventCatalog,
  overviewData = [],
  loading,
  selectedApp,
  fromDate,
  toDate,
  funnelCategoryTab,
  setFunnelCategoryTab,
}) => {
  const [subTabMode, setSubTabMode] = useState<"top_paths" | "time_decay" | "retention">("top_paths");
  const [metricMode, setMetricMode] = useState<"users" | "sessions">("users");
  const [showEditSteps, setShowEditSteps] = useState(false);
  const [useCompactMode, setUseCompactMode] = useState(false);

  const initialSteps = useMemo(() => {
    const appDefaults = DEFAULT_STEPS_BY_APP[selectedApp] || DEFAULT_STEPS_BY_APP.tc;
    return appDefaults.map((s, idx) => ({
      id: `step-${idx + 1}`,
      label: s.label,
    }));
  }, [selectedApp]);

  const [customSteps, setCustomSteps] = useState<CustomStepConfig[]>(initialSteps);

  const handleAddStep = () => {
    const nextId = `step-${customSteps.length + 1}-${Date.now()}`;
    const fallbackLabel = eventCatalog[customSteps.length % Math.max(1, eventCatalog.length)]?.label || "";
    setCustomSteps([...customSteps, { id: nextId, label: fallbackLabel }]);
  };

  const handleRemoveStep = (id: string) => {
    if (customSteps.length <= 2) return;
    setCustomSteps(customSteps.filter((s) => s.id !== id));
  };

  const handleMoveStep = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === customSteps.length - 1) return;
    const nextSteps = [...customSteps];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = nextSteps[index];
    nextSteps[index] = nextSteps[targetIdx];
    nextSteps[targetIdx] = temp;
    setCustomSteps(nextSteps);
  };

  const handleUpdateStepLabel = (id: string, newLabel: string) => {
    setCustomSteps(customSteps.map((s) => (s.id === id ? { ...s, label: newLabel } : s)));
  };

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
    if (!overviewData || overviewData.length === 0) return 0;
    return overviewData.reduce((acc, cur) => acc + (Number(cur.newUsers || cur.newUserCount) || 0), 0);
  }, [overviewData]);

  const computedJourney = useMemo(() => {
    if (customSteps.length === 0) return [];
    const sourceSteps = dynamicCustomFunnelSteps.length >= 2 ? dynamicCustomFunnelSteps : [];

    let prevCount = 0;
    let firstStepCount = 0;

    return customSteps.map((stepConfig, index) => {
      const stepNumber = index + 1;
      const dbMatch = sourceSteps.find((s) => Number(s.step) === stepNumber);
      let count = dbMatch
        ? (metricMode === "users" ? Number(dbMatch.reachedUserCount) || 0 : Number(dbMatch.reachedSessionCount) || 0)
        : 0;

      if (index === 0) {
        firstStepCount = count;
        prevCount = count;
      } else {
        count = Math.min(prevCount, count);
      }

      const overallRate = firstStepCount > 0 ? (count / firstStepCount) * 100 : 0;
      const stepRate = prevCount > 0 ? (count / prevCount) * 100 : 0;
      const dropOffCount = index === 0 ? 0 : Math.max(0, prevCount - count);
      const dropOffRate = prevCount > 0 ? Math.max(0, 100 - stepRate) : 0;

      prevCount = count;

      return {
        id: stepConfig.id,
        stepNumber,
        label: stepConfig.label,
        count,
        overallRate,
        stepRate,
        dropOffCount,
        dropOffRate,
      };
    });
  }, [customSteps, dynamicCustomFunnelSteps, metricMode]);

  const maxBarWidth = useMemo(() => {
    if (computedJourney.length === 0) return 1;
    return computedJourney[0].count || 1;
  }, [computedJourney]);

  const summaryKpi = useMemo(() => {
    if (computedJourney.length === 0) return { startVal: 0, endVal: 0, totalConversionRate: 0, entryRate: 0 };
    const startVal = computedJourney[0].count;
    const endVal = computedJourney[computedJourney.length - 1].count;
    const totalConversionRate = startVal > 0 ? (endVal / startVal) * 100 : 0;
    const entryRate = totalAppNewUsers > 0 ? (startVal / totalAppNewUsers) * 100 : 0;
    return { startVal, endVal, totalConversionRate, entryRate };
  }, [computedJourney, totalAppNewUsers]);

  const newUserBarChartData: ChartData<"bar"> = useMemo(() => {
    return {
      labels: computedJourney.map((s) => `Step ${s.stepNumber}`),
      datasets: [
        {
          label: metricMode === "users" ? "신규 도달 유저 (명)" : "신규 도달 세션 (회)",
          data: computedJourney.map((s) => s.count),
          backgroundColor: computedJourney.map((_, idx) =>
            idx === 0
              ? "rgba(49, 130, 246, 0.9)"
              : `rgba(49, 130, 246, ${Math.max(0.35, 0.85 - idx * 0.05)})`
          ),
          borderColor: "#3182F6",
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [computedJourney, metricMode]);

  const formatEventLabel = (label: string) => {
    const ve = VIRTUAL_EVENTS.find((v) => v.label === label);
    if (ve) return ve.displayName;
    return label;
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E5E8EB] overflow-hidden shadow-2xs">
      {/* ── HEADER & SUB-NAV ── */}
      <div className="p-6 border-b border-[#F2F4F6] bg-[#FAFBFD] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#E8F3FF] text-[#3182F6] font-bold text-[12px]">
                신규 코호트
              </span>
              <h2 className="text-[18px] font-bold text-[#191F28] tracking-tight">신규 가입 유저 퍼널 분석</h2>
            </div>
            <p className="text-[13px] text-[#8B95A1] mt-1">
              선택한 기간 동안 신규 가입한 유저의 단계별 전환 및 온보딩 이탈을 추적합니다.
            </p>
          </div>

          <div className="flex bg-[#EAEFF7] p-1 rounded-xl gap-1 text-[13px] font-medium shrink-0">
            <button
              onClick={() => setSubTabMode("top_paths")}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                subTabMode === "top_paths" ? "bg-white text-[#191F28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]" : "text-[#6B7684]"
              }`}
            >
              온보딩 주요 경로
            </button>
          </div>
        </div>

        {/* ── CONTROLS TOOLBAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#F2F4F6]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-[#6B7684]">경로 편집:</span>
            <span className="text-[13px] font-bold text-[#191F28]">{customSteps.length}단계 정의됨</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditSteps(!showEditSteps)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border flex items-center gap-1.5 transition-all cursor-pointer ${
                showEditSteps
                  ? "bg-[#E8F3FF] border-[#3182F6] text-[#3182F6]"
                  : "bg-white border-[#E5E8EB] text-[#4E5968] hover:bg-[#F9FAFB]"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>단계 편집</span>
            </button>

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

      {/* ── FUNNEL BARS SECTION (Executive Chart.js Bar Chart) ── */}
      <div className="p-5 md:p-6">
        <div className="bg-[#FAFBFD] border border-[#E5E8EB] rounded-2xl p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[#E5E8EB] pb-3">
            <div>
              <h3 className="text-xs font-bold text-[#191F28] flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-[#3182F6]" />
                <span>신규 유저 퍼널 막대 차트</span>
              </h3>
              <p className="text-[11px] text-[#8B95A1] mt-0.5">
                스크롤 없이 화면 폭에 맞춰 신규 가입 유저의 온보딩 이탈을 한눈에 파악합니다.
              </p>
            </div>
            <span className="text-xs font-bold text-[#3182F6] bg-[#E8F3FF] px-2.5 py-1 rounded-lg">
              신규 전환율: {summaryKpi.totalConversionRate.toFixed(1)}%
            </span>
          </div>

          <div className="h-64 pt-2">
            <Bar
              data={newUserBarChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items: any) => {
                        const idx = items[0]?.dataIndex;
                        return computedJourney[idx] ? `Step ${computedJourney[idx].stepNumber}: ${formatEventLabel(computedJourney[idx].label)}` : "";
                      },
                      label: (ctx: any) => {
                        const idx = ctx.dataIndex;
                        const step = computedJourney[idx];
                        if (!step) return "";
                        const countStr = `${step.count.toLocaleString()} ${metricMode === "users" ? "명" : "회"}`;
                        const pctStr = idx === 0 ? "100.0%" : `${step.overallRate.toFixed(1)}%`;
                        return [
                          ` 도달: ${countStr} (${pctStr})`,
                          idx > 0 && step.dropOffCount > 0 ? ` 이탈: -${step.dropOffCount.toLocaleString()} 명 (-${step.dropOffRate.toFixed(1)}%)` : "",
                        ].filter(Boolean);
                      },
                    },
                  },
                },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: "#191F28", font: { weight: "bold", size: 11 } },
                  },
                  y: {
                    grid: { color: "#F2F4F6" },
                    ticks: { color: "#8B95A1", font: { size: 10 } },
                  },
                },
              }}
            />
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
