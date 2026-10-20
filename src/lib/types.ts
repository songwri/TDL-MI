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

/** 레포냥 레터 구조화 콘텐츠 (섹션 순서 = 메일 렌더링 순서) */
export interface NewsletterContent {
  /** 메일 제목 */
  headline: string;
  /** 오프닝: 이번 호에 무엇을 정리했는지 짧은 메시지 */
  intro: string;
  /** 1분 냥스: 짧은 뉴스 여러 건 */
  quickNews: {
    articleId: string;
    tag: string;
    title: string;
    emoji: string;
    body: string;
    source: string;
    url: string;
  }[];
  /** 오늘의 메인 리포트 */
  mainReport: {
    articleId: string;
    kicker: string;
    title: string;
    source: string;
    url: string;
    paragraphs: string[];
    keyPoints: string[];
    forUs: string[];
  };
  /** 츄르 스테이션: 따끈한 소식 한 조각 + 구독자 소통 */
  churuStation: {
    articleId: string;
    title: string;
    body: string;
    question: string;
    source: string;
    url: string;
  };
  /** 꼬리 뉴스: 지난 호와 이어지는 이야기 (Market Intelligence) */
  tailNews: {
    intro: string;
    items: { pastIssueLabel: string; topic: string; story: string }[];
    watchList: string[];
  };
  /** 마무리 한마디 */
  closing: string;
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
