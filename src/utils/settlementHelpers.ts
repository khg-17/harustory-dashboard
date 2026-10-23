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

export const APP_ALIAS_MAP: Record<string, string[]> = {
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
  okcashback: ["okcashback", "ok캐쉬백", "ph-okcashback", "ph_okcashback", "okcashbag"],
  "ph-okcashback": ["okcashback", "ok캐쉬백", "ph-okcashback", "ph_okcashback", "okcashbag"],
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
  "ph-hw": ["ph-hw", "phhw", "포인트홈-하루날씨", "포인트홈하루날씨"],
  "ph-mmg": ["ph-mmg", "phmmg", "포인트홈-메모지", "포인트홈메모지"],
  "ph-whatisthisnumber": ["ph-whatisthisnumber", "phwhatisthisnumber", "포인트홈-뭐야이번호", "포인트홈뭐야이번호"],
  "ph-schooltogether": ["ph-schooltogether", "phschooltogether", "포인트홈-스쿨투게더", "포인트홈스쿨투게더"],
  "ph-quizanswer": ["ph-quizanswer", "phquizanswer", "포인트홈-퀴즈 정답 알리미", "포인트홈퀴즈정답알리미", "포인트홈-퀴즈정답", "포인트홈퀴즈정답"],
  "ph-walkingking": ["ph-walkingking", "phwalkingking", "포인트홈-걸음왕", "포인트홈걸음왕"],
  "ph-specialchars": ["ph-specialchars", "phspecialchars", "포인트홈-특수문자이모티콘", "포인트홈특수문자이모티콘", "포인트홈-특수문자", "포인트홈특수문자"],
  "ph-directblood": ["ph-directblood", "phdirectblood", "포인트홈-지정헌혈", "포인트홈지정헌혈"],
  "ph-raisehand": ["ph-raisehand", "phraisehand", "포인트홈-고발", "포인트홈고발"],
  "ph-tvdalin": ["ph-tvdalin", "phtvdalin", "포인트홈-tv의달인", "포인트홈tv의달인"],
  "ph-pinkdiary": ["ph-pinkdiary", "phpinkdiary", "포인트홈-핑크다이어리", "포인트홈핑크다이어리", "핑크다이어리"],
  "ph-scorecenter": ["ph-scorecenter", "phscorecenter", "포인트홈-스코어센터", "포인트홈스코어센터", "스코어센터"],
  "ph-lottodraw": ["ph-lottodraw", "phlottodraw", "포인트홈-로또드로잉", "포인트홈로또드로잉", "로또드로잉"],
  "ph-mbtitest": ["ph-mbtitest", "phmbtitest", "포인트홈-mbti테스트", "포인트홈mbti테스트", "포인트홈-mbti", "포인트홈mbti", "mbti테스트"],
  "ph-probaseball": ["ph-probaseball", "phprobaseball", "포인트홈-프로야구", "포인트홈프로야구", "프로야구"],
  "ph-ddokddokvoca": ["ph-ddokddokvoca", "phddokddokvoca", "포인트홈-똑똑보카", "포인트홈똑똑보카", "똑똑보카"],
  "ph-cultureland": ["ph-cultureland", "phcultureland", "포인트홈-컬쳐랜드문화상품권", "포인트홈컬쳐랜드문화상품권", "컬쳐랜드문화상품권", "포인트홈-컬쳐랜드"],
  "ph-ggcurrency": ["ph-ggcurrency", "phggcurrency", "포인트홈-경기지역화폐", "포인트홈경기지역화폐", "경기지역화폐"],
};

export const APP_SN_MAP: Record<string, number> = {
  "ph-hw": 58,
  "ph-scorecenter": 67,
  "ph-probaseball": 68,
  "ph-walkingking": 70,
  "ph-ddokddokvoca": 71,
  "ph-lottodraw": 73,
  "ph-mbtitest": 74,
  "ph-whatisthisnumber": 77,
  "ph-directblood": 78,
  "ph-schooltogether": 80,
  "ph-cultureland": 88,
  "ph-quizanswer": 91,
  "ph-specialchars": 92,
  "ph-raisehand": 93,
  "ph-pinkdiary": 94,
  "ph-tvdalin": 96,
  "ph-mmg": 137,
  "ph-ggcurrency": 142,
};

