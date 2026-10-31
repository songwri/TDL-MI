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

/**
 * 차트 색 (데이터 시각화 스킬의 검증된 팔레트 기준)
 * - 카테고리: 고정 순서의 5개 색 + "기타"는 회색. 색은 항목(카테고리)에 붙고 순위나 필터에 따라 바뀌지 않는다
 *   (색약 시뮬레이션 인접 색 차이와 정상 시야 차이 기준 통과, 막대 안 숫자와 범례로 색에만 의존하지 않음)
 * - 크기(히트맵): 파랑 한 가지 색의 연한 색 → 진한 색
 * - 강조: 브랜드 레드는 "지난 호에서도 이어지는 주제" 같은 한 가지 의미에만 쓰고 나머지는 회색
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "AMR/AGV": "#2A78D6",
  "풀필먼트 자동화": "#EB6834",
  "소팅/보관설비": "#1BAF7A",
  "로봇 피킹/매니퓰레이션": "#EDA100",
  "글로벌 트렌드": "#E87BA4",
  기타: "#A9A7A0",
};

export const RAMP = ["#CDE2FB", "#9EC5F4", "#6DA7EC", "#3987E5", "#1C5CAB", "#104281"] as const;

export const NEUTRALS = { strong: "#52514E", mid: "#A9A7A0", light: "#D6D4CC" } as const;
