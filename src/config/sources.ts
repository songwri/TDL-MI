import type { Region } from "@/lib/types";

/**
 * 수집 채널 정의. 사이트 주소만 넣어도 된다(type 생략 = auto).
 *  - auto: 홈페이지에서 RSS 를 자동 탐지 → 없으면 흔한 피드 경로 → 그래도 없으면 기사처럼 생긴 링크를 골라 수집
 *          새 사이트는 `npm run sources -- probe <주소>` 로 먼저 확인
 *  - rss:  RSS/Atom 피드 주소를 직접 지정 (가장 빠르고 안정적)
 *  - html: 목록 페이지에서 linkPattern에 맞는 기사 링크를 추출 후, 각 기사 페이지를 스크랩 (cheerio)
 * requireRelevance=true 인 채널은 RELEVANCE_KEYWORDS 매칭 기사만 적재한다(범용 매체용).
 * enrich=true 이면 기사 원문 페이지를 열어 본문/썸네일/발행일을 보강한다.
 */
export interface SourceDef {
  id: string;
  name: string;
  region: Region;
  type?: "auto" | "rss" | "html";
  url: string;
  /** html 타입: 기사 URL로 인정할 경로 패턴 */
  linkPattern?: string;
  requireRelevance?: boolean;
  enrich?: boolean;
  enabled: boolean;
  maxItems?: number;
}

const googleNews = (q: string, lang: "ko" | "en") =>
  lang === "ko"
    ? `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:14d&hl=ko&gl=KR&ceid=KR:ko`
    : `https://news.google.com/rss/search?q=${encodeURIComponent(q)}+when:14d&hl=en-US&gl=US&ceid=US:en`;

export const SOURCES: SourceDef[] = [
  // ── 국내 ──────────────────────────────────────────────
  {
    id: "klnews",
    name: "물류신문",
    region: "KR",
    type: "rss",
    url: "https://www.klnews.co.kr/rss/allArticle.xml",
    requireRelevance: false,
    enrich: true,
    enabled: true,
  },
  {
    id: "irobotnews",
    name: "로봇신문",
    region: "KR",
    type: "rss",
    url: "https://www.irobotnews.com/rss/allArticle.xml",
    requireRelevance: true,
    enrich: true,
    enabled: true,
  },
  {
    id: "cargonews",
    name: "카고뉴스",
    region: "KR",
    type: "rss",
    url: "https://www.cargonews.co.kr/rss/allArticle.xml",
    requireRelevance: true,
    enrich: true,
    enabled: true,
  },
  {
    id: "gnews-kr",
    name: "Google 뉴스(물류자동화)",
    region: "KR",
    type: "rss",
    url: googleNews("물류 자동화 OR 물류로봇 OR 풀필먼트 OR AMR", "ko"),
    requireRelevance: true,
    enrich: false,
    enabled: false,
    maxItems: 30,
  },
  // ── 해외 ──────────────────────────────────────────────
  {
    id: "supplychaindive",
    name: "Supply Chain Dive",
    region: "GLOBAL",
    type: "rss",
    url: "https://www.supplychaindive.com/feeds/news/",
    requireRelevance: true,
    enrich: true,
    enabled: true,
  },
  {
    id: "robotics247",
    name: "Robotics 24/7",
    region: "GLOBAL",
    type: "auto",
    url: "https://www.robotics247.com/",
    linkPattern: "/article/",
    requireRelevance: false,
    enrich: true,
    enabled: true,
    maxItems: 20,
  },
  {
    id: "mmh",
    name: "Modern Materials Handling",
    region: "GLOBAL",
    type: "auto",
    url: "https://www.mmh.com/",
    linkPattern: "/article/",
    requireRelevance: false,
    enrich: true,
    enabled: true,
    maxItems: 20,
  },
  {
    id: "logimat-cemat",
    name: "LogiMAT / CeMAT",
    region: "GLOBAL",
    type: "rss",
    url: googleNews("LogiMAT OR CeMAT intralogistics", "en"),
    requireRelevance: false,
    enrich: false,
    enabled: true,
    maxItems: 20,
  },
];
