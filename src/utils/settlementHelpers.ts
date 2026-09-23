import { SettlementDailyItem, SettlementAdData } from "@/types/dashboard";

export function getPreviousMonthDateRange(fromDateStr: string, toDateStr: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDateStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toDateStr)) {
    return { prevFromStr: fromDateStr, prevToStr: toDateStr, numDays: 0 };
  }

  const from = new Date(fromDateStr + "T00:00:00");
  const to = new Date(toDateStr + "T00:00:00");

  const diffTime = Math.abs(to.getTime() - from.getTime());
  const numDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const prevFrom = new Date(from);
  const originalDay = prevFrom.getDate();
  prevFrom.setMonth(prevFrom.getMonth() - 1);

  if (prevFrom.getDate() !== originalDay) {
    prevFrom.setDate(0);
  }

  const prevTo = new Date(prevFrom);
  prevTo.setDate(prevTo.getDate() + numDays - 1);

  const format = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    prevFromStr: format(prevFrom),
    prevToStr: format(prevTo),
    numDays,
  };
}

export function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterday(daysBeforeYesterday: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1 - daysBeforeYesterday);
  return d;
}

export function calcAdFree(adFreeObj: any): number {
  if (!adFreeObj) return 0;
  return Number(adFreeObj.adcash || 0) +
         Number(adFreeObj.adforus || 0) +
         Number(adFreeObj.apWebCPC || 0) +
         Number(adFreeObj.buzzvil || 0) +
         Number(adFreeObj.tossMini || 0) +
         Number(adFreeObj.adsense || 0);
}

export function calcMissionRewardP(receivedReward: any, appNameOrSelectedApp: string): number {
  if (!receivedReward) return 0;
  const isPh = (appNameOrSelectedApp || "").toLowerCase().startsWith("ph-") ||
               (appNameOrSelectedApp || "").toLowerCase().includes("포인트홈");
  const field = isPh ? "direct" : "earning";

  const m = Number(receivedReward.mission?.[field] || 0);
  const b = Number(receivedReward.buzzvil?.[field] || 0);
  const r = Number(receivedReward.rc?.[field] || 0);
  return m + b + r;
}

