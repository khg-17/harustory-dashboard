import { useState, useCallback, useEffect } from "react";
import {
  ActiveTab,
  SettlementDailyItem,
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
} from "@/types/dashboard";
import { getPreviousMonthDateRange } from "@/utils/settlementHelpers";

interface UseDashboardDataParams {
  activeTab: ActiveTab;
  selectedApp: string;
  fromDate: string;
  toDate: string;
  userSegment: UserSegment;
}

export function useDashboardData({
  activeTab,
  selectedApp,
  fromDate,
  toDate,
  userSegment,
}: UseDashboardDataParams) {
  const [loading, setLoading] = useState<boolean>(true);

  // Users Live States
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

  // Content Live States
  const [contentRaw, setContentRaw] = useState<ContentItem[]>([]);
  const [genresRaw, setGenresRaw] = useState<GenreItem[]>([]);
  const [contentViewRaw, setContentViewRaw] = useState<ContentViewItem[]>([]);

  // Mission Live States
  const [missionByTypeRaw, setMissionByTypeRaw] = useState<MissionByTypeItem[]>([]);
  const [missionsDetailRaw, setMissionsDetailRaw] = useState<MissionDetailItem[]>([]);
  const [missionDailyTrendRaw, setMissionDailyTrendRaw] = useState<MissionDailyTrendItem[]>([]);
  const [attendanceDailyRaw, setAttendanceDailyRaw] = useState<AttendanceDailyItem[]>([]);
  const [earningActivityRaw, setEarningActivityRaw] = useState<EarningActivityItem[]>([]);
  const [attendanceCompletionRaw, setAttendanceCompletionRaw] = useState<AttendanceCompletionItem[]>([]);
  const [attendanceStepsRaw, setAttendanceStepsRaw] = useState<AttendanceStepItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
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
        const [currentRes, contentRevRes] = await Promise.all([
          fetch(`/api/settlement?from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts).catch(() => null),
          fetch(`/api/clickhouse?type=content_revenue&app=${selectedApp}&from=${fromDate}&to=${toDate}&_t=${timestamp}`, fetchOpts).catch(() => null),
        ]);

        let currentItems: SettlementDailyItem[] = [];
        if (currentRes) {
          const json = await currentRes.json().catch(() => null);
          if (json && json.success && Array.isArray(json.data)) {
            currentItems = json.data;
          }
        }
        setSettlementRaw(currentItems);

        if (contentRevRes) {
          const contentRevJson = await contentRevRes.json().catch(() => null);
          if (contentRevJson && contentRevJson.success && Array.isArray(contentRevJson.data)) {
            setContentRevenueRaw(contentRevJson.data);
          } else {
            setContentRevenueRaw([]);
          }
        } else {
          setContentRevenueRaw([]);
        }

        const { prevFromStr, prevToStr } = getPreviousMonthDateRange(fromDate, toDate);
        if (prevFromStr && prevToStr) {
          fetch(`/api/settlement?from=${prevFromStr}&to=${prevToStr}&_t=${timestamp}`, fetchOpts)
            .then((res) => res.json())
            .then((json) => {
              if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
                setSettlementRaw((prev) => {
                  const map = new Map<string, SettlementDailyItem>();
                  prev.forEach((item) => { if (item?.date) map.set(item.date, item); });
                  json.data.forEach((item: SettlementDailyItem) => { if (item?.date) map.set(item.date, item); });
                  return Array.from(map.values()).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
                });
              }
            })
            .catch(() => {});
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

  return {
    loading,
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
    contentRaw,
    genresRaw,
    contentViewRaw,
    missionByTypeRaw,
    missionsDetailRaw,
    missionDailyTrendRaw,
    attendanceDailyRaw,
    earningActivityRaw,
    attendanceCompletionRaw,
    attendanceStepsRaw,
    fetchDashboardData,
    refetch: fetchDashboardData,
  };
}
