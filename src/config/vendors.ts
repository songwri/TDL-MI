/**
 * 물류기술 공급사 기본 목록 (글로벌 지도·중국 기술기업 화면).
 *
 * 원칙
 * - 웹 검색으로 확인한 사실만 적고, 항목마다 출처를 단다. 확인 못 한 칸은 비워 두고 confidence 로 표시한다.
 * - 순위는 공개 순위표가 있을 때만 적는다(rank.basis 에 근거). 회사 자체 주장은 "회사 발표"로 구분한다.
 * - 팀이 구글 시트 Vendors 탭에 같은 회사명으로 줄을 추가하면 그 값이 이 목록을 덮어쓰고, 새 회사는 추가된다.
 */

export const SEGMENTS = {
  fullstack: "Full-Stack SI (설계·설비·제어 일괄)",
  asrs: "AS/RS·스태커·셔틀",
  amr: "AMR·AGV (선반·토트 운반)",
  acr: "ACR (케이스 핸들링 로봇)",
  sorter: "소터·분류 로봇",
  picking: "로봇 피킹",
  forklift: "무인 지게차",
  software: "WMS·WES·디지털 트윈",
} as const;
export type Segment = keyof typeof SEGMENTS;

export type Confidence = "확인" | "일부 확인" | "입력 필요";

export interface Vendor {
  name: string;
  nameLocal?: string;
  /** 본사 국가 ISO 3166-1 alpha-2 */
  country: string;
  city?: string;
  /** 모회사·그룹 (소유 국가가 본사와 다를 때 중요) */
  parent?: string;
  segments: Segment[];
  solutions: string[];
  /** 공급 실적이 확인된 국가 (ISO2). 확인된 것만 */
  markets?: string[];
  /** 공급 범위 요약 (예: "40여 개국", 회사 발표) */
  reach?: string;
  /** 한국 내 사업·고객 (LX판토스 관점에서 가장 중요한 칸) */
  korea?: string;
  rank?: { value: string; basis: string };
  /** 매출 (보고된 통화·연도 그대로. 환율 환산하지 않음) */
  revenue?: { value: string; year: string; basis: string; url?: string };
  /** 실제 적용 사례 (고객사·국가·내용) */
  references?: { customer: string; country?: string; detail: string; year?: string; url?: string }[];
  sources: { label: string; url: string }[];
  confidence: Confidence;
  checkedAt: string;
}

const CHECKED = "2026-11-24";
const MMH_2023 = { label: "MMH Top 20 Systems Suppliers 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" };

