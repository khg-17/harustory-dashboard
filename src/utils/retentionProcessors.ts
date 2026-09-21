import { CohortRow } from "@/types/dashboard";

export function processRawDataToMap(rawData: any[], isActivation: boolean = false): CohortRow[] {
  if (!rawData || rawData.length === 0) return [];

  const dateMap: Record<string, { newUserCount: number; daysMap: Record<number, { rate: number; count: number }> }> = {};

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
}

export function computeAvgDecay(rows: CohortRow[], dayNList: number[]): (number | null)[] {
  if (rows.length === 0) return dayNList.map(() => null);

  const maxDateStr = rows.reduce((max, r) => (r.cohortDate > max ? r.cohortDate : max), "");
  const maxDate = maxDateStr ? new Date(maxDateStr + "T00:00:00") : new Date();

  return dayNList.map((dayNum) => {
    if (dayNum === 0) return 100;

    const elapsedCohorts = rows.filter((r) => {
      const cDate = new Date(r.cohortDate + "T00:00:00");
      const ageInDays = Math.round((maxDate.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24));
      return dayNum <= ageInDays;
    });

    if (elapsedCohorts.length === 0) return null;

    const rates = elapsedCohorts.map((r) => r.daysMap[dayNum]?.rate ?? 0);
    const avgRate = rates.reduce((a, b) => a + b, 0) / elapsedCohorts.length;
    return Number(avgRate.toFixed(1));
  });
}
