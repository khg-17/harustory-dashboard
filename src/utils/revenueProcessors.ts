import {
  SettlementDailyItem,
  RevenueSummary,
  DailyRevenueTrendItem,
  DailyContentRevenueItem,
  PeriodType,
} from "@/types/dashboard";
import {
  getPreviousMonthDateRange,
  getSettlementDataForApp,
} from "./settlementHelpers";

export function extractDtStr(rawDt: any): string {
  if (!rawDt) return "";
  const str = String(rawDt).trim();
  if (str.includes("T")) return str.split("T")[0];
  if (str.length >= 10) return str.slice(0, 10);
  return str;
}

export function parseRewardAmount(item: any): number {
  if (!item) return 0;
  const raw =
    item.totalRewardAmount ??
    item.total_reward_amount ??
    item.rewardAmount ??
    item.reward_amount ??
    item.reward ??
    item.totalReward ??
    item.total_reward ??
    item.rewardCost ??
    item.reward_cost ??
    item.total_reward_cost ??
    item.mCost ??
    item.missionReward ??
    item.totalMissionReward ??
    item.rewardSum ??
    item.total_reward_sum ??
    0;
  const num = Number(raw);
  return !isNaN(num) ? num : 0;
}

export function parseExchangedPoints(item: any): number {
  if (!item) return 0;
  const raw =
    item.totalExchangedPoints ??
    item.total_exchanged_points ??
    item.exchangedPoints ??
    item.exchanged_points ??
    item.exchangedWon ??
    item.exchanged_won ??
    item.exchangedPointWon ??
    item.pointExchangedWon ??
    item.total_point_exchanged_won ??
    item.eCost ??
    item.exchangedCost ??
    item.pointExchangeCost ??
    0;
  const num = Number(raw);
  return !isNaN(num) ? num : 0;
}

export function generateDateRange(fromStr: string, toStr: string): string[] {
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
}

interface ComputeRevenueParams {
  settlementRaw: SettlementDailyItem[];
  hasActiveSettlement: boolean;
  selectedApp: string;
  fromDate: string;
  toDate: string;
  periodType: PeriodType;
  serviceRevenueRaw: any[];
  adRevenueRaw: any[];
  contentRevenueRaw: any[];
  contentPurchaseRaw: any[];
  earningRaw: any[];
  missionTotalRaw: any[];
}

