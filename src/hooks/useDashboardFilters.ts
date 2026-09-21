import { useState, useEffect } from "react";
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
  UserSegment,
  MissionSubTab,
} from "@/types/dashboard";
import { formatDateStr, getYesterday } from "@/utils/settlementHelpers";

export function useDashboardFilters() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [revenueCategoryTab, setRevenueCategoryTab] = useState<RevenueCategoryTab>("overall");
  const [funnelCategoryTab, setFunnelCategoryTab] = useState<FunnelCategoryTab>("detail");

  const [selectedApp, setSelectedApp] = useState<string>("tc");
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [datePreset, setDatePreset] = useState<DatePreset>("7d");

  const [fromDate, setFromDate] = useState<string>(() => formatDateStr(getYesterday(6)));
  const [toDate, setToDate] = useState<string>(() => formatDateStr(getYesterday(0)));

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [revenueViewMode, setRevenueViewMode] = useState<ViewMode>("chart");

  const [retentionMode, setRetentionMode] = useState<RetentionMode>("combined");
  const [retentionDayMax, setRetentionDayMax] = useState<RetentionDayMax>(30);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const [heatmapTooltip, setHeatmapTooltip] = useState<CustomTooltipState | null>(null);

  const [userSegment, setUserSegment] = useState<UserSegment>("all");
  const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>("general");

  const [realAppList, setRealAppList] = useState<AppOption[]>([
    { label: "전체 (통합 서비스)", value: "tc" },
    { label: "비트버니 (bitbunny)", value: "bitbunny" },
    { label: "야핏무브 (yafit)", value: "yafit" },
    { label: "하루스토리 (harustory)", value: "harustory" },
    { label: "토스 (toss)", value: "toss" },
    { label: "카카오페이 (kakaopay)", value: "kakaopay" },
    { label: "포인트홈-하루날씨 (ph-hw)", value: "ph-hw" },
  ]);

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

  const handleDatePreset = (preset: "7d" | "30d" | "month") => {
    setDatePreset(preset);
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

  return {
    activeTab,
    setActiveTab,
    revenueCategoryTab,
    setRevenueCategoryTab,
    funnelCategoryTab,
    setFunnelCategoryTab,
    selectedApp,
    setSelectedApp,
    periodType,
    setPeriodType,
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
    realAppList,
    handleDatePreset,
    handlePeriodChange,
  };
}
