/**
 * TDL Trend 브랜드: 이름·호수 표기·색상 (프롬프트와 이메일 템플릿이 공유)
 * 발행: 테크이노베이션팀 / 독자: CL사업부 (이름·독자는 환경변수로 바꿀 수 있음)
 */
export const BRAND = {
  /** 리포트 이름. 헤더: "테크이노베이션 TDL Trend 제N호" */
  product: "TDL Trend",
  kind: "Market Intelligence Report",
};

/** 호수 표기: 1 → "제1호" */
export const issueLabel = (n: number) => `제${n}호`;
export const issueShort = issueLabel;

export const COLORS = {
  brand: "#A72B2B",
  brandDeep: "#7E1F1F",
  brandTint: "#FBF1EF",
  ink: "#222222",
  sub: "#5F5F5F",
  mute: "#8A8A8A",
  line: "#DADADA",
  soft: "#F5F5F5",
  head: "#EEEEEE",
  paper: "#FFFFFF",
};

/** 차트에 쓰는 카테고리 색 (카테고리 순서와 같음). 인쇄·흑백에서도 구분되도록 명도를 나눔 */
export const CATEGORY_COLORS: Record<string, string> = {
  "AMR/AGV": "#A72B2B",
  "풀필먼트 자동화": "#2F4B7C",
  "소팅/보관설비": "#4F7F8C",
  "로봇 피킹/매니퓰레이션": "#C98A2B",
  "글로벌 트렌드": "#6B6B6B",
  기타: "#B8B8B8",
};
