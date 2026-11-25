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
  { key: "doubt", label: "리스크·과제", pos: 0.52, re: /중단|철수|지연|적자|부진|우려|감원|파산|리콜|한계|반발|갈등|파업|논란|규제|제동|무산|취소|사고|화재|피해|보류|halt|paus|delay|backlash|strike|protest|opposition|lawsuit|layoff|bankrupt|shut\s*down|struggl|recall|setback|scal(?:e|ing) back/i },
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

/**
 * 외부 리포트 (사이드바 '외부 리포트'). 유료·로그인 본문은 가져올 수 없어서
 *   1) 공개된 최신 발표의 핵심 사실(날짜·출처 링크 포함, 수치는 발표에 적힌 그대로)
 *   2) Gartner 는 공개 발표의 기술 단계 ↔ 우리 기사 기준 단계 비교
 *   3) 우리 수집 기사 중 해당 기관을 언급한 기사 (자동, 매일 갱신)
 * 을 보여 준다. 새 발표가 나오면 facts 를 고친다 (checkedAt 갱신).
 */
export interface ExternalSource {
  id: "gartner" | "dhl" | "mckinsey" | "mhi" | "kcci";
  name: string;
  /** 사이드바에 보일 짧은 이름 */
  short: string;
  by: string;
  href: string;
  /** 수집 기사에서 이 기관 언급을 찾는 표현 */
  match: RegExp;
  checkedAt: string;
  facts: { date: string; title: string; points: string[]; url: string }[];
  /** 공개 발표에 나온 기술 단계 (우리 추적 기술 이름과 연결) */
  compare?: { tech: string; theirs: string; note: string; url: string }[];
  note?: string;
}

const G_ROBOTS_2024 = "https://www.gartner.com/en/newsroom/press-releases/2024-11-12-gartner-hype-cycle-reveals-rising-adoption-and-fast-growing-market-for-advanced-mobile-robots-for-supply-chains";