export const VENDORS: Vendor[] = [
  /* ── 글로벌 시스템 공급사 (MMH 2023 순위: 2022년 매출 기준, 공개된 최신 순위표) ── */
  { name: "Daifuku", nameLocal: "다이후쿠", country: "JP", city: "Osaka", segments: ["fullstack", "asrs", "sorter"], solutions: ["자동창고(AS/RS)", "컨베이어·소팅", "클린룸·공항 수하물 시스템"], rank: { value: "1위", basis: "MMH 2023 · 2022년 매출 $4,549M (9년 연속 1위)" }, revenue: { value: "$4,549M", year: "2022", basis: "MMH Top 20 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023, { label: "Daifuku 보도자료 2023-05-16", url: "https://www.daifuku.com/company/news/2023/0516_01/" }], confidence: "확인", checkedAt: CHECKED },
  { name: "Dematic", nameLocal: "데마틱", country: "US", city: "Atlanta", parent: "KION Group (독일)", segments: ["fullstack", "asrs", "sorter", "software"], solutions: ["멀티셔틀", "소팅", "WES"], rank: { value: "2위", basis: "MMH 2023 · 2022년 매출 $4,063M" }, revenue: { value: "$4,063M", year: "2022", basis: "MMH Top 20 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023, { label: "Wikipedia: Dematic", url: "https://en.wikipedia.org/wiki/Dematic" }], confidence: "확인", checkedAt: CHECKED },
  { name: "Honeywell Intelligrated", country: "US", city: "Mason, Ohio", parent: "Honeywell", segments: ["fullstack", "sorter", "picking", "software"], solutions: ["소팅·컨베이어", "로봇 언로딩", "Momentum WES"], sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Vanderlande", nameLocal: "반더란데", country: "NL", city: "Veghel", parent: "Toyota Industries (일본)", segments: ["fullstack", "sorter", "asrs", "software"], solutions: ["창고·택배 소팅", "공항 수하물", "FASTPICK"], rank: { value: "4위", basis: "MMH 2023 · 2022년 매출 €2.2B" }, revenue: { value: "€2.3B", year: "2024", basis: "Wikipedia (2022년 €2.2B)", url: "https://en.wikipedia.org/wiki/Vanderlande" }, sources: [MMH_2023, { label: "Wikipedia: Vanderlande", url: "https://en.wikipedia.org/wiki/Vanderlande" }], confidence: "확인", checkedAt: CHECKED },
  { name: "FORTNA", country: "US", city: "Atlanta", segments: ["fullstack", "sorter", "software"], solutions: ["유통·택배 센터 설계·통합", "WES"], rank: { value: "6위", basis: "MMH 2023 · 2022년 매출 $2.1B" }, revenue: { value: "$2.1B", year: "2022", basis: "MMH Top 20 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Murata Machinery", nameLocal: "무라타기계", country: "JP", city: "Kyoto", segments: ["fullstack", "asrs"], solutions: ["자동창고", "셔틀", "반도체 물류"], rank: { value: "7위", basis: "MMH 2023" }, sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "SSI Schaefer", nameLocal: "섀퍼", country: "DE", city: "Neunkirchen", segments: ["fullstack", "asrs", "software"], solutions: ["셔틀·자동창고", "WAMAS WMS"], rank: { value: "8위", basis: "MMH 2023 · 2022 회계연도 €1.81B" }, revenue: { value: "€1.81B", year: "2022", basis: "MMH Top 20 2023 (회계연도)", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Mecalux", country: "ES", city: "Barcelona", segments: ["asrs", "software"], solutions: ["랙·자동창고", "Easy WMS"], rank: { value: "9위", basis: "MMH 2023 · $1.57B" }, revenue: { value: "$1.57B", year: "2022", basis: "MMH Top 20 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Swisslog", nameLocal: "스위스로그", country: "CH", parent: "KUKA (Midea 그룹, 중국)", segments: ["fullstack", "asrs", "software"], solutions: ["AutoStore 통합", "CycloneCarrier 셔틀", "SynQ 소프트웨어"], rank: { value: "14위", basis: "MMH 2023" }, sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "TGW Logistics", country: "AT", city: "Marchtrenk", segments: ["fullstack", "asrs", "picking"], solutions: ["셔틀", "로봇 피킹 스테이션"], rank: { value: "Top 20", basis: "MMH 2023 · 2022년 매출 $991M" }, revenue: { value: "$991M", year: "2022", basis: "MMH Top 20 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" }, sources: [MMH_2023, { label: "Wikipedia: TGW", url: "https://en.wikipedia.org/wiki/TGW_Logistics_Group" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Knapp", nameLocal: "크납", country: "AT", city: "Hart bei Graz", segments: ["fullstack", "asrs", "picking", "software"], solutions: ["OSR 셔틀", "Pick-it-Easy Robot"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "AutoStore", nameLocal: "오토스토어", country: "NO", segments: ["asrs"], solutions: ["큐브형 자동창고 (파트너사 통해 공급)"], revenue: { value: "$601.4M", year: "2024", basis: "AutoStore 2024년 4분기 실적 발표", url: "https://www.autostoresystem.com/investors/press-releases/autostore-q4-2024-financial-results" }, sources: [{ label: "AutoStore Q4 2024 실적", url: "https://www.autostoresystem.com/investors/press-releases/autostore-q4-2024-financial-results" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Exotec", nameLocal: "엑소텍", country: "FR", city: "Lille", segments: ["asrs", "amr"], solutions: ["Skypod (랙 등반 로봇)"], reach: "고객 사이트 200곳+, 로봇 1만 대 (2025.10), 누적 시스템 판매 $1B (2024)", references: [{ customer: "Gap · Uniqlo · Decathlon · Carrefour · Geodis 등", detail: "Skypod G2P 시스템 (회사가 밝힌 고객)", url: "https://www.exotec.com/news/exotec-celebrates-10-years-of-innovation-driving-a-new-era-of-warehouse-technology/" }], sources: [{ label: "Exotec 10주년 발표", url: "https://www.exotec.com/news/exotec-celebrates-10-years-of-innovation-driving-a-new-era-of-warehouse-technology/" }, { label: "Robotics 24/7: $1B 판매", url: "https://www.robotics247.com/article/modex_2024_exotec_reaches_1_billion_in_systems_sold/exotec" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Symbotic", country: "US", segments: ["asrs", "fullstack"], solutions: ["케이스 단위 자동화 (로봇·AI 소프트웨어)"], markets: ["US"], references: [{ customer: "Walmart", country: "US", detail: "지역 물류센터 42곳 전체에 자동화 시스템 (2022.5 계약 확대, 2029년까지 순차 가동)", year: "2022", url: "https://www.robotics247.com/article/symbotic_and_walmart_expand_partnership_to_implement_automation_in_42_regional_distribution_centers" }], sources: [{ label: "Robotics 24/7: Walmart 42개 DC", url: "https://www.robotics247.com/article/symbotic_and_walmart_expand_partnership_to_implement_automation_in_42_regional_distribution_centers" }, { label: "Walmart 발표 (2021)", url: "https://corporate.walmart.com/news/2021/07/14/chain-reaction-were-partnering-with-symbotic-to-bring-high-tech-automation-to-our-supply-chain" }], confidence: "확인", checkedAt: CHECKED },
  { name: "Ocado Intelligent Automation", country: "GB", parent: "Ocado Group", segments: ["asrs", "picking", "software"], solutions: ["그리드형 식료품 풀필먼트"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Locus Robotics", country: "US", segments: ["amr"], solutions: ["협업형 피킹 AMR"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },

  /* ── 중국 ── */
  {
    name: "Geek+", nameLocal: "极智嘉 (Geekplus)", country: "CN", city: "Beijing", segments: ["amr", "sorter", "acr", "software"],
    solutions: ["선반 운반형 G2P AMR", "로봇 소팅", "컨테이너 핸들링 로봇"],
    markets: ["KR", "CN"],
    korea: "서울 지사. CJ대한통운 군포센터 AMR 128대(네이버 쇼핑 물량, 운영효율 33%↑), 2024.4 Toll Group 한국 첫 로봇 소팅 창고. 2024.10 국내 AMR사 플로틱과 전략 제휴",
    revenue: { value: "RMB 3.17B (2024년 2.41B)", year: "2025", basis: "2025년 연간 실적 (전년 대비 31.6%↑)", url: "https://www.geekplus.com/resources/news/geekplus-hits-profitability-milestone-with-31.6-yoy-revenue-growth-fueled-by-embodied-intelligence-driven-tech-innovation" },
    references: [
      { customer: "CJ대한통운 군포센터", country: "KR", detail: "AMR 128대, 네이버 쇼핑 물량 하루 3만 건 처리, 운영효율 33%↑", url: "https://www.robotics247.com/article/geek_opens_south_korea_office_deploys_more_mobile_robots_cj_logistics" },
      { customer: "Toll Group", country: "KR", detail: "한국 첫 로봇 소팅 창고 (재고 30만 품목)", year: "2024", url: "https://www.geekplus.com/resources/news/toll-group-south-korea" },
    ],
    rank: { value: "창고 풀필먼트 AMR 세계 1위 (회사 발표)", basis: "2025.6 홍콩 상장 투자설명서: 2024년 점유율 9.0% (CIC 기준). 2025.7.9 HKEX 상장" },
    sources: [
      { label: "Robotics 24/7: Geek+ 한국 지사·CJ대한통운", url: "https://www.robotics247.com/article/geek_opens_south_korea_office_deploys_more_mobile_robots_cj_logistics" },
      { label: "Geek+ × Toll Group 한국", url: "https://www.geekplus.com/resources/news/toll-group-south-korea" },
      { label: "Floatic × Geek+ 제휴", url: "https://technode.global/?p=87807" },
      { label: "HKEX 투자설명서 (2025-06-30)", url: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/0630/2025063000025.pdf" },
      { label: "Geek+ 보도자료: 7년 연속 AMR 1위", url: "https://www.geekplus.com/resources/news/global-warehouse-automation-surges-as-geekplus-extends-no.1-amr-leadership-for-seven-consecutive-years" },
    ],
    confidence: "확인", checkedAt: CHECKED,
  },
  {
    name: "Hai Robotics", nameLocal: "海柔创新", country: "CN", city: "Shenzhen", segments: ["acr"],
    solutions: ["HaiPick ACR (케이스 단위 자율 피킹·보관)"],
    reach: "설치 1,700건+ · 40여 개국 (업계 디렉터리), 2025.9 옌청·말레이시아 페낭 공장 발표",
    markets: ["CN", "MY", "KR", "RO"],
    korea: "국내 파트너 보우시스템. 서울 아웃도어 브랜드 N 물류센터 HaiPick System 3 (2025.3), NEPA (인건비 50%↓, 하루 6.6만 개 출고)",
    references: [
      { customer: "NEPA", country: "KR", detail: "HaiPick 도입, 인건비 50% 절감 · 하루 6.6만 개 출고", url: "https://www.casestudies.com/company/hai-robotics/case-study/nepa-customer-case-study" },
      { customer: "아웃도어 브랜드 N (보우시스템 구축)", country: "KR", detail: "서울 물류센터 HaiPick System 3", year: "2025", url: "https://www.newswire.co.kr/newsRead.php?no=1008231" },
      { customer: "LPP Logistics", country: "RO", detail: "부쿠레슈티 풀필먼트센터 ACR 278대 + 동반 AMR 670대, 6개월 내 구축", url: "https://www.einpresswire.com/article/928774497?promo=4400" },
    ],
    sources: [
      { label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" },
      { label: "보우시스템 × Hai Robotics", url: "https://www.roboticstomorrow.com/news/2025/03/26/hai-robotics-and-bowoo-system-partner-to-elevate-warehouse-automation-for-leading-fashion-brand/24513/" },
    ],
    confidence: "일부 확인", checkedAt: CHECKED,
  },
  { name: "Hikrobot", nameLocal: "海康机器人", country: "CN", city: "Hangzhou", parent: "Hikvision", segments: ["amr", "forklift"], solutions: ["산업·물류 이동로봇", "머신비전"], reach: "누적 출하 10만~15만 대 (출처마다 다름), 유럽 사무소", sources: [{ label: "업계 디렉터리 (fdatabot)", url: "https://www.fdatabot.com/top-mobile-robot-manufacturers-in-china/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Quicktron", nameLocal: "快仓智能", country: "CN", city: "Shanghai", segments: ["amr", "software"], solutions: ["선반·빈·팔레트 G2P", "창고 소프트웨어"], reach: "AMR 4.5만 대+ · 고객 1,000곳+ (업계 디렉터리)", sources: [{ label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Mushiny", nameLocal: "木蚁机器人", country: "CN", segments: ["sorter", "amr"], solutions: ["분류 시스템", "G2P"], markets: ["JP"], reach: "수출 비중 70%+ (보도)", references: [{ customer: "일본 간토 지역 제약 창고 (복수)", country: "JP", detail: "물류 로봇·소프트웨어 운영", url: "https://thepublicpurview.com/chinese-robots-venture-abroad-to-compete-in-global-market/" }], sources: [{ label: "The Public Purview", url: "https://thepublicpurview.com/chinese-robots-venture-abroad-to-compete-in-global-market/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "ForwardX Robotics", nameLocal: "灵动科技", country: "CN", city: "Beijing", segments: ["amr"], solutions: ["피킹·운반 AMR"], sources: [{ label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" }], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "KSEC Intelligent", nameLocal: "昆船智能", country: "CN", city: "Kunming", segments: ["fullstack", "asrs"], solutions: ["스마트 물류 시스템 일괄", "자동창고"], markets: ["BR", "TH", "KW"], reach: "브라질·태국·쿠웨이트 수출 (2020년 보도)", sources: [{ label: "2025 연차보고서", url: "https://static.cninfo.com.cn/finalpage/2026-04-27/1225192843.PDF" }, { label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Lanjian Intelligent", nameLocal: "兰剑智能", country: "CN", city: "Jinan", segments: ["fullstack", "asrs", "amr"], solutions: ["창고·셔틀·운반 로봇 자체 개발", "물류 시스템 일괄"], reach: "2018년 해외 진출, 선진국 수출 (보도)", sources: [{ label: "前瞻产业研究院", url: "https://bg.qianzhan.com/trends/detail/506/240521-93ca59b1.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Inform Storage", nameLocal: "音飞储存", country: "CN", city: "Nanjing", segments: ["asrs"], solutions: ["랙·자동창고 설비"], markets: ["TH"], reach: "태국 공장 (해외 제조·설치·AS 거점)", sources: [{ label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Zhongding Integration", nameLocal: "中鼎集成", country: "CN", parent: "诺力股份 (Noblelift)", segments: ["fullstack", "asrs"], solutions: ["스태커 크레인", "4방향 셔틀", "자동창고"], sources: [{ label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Beizi Technology", nameLocal: "北自科技", country: "CN", city: "Beijing", segments: ["fullstack", "asrs", "software"], solutions: ["설계·시뮬레이션·통합 턴키", "스태커 (자회사)"], sources: [{ label: "심사 문의 회신 2026-01", url: "https://stockmc.xueqiu.com/202601/603082_20260107_SHKI.pdf" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Kejie Intelligent", nameLocal: "科捷智能", country: "CN", segments: ["fullstack", "asrs", "sorter"], solutions: ["스태커 크레인", "분류 설비"], sources: [{ label: "CSDN 정리", url: "https://blog.csdn.net/nickelwang/article/details/150457137" }], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Today International", nameLocal: "今天国际", country: "CN", city: "Shenzhen", segments: ["fullstack"], solutions: ["스마트 물류 시스템 일괄 (제조·에너지 공장)"], sources: [{ label: "智研咨询", url: "https://www.chyxx.com/industry/1227421.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "51WORLD", nameLocal: "51世界", country: "CN", city: "Beijing", segments: ["software"], solutions: ["디지털 트윈 플랫폼"], markets: ["CN"], references: [{ customer: "China Merchants Port (CMHIT) 마완항", country: "CN", detail: "항만 운영 시뮬레이션: 컨테이너 10만 개 동기화, 약 100만㎡ 재현", url: "https://medium.com/51world/the-first-dynamic-simulation-port-of-digital-twin-in-china-unveiled-f80fa2c7798a" }], sources: [{ label: "51WORLD 마완항 사례", url: "https://medium.com/51world/the-first-dynamic-simulation-port-of-digital-twin-in-china-unveiled-f80fa2c7798a" }], confidence: "일부 확인", checkedAt: CHECKED },

  /* ── 한국 (국내 비교용, 팀 보강 필요) ── */
  { name: "Floatic", nameLocal: "플로틱", country: "KR", segments: ["amr"], solutions: ["이커머스 창고용 AMR"], korea: "2024.10 Geek+ 와 아태 공동 영업 제휴", sources: [{ label: "Floatic × Geek+ 제휴", url: "https://technode.global/?p=87807" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "현대무벡스", country: "KR", segments: ["fullstack", "asrs", "sorter"], solutions: ["물류 자동화 SI"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "트위니", country: "KR", segments: ["amr"], solutions: ["자율주행 물류 로봇"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "시스콘", country: "KR", segments: ["amr"], solutions: ["산업용 AMR"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
];

/** 지도용: ISO2 → world-atlas 국가 번호, 한국어 이름, 경로선을 그릴 대표 좌표 [경도, 위도] */
export const COUNTRIES: Record<string, { id: string; ko: string; ll: [number, number] }> = {
  KR: { id: "410", ko: "한국", ll: [127.8, 36.3] }, CN: { id: "156", ko: "중국", ll: [104, 35] }, JP: { id: "392", ko: "일본", ll: [138, 36.5] }, US: { id: "840", ko: "미국", ll: [-98, 39] },
  DE: { id: "276", ko: "독일", ll: [10.4, 51.2] }, NL: { id: "528", ko: "네덜란드", ll: [5.3, 52.2] }, FR: { id: "250", ko: "프랑스", ll: [2.5, 46.6] }, NO: { id: "578", ko: "노르웨이", ll: [9, 61] },
  GB: { id: "826", ko: "영국", ll: [-1.8, 52.8] }, AT: { id: "040", ko: "오스트리아", ll: [14.5, 47.6] }, ES: { id: "724", ko: "스페인", ll: [-3.7, 40.2] }, CH: { id: "756", ko: "스위스", ll: [8.2, 46.8] },
  TH: { id: "764", ko: "태국", ll: [101, 15.5] }, BR: { id: "076", ko: "브라질", ll: [-52, -10] }, KW: { id: "414", ko: "쿠웨이트", ll: [47.6, 29.3] }, MY: { id: "458", ko: "말레이시아", ll: [102, 4] },
  SE: { id: "752", ko: "스웨덴", ll: [16, 62] }, IT: { id: "380", ko: "이탈리아", ll: [12.5, 42.8] }, IN: { id: "356", ko: "인도", ll: [79, 22] }, AU: { id: "036", ko: "호주", ll: [134, -25] },
  SG: { id: "702", ko: "싱가포르", ll: [103.8, 1.35] }, RO: { id: "642", ko: "루마니아", ll: [25, 45.9] }, VN: { id: "704", ko: "베트남", ll: [106, 16] }, CA: { id: "124", ko: "캐나다", ll: [-100, 56] }, MX: { id: "484", ko: "멕시코", ll: [-102, 23.6] },
  TW: { id: "158", ko: "대만", ll: [121, 23.7] }, ID: { id: "360", ko: "인도네시아", ll: [117, -2] }, PL: { id: "616", ko: "폴란드", ll: [19.4, 52] }, BE: { id: "056", ko: "벨기에", ll: [4.5, 50.6] },
  DK: { id: "208", ko: "덴마크", ll: [9.5, 56] }, FI: { id: "246", ko: "핀란드", ll: [26, 64] }, AE: { id: "784", ko: "아랍에미리트", ll: [54, 24] }, SA: { id: "682", ko: "사우디아라비아", ll: [45, 24] },
};

/** 시트 Vendors 탭 머리글 (팀이 직접 입력·수정하는 칸) */
export const VENDOR_HEADERS = [
  "회사명", "현지명", "본사국가(ISO2)", "도시", "모회사", "분야(;로 구분)", "대표 솔루션(;)", "공급국가(ISO2;)", "공급 범위", "한국 사업", "순위", "순위 근거", "출처 URL(;)", "확인 상태", "확인일", "매출", "매출 연도", "매출 근거", "레퍼런스(고객|국가|내용|연도|URL ;)",
] as const;
