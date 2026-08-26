"use client";

import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Eye,
  Users,
  Film,
  TrendingUp,
  Search,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles,
  Layers,
  Clock,
  ChevronDown,
  Award,
} from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
} from "chart.js";
import { ContentItem, GenreItem, ContentViewItem } from "@/types/dashboard";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

ChartJS.defaults.font.family = "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif";

interface ContentDashboardProps {
  contentRaw: ContentItem[];
  genresRaw: GenreItem[];
  contentViewRaw: ContentViewItem[];
  contentPurchaseRaw: any[];
  loading: boolean;
}

interface ContentDashboardProps {
  contentRaw: ContentItem[];
  genresRaw: GenreItem[];
  contentViewRaw: ContentViewItem[];
  contentPurchaseRaw: any[];
  loading: boolean;
}

// Strict deterministic type parser based on ClickHouse content code prefix & contentType
function parseContentType(title: string, typeRaw?: string | number): string {
  const typeStr = String(typeRaw || "").trim().toLowerCase();
  if (typeStr === "1" || typeStr.includes("toon") || typeStr.includes("웹툰")) return "웹툰";
  if (typeStr === "2" || typeStr.includes("novel") || typeStr.includes("웹소설")) return "웹소설";
  if (typeStr === "3" || typeStr.includes("drama") || typeStr.includes("숏드라마")) return "숏드라마";

  const titleLower = (title || "").toLowerCase();
  if (titleLower.startsWith("cw")) return "웹툰";
  if (titleLower.startsWith("cn")) return "웹소설";
  if (titleLower.startsWith("cd") || titleLower.startsWith("sd")) return "숏드라마";
  if (titleLower.includes("webtoon")) return "웹툰";
  if (titleLower.includes("webnovel")) return "웹소설";
  if (titleLower.includes("shortdrama") || titleLower.includes("drama")) return "숏드라마";

  return "웹툰";
}

