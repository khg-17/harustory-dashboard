export type ActiveTab = "users" | "revenue" | "funnel" | "mission";
export type RevenueCategoryTab = "overall" | "ad_category" | "ad_network" | "content" | "content_pay" | "content_usage" | "margin" | "ad";
export type FunnelCategoryTab = "detail" | "new_user";
export type MissionSubTab = "general" | "reward" | "attendance";
export type UserSegment = "all" | "existing" | "new";
export type PeriodType = "day" | "week" | "month";
export type DatePreset = "7d" | "30d" | "month" | "custom";
export type ViewMode = "chart" | "table";
export type RetentionMode = "combined" | "retention" | "earning_activation";
export type RetentionDayMax = 7 | 14 | 30;

export interface MissionByTypeItem {
  dt?: string;
  missionType: string;
  completeCount: number;
  uu: number;
  rewardAmount: number;
}

export interface MissionDetailItem {
  label: string;
  missionName?: string;
  completeCount: number;
  uu: number;
}

export interface MissionDailyTrendItem {
  dt: string;
  missionType: string;
  label: string;
  missionName: string;
  completeCount: number;
  uu: number;
  avgPerUser: number;
}

export interface AttendanceDailyItem {
  dt?: string;
  eventDateKst?: string;
  day1ClickUserCount: number;
  day2ClickUserCount?: number;
  day3ClickUserCount?: number;
  day4ClickUserCount?: number;
  day5ClickUserCount?: number;
  day6ClickUserCount?: number;
  day7ClickUserCount: number;
  adMoreUserCount: number;
  adSkipUserCount: number;
  completeUserCount: number;
  day3AdMoreUserCount?: number;
  day3AdSkipUserCount?: number;
  day6AdMoreUserCount?: number;
  day6AdSkipUserCount?: number;
}

export interface AttendanceCompletionItem {
  day1CompleteUserCount: number;
  completeUserCount: number;
  completionRate: number;
}

export interface AttendanceStepItem {
  attendanceDayNo: number;
  completeUserCount: number;
  reachRate: number;
}

export interface EarningActivityItem {
  dt?: string;
  eventDateKst?: string;
  earningUu: number;
}

export interface ContentItem {
  dt?: string;
  eventDateKst?: string;
  content: string;
  contentType: string;
  genre: string;
  impressionCount: number;
  clickCount: number;
  clickUserCount: number;
  clickRate: number | null;
}

export interface GenreItem {
  dt?: string;
  eventDateKst?: string;
  genre: string;
  impressionCount: number;
  clickCount: number;
  clickUserCount: number;
  clickRate: number | null;
}

export interface ContentViewItem {
  dt: string;
  formattedDt?: string;
  readerUu: number;
  episodeViewCount: number;
  avgEpisodesPerReader: number;
  nextEpisodeUu: number;
  nextEpisodeContinueRate: number;
  waitfreeUu: number;
  waitfreeEpisodeRate: number;
}


export interface FunnelItem {
  funnel: string;
  startUserCount: number | string;
  completeUserCount: number | string;
  completionRate: number;
  startSessionCount: number | string;
  completeSessionCount: number | string;
  sessionCompletionRate: number;
  dauParticipationRate: number;
}

export interface FunnelStepItem {
  funnel: string;
  step: number | string;
  reachedSessionCount: number | string;
  reachedUserCount: number | string;
  vsPrevStepRate: number | null;
}

export interface EventCatalogItem {
  event: string;
  label: string;
  firstSeenDateKst: string;
  lastSeenDateKst: string;
  totalEventCount: number | string;
}

export interface CustomStepConfig {
  id: string;
  label: string;
}

export interface JourneyNodeData {
  stepIndex: number;
  stepId: string;
  label: string;
  eventName: string;
  userCount: number;
  sessionCount: number;
  conversionRate: number;
  cumConversionRate: number;
  dropRate: number;
  dropUserCount: number;
  dropSessionCount: number;
}


export interface CustomTooltipState {
  x: number;
  y: number;
  date: string;
  typeText?: string;
  dayNum: number;
  newUserCount: number;
  visitCount: number;
  visitRate: number;
  earningCount: number;
  earningRate: number;
  isCombined: boolean;
}

