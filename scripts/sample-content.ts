import type { ReportContent } from "@/lib/types";

/** 톤·레이아웃·인포그래픽 확인용 예시 리포트 (기사 내용은 샘플 데이터 기준의 가상 예시) */
export const SAMPLE_ARTICLES = [
  { id: "s1", title: "AutoStore unveils next-gen picking port with integrated robotic arm", source: "Robotics 24/7", link: "https://example.com/sample/c1", publishedAt: "2026-10-17", region: "GLOBAL" as const },
  { id: "s2", title: "CJ대한통운, 곤지암 메가허브에 AMR 200대 추가 투입", source: "물류신문", link: "https://example.com/sample/c2", publishedAt: "2026-10-18", region: "KR" as const },
  { id: "s3", title: "Agility Robotics raises new round to scale Digit humanoid production", source: "Supply Chain Dive", link: "https://example.com/sample/c3", publishedAt: "2026-10-15", region: "GLOBAL" as const },
  { id: "s4", title: "현대글로비스, 디지털 트윈 기반 물류센터 시뮬레이션 플랫폼 구축", source: "카고뉴스", link: "https://example.com/sample/c4", publishedAt: "2026-10-14", region: "KR" as const },
  { id: "s5", title: "Tariff uncertainty pushes shippers toward warehouse automation", source: "Supply Chain Dive", link: "https://example.com/sample/c7", publishedAt: "2026-10-09", region: "GLOBAL" as const },
  { id: "s6", title: "레인보우로보틱스, 물류용 양팔 모바일 매니퓰레이터 공개", source: "로봇신문", link: "https://example.com/sample/c6", publishedAt: "2026-10-11", region: "KR" as const },
];