export const EXTERNAL_SOURCES: ExternalSource[] = [
  {
    id: "gartner",
    name: "Gartner Hype Cycle",
    short: "Gartner Hype Cycle",
    by: "Gartner",
    href: "https://www.gartner.com/en/supply-chain",
    match: /gartner|가트너/i,
    checkedAt: "2026-11-25",
    note: "Hype Cycle 본문은 Gartner 고객 전용이라, 공개 보도자료에 나온 내용만 옮겼습니다.",
    facts: [
      {
        date: "2025-11-12",
        title: "공급망 계획 기술 하이프 사이클 2025",
        points: ["자율 계획(Autonomous planning)이 '기대 정점'을 지나, 공급망 계획에서 가장 영향력 큰 흐름 중 하나로 부상"],
        url: "https://www.gartner.com/en/newsroom/press-releases/2025-11-12-gartner-says-autonomous-planning-has-passed-the-peak-of-inflated-expectations-on-supply-chain-planning-technology-hype-cycle",
      },
      {
        date: "2025-09-29",
        title: "공급망 전략 하이프 사이클 2025",
        points: ["공급망 사이버보안이 '기대 정점'에 위치"],
        url: "https://www.gartner.com/en/newsroom/press-releases/2025-09-29-gartner-says-supply-chain-cybersecurity-is-at-peak-of-inflated-expectations",
      },
      {
        date: "2025-07-24",
        title: "Hype Cycle for Supply Chain Execution and Logistics Technologies, 2025",
        points: ["물류·실행 기술의 성숙도·위험도를 다룬 최신판 발행 (기술별 위치는 고객 전용)"],
        url: "https://www.gartner.com/en/supply-chain",
      },
      {
        date: "2024-11-12",
        title: "공급망용 모바일 로봇·드론 하이프 사이클 2024",
        points: [
          "운반용 AMR, 통로 내 피킹 로봇, 이동형 Goods-to-Person 이 '계몽 단계(Slope of Enlightenment)'로 이동 중",
          "휴머노이드 로봇이 처음으로 '기술 태동(Innovation Trigger)'에 진입, 주류 도입까지 10년 이상 전망",
        ],
        url: G_ROBOTS_2024,
      },
    ],
    compare: [
      { tech: "AMR", theirs: "계몽 단계로 이동 중", note: "운반용 AMR (2024)", url: G_ROBOTS_2024 },
      { tech: "Goods-to-Person", theirs: "계몽 단계로 이동 중", note: "이동형 G2P (2024)", url: G_ROBOTS_2024 },
      { tech: "피스피킹", theirs: "계몽 단계로 이동 중", note: "통로 내 피킹 로봇 (2024)", url: G_ROBOTS_2024 },
      { tech: "휴머노이드", theirs: "기술 태동", note: "주류 도입 10년 이상 (2024)", url: G_ROBOTS_2024 },
    ],
  },
  {
    id: "dhl",
    name: "DHL Logistics Trend Radar",
    short: "DHL Trend Radar",
    by: "DHL",
    href: "https://www.dhl.com/logistics-trend-radar",
    match: /\bdhl\b/i,
    checkedAt: "2026-11-25",
    note: "약 2년마다 새 판이 나옵니다. 트렌드 40개 전체와 영향도·도입 시점은 DHL 사이트의 대화형 레이더에서 볼 수 있습니다.",
    facts: [
      {
        date: "2024",
        title: "Logistics Trend Radar 7.0",
        points: [
          "트렌드 40개 (사회·비즈니스 17, 기술 23), 각 트렌드에 영향도(높음·낮음)와 도입 예상 시점 표시",
          "AI 신흥 트렌드 5개: Generative AI, AI Ethics, Audio AI, Computer Vision, Advanced Analytics",
          "지속가능성 중점: Renewable Energy Infrastructure, Sustainable Fuels",
          "로보틱스·IoT·디지털 백본 묶음이 계속 물류에 큰 영향, 사회·비즈니스 쪽은 E-commerce Evolution 등",
        ],
        url: "https://aircargoweek.com/dhl-logistics-trend-radar-7-0-unveils-emerging-ai-trends-and-sustainable-solutions",
      },
    ],
  },
  {
    id: "mckinsey",
    name: "McKinsey Operations · Supply Chain Insights",
    short: "McKinsey Supply Chain",
    by: "McKinsey",
    href: "https://www.mckinsey.com/capabilities/operations/our-insights",
    match: /mckinsey|맥킨지/i,
    checkedAt: "2026-11-25",
    facts: [
      {
        date: "2025",
        title: "Supply chain risk pulse 2025 (공급망 리더 약 100명 설문)",
        points: [
          "관세가 최대 관심사, 대응은 재고 이동·공급사 협상·니어쇼어링 같은 단기 조치 위주",
          "관세 비용의 고객 전가 비율 가중 평균 45%, 응답자 43%가 3년 안에 미국 내 생산 비중 확대 계획",
          "대부분 1차 협력사까지만 리스크 파악, 2차 협력사 매핑 58% (그중 절반 미만만 정기 접촉)",
          "리스크 대비 재고 버퍼는 3년째 축소 (현금 흐름 압박)",
          "생성형 AI 활용 상위: 수요 예측, 재고 최적화, 공급 계획",
        ],
        url: "https://www.mckinsey.com/capabilities/operations/our-insights/supply-chain-risk-survey",
      },
    ],
  },
  {
    id: "mhi",
    name: "MHI Annual Industry Report",
    short: "MHI Industry Report",
    by: "MHI",
    href: "https://www.mhi.org/publications/report",
    match: /\bmhi\b|promat|modex/i,
    checkedAt: "2026-11-25",
    note: "미국 물류·자재 취급 협회(MHI)가 매년 내는 업계 설문 보고서입니다. 세부 수치는 원문 PDF(무료 등록)에서 볼 수 있습니다. 수집 기사 언급에는 MHI 가 여는 ProMat·MODEX 전시 기사도 포함합니다.",
    facts: [
      {
        date: "2025",
        title: "MHI Annual Industry Report 2025 (12번째 판)",
        points: ["업계 리더의 절반 이상이 설비·인력·물자를 끝에서 끝까지 연결하는(엔드투엔드 오케스트레이션) 공급망 기술 투자를 늘릴 계획"],
        url: "https://www.mhisolutionsmag.com/index.php/tag/mhi-annual-industry-report-2025/",
      },
    ],
  },
  {
    id: "kcci",
    name: "KCCI 한국형 컨테이너 운임지수",
    short: "KCCI 운임지수",
    by: "한국해양진흥공사",
    href: "https://www.kobc.or.kr",
    match: /kcci|한국형\s*컨테이너\s*운임/i,
    checkedAt: "2026-11-25",
    note: "매주 발표되는 지수라, 최신 값은 아래 '수집 기사 속 언급'에서 주간 보도로 확인하는 것이 가장 빠릅니다. 원 데이터는 한국해양진흥공사 사이트에서 봅니다.",
    facts: [
      {
        date: "2025-11",
        title: "공식 발표 3주년",
        points: [
          "2022.11.7 첫 공식 발표, 매주 발표 (3년간 150회), 운임 제공 패널 10개사 → 25개사",
          "주요 항로: 북미 서안·동안, 중남미, 북유럽·지중해, 중동, 중국·일본·동남아 연근해 (40피트 컨테이너 기준 운임)",
          "2024.9 블룸버그 터미널, 2025.11 알파라이너 플랫폼에 지수 제공",
        ],
        url: "https://www.fnnews.com/news/202511131038475784",
      },
    ],
  },
];