export interface AppOption {
  label: string;
  value: string;
}

export interface OverviewItem {
  eventDateKst: string;
  activeUserCount: number;
  newUserCount: number;
  eventCount: number;
}

export interface ChartProcessedItem {
  label: string;
  fullDate: string;
  dau: number;
  newUser: number;
  eventCount: number;
}

export interface CohortRow {
  cohortDate: string;
  formattedDate: string;
  newUserCount: number;
  daysMap: Record<number, { rate: number; count: number }>;
}

export interface CombinedCohortRow {
  cohortDate: string;
  formattedDate: string;
  newUserCount: number;
  vRow?: CohortRow;
  eRow?: CohortRow;
}

export interface DailyRevenueTrendItem {
  dt: string;
  formattedDt: string;
  serviceRev: number;
  adRev: number;
  rewardAdRev: number;
  grossTotal: number;
  contentPay: number;
  adTicket: number;
  giftBox: number;
  mCost: number;
  eCost: number;
  cost: number;
  margin: number;
  marginRate: number;
}

export interface DailyContentRevenueItem {
  dt: string;
  formattedDt: string;
  totalContentRevenue: number;
  revenueWon: number;
  paidCoinWon: number;
  chargeWon: number;
  chargeCoin?: number;
  adTicketWon: number;
  payerUu: number;
  arppuWon: number;
}

export interface RevenueSummary {
  contentPaySum: number;
  paidCoinSum: number;
  adTicketSum: number;
  giftBoxSum: number;
  serviceTotalSum: number;
  totalAdRevenue: number;
  rewardAdRevenue: number;
  grossRevenue: number;
  totalMissionReward: number;
  totalExchangedPoints: number;
  totalRewardCost: number;
  netProfit: number;
  marginRate: number;
  adCategoryMap: Record<string, { revenue: number; impression: number }>;
  networkMap: Record<string, { revenue: number; impression: number }>;
  dailyTrend: DailyRevenueTrendItem[];
  chargeWonSum: number;
  chargeCoinSum: number;
  avgPayerUu: number;
  avgArppuWon: number;
  contentDailyList: DailyContentRevenueItem[];
  purchaseTypeMap: Record<number, { cnt: number; uu: number }>;
  adCategoryDailyTrend: { dates: string[]; categories: Record<string, number[]> };
  networkDailyTrend: { dates: string[]; networks: Record<string, number[]> };
  purchaseTypeDailyTrend: { dates: string[]; types: Record<number, number[]> };
}

export interface SettlementContentCoin {
  freeCoin: number;
  paidCoin: number;
}

export interface SettlementContentData {
  payingCoin: SettlementContentCoin;
  chargeCoin: number;
}

export interface SettlementRewardDetail {
  direct: number;
  ticket: number;
  goldenKey: number;
  earning: number;
}

export interface SettlementReceivedReward {
  mission?: SettlementRewardDetail;
  buzzvil?: SettlementRewardDetail;
  rc?: SettlementRewardDetail;
}

export interface SettlementAdData {
  adcash: number;
  adforus: number;
  adsense?: number;
  adpopcorn?: number;
  apWebCPC?: number;
  buzzvil: number;
  rc: number;
  tossMini: number;
}

export interface SettlementAdFreeData {
  adcash?: number;
  adforus?: number;
  apWebCPC?: number;
  buzzvil?: number;
  tossMini?: number;
  adsense?: number;
}

export interface SettlementAppData {
  appSN: number;
  appName: string | null;
  payingCoin?: SettlementContentCoin;
  chargeCoin?: number;
  adFree?: SettlementAdFreeData;
  contentRevenue?: number;
  content?: SettlementContentData;
  usedReward: number;
  receivedReward?: SettlementReceivedReward;
  ad: SettlementAdData;
}

export interface SettlementDailyItem {
  date: string; // yyyy-MM-dd
  apps?: SettlementAppData[];
  payingCoin?: SettlementContentCoin;
  chargeCoin?: number;
  adFree?: SettlementAdFreeData;
  contentRevenue?: number;
  content?: SettlementContentData;
  usedReward?: number;
  receivedReward?: SettlementReceivedReward;
  ad?: SettlementAdData;
}