export const SAMPLE_REPORT: ReportContent = {
  issueTheme: "손이 생긴 물류센터",
  teamNote:
    "그동안 물류센터의 로봇은 바퀴로 달리는 데 바빴는데, 이번 호에서는 드디어 손을 쓰기 시작했습니다. 다만 손재주보다 중요한 것은 어떤 물건을 맡기느냐입니다. 이번 호는 '무엇이 되는가'보다 '우리 센터 SKU에서 되는가'를 기준으로 읽어 주시길 권합니다.",
  headline: "로봇 피킹, 상용화 단계 진입 신호와 센터 자동화 투자 판단 기준",
  keyTakeaway: "로봇 피킹은 설비 일체형으로 상용화 단계에 들어섰고, 도입 판단의 열쇠는 SKU 적합도 검증입니다.",
  executiveSummary: [
    "AutoStore가 로봇 팔 일체형 피킹 포트를 공개해, 낱개 피킹 자동화가 **보관 설비와 통합되는 흐름**이 확인됩니다.",
    "국내 대형 센터의 AMR 도입이 **시범에서 증설 단계로 전환**되고 있습니다(CJ대한통운 AMR 200대 추가).",
    "휴머노이드는 양산 확대 단계에 진입했으나, **단가 경쟁력은 아직 확인되지 않았습니다**.",
    "관세 변동성 확대가 **창고 자동화 투자 시점을 앞당기는 요인**으로 보고되었습니다.",
  ],
  themes: [
    {
      title: "낱개 피킹 자동화가 보관 설비와 결합되는 단계로 이동",
      takeaway: "피킹 자동화의 무게 중심이 개별 로봇에서 설비 일체형으로 이동",
      lead: "큐브형 자동창고와 로봇 팔의 결합, 양팔 모바일 매니퓰레이터 공개가 같은 시기에 나타났습니다. 피킹 자동화의 무게 중심이 개별 로봇에서 설비 일체형으로 옮겨가는 신호로 판단됩니다.",
      body: [
        "AutoStore는 상자를 격자 형태로 보관하고 로봇이 포트까지 운반하는 방식의 시스템입니다. 기존에는 포트에서 작업자가 상품을 집었으나, 신형 포트는 로봇 팔이 낱개 상품을 집어 주문 박스로 옮깁니다. **운반과 피킹이 한 지점에서 끝나는 구조**입니다.",
        "국내에서는 레인보우로보틱스가 피킹과 디팔레타이징이 가능한 양팔 모바일 로봇을 공개했습니다. 두 사례는 접근 방식이 다르지만 모두 사람이 수행하던 낱개 취급 공정을 대상으로 합니다. 다만 비정형·연포장 상품은 수작업이 계속 필요할 가능성이 높습니다.",
      ],
      insights: [
        "상자 운반(G2P)과 낱개 피킹을 동일 포트에서 처리하는 구조가 **상용 제품으로 제시**되었습니다.",
        "기존 AutoStore 그리드에 포트를 추가하는 방식이어서, 설치 기반이 있는 센터는 **단계적 도입이 가능**합니다.",
        "취급 가능한 상품 범위가 도입 효과를 좌우하므로, **SKU 특성별 적용성 검증이 선행**되어야 합니다.",
      ],
      implications: ["운영 센터 SKU 중 로봇 피킹 가능 상품의 비중을 사전에 분석할 필요가 있습니다.", "수작업 포트와 로봇 포트를 병행하는 단계적 도입 시나리오 검토가 현실적입니다."],
      sourceArticleIds: ["s1", "s6"],
    },
    {
      title: "AMR은 시범에서 증설로, 휴머노이드는 양산 준비 단계",
      takeaway: "AMR은 지금 비교할 시점, 휴머노이드는 단가 확인 전까지 관찰",
      lead: "이동 자동화의 성숙도는 로봇 유형별로 차이가 큽니다. AMR은 대형 센터의 증설 단계에 있고, 휴머노이드는 양산 투자 단계입니다.",
      body: [
        "CJ대한통운은 곤지암 메가허브에 AMR 200대를 추가로 투입합니다. 사람의 이동 동선을 줄여 출고 생산성을 높이려는 목적입니다. 반면 Agility Robotics는 신규 투자를 유치해 Digit 생산을 확대합니다. 현장 시범에서 양산 단계로 넘어가는 시점입니다.",
      ],
      insights: [
        "국내 대형 센터에서 AMR 도입은 **시범 운영 이후의 증설 단계**로 이동했습니다.",
        "휴머노이드의 단가와 가동 안정성은 기사에서 확인되지 않아, **도입 판단 시점은 이르다**고 판단됩니다.",
      ],
      implications: ["AMR은 증설 사례의 성과 지표(생산성 변화)를 확보해 비교 기준으로 삼을 수 있습니다.", "휴머노이드는 단가가 AMR 대비 경쟁력을 갖는지 확인될 때까지 관찰 대상으로 분류합니다."],
      sourceArticleIds: ["s2", "s3"],
    },
    {
      title: "투자 시점 판단: 관세 변동성과 사전 검증 수단의 부상",
      takeaway: "투자는 앞당기되, 가상 검증으로 실패 비용을 줄이는 흐름",
      lead: "관세 변동성이 재고 보유량을 늘리고 있고, 설비 투자 전에 가상 검증을 수행하려는 움직임이 함께 나타났습니다.",
      body: [
        "설문 결과 관세 변동성 확대로 재고 보유량이 늘어난 화주가 창고 자동화 투자 계획을 앞당기고 있습니다. 현대글로비스는 디지털 트윈으로 센터 레이아웃과 설비 투자를 사전에 검증하는 플랫폼을 구축했습니다. 투자 시점은 앞당기되 실패 비용은 줄이려는 접근으로 해석됩니다.",
      ],
      insights: ["보관 효율 개선 수요가 **자동화 투자 시점을 앞당기는 요인**으로 제시되었습니다.", "설비를 설치한 뒤 병목을 발견하는 비용을 줄이기 위해 **가상 검증이 활용**되고 있습니다."],
      implications: ["투자 검토 시 시뮬레이션 기반 사전 검증 단계를 의사결정 절차에 포함하는 방안을 검토할 수 있습니다."],
      sourceArticleIds: ["s4", "s5"],
    },
  ],
  trend: {
    overview: "제1호부터 제4호까지 이동 로봇(AMR)과 휴머노이드 주제는 반복해서 다뤄졌으며, 이번 호는 낱개 피킹과 투자 검증 주제의 비중이 높아졌습니다. 이번 호 6건 중 3건이 지난 호와 연관된 후속 기사입니다.",
    notes: ["로봇 피킹/매니퓰레이션 카테고리가 제3호 이후 연속해서 선정되었습니다.", "AutoStore는 제1호에서 도입 소식으로, 이번 호에서 신형 포트로 다시 등장했습니다."],
  },
  recommendations: [
    "로봇 피킹 적용 가능 SKU 비중 분석을 운영 센터 1곳을 대상으로 시범 수행합니다.",
    "AMR 증설 사례의 생산성 지표(시간당 출고량, 이동 거리 변화)를 수집해 내부 투자 기준과 비교합니다.",
    "투자 검토 절차에 디지털 트윈 등 사전 시뮬레이션 단계를 포함할지 검토합니다.",
  ],
  watchList: ["로봇 피킹 포트의 실제 처리량(시간당 피킹 수) 공개 여부", "휴머노이드 단가가 AMR 대비 경쟁력 있는 수준으로 하락하는지 여부"],
  keywords: ["AutoStore", "피스피킹", "AMR", "휴머노이드", "디지털 트윈"],
  stats: {
    total: 6,
    byCategory: [
      { label: "AMR/AGV", count: 1 },
      { label: "풀필먼트 자동화", count: 1 },
      { label: "소팅/보관설비", count: 1 },
      { label: "로봇 피킹/매니퓰레이션", count: 2 },
      { label: "글로벌 트렌드", count: 1 },
    ],
    byRegion: [
      { label: "국내", count: 3 },
      { label: "해외", count: 3 },
    ],
    topKeywords: [
      { label: "AutoStore", count: 2, seenBefore: true },
      { label: "AMR", count: 2, seenBefore: true },
      { label: "휴머노이드", count: 2, seenBefore: true },
      { label: "피스피킹", count: 2, seenBefore: true },
      { label: "디지털 트윈", count: 1 },
      { label: "Agility Robotics", count: 1 },
      { label: "현대글로비스", count: 1 },
    ],
    repeat: { fresh: 3, followUp: 3, duplicate: 0 },
    trend: {
      issues: [
        { no: 1, date: "2026-05-23", current: false },
        { no: 2, date: "2026-07-12", current: false },
        { no: 3, date: "2026-09-08", current: false },
        { no: 4, date: "2026-10-27", current: true },
      ],
      category: [
        { label: "AMR/AGV", counts: [1, 1, 0, 1] },
        { label: "풀필먼트 자동화", counts: [1, 1, 0, 1] },
        { label: "소팅/보관설비", counts: [0, 0, 1, 1] },
        { label: "로봇 피킹/매니퓰레이션", counts: [0, 1, 2, 2] },
        { label: "글로벌 트렌드", counts: [1, 0, 1, 1] },
      ],
      keywords: [
        { label: "AutoStore", counts: [1, 0, 0, 2] },
        { label: "AMR", counts: [2, 1, 0, 2] },
        { label: "휴머노이드", counts: [0, 1, 0, 2] },
        { label: "피스피킹", counts: [0, 0, 2, 2] },
        { label: "Walmart", counts: [0, 0, 1, 0] },
        { label: "디지털 트윈", counts: [0, 0, 0, 1] },
      ],
    },
  },
};
