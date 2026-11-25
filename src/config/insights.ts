import type { Category } from "@/lib/types";

/**
 * 트렌드 인사이트 페이지 설정.
 * 숫자는 모두 수집 기사에서 코드가 계산한다. 이 파일은 "무엇을 셀지"와 팀이 정하는 판단값(CL사업 연관도)만 담는다.
 */

/** 기술 성숙도 맵에 올릴 기술 (taxonomy.ts ENTITIES 의 canonical 이름) 과 색을 정할 카테고리 */
export const TRACKED_TECH: { name: string; category: Category }[] = [
  { name: "AMR", category: "AMR/AGV" },
  { name: "AGV", category: "AMR/AGV" },
  { name: "자율주행 지게차", category: "AMR/AGV" },
  { name: "AS/RS", category: "소팅/보관설비" },
  { name: "셔틀 시스템", category: "소팅/보관설비" },
  { name: "소터", category: "소팅/보관설비" },
  { name: "피스피킹", category: "로봇 피킹/매니퓰레이션" },
  { name: "팔레타이징", category: "로봇 피킹/매니퓰레이션" },
  { name: "휴머노이드", category: "로봇 피킹/매니퓰레이션" },
  { name: "피지컬 AI", category: "로봇 피킹/매니퓰레이션" },
  { name: "Goods-to-Person", category: "풀필먼트 자동화" },
  { name: "마이크로풀필먼트", category: "풀필먼트 자동화" },
  { name: "WMS/WES", category: "풀필먼트 자동화" },
  { name: "디지털 트윈", category: "풀필먼트 자동화" },
  { name: "라스트마일", category: "글로벌 트렌드" },
  { name: "드론 배송", category: "글로벌 트렌드" },
  { name: "콜드체인", category: "기타" },
  { name: "RaaS", category: "기타" },
];

/**
 * 기사 속 "단계 신호". 제목·요약에 이런 표현이 있으면 그 단계의 근거로 센다.
 * 단계 위치(pos)는 하이프 사이클 곡선의 가로 위치(0~1)이며, 기술의 위치 = 신호 위치의 가중 평균.
 */
export const STAGE_SIGNALS = [
  { key: "launch", label: "공개·개발", pos: 0.12, re: /공개|출시|발표|선보|개발|시연|unveil|launch|introduc|debut|prototype|demo|reveal/i },
  { key: "invest", label: "투자·기대", pos: 0.3, re: /투자\s*유치|펀딩|시리즈\s*[a-e]\b|상장|기업가치|인수|raises|raised|funding|valuation|\bipo\b|acquir|investment round/i },
  { key: "doubt", label: "회의·과제", pos: 0.52, re: /중단|철수|지연|적자|부진|우려|감원|파산|리콜|한계|halt|paus|delay|layoff|bankrupt|shut\s*down|struggl|recall|setback|scal(?:e|ing) back/i },
  { key: "pilot", label: "실증·시범", pos: 0.7, re: /시범|실증|파일럿|\bpoc\b|테스트|검증|pilot|trial|testing|proof of concept/i },
  { key: "adopt", label: "도입·확산", pos: 0.88, re: /도입|확대|증설|양산|수주|공급\s*계약|구축|가동|상용화|deploy|roll(?:s|ed|ing)?\s*out|scal(?:e|es|ing)\s*up|\bordered\b|contract|install|go(?:es)?\s*live|expand/i },
] as const;
export type StageKey = (typeof STAGE_SIGNALS)[number]["key"];

/** 곡선 위 구간 이름 (가로 위치 기준) */
export const CURVE_STAGES = [
  { label: "기술 태동", from: 0, to: 0.22 },
  { label: "기대 정점", from: 0.22, to: 0.42 },
  { label: "검증의 골", from: 0.42, to: 0.6 },
  { label: "실증 확산", from: 0.6, to: 0.8 },
  { label: "생산성 안정", from: 0.8, to: 1 },
] as const;

/** 동종사 레이더: 국내 물류·유통 기업 (taxonomy.ts canonical). self 는 강조 표시 */
export const PEERS: { name: string; self?: boolean }[] = [
  { name: "LX판토스", self: true },
  { name: "CJ대한통운" },
  { name: "한진" },
  { name: "롯데글로벌로지스" },
  { name: "현대글로비스" },
  { name: "삼성SDS" },
  { name: "쿠팡" },
  { name: "컬리" },
];

/**
 * CL사업 연관도 (팀 판단값: 3 높음 · 2 중간 · 1 낮음). 계약물류 센터 운영 관점에서 팀이 정해 고친다.
 * 우선 검토 보드의 열을 정한다. 숫자를 바꾸면 화면이 바로 바뀐다.
 */
export const CL_RELEVANCE: Record<string, 1 | 2 | 3> = {
  AMR: 3, "자율주행 지게차": 3, "AS/RS": 3, 소터: 3, 피스피킹: 3, 팔레타이징: 3, "WMS/WES": 3, "Goods-to-Person": 3,
  AGV: 2, "셔틀 시스템": 2, 휴머노이드: 2, "피지컬 AI": 2, "디지털 트윈": 2, 마이크로풀필먼트: 2, 콜드체인: 2, RaaS: 2,
  라스트마일: 1, "드론 배송": 1,
};

/**
 * 공개 경제 지표 (미국 세인트루이스 연준 FRED, 무료·키 불필요 CSV). GitHub Actions 가 매일 받아 시트에 저장한다.
 * 국내 운임지수(KCCI·SCFI 등)는 무료 공개 API 가 없어 링크로만 안내한다.
 */
export const FRED_SERIES = [
  { id: "TSIFRGHT", name: "화물운송 서비스 지수", note: "미국 교통통계국 · 트럭·철도·항공·수상 화물 물동량", unit: "지수" },
  { id: "FRGSHPUSM649NCIS", name: "Cass 화물 출하 지수", note: "북미 화주 출하 건수 · 물동량 선행 신호", unit: "지수" },
  { id: "PCU483111483111", name: "원양 해상화물 운임 물가", note: "미국 생산자물가 · 해상 운임 흐름", unit: "지수" },
  { id: "PCU481112481112", name: "항공화물 운임 물가", note: "미국 생산자물가 · 항공 운임 흐름", unit: "지수" },
] as const;

/** 외부 리포트 바로가기 (수치는 옮기지 않고 링크만. 주소는 팀이 고칠 수 있음) */
export const EXTERNAL_REPORTS = [
  { name: "Gartner Hype Cycle (Supply Chain)", by: "Gartner", what: "공급망 기술의 기대·성숙 단계. 이 페이지의 기술 성숙도 맵과 비교해 보기", href: "https://www.gartner.com/en/supply-chain" },
  { name: "Logistics Trend Radar", by: "DHL", what: "물류 트렌드 40여 개의 영향도·도입 시점 지도", href: "https://www.dhl.com/global-en/home/insights-and-innovation/insights/logistics-trend-radar.html" },
  { name: "Operations · Supply Chain Insights", by: "McKinsey", what: "디지털 물류 설문·공급망 리서치 모음", href: "https://www.mckinsey.com/capabilities/operations/our-insights" },
  { name: "MHI Annual Industry Report", by: "MHI", what: "물류 자동화 도입률·투자 의향 연례 설문", href: "https://www.mhi.org/publications/report" },
  { name: "KCCI 한국형 컨테이너 운임지수", by: "한국해양진흥공사", what: "부산발 컨테이너 운임 주간 지수", href: "https://www.kobc.or.kr" },
] as const;
