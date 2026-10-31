export type Region = "KR" | "GLOBAL";

export const CATEGORIES = [
  "AMR/AGV",
  "풀필먼트 자동화",
  "소팅/보관설비",
  "로봇 피킹/매니퓰레이션",
  "글로벌 트렌드",
  "기타",
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Article {
  id: string;
  collectedAt: string; // ISO
  publishedAt: string; // ISO
  source: string;
  region: Region;
  title: string;
  link: string;
  summary: string;
  /** 본문 텍스트 (로컬 캐시에만 보관, 시트에는 저장하지 않음) */
  content?: string;
  thumbnail?: string;
  category: Category;
  keywords: string[];
  /** 수집한 채널 ID (config/sources.ts 의 id). 예전 기사는 비어 있을 수 있음 */
  channel?: string;
  /** 이번 호 후보로 체크됨 */
  selected: boolean;
  /** 발행된 호수 (발행 확정 시 기록) */
  publishedInIssue?: number | null;
  isSample?: boolean;
}

export interface NewsletterIssue {
  issueNo: number;
  publishDate: string; // YYYY-MM-DD
  concept: string;
  articleIds: string[];
  html: string;
  keywords: string[];
  headline?: string;
  /** 생성된 구조화 콘텐츠 */
  content?: ReportContent;
  createdAt: string;
}

/**
 * TDL Trend 리포트 구조화 콘텐츠.
 * Claude 가 쓰는 부분(ReportDraft)과 서버가 계산해 붙이는 통계(stats)로 이루어진다.
 */
export interface ReportDraft {
  /** 메일 제목 겸 리포트 제목 */
  headline: string;
  /** 핵심 요약 (결론 먼저, 3~5개) */
  executiveSummary: string[];
  /** 선정 기사들을 공통 주제로 묶은 기사형 인사이트 */
  themes: {
    title: string;
    lead: string;
    body: string[];
    insights: string[];
    implications: string[];
    /** 근거가 되는 선정 기사 ID (원문 링크로 연결됨) */
    sourceArticleIds: string[];
  }[];
  /** 지난 호 대비 추세 해석 (통계 인용) */
  trend: { overview: string; notes: string[] };
  /** 제언 (CL사업부 관점) */
  recommendations: string[];
  /** 향후 주목 사항 */
  watchList: string[];
  keywords: string[];
}

export interface ReportStats {
  total: number;
  byCategory: { label: string; count: number }[];
  byRegion: { label: string; count: number }[];
  /** seenBefore: 지난 호에서도 등장한 키워드 */
  topKeywords: { label: string; count: number; seenBefore?: boolean }[];
  /** 이번 호 기사 중 지난 호와의 관계 */
  repeat: { fresh: number; followUp: number; duplicate: number };
  /** 최근 호 + 이번 호 (오래된 순) */
  trend: {
    issues: { no: number; date: string; current: boolean }[];
    category: { label: string; counts: number[] }[];
    keywords: { label: string; counts: number[] }[];
  };
}

export type ReportContent = ReportDraft & { stats?: ReportStats };

/** 웹 인터랙티브 리포트 화면에 필요한 부가 정보 (선정 기사 순서 = 참고 기사 번호) */
export interface ViewerData {
  issueNo: number;
  publishDate: string;
  brand: { product: string; publisher: string; audience: string };
  articles: Pick<Article, "id" | "title" | "source" | "link" | "publishedAt" | "category" | "region">[];
}

export type RelationKind = "duplicate" | "follow-up" | "related";

export interface IssueRelation {
  issueNo: number;
  publishDate: string;
  articleId?: string;
  articleTitle?: string;
  sharedKeywords: string[];
  score: number;
  kind: RelationKind;
  label: string;
}

export interface ArticleIntel {
  articleId: string;
  relations: IssueRelation[];
}

export interface RefreshResult {
  added: number;
  duplicates: number;
  filtered: number;
  perSource: { source: string; fetched: number; added: number; error?: string }[];
}