export function getSettlementDataForApp(item: SettlementDailyItem, selectedApp: string) {
  if (!item) return null;

  if (selectedApp === "tc") {
    if (Array.isArray(item.apps) && item.apps.length > 0) {
      let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0, missionRewardP = 0;
      let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0;

      item.apps.forEach((app) => {
        paidCoin += Number(app.payingCoin?.paidCoin ?? app.content?.payingCoin?.paidCoin ?? 0);
        freeCoin += Number(app.payingCoin?.freeCoin ?? app.content?.payingCoin?.freeCoin ?? 0);
        chargeCoin += Number(app.chargeCoin ?? app.content?.chargeCoin ?? 0);
        usedReward += Number(app.usedReward || 0);
        contentRevenue += Number(app.contentRevenue || 0);
        adFree += calcAdFree(app.adFree);
        missionRewardP += calcMissionRewardP(app.receivedReward, app.appName || "");

        const ad: Partial<SettlementAdData> = app.ad || {};
        b += Number(ad.buzzvil || 0);
        pop += Number(ad.apWebCPC ?? ad.adpopcorn ?? 0);
        forus += Number(ad.adforus || 0);
        sense += Number(ad.adsense || 0);
        cash += Number(ad.adcash || 0);
        rc += Number(ad.rc || 0);
        toss += Number(ad.tossMini || 0);
      });

      return {
        paidCoin,
        freeCoin,
        chargeCoin,
        usedReward,
        contentRevenue,
        adFree,
        missionRewardP,
        ad: { b, pop, forus, sense, cash, rc, toss },
      };
    } else {
      const ad: Partial<SettlementAdData> = item.ad || {};
      const missionRewardP = calcMissionRewardP(item.receivedReward, "tc");
      return {
        paidCoin: Number(item.payingCoin?.paidCoin ?? item.content?.payingCoin?.paidCoin ?? 0),
        freeCoin: Number(item.payingCoin?.freeCoin ?? item.content?.payingCoin?.freeCoin ?? 0),
        chargeCoin: Number(item.chargeCoin ?? item.content?.chargeCoin ?? 0),
        usedReward: Number(item.usedReward || 0),
        contentRevenue: Number(item.contentRevenue || 0),
        adFree: calcAdFree(item.adFree),
        missionRewardP,
        ad: {
          b: Number(ad.buzzvil || 0),
          pop: Number(ad.apWebCPC ?? ad.adpopcorn ?? 0),
          forus: Number(ad.adforus || 0),
          sense: Number(ad.adsense || 0),
          cash: Number(ad.adcash || 0),
          rc: Number(ad.rc || 0),
          toss: Number(ad.tossMini || 0),
        },
      };
    }
  }

  if (Array.isArray(item.apps) && item.apps.length > 0) {
    const selLower = selectedApp.toLowerCase();

    const APP_ALIAS_MAP: Record<string, string[]> = {
      bitbunny: ["bitbunny", "비트버니"],
      yafit: ["yafit", "야핏", "야핏무브"],
      harustory: ["harustory", "하루스토리"],
      toss: ["toss", "토스"],
      kakaopay: ["kakaopay", "카카오", "카카오페이"],
      kbpay: ["kbpay", "kb pay", "kb페이"],
      digiloca: ["digiloca", "디지로카"],
      olock: ["olock", "오락"],
      pass: ["pass"],
      passbykt: ["passbykt", "pass by kt", "kt pass"],
      okcashback: ["okcashback", "ok캐쉬백"],
      benepia: ["benepia", "베네피아"],
      benecafe: ["benecafe", "베네카페"],
      happytoon: ["happytoon", "해피툰"],
      haruweather: ["haruweather", "하루날씨"],
      pocketcu: ["pocketcu", "포켓cu"],
      rround: ["rround", "알라운드", "라운드"],
      wabank: ["wabank", "와뱅", "광주와뱅크"],
      zaritalk: ["zaritalk", "자리톡"],
      zum: ["zum", "줌"],
      "3o3": ["3o3", "삼쩜삼"],
      bitwalk: ["bitwalk", "비트워크"],
      bppay: ["bppay", "bp페이", "비플페이"],
      memog: ["memog", "메모g"],
      treasurer: ["treasurer", "트레저러"],
      upluspage: ["upluspage", "유플러스페이지"],
      "ph-hw": ["ph-hw", "하루날씨", "포인트홈", "point home", "포인트홈-하루날씨"],
      "ph-mmg": ["ph-mmg", "메모g", "포인트홈-메모g"],
      "ph-whatisthisnumber": ["ph-whatisthisnumber", "이번호뭐지", "포인트홈-이번호뭐지"],
      "ph-schooltogether": ["ph-schooltogether", "학교가자", "포인트홈-학교가자"],
      "ph-quizanswer": ["ph-quizanswer", "퀴즈정답", "포인트홈-퀴즈정답"],
      "ph-walkingking": ["ph-walkingking", "걷기왕", "만보기왕", "포인트홈-걷기왕"],
      "ph-specialchars": ["ph-specialchars", "특수문자", "포인트홈-특수문자"],
      "ph-directblood": ["ph-directblood", "직혈", "포인트홈-직혈"],
      "ph-raisehand": ["ph-raisehand", "손들기", "포인트홈-손들기"],
    };

    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, "");
    const targetAliases = (APP_ALIAS_MAP[selLower] || [selLower]).map(norm);

    const matchedApps = item.apps.filter((app) => {
      if (!app.appName) return false;
      const appNorm = norm(app.appName);
      return targetAliases.some(
        (alias) => appNorm.includes(alias) || alias.includes(appNorm)
      );
    });

    if (matchedApps.length > 0) {
      let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0, missionRewardP = 0;
      let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0;

      matchedApps.forEach((app) => {
        paidCoin += Number(app.payingCoin?.paidCoin ?? app.content?.payingCoin?.paidCoin ?? 0);
        freeCoin += Number(app.payingCoin?.freeCoin ?? app.content?.payingCoin?.freeCoin ?? 0);
        chargeCoin += Number(app.chargeCoin ?? app.content?.chargeCoin ?? 0);
        usedReward += Number(app.usedReward || 0);
        contentRevenue += Number(app.contentRevenue || 0);
        adFree += calcAdFree(app.adFree);
        missionRewardP += calcMissionRewardP(app.receivedReward, app.appName || selectedApp);

        const ad: Partial<SettlementAdData> = app.ad || {};
        b += Number(ad.buzzvil || 0);
        pop += Number(ad.apWebCPC ?? ad.adpopcorn ?? 0);
        forus += Number(ad.adforus || 0);
        sense += Number(ad.adsense || 0);
        cash += Number(ad.adcash || 0);
        rc += Number(ad.rc || 0);
        toss += Number(ad.tossMini || 0);
      });

      return {
        paidCoin,
        freeCoin,
        chargeCoin,
        usedReward,
        contentRevenue,
        adFree,
        missionRewardP,
        ad: { b, pop, forus, sense, cash, rc, toss },
      };
    }
  }

  return null;
}