// Format raw content code into human-readable work title
function formatContentTitle(code: string): string {
  const trimmed = (code || "").trim();
  if (!trimmed) return "제목 없음";
  if (trimmed === "webtoon") return "웹툰 카테고리 전체 (홈/메뉴 진입)";
  if (trimmed === "webnovel") return "웹소설 카테고리 전체 (홈/메뉴 진입)";
  if (trimmed === "shortdrama" || trimmed === "drama") return "숏드라마 카테고리 전체 (홈/메뉴 진입)";
  if (trimmed === "all" || trimmed === "main") return "메인 탭 전체";
  if (trimmed.startsWith("/collection") || trimmed.startsWith("special")) return "기획전 / 특별 컬렉션 배너";

  const titleMap: Record<string, string> = {
    cwcae7bdd27b: "서라벌 로맨스",
    cw3028c5f610: "유월의 복숭아",
    cw25a3a42763: "페로몬 인 더 딥",
    cw36625babaf: "괴물이 산다",
    cw1ab6588552: "과거에서 재능이 쏟아져",
    cw5ac6e0fa13: "악녀는 화려하게 데뷔한다",
    cw8d90eae96e: "내 인생에서 사라져 주세요",
    cw93b97d5580: "간지날수록 강해져",
    cw580c2480e4: "비서실격",
    cwcc6be91761: "그 남자 약혼녀 구출 작전",
    cw07ef692483: "글 안 쓰는 천재작가",
    cw08bdb59792: "플래닛 워커",
    cwa8a6289de4: "인별당",
    cw5d4f29f5a0: "9서클 영주님",
    cw9f1f924af3: "날로 먹는 인생문",
    cw8aaa506e12: "고인물, 망나니로 살아남기",
    cw993218ded2: "공작가 막내는 원샷원킬",
    cw9754e43101: "1941 타임슬립 대전략",
    cwa6b2ea0589: "갑자기 양녕에 빙의함",
    cw190b54890e: "나만 아는 주인공들",
    cw746745156a: "1969, JP가 되었다",
    cwb840ab8aa6: "검은머리 MLB 단장",
    cw8af3d3f1e9: "축구를 너무 잘함",
    cw7c15517fcc: "눈 떠보니 조선군관",
    cwb27647ae4e: "트라웃의 동창으로 산다는 건",
    cw5707c59aa3: "대역공녀에게 후회는 필요 없습니다",
    cw6155295dbc: "재벌집 막내 구단주",
    cw1aecc08e44: "그대, 사랑을 꿈꾸나요",
    cwf43a7d90db: "당신의 하루",
    cw8bfc45db93: "따뜻하게, 다시",
    cw5d67372bbf: "사랑이 보이지 않아",
    cwd0a6effe8f: "잠 못 드는 밤",
    cwc73300cdf1: "떠난 악녀를 찾지 마세요",
    cwcdd9503430: "저도 결혼은 처음이라서요",
    cw4a614149ac: "너의 소울푸드가 보여!",
    cwcfc4e78960: "술탄의 귀한 고양이가 되었습니다",
    cw7509ac0454: "농사로 이계 평정",
    cwe4a4fba9ae: "대치동 클래스",
    cw6afe77e87b: "실수로 남주의 동생을 꼬셔버렸다",
    cwbf8ccb2eb3: "두 번 사는 음악천재",
    cwc50078c531: "왜 하필 시누이죠?",
    cw77052763dd: "제가 모두 이혼시켜 드리겠습니다",
    cw8b8b9fd595: "용돈이 계속 늘어!",
    cw888e5563de: "호랑이님의 딸이 되었습니다",
    cwf6023d0576: "의술의 탑",
    cw4fb3561bdd: "홍 의관의 은밀한 비밀",
    cwa19f98c033: "이번엔 진짜 재벌!",
    cw9a0cf01978: "미지의 신세계",
    cwf173fc26a8: "마법사의 밤",
    cwfba8935ccf: "별빛 아래서",
    cw70e5ccd0fa: "린지 앤 린지안",
    cw46e9579378: "C.O.P",
    cn6d708e55d3: "받아보면 아는 포수",
    cn401d1853be: "귀환용사의 골목식당",
    cw02edfb4bee: "슬기로운 퇴사 생활",
    cw21b8391304: "은혜로운 회사생활",
    cw217cce739f: "손맛으로 구제하는 망돌 인생",
    cn17acfd1e86: "아카데미 천재 여검사의 남동생이 되었다",
    cn18ab3d5d68: "독 먹는 힐러",
    cn1b222ed2bf: "서울역 네크로맨서",
    cn301b329060: "말단 병사에서 군주까지",
  };

  if (titleMap[trimmed]) {
    return titleMap[trimmed];
  }

  // Formatting for unmapped work codes with clean, non-verbose format
  if (trimmed.startsWith("cw")) return `웹툰 (${trimmed})`;
  if (trimmed.startsWith("cn")) return `웹소설 (${trimmed})`;
  if (trimmed.startsWith("cd") || trimmed.startsWith("sd")) return `숏드라마 (${trimmed})`;

  return trimmed;
}

