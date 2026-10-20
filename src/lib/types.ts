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
  /** 생성된 구조화 콘텐츠 (로컬 캐시 전용) */
  content?: NewsletterContent;
  createdAt: string;
}

export interface NewsletterContent {
  headline: string;
  conceptBriefing: string;
  editorNote: string;
  deepDive: {
    articleId: string;
    title: string;
    source: string;
    url: string;
    summary: string;
    analysis: string[];
    keyPoints: string[];
    implications: string[];
  };
  briefs: {
    articleId: string;
    title: string;
    source: string;
    url: string;
    summary: string;
    keyPoint: string;
  }[];
  marketIntelligence: {
    overview: string;
    connections: { pastIssueLabel: string; topic: string; insight: string }[];
    watchList: string[];
  };
  closingTip: string;
  keywords: string[];
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