export function getCanonicalAppCode(input: string, appSN?: number): string {
  if (appSN) {
    for (const [code, sn] of Object.entries(APP_SN_MAP)) {
      if (sn === appSN) return code;
    }
  }
  if (!input) return "";
  const norm = input.toLowerCase().replace(/[\s\-_]/g, "");

  for (const [canonicalCode, aliases] of Object.entries(APP_ALIAS_MAP)) {
    const codeNorm = canonicalCode.toLowerCase().replace(/[\s\-_]/g, "");
    if (codeNorm === norm) return canonicalCode;
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[\s\-_]/g, "");
      if (aliasNorm === norm || norm === aliasNorm) {
        return canonicalCode;
      }
    }
  }

  return input.toLowerCase().trim();
}

export function getSettlementDataForApp(item: SettlementDailyItem, selectedApp: string) {
  if (!item) return null;

  if (selectedApp === "tc" || selectedApp === "general_all" || selectedApp === "ph_all") {
    if (Array.isArray(item.apps) && item.apps.length > 0) {
      let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0, missionRewardP = 0;
      let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0, coupangSeller = 0, coupangPartners = 0;

      const targetApps = item.apps.filter((app) => {
        if (selectedApp === "tc") return true;
        const name = (app.appName || "").toLowerCase();
        const isPh = name.startsWith("포인트홈") || name.startsWith("ph-");
        return selectedApp === "ph_all" ? isPh : !isPh;
      });

      targetApps.forEach((app) => {
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
        coupangSeller += Number(ad.coupangSeller ?? (ad as any).coupang ?? (app.ad as any)?.coupangSeller ?? (app.ad as any)?.coupang ?? 0);
        coupangPartners += Number(ad.coupangPartners ?? (app.ad as any)?.coupangPartners ?? 0);
      });

      return {
        paidCoin,
        freeCoin,
        chargeCoin,
        usedReward,
        contentRevenue,
        adFree,
        missionRewardP,
        ad: { b, pop, forus, sense, cash, rc, toss, coupangSeller, coupangPartners },
      };
    } else if (selectedApp === "tc") {
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
          coupangSeller: Number(ad.coupangSeller ?? (ad as any).coupang ?? (item.ad as any)?.coupangSeller ?? (item.ad as any)?.coupang ?? 0),
          coupangPartners: Number(ad.coupangPartners ?? (item.ad as any)?.coupangPartners ?? 0),
        },
      };
    }
  }

  if (Array.isArray(item.apps) && item.apps.length > 0) {
    const selLower = selectedApp.toLowerCase();
    const norm = (s: string) => s.toLowerCase().replace(/[\s\-_]/g, "");
    const targetAliases = (APP_ALIAS_MAP[selLower] || [selLower]).map(norm);
    const targetSN = APP_SN_MAP[selLower];

    const matchedApps = item.apps.filter((app) => {
      if (targetSN && app.appSN === targetSN) return true;
      if (!app.appName) return false;
      const appNorm = norm(app.appName);
      return targetAliases.some(
        (alias) => appNorm.includes(alias) || alias.includes(appNorm)
      );
    });

    if (matchedApps.length > 0) {
      let paidCoin = 0, freeCoin = 0, chargeCoin = 0, usedReward = 0, contentRevenue = 0, adFree = 0, missionRewardP = 0;
      let b = 0, pop = 0, forus = 0, sense = 0, cash = 0, rc = 0, toss = 0, coupangSeller = 0, coupangPartners = 0;

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
        coupangSeller += Number(ad.coupangSeller ?? (ad as any).coupang ?? (app.ad as any)?.coupangSeller ?? (app.ad as any)?.coupang ?? 0);
        coupangPartners += Number(ad.coupangPartners ?? (app.ad as any)?.coupangPartners ?? 0);
      });

      return {
        paidCoin,
        freeCoin,
        chargeCoin,
        usedReward,
        contentRevenue,
        adFree,
        missionRewardP,
        ad: { b, pop, forus, sense, cash, rc, toss, coupangSeller, coupangPartners },
      };
    }
  }

  return null;
}