export const ContentDashboard: React.FC<ContentDashboardProps> = ({
  contentRaw,
  genresRaw,
  contentViewRaw,
  contentPurchaseRaw,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"clickCount" | "clickUserCount" | "impressionCount">("clickCount");

  // 1. KPI Aggregates
  const kpiData = useMemo(() => {
    const totalEpisodeViews = contentViewRaw.reduce((acc, curr) => acc + (Number(curr.episodeViewCount) || 0), 0);
    const totalReaderUu = contentViewRaw.reduce((acc, curr) => Math.max(acc, Number(curr.readerUu) || 0), 0);
    const avgEpisodesPerUser = totalReaderUu > 0 ? (totalEpisodeViews / totalReaderUu).toFixed(1) : "0.0";
    
    // Average waitfree rate
    const validWaitfreeRows = contentViewRaw.filter((r) => r.waitfreeEpisodeRate != null);
    const avgWaitfreeRate = validWaitfreeRows.length > 0
      ? (validWaitfreeRows.reduce((acc, curr) => acc + Number(curr.waitfreeEpisodeRate || 0), 0) / validWaitfreeRows.length * 100).toFixed(1)
      : "0.0";

    // Alternative view counts from contentRaw if contentViewRaw is empty
    const rawTotalViews = contentRaw.reduce((acc, curr) => acc + (Number(curr.clickCount) || 0), 0);
    const rawTotalUsers = contentRaw.reduce((acc, curr) => acc + (Number(curr.clickUserCount) || 0), 0);

    return {
      totalViews: totalEpisodeViews > 0 ? totalEpisodeViews : rawTotalViews,
      totalUsers: totalReaderUu > 0 ? totalReaderUu : rawTotalUsers,
      avgEpisodes: avgEpisodesPerUser,
      waitfreeRate: avgWaitfreeRate,
    };
  }, [contentViewRaw, contentRaw]);

  // 2. Genre Popularity Aggregates (Strict DB values)
  const genreAggregated = useMemo(() => {
    const map = new Map<string, { genre: string; clickCount: number; clickUserCount: number; impressionCount: number }>();
    
    // Process genresRaw
    genresRaw.forEach((item) => {
      const gName = item.genre?.trim() || "미수집";
      const existing = map.get(gName) || { genre: gName, clickCount: 0, clickUserCount: 0, impressionCount: 0 };
      existing.clickCount += Number(item.clickCount) || 0;
      existing.clickUserCount += Number(item.clickUserCount) || 0;
      existing.impressionCount += Number(item.impressionCount) || 0;
      map.set(gName, existing);
    });

    // Enrichment from contentRaw
    if (map.size === 0) {
      contentRaw.forEach((item) => {
        const gName = item.genre?.trim() || "미수집";
        const existing = map.get(gName) || { genre: gName, clickCount: 0, clickUserCount: 0, impressionCount: 0 };
        existing.clickCount += Number(item.clickCount) || 0;
        existing.clickUserCount += Number(item.clickUserCount) || 0;
        existing.impressionCount += Number(item.impressionCount) || 0;
        map.set(gName, existing);
      });
    }

    const list = Array.from(map.values()).sort((a, b) => b.clickCount - a.clickCount);
    const totalClicks = list.reduce((acc, curr) => acc + curr.clickCount, 0);

    return { list, totalClicks };
  }, [genresRaw, contentRaw]);

  // Genre Chart Data
  const genreChartData: ChartData<"doughnut"> = useMemo(() => {
    const topGenres = genreAggregated.list.slice(0, 6);
    const otherClicks = genreAggregated.list.slice(6).reduce((acc, curr) => acc + curr.clickCount, 0);

    const labels = topGenres.map((g) => g.genre);
    const data = topGenres.map((g) => g.clickCount);

    if (otherClicks > 0) {
      labels.push("기타");
      data.push(otherClicks);
    }

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            "#3182f6",
            "#8b5cf6",
            "#ec4899",
            "#00c980",
            "#f59e0b",
            "#06b6d4",
            "#94a3b8",
          ],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [genreAggregated]);

  // 3. Works/Content List Aggregated & Filtered (Strict DB values with work title mapping)
  const contentListAggregated = useMemo(() => {
    const map = new Map<
      string,
      {
        content: string;
        contentType: string;
        genre: string;
        clickCount: number;
        clickUserCount: number;
        impressionCount: number;
      }
    >();

    contentRaw.forEach((item) => {
      const rawCode = item.content?.trim() || "제목 없음";
      const displayTitle = formatContentTitle(rawCode);
      const contentType = parseContentType(rawCode, item.contentType);
      const genre = item.genre?.trim() || "미수집";

      const key = `${rawCode}_${contentType}`;
      const existing = map.get(key) || {
        content: displayTitle,
        contentType,
        genre,
        clickCount: 0,
        clickUserCount: 0,
        impressionCount: 0,
      };

      existing.clickCount += Number(item.clickCount) || 0;
      existing.clickUserCount += Number(item.clickUserCount) || 0;
      existing.impressionCount += Number(item.impressionCount) || 0;

      map.set(key, existing);
    });

    let result = Array.from(map.values());

    // Content Type Filter
    if (selectedTypeFilter !== "all") {
      result = result.filter((item) => {
        const typeLower = (item.contentType || "").toLowerCase();
        const titleLower = (item.content || "").toLowerCase();
        if (selectedTypeFilter === "webtoon") {
          return typeLower.includes("toon") || typeLower.includes("웹툰") || titleLower.includes("웹툰");
        }
        if (selectedTypeFilter === "webnovel") {
          return typeLower.includes("novel") || typeLower.includes("웹소설") || titleLower.includes("웹소설");
        }
        if (selectedTypeFilter === "shortdrama") {
          return typeLower.includes("drama") || typeLower.includes("숏드라마") || titleLower.includes("숏드라마");
        }
        return true;
      });
    }

    // Search Filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (item) => item.content.toLowerCase().includes(term) || item.genre.toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));

    return result;
  }, [contentRaw, selectedTypeFilter, searchTerm, sortBy]);

  // 4. Content Purchase Type Distribution
  const purchaseTypeAggregated = useMemo(() => {
    const typeNames: Record<number, string> = {
      0: "무료",
      10: "유료 대여",
      11: "기다려서 무료 (기다무)",
      12: "무료 티켓",
      13: "광고 보고 무료 (광고무)",
      20: "유료 소장",
      90: "취소/환불",
    };

    const typeColors: Record<number, string> = {
      0: "#94a3b8",
      10: "#3182f6",
      11: "#8b5cf6",
      12: "#06b6d4",
      13: "#f59e0b",
      20: "#00c980",
      90: "#ef4444",
    };

    const map = new Map<number, { cnt: number; uu: number }>();
    contentPurchaseRaw.forEach((row) => {
      const pType = Number(row.purchaseType);
      const existing = map.get(pType) || { cnt: 0, uu: 0 };
      existing.cnt += Number(row.cnt) || 0;
      existing.uu += Number(row.uu) || 0;
      map.set(pType, existing);
    });

    const labels: string[] = [];
    const data: number[] = [];
    const bgColors: string[] = [];

    map.forEach((val, pType) => {
      labels.push(typeNames[pType] || `기타 (${pType})`);
      data.push(val.cnt);
      bgColors.push(typeColors[pType] || "#cbd5e1");
    });

    return {
      labels,
      datasets: [
        {
          label: "이용 건수",
          data,
          backgroundColor: bgColors,
          borderRadius: 6,
        },
      ],
    };
  }, [contentPurchaseRaw]);

  return (
    <div className="space-y-6">
      {/* 1. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 총 감상 횟수 */}
        <div className="bg-white rounded-2xl p-5 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            총 작품 감상 횟수
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {loading ? "..." : `${kpiData.totalViews.toLocaleString()}`}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">회</span>
          </div>
          <div className="text-[11px] text-[#8b95a1] font-medium pt-1.5 border-t border-[#f2f4f6]">
            조회 기간 내 전체 회차 클릭 기준
          </div>
        </div>

        {/* Card 2: 감상 독자 수 */}
        <div className="bg-white rounded-2xl p-5 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            총 감상 독자 수 (UU)
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {loading ? "..." : `${kpiData.totalUsers.toLocaleString()}`}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">명</span>
          </div>
          <div className="text-[11px] text-[#8b95a1] font-medium pt-1.5 border-t border-[#f2f4f6]">
            작품을 1회 이상 감상한 독자
          </div>
        </div>

        {/* Card 3: 독자당 평균 감상 회차 */}
        <div className="bg-white rounded-2xl p-5 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            독자당 평균 감상 회차
          </div>
          <div className="text-[26px] font-bold text-[#3182f6] tracking-[-0.04em]">
            {loading ? "..." : `${kpiData.avgEpisodes}`}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">회</span>
          </div>
          <div className="text-[11px] text-[#8b95a1] font-medium pt-1.5 border-t border-[#f2f4f6]">
            독자 1인당 평균 회차 소비 깊이
          </div>
        </div>

        {/* Card 4: 대표 장르 수 */}
        <div className="bg-white rounded-2xl p-5 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all space-y-2">
          <div className="text-[13px] font-semibold text-[#8b95a1]">
            집계된 장르 종류
          </div>
          <div className="text-[26px] font-bold text-[#191f28] tracking-[-0.04em]">
            {loading ? "..." : `${genreAggregated.list.length}`}
            <span className="text-[16px] font-medium text-[#4e5968] ml-0.5">개</span>
          </div>
          <div className="text-[11px] text-[#8b95a1] font-medium pt-1.5 border-t border-[#f2f4f6]">
            인기 카테고리 분포 수
          </div>
        </div>
      </div>

      {/* 3. Genre Popularity & Purchase Type Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 장르별 인기도 순위 & 도넛 차트 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-[#f2f4f6]">
            <div>
              <h2 className="text-base font-bold text-[#191f28] flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#3182f6]" />
                장르별 인기도 및 감상 비중
              </h2>
              <p className="text-xs text-[#8b95a1] mt-0.5">인기 장르 순위 및 전체 감상 클릭 대비 장르 점유율</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
              Top {Math.min(6, genreAggregated.list.length)} 장르
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-4">
            {/* Doughnut Chart */}
            <div className="relative h-56 flex items-center justify-center">
              {genreAggregated.list.length > 0 ? (
                <Doughnut
                  data={genreChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "right", labels: { boxWidth: 10, font: { size: 11 } } },
                    },
                    cutout: "68%",
                  }}
                />
              ) : (
                <div className="text-xs text-[#8b95a1]">장르 집계 데이터 준비 중...</div>
              )}
            </div>

            {/* Ranked List */}
            <div className="space-y-2.5">
              {genreAggregated.list.slice(0, 5).map((g, idx) => {
                const sharePct = genreAggregated.totalClicks > 0
                  ? ((g.clickCount / genreAggregated.totalClicks) * 100).toFixed(1)
                  : "0.0";
                return (
                  <div key={g.genre} className="flex items-center justify-between p-2.5 rounded-xl bg-[#f8f9fa] border border-[#f2f4f6] hover:bg-[#f2f4f6]/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? "bg-amber-400 text-slate-950" : idx === 1 ? "bg-[#d1d6db] text-[#191f28]" : idx === 2 ? "bg-amber-700 text-white" : "bg-[#e5e8eb] text-[#4e5968]"
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-[#191f28]">{g.genre}</div>
                        <div className="text-[10px] text-[#8b95a1]">독자 {g.clickUserCount.toLocaleString()}명</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#3182f6]">{g.clickCount.toLocaleString()}회</div>
                      <div className="text-[10px] text-[#8b95a1] font-medium">{sharePct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: 감상/이용 유형 분포 차트 */}
        <div className="bg-white rounded-2xl p-6 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          <div className="pb-4 border-b border-[#f2f4f6]">
            <h2 className="text-base font-bold text-[#191f28] flex items-center gap-2">
              <Film className="w-4 h-4 text-[#a98eff]" />
              감상 이용 방식 분포
            </h2>
            <p className="text-xs text-[#8b95a1] mt-0.5">유료 대여/소장, 기다무, 광고무, 무료</p>
          </div>

          <div className="h-56 my-4">
            {purchaseTypeAggregated.labels.length > 0 ? (
              <Bar
                data={purchaseTypeAggregated}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${Number(ctx.raw).toLocaleString()}건`,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: { grid: { color: "#f2f4f6" }, ticks: { font: { size: 10 } } },
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#8b95a1]">
                감상 이용 방식 데이터 준비 중...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Content Works Ranking Table */}
      <div className="bg-white rounded-2xl p-6 border border-[#e5e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#f2f4f6]">
          <div>
            <h2 className="text-base font-bold text-[#191f28] flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              작품별 감상 순위 및 탐색
            </h2>
            <p className="text-xs text-[#8b95a1] mt-0.5">
              조회 조건에 따른 작품별 감상 횟수, 유저 수 및 노출 대비 클릭률
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter Tabs */}
            <div className="flex bg-[#f2f4f6] p-1 rounded-xl gap-0.5 text-xs">
              <button
                onClick={() => setSelectedTypeFilter("all")}
                className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                  selectedTypeFilter === "all"
                    ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "text-[#6b7684] font-medium hover:text-[#191f28]"
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedTypeFilter("webtoon")}
                className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                  selectedTypeFilter === "webtoon"
                    ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "text-[#6b7684] font-medium hover:text-[#191f28]"
                }`}
              >
                웹툰
              </button>
              <button
                onClick={() => setSelectedTypeFilter("webnovel")}
                className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                  selectedTypeFilter === "webnovel"
                    ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "text-[#6b7684] font-medium hover:text-[#191f28]"
                }`}
              >
                웹소설
              </button>
              <button
                onClick={() => setSelectedTypeFilter("shortdrama")}
                className={`px-3 py-1.5 transition-all cursor-pointer rounded-lg ${
                  selectedTypeFilter === "shortdrama"
                    ? "bg-white text-[#191f28] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "text-[#6b7684] font-medium hover:text-[#191f28]"
                }`}
              >
                숏드라마
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b95a1]" />
              <input
                type="text"
                placeholder="작품명 / 장르 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#f8f9fa] border border-[#e5e8eb] rounded-xl text-xs text-[#191f28] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f8f9fa] border-b border-[#e5e8eb]/80 text-[#8b95a1] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-16 text-center">순위</th>
                <th className="py-3 px-4">작품명</th>
                <th className="py-3 px-4">카테고리</th>
                <th className="py-3 px-4">장르</th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#191f28] transition-colors"
                  onClick={() => setSortBy("clickCount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>감상 횟수</span>
                    {sortBy === "clickCount" && <ChevronDown className="w-3 h-3 text-[#3182f6]" />}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#191f28] transition-colors"
                  onClick={() => setSortBy("clickUserCount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>감상 독자 수 (UU)</span>
                    {sortBy === "clickUserCount" && <ChevronDown className="w-3 h-3 text-[#3182f6]" />}
                  </div>
                </th>
                <th
                  className="py-3 px-4 text-right cursor-pointer hover:text-[#191f28] transition-colors"
                  onClick={() => setSortBy("impressionCount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>노출 수</span>
                    {sortBy === "impressionCount" && <ChevronDown className="w-3 h-3 text-[#3182f6]" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f2f4f6]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8b95a1]">
                    작품 데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : contentListAggregated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8b95a1]">
                    조건에 해당하는 작품 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                contentListAggregated.map((item, idx) => (
                  <tr key={item.content + idx} className="hover:bg-[#f8f9fa] transition-colors">
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[11px] font-bold ${
                          idx === 0
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : idx === 1
                            ? "bg-[#e5e8eb] text-[#191f28]"
                            : idx === 2
                            ? "bg-amber-900/10 text-amber-900"
                            : "text-[#8b95a1]"
                        }`}
                      >
                        {idx + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#191f28]">{item.content}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-[#f2f4f6] text-[#4e5968] text-[10px] font-medium rounded-md border border-[#e5e8eb]">
                        {item.contentType || "일반"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-md">
                        {item.genre || "미분류"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#3182f6]">
                      {item.clickCount.toLocaleString()} 회
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#191f28]">
                      {item.clickUserCount.toLocaleString()} 명
                    </td>
                    <td className="py-3 px-4 text-right text-[#8b95a1]">
                      {item.impressionCount > 0 ? `${item.impressionCount.toLocaleString()} 회` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
