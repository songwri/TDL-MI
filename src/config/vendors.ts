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
  sources: { label: string; url: string }[];
  confidence: Confidence;
  checkedAt: string;
}

const CHECKED = "2026-11-24";
const MMH_2023 = { label: "MMH Top 20 Systems Suppliers 2023", url: "https://www.mmh.com/article/top_20_warehouse_automation_and_automated_materials_handling_systems_suppliers_2023" };

export const VENDORS: Vendor[] = [
  /* ── 글로벌 시스템 공급사 (MMH 2023 순위: 2022년 매출 기준, 공개된 최신 순위표) ── */
  { name: "Daifuku", nameLocal: "다이후쿠", country: "JP", city: "Osaka", segments: ["fullstack", "asrs", "sorter"], solutions: ["자동창고(AS/RS)", "컨베이어·소팅", "클린룸·공항 수하물 시스템"], rank: { value: "1위", basis: "MMH 2023 · 2022년 매출 $4,549M (9년 연속 1위)" }, sources: [MMH_2023, { label: "Daifuku 보도자료 2023-05-16", url: "https://www.daifuku.com/company/news/2023/0516_01/" }], confidence: "확인", checkedAt: CHECKED },
  { name: "Dematic", nameLocal: "데마틱", country: "US", city: "Atlanta", parent: "KION Group (독일)", segments: ["fullstack", "asrs", "sorter", "software"], solutions: ["멀티셔틀", "소팅", "WES"], rank: { value: "2위", basis: "MMH 2023 · 2022년 매출 $4,063M" }, sources: [MMH_2023, { label: "Wikipedia: Dematic", url: "https://en.wikipedia.org/wiki/Dematic" }], confidence: "확인", checkedAt: CHECKED },
  { name: "Honeywell Intelligrated", country: "US", city: "Mason, Ohio", parent: "Honeywell", segments: ["fullstack", "sorter", "picking", "software"], solutions: ["소팅·컨베이어", "로봇 언로딩", "Momentum WES"], sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Vanderlande", nameLocal: "반더란데", country: "NL", city: "Veghel", parent: "Toyota Industries (일본)", segments: ["fullstack", "sorter", "asrs", "software"], solutions: ["창고·택배 소팅", "공항 수하물", "FASTPICK"], rank: { value: "4위", basis: "MMH 2023 · 2022년 매출 €2.2B" }, sources: [MMH_2023, { label: "Wikipedia: Vanderlande", url: "https://en.wikipedia.org/wiki/Vanderlande" }], confidence: "확인", checkedAt: CHECKED },
  { name: "FORTNA", country: "US", city: "Atlanta", segments: ["fullstack", "sorter", "software"], solutions: ["유통·택배 센터 설계·통합", "WES"], rank: { value: "6위", basis: "MMH 2023 · 2022년 매출 $2.1B" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Murata Machinery", nameLocal: "무라타기계", country: "JP", city: "Kyoto", segments: ["fullstack", "asrs"], solutions: ["자동창고", "셔틀", "반도체 물류"], rank: { value: "7위", basis: "MMH 2023" }, sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "SSI Schaefer", nameLocal: "섀퍼", country: "DE", city: "Neunkirchen", segments: ["fullstack", "asrs", "software"], solutions: ["셔틀·자동창고", "WAMAS WMS"], rank: { value: "8위", basis: "MMH 2023 · 2022 회계연도 €1.81B" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Mecalux", country: "ES", city: "Barcelona", segments: ["asrs", "software"], solutions: ["랙·자동창고", "Easy WMS"], rank: { value: "9위", basis: "MMH 2023 · $1.57B" }, sources: [MMH_2023], confidence: "확인", checkedAt: CHECKED },
  { name: "Swisslog", nameLocal: "스위스로그", country: "CH", parent: "KUKA (Midea 그룹, 중국)", segments: ["fullstack", "asrs", "software"], solutions: ["AutoStore 통합", "CycloneCarrier 셔틀", "SynQ 소프트웨어"], rank: { value: "14위", basis: "MMH 2023" }, sources: [MMH_2023], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "TGW Logistics", country: "AT", city: "Marchtrenk", segments: ["fullstack", "asrs", "picking"], solutions: ["셔틀", "로봇 피킹 스테이션"], rank: { value: "Top 20", basis: "MMH 2023 · 2022년 매출 $991M" }, sources: [MMH_2023, { label: "Wikipedia: TGW", url: "https://en.wikipedia.org/wiki/TGW_Logistics_Group" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Knapp", nameLocal: "크납", country: "AT", city: "Hart bei Graz", segments: ["fullstack", "asrs", "picking", "software"], solutions: ["OSR 셔틀", "Pick-it-Easy Robot"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "AutoStore", nameLocal: "오토스토어", country: "NO", segments: ["asrs"], solutions: ["큐브형 자동창고 (파트너사 통해 공급)"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Exotec", nameLocal: "엑소텍", country: "FR", city: "Lille", segments: ["asrs", "amr"], solutions: ["Skypod (랙 등반 로봇)"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Symbotic", country: "US", segments: ["asrs", "fullstack"], solutions: ["케이스 단위 자동화 (Walmart 지역 DC)"], markets: ["US"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Ocado Intelligent Automation", country: "GB", parent: "Ocado Group", segments: ["asrs", "picking", "software"], solutions: ["그리드형 식료품 풀필먼트"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Locus Robotics", country: "US", segments: ["amr"], solutions: ["협업형 피킹 AMR"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },

  /* ── 중국 ── */
  {
    name: "Geek+", nameLocal: "极智嘉 (Geekplus)", country: "CN", city: "Beijing", segments: ["amr", "sorter", "acr", "software"],
    solutions: ["선반 운반형 G2P AMR", "로봇 소팅", "컨테이너 핸들링 로봇"],
    markets: ["KR", "CN"],
    korea: "서울 지사. CJ대한통운 군포센터 AMR 128대(네이버 쇼핑 물량, 운영효율 33%↑), 2024.4 Toll Group 한국 첫 로봇 소팅 창고. 2024.10 국내 AMR사 플로틱과 전략 제휴",
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
    markets: ["CN", "MY"],
    sources: [{ label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" }],
    confidence: "일부 확인", checkedAt: CHECKED,
  },
  { name: "Hikrobot", nameLocal: "海康机器人", country: "CN", city: "Hangzhou", parent: "Hikvision", segments: ["amr", "forklift"], solutions: ["산업·물류 이동로봇", "머신비전"], reach: "누적 출하 10만~15만 대 (출처마다 다름), 유럽 사무소", sources: [{ label: "업계 디렉터리 (fdatabot)", url: "https://www.fdatabot.com/top-mobile-robot-manufacturers-in-china/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Quicktron", nameLocal: "快仓智能", country: "CN", city: "Shanghai", segments: ["amr", "software"], solutions: ["선반·빈·팔레트 G2P", "창고 소프트웨어"], reach: "AMR 4.5만 대+ · 고객 1,000곳+ (업계 디렉터리)", sources: [{ label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Mushiny", nameLocal: "木蚁机器人", country: "CN", segments: ["sorter", "amr"], solutions: ["분류 시스템", "G2P"], markets: ["JP"], reach: "수출 비중 70%+ (보도), 일본 간토 제약 창고", sources: [{ label: "The Public Purview", url: "https://thepublicpurview.com/chinese-robots-venture-abroad-to-compete-in-global-market/" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "ForwardX Robotics", nameLocal: "灵动科技", country: "CN", city: "Beijing", segments: ["amr"], solutions: ["피킹·운반 AMR"], sources: [{ label: "업계 디렉터리 (ChoZan)", url: "https://chozan.co/warehouse-robotics-companies/" }], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "KSEC Intelligent", nameLocal: "昆船智能", country: "CN", city: "Kunming", segments: ["fullstack", "asrs"], solutions: ["스마트 물류 시스템 일괄", "자동창고"], markets: ["BR", "TH", "KW"], reach: "브라질·태국·쿠웨이트 수출 (2020년 보도)", sources: [{ label: "2025 연차보고서", url: "https://static.cninfo.com.cn/finalpage/2026-04-27/1225192843.PDF" }, { label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Lanjian Intelligent", nameLocal: "兰剑智能", country: "CN", city: "Jinan", segments: ["fullstack", "asrs", "amr"], solutions: ["창고·셔틀·운반 로봇 자체 개발", "물류 시스템 일괄"], reach: "2018년 해외 진출, 선진국 수출 (보도)", sources: [{ label: "前瞻产业研究院", url: "https://bg.qianzhan.com/trends/detail/506/240521-93ca59b1.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Inform Storage", nameLocal: "音飞储存", country: "CN", city: "Nanjing", segments: ["asrs"], solutions: ["랙·자동창고 설비"], markets: ["TH"], reach: "태국 공장 (해외 제조·설치·AS 거점)", sources: [{ label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Zhongding Integration", nameLocal: "中鼎集成", country: "CN", parent: "诺力股份 (Noblelift)", segments: ["fullstack", "asrs"], solutions: ["스태커 크레인", "4방향 셔틀", "자동창고"], sources: [{ label: "GGII 기사", url: "https://www.gg-robot.com/art-69284.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Beizi Technology", nameLocal: "北自科技", country: "CN", city: "Beijing", segments: ["fullstack", "asrs", "software"], solutions: ["설계·시뮬레이션·통합 턴키", "스태커 (자회사)"], sources: [{ label: "심사 문의 회신 2026-01", url: "https://stockmc.xueqiu.com/202601/603082_20260107_SHKI.pdf" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "Kejie Intelligent", nameLocal: "科捷智能", country: "CN", segments: ["fullstack", "asrs", "sorter"], solutions: ["스태커 크레인", "분류 설비"], sources: [{ label: "CSDN 정리", url: "https://blog.csdn.net/nickelwang/article/details/150457137" }], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "Today International", nameLocal: "今天国际", country: "CN", city: "Shenzhen", segments: ["fullstack"], solutions: ["스마트 물류 시스템 일괄 (제조·에너지 공장)"], sources: [{ label: "智研咨询", url: "https://www.chyxx.com/industry/1227421.html" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "51WORLD", nameLocal: "51世界", country: "CN", city: "Beijing", segments: ["software"], solutions: ["디지털 트윈 플랫폼 (선전 마완항 항만 시뮬레이션: 컨테이너 10만 개 동기화)"], markets: ["CN"], sources: [{ label: "51WORLD 마완항 사례", url: "https://medium.com/51world/the-first-dynamic-simulation-port-of-digital-twin-in-china-unveiled-f80fa2c7798a" }], confidence: "일부 확인", checkedAt: CHECKED },

  /* ── 한국 (국내 비교용, 팀 보강 필요) ── */
  { name: "Floatic", nameLocal: "플로틱", country: "KR", segments: ["amr"], solutions: ["이커머스 창고용 AMR"], korea: "2024.10 Geek+ 와 아태 공동 영업 제휴", sources: [{ label: "Floatic × Geek+ 제휴", url: "https://technode.global/?p=87807" }], confidence: "일부 확인", checkedAt: CHECKED },
  { name: "현대무벡스", country: "KR", segments: ["fullstack", "asrs", "sorter"], solutions: ["물류 자동화 SI"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "트위니", country: "KR", segments: ["amr"], solutions: ["자율주행 물류 로봇"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
  { name: "시스콘", country: "KR", segments: ["amr"], solutions: ["산업용 AMR"], sources: [], confidence: "입력 필요", checkedAt: CHECKED },
];

/** 지도용: ISO2 → world-atlas 국가 번호, 한국어 이름 */
export const COUNTRIES: Record<string, { id: string; ko: string }> = {
  KR: { id: "410", ko: "한국" }, CN: { id: "156", ko: "중국" }, JP: { id: "392", ko: "일본" }, US: { id: "840", ko: "미국" },
  DE: { id: "276", ko: "독일" }, NL: { id: "528", ko: "네덜란드" }, FR: { id: "250", ko: "프랑스" }, NO: { id: "578", ko: "노르웨이" },
  GB: { id: "826", ko: "영국" }, AT: { id: "040", ko: "오스트리아" }, ES: { id: "724", ko: "스페인" }, CH: { id: "756", ko: "스위스" },
  TH: { id: "764", ko: "태국" }, BR: { id: "076", ko: "브라질" }, KW: { id: "414", ko: "쿠웨이트" }, MY: { id: "458", ko: "말레이시아" },
  SE: { id: "752", ko: "스웨덴" }, IT: { id: "380", ko: "이탈리아" }, IN: { id: "356", ko: "인도" }, AU: { id: "036", ko: "호주" },
  SG: { id: "702", ko: "싱가포르" }, VN: { id: "704", ko: "베트남" }, CA: { id: "124", ko: "캐나다" }, MX: { id: "484", ko: "멕시코" },
  TW: { id: "158", ko: "대만" }, ID: { id: "360", ko: "인도네시아" }, PL: { id: "616", ko: "폴란드" }, BE: { id: "056", ko: "벨기에" },
  DK: { id: "208", ko: "덴마크" }, FI: { id: "246", ko: "핀란드" }, AE: { id: "784", ko: "아랍에미리트" }, SA: { id: "682", ko: "사우디아라비아" },
};

/** 시트 Vendors 탭 머리글 (팀이 직접 입력·수정하는 칸) */
export const VENDOR_HEADERS = [
  "회사명", "현지명", "본사국가(ISO2)", "도시", "모회사", "분야(;로 구분)", "대표 솔루션(;)", "공급국가(ISO2;)", "공급 범위", "한국 사업", "순위", "순위 근거", "출처 URL(;)", "확인 상태", "확인일",
] as const;