export function computeRevenueSummary({
  settlementRaw,
  hasActiveSettlement,
  selectedApp,
  fromDate,
  toDate,
  periodType,
  serviceRevenueRaw,
  adRevenueRaw,
  contentRevenueRaw,
  contentPurchaseRaw,
  earningRaw,
  missionTotalRaw,
}: ComputeRevenueParams): RevenueSummary {
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
  let totalMissionReward = 0;

  const isPhApp = selectedApp.toLowerCase().includes("ph-");
  const { prevFromStr, prevToStr } = getPreviousMonthDateRange(fromDate, toDate);

  if (hasActiveSettlement) {
    settlementRaw.forEach((item) => {
      const dtStr = extractDtStr(item.date);
      if (!dtStr) return;
      const isCurrent = dtStr >= fromDate && dtStr <= toDate;
      const isPrev = dtStr >= prevFromStr && dtStr <= prevToStr;
      if (!isCurrent && !isPrev) return;

      const sData = getSettlementDataForApp(item, selectedApp);
      if (!sData) return;

      const { paidCoin, chargeCoin, usedReward, contentRevenue, adFree, missionRewardP, ad } = sData;
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
        totalMissionReward += (missionRewardP || 0);

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
          if (rev > 0) {
            if (!networkMap[netName]) networkMap[netName] = { revenue: 0, impression: 0 };
            networkMap[netName].revenue += rev;
          }
        });

        const catMap: Record<string, number> = {
          "reward": b,
          "display": pop + forus + sense + cash + toss,
          "rc": rc,
          "adTicket": adFree || 0,
        };
        Object.entries(catMap).forEach(([catName, rev]) => {
          if (rev > 0) {
            if (!adCategoryMap[catName]) adCategoryMap[catName] = { revenue: 0, impression: 0 };
            adCategoryMap[catName].revenue += rev;
          }
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

  if (!hasActiveSettlement) {
    missionTotalRaw.forEach((row) => {
      const dtStr = extractDtStr(row.dt);
      if (dtStr >= fromDate && dtStr <= toDate) {
        const val = parseRewardAmount(row);
        totalMissionReward += val;
      }
    });
  }

  const totalRewardCost = totalExchangedPoints;
  const netProfit = totalAdRevenue - totalRewardCost;
  const marginRate = totalAdRevenue > 0 ? (netProfit / totalAdRevenue) * 100 : 0;

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

      const { paidCoin, contentRevenue, usedReward, ad } = sData;
      const { b, pop, forus, sense, cash, rc, toss } = ad;

      const dayTotalAd = b + pop + forus + sense + cash + rc + toss;
      const realContentRev = (contentRevenue && contentRevenue > 0) ? contentRevenue : paidCoin;

      dailyMap[dtStr].serviceRev = realContentRev;
      dailyMap[dtStr].contentPay = realContentRev;
      dailyMap[dtStr].adRev = dayTotalAd;
      dailyMap[dtStr].rewardAdRev = isPhApp ? (cash + rc) : (pop + forus + rc);
      dailyMap[dtStr].eCost = usedReward;
      dailyMap[dtStr].mCost = sData.missionRewardP || 0;
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

  let dailyTrend: DailyRevenueTrendItem[] = [];
  if (periodType === "day") {
    dailyTrend = rawDailyTrend;
  } else {
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

    dailyTrend = Object.values(groups)
      .map((g) => {
        g.marginRate = g.adRev > 0 ? Number(((g.margin / g.adRev) * 100).toFixed(1)) : 0;
        return g;
      })
      .sort((a, b) => a.dt.localeCompare(b.dt));
  }

  let chargeWonSum = 0;
  let chargeCoinSum = 0;
  let totalPayerUu = 0;
  let totalArppuWonSum = 0;
  let contentDaysCount = 0;

  let contentDailyList: DailyContentRevenueItem[] = [];

  if (hasActiveSettlement) {
    const sortedSettlement = [...settlementRaw]
      .filter((s) => {
        const dtStr = extractDtStr(s.date);
        return dtStr >= fromDate && dtStr <= toDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

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

      return {
        dt: dtStr,
        formattedDt: dtStr ? dtStr.slice(5).replace("-", "/") : "",
        totalContentRevenue: realContentRev,
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

  let adCategoryDailyTrend = { dates: [] as string[], categories: {} as Record<string, number[]> };
  let networkDailyTrend = { dates: [] as string[], networks: {} as Record<string, number[]> };

  if (hasActiveSettlement) {
    const filteredSettlement = settlementRaw
      .filter((s) => {
        const dtStr = extractDtStr(s.date);
        return dtStr >= fromDate && dtStr <= toDate;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const dates = filteredSettlement.map((s) => s.date.slice(5).replace("-", "/"));

    const metricsList = filteredSettlement.map((s) => {
      const sData = getSettlementDataForApp(s, selectedApp);
      if (sData) return { ...sData.ad, adFree: sData.adFree || 0 };
      return { b: 0, pop: 0, forus: 0, sense: 0, cash: 0, rc: 0, toss: 0, adFree: 0 };
    });

    const netDailyCandidate: Record<string, number[]> = {
      "Buzzvil": metricsList.map((m) => m.b),
      "apWebCPC": metricsList.map((m) => m.pop),
      "Adforus": metricsList.map((m) => m.forus),
      "AdCash": metricsList.map((m) => m.cash),
      "RC (비토스)": metricsList.map((m) => m.rc),
      "Toss Mini": metricsList.map((m) => m.toss),
    };
    if (metricsList.some((m) => m.sense > 0)) {
      netDailyCandidate["AdSense"] = metricsList.map((m) => m.sense);
    }

    const netDaily: Record<string, number[]> = {};
    Object.entries(netDailyCandidate).forEach(([netName, arr]) => {
      if (arr.some((v) => v > 0)) {
        netDaily[netName] = arr;
      }
    });

    const catDailyCandidate: Record<string, number[]> = {
      reward: metricsList.map((m) => m.b),
      display: metricsList.map((m) => m.pop + m.forus + m.sense + m.cash + m.toss),
      rc: metricsList.map((m) => m.rc),
      adTicket: metricsList.map((m) => m.adFree),
    };

    const catDaily: Record<string, number[]> = {};
    Object.entries(catDailyCandidate).forEach(([catName, arr]) => {
      if (arr.some((v) => v > 0)) {
        catDaily[catName] = arr;
      }
    });

    adCategoryDailyTrend = { dates, categories: catDaily };
    networkDailyTrend = { dates, networks: netDaily };
  }

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
}
