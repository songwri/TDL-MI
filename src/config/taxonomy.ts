import type { Category } from "@/lib/types";

/**
 * 카테고리 분류 규칙. 키워드는 소문자 기준 부분일치(한글/영문 혼용).
 * 가중치 합이 가장 큰 카테고리로 분류하며, 매칭이 없으면 지역에 따라 기본값을 사용한다.
 */
export const CATEGORY_RULES: { category: Category; keywords: [string, number][] }[] = [
  {
    category: "AMR/AGV",
    keywords: [
      ["amr", 3], ["agv", 3], ["autonomous mobile robot", 3], ["mobile robot", 2], ["자율주행 로봇", 3],
      ["자율주행로봇", 3], ["물류로봇", 2], ["물류 로봇", 2], ["운반로봇", 3], ["운반 로봇", 3], ["무인운반", 3],
      ["forklift", 2], ["지게차", 2], ["autonomous forklift", 3], ["locus", 2], ["geek+", 2], ["geekplus", 2],
      ["fetch robotics", 2], ["otto motors", 2], ["mir ", 1], ["트위니", 2], ["시스콘", 2], ["amr/agv", 3],
    ],
  },
  {
    category: "풀필먼트 자동화",
    keywords: [
      ["fulfillment", 3], ["fulfilment", 3], ["풀필먼트", 3], ["micro-fulfillment", 3], ["mfc", 2],
      ["e-commerce", 1], ["이커머스", 1], ["dark store", 2], ["다크스토어", 2], ["wms", 2], ["wes", 2],
      ["물류센터", 2], ["distribution center", 2], ["warehouse automation", 3], ["창고 자동화", 3],
      ["goods-to-person", 3], ["g2p", 2], ["gtp", 2], ["쿠팡", 1], ["ocado", 2], ["autostore", 1],
    ],
  },
  {
    category: "소팅/보관설비",
    keywords: [
      ["sorter", 3], ["sortation", 3], ["sorting", 2], ["소터", 3], ["분류기", 3], ["분류 설비", 3],
      ["as/rs", 3], ["asrs", 3], ["자동창고", 3], ["shuttle", 2], ["셔틀", 2], ["conveyor", 2], ["컨베이어", 2],
      ["storage", 1], ["보관", 1], ["랙", 1], ["rack", 1], ["autostore", 3], ["오토스토어", 3], ["skypod", 3], ["exotec", 2], ["엑소텍", 2], ["cube storage", 3], ["큐브형", 2], ["스토리지", 1],
      ["palletizing", 2], ["팔레타이징", 2], ["vertical lift", 2],
    ],
  },
  {
    category: "로봇 피킹/매니퓰레이션",
    keywords: [
      ["picking", 2], ["피킹", 2], ["piece picking", 3], ["피스피킹", 3], ["robotic arm", 3], ["로봇팔", 3],
      ["로봇 팔", 3], ["manipulat", 3], ["humanoid", 3], ["휴머노이드", 3], ["gripper", 2], ["그리퍼", 2],
      ["depalletiz", 3], ["디팔레타이징", 3], ["physical ai", 3], ["피지컬 ai", 3], ["피지컬ai", 3],
      ["covariant", 2], ["dexterity", 2], ["stretch", 1], ["digit", 1], ["figure ai", 2], ["vla", 2],
    ],
  },
  {
    category: "글로벌 트렌드",
    keywords: [
      ["tariff", 2], ["관세", 2], ["market", 1], ["시장", 1], ["investment", 1], ["투자", 1], ["funding", 2],
      ["acquisition", 2], ["인수", 2], ["logimat", 3], ["cemat", 3], ["promat", 3], ["modex", 3],
      ["supply chain", 1], ["공급망", 1], ["report", 1], ["survey", 1], ["forecast", 1], ["전망", 1],
    ],
  },
];

/**
 * 수집 관련성 필터: 범용 매체(SCM 전반, 로봇 전반)에서 물류·로봇 자동화와 무관한 기사를 걸러낸다.
 */
export const RELEVANCE_KEYWORDS = [
  "warehouse", "fulfillment", "fulfilment", "distribution center", "logistics", "automation", "robot",
  "amr", "agv", "sortation", "sorter", "picking", "as/rs", "asrs", "conveyor", "forklift", "wms", "intralogistics",
  "material handling", "parcel", "last mile", "last-mile", "humanoid", "autostore", "e-commerce",
  "물류", "로봇", "자동화", "풀필먼트", "창고", "센터", "소터", "피킹", "택배", "배송", "공급망", "scm", "휴머노이드",
];

/**
 * Market Intelligence 엔티티 사전.
 * canonical: 표시/매칭 기준명, aliases: 본문에서 탐지할 표현(소문자), kind: 가중치에 반영.
 */
export interface EntityDef {
  canonical: string;
  aliases: string[];
  kind: "company" | "solution" | "tech";
}

export const ENTITIES: EntityDef[] = [
  // 글로벌 솔루션/기업
  { canonical: "AutoStore", aliases: ["autostore", "오토스토어"], kind: "solution" },
  { canonical: "Ocado", aliases: ["ocado", "오카도"], kind: "company" },
  { canonical: "Symbotic", aliases: ["symbotic", "심보틱"], kind: "company" },
  { canonical: "Exotec", aliases: ["exotec", "엑소텍", "skypod"], kind: "company" },
  { canonical: "Locus Robotics", aliases: ["locus robotics", "로커스 로보틱스", "로커스로보틱스"], kind: "company" },
  { canonical: "Geek+", aliases: ["geek+", "geekplus", "긱플러스"], kind: "company" },
  { canonical: "Hai Robotics", aliases: ["hai robotics", "하이로보틱스", "하이 로보틱스", "haipick"], kind: "company" },
  { canonical: "Amazon Robotics", aliases: ["amazon robotics", "아마존 로보틱스", "proteus", "sparrow", "vulcan"], kind: "company" },
  { canonical: "Amazon", aliases: ["amazon", "아마존"], kind: "company" },
  { canonical: "Boston Dynamics", aliases: ["boston dynamics", "보스턴다이나믹스", "보스턴 다이나믹스"], kind: "company" },
  { canonical: "Agility Robotics", aliases: ["agility robotics", "어질리티 로보틱스", "digit humanoid"], kind: "company" },
  { canonical: "Figure AI", aliases: ["figure ai", "figure 0", "피규어ai", "피규어 ai"], kind: "company" },
  { canonical: "Tesla Optimus", aliases: ["optimus", "옵티머스"], kind: "solution" },
  { canonical: "Dexterity", aliases: ["dexterity"], kind: "company" },
  { canonical: "Covariant", aliases: ["covariant", "코바리언트"], kind: "company" },
  { canonical: "Berkshire Grey", aliases: ["berkshire grey"], kind: "company" },
  { canonical: "Knapp", aliases: ["knapp", "크납"], kind: "company" },
  { canonical: "Dematic", aliases: ["dematic", "데마틱"], kind: "company" },
  { canonical: "Honeywell Intelligrated", aliases: ["intelligrated", "honeywell"], kind: "company" },
  { canonical: "Swisslog", aliases: ["swisslog", "스위스로그"], kind: "company" },
  { canonical: "SSI Schaefer", aliases: ["ssi schaefer", "ssi schäfer", "섀퍼"], kind: "company" },
  { canonical: "Vanderlande", aliases: ["vanderlande", "반더란데"], kind: "company" },
  { canonical: "Körber", aliases: ["körber", "korber", "쾨르버"], kind: "company" },
  { canonical: "Zebra", aliases: ["zebra technologies", "fetch robotics", "지브라"], kind: "company" },
  { canonical: "Mujin", aliases: ["mujin", "무진"], kind: "company" },
  { canonical: "Walmart", aliases: ["walmart", "월마트"], kind: "company" },
  { canonical: "FedEx", aliases: ["fedex", "페덱스"], kind: "company" },
  { canonical: "UPS", aliases: ["ups", "united parcel"], kind: "company" },
  { canonical: "DHL", aliases: ["dhl"], kind: "company" },
  { canonical: "NVIDIA", aliases: ["nvidia", "엔비디아", "isaac", "omniverse"], kind: "company" },
  // 국내
  { canonical: "쿠팡", aliases: ["쿠팡", "coupang"], kind: "company" },
  { canonical: "CJ대한통운", aliases: ["cj대한통운", "cj 대한통운", "cj logistics"], kind: "company" },
  { canonical: "한진", aliases: ["한진", "hanjin"], kind: "company" },
  { canonical: "롯데글로벌로지스", aliases: ["롯데글로벌로지스", "롯데 글로벌로지스"], kind: "company" },
  { canonical: "현대글로비스", aliases: ["현대글로비스", "hyundai glovis"], kind: "company" },
  { canonical: "컬리", aliases: ["컬리", "kurly"], kind: "company" },
  { canonical: "LG CNS", aliases: ["lg cns", "lg씨엔에스"], kind: "company" },
  { canonical: "삼성SDS", aliases: ["삼성sds", "samsung sds"], kind: "company" },
  { canonical: "현대위아", aliases: ["현대위아"], kind: "company" },
  { canonical: "트위니", aliases: ["트위니", "twinny"], kind: "company" },
  { canonical: "시스콘", aliases: ["시스콘", "syscon"], kind: "company" },
  { canonical: "레인보우로보틱스", aliases: ["레인보우로보틱스", "rainbow robotics"], kind: "company" },
  { canonical: "두산로보틱스", aliases: ["두산로보틱스", "doosan robotics"], kind: "company" },
  { canonical: "씨메스", aliases: ["씨메스", "cmes"], kind: "company" },
  { canonical: "플라잎", aliases: ["플라잎", "plaif"], kind: "company" },
  { canonical: "브릴스", aliases: ["브릴스", "brils"], kind: "company" },
  // 기술 키워드
  { canonical: "AMR", aliases: ["amr", "autonomous mobile robot", "자율주행 로봇", "자율주행로봇", "자율이동로봇"], kind: "tech" },
  { canonical: "AGV", aliases: ["agv", "무인운반"], kind: "tech" },
  { canonical: "AS/RS", aliases: ["as/rs", "asrs", "자동창고", "automated storage"], kind: "tech" },
  { canonical: "셔틀 시스템", aliases: ["shuttle", "셔틀"], kind: "tech" },
  { canonical: "소터", aliases: ["sorter", "sortation", "소터", "분류기"], kind: "tech" },
  { canonical: "피스피킹", aliases: ["piece picking", "piece-picking", "피스피킹", "robotic picking", "로봇 피킹"], kind: "tech" },
  { canonical: "팔레타이징", aliases: ["palletiz", "팔레타이징", "depalletiz", "디팔레타이징"], kind: "tech" },
  { canonical: "휴머노이드", aliases: ["humanoid", "휴머노이드"], kind: "tech" },
  { canonical: "피지컬 AI", aliases: ["physical ai", "피지컬 ai", "피지컬ai", "embodied ai", "vla model", "foundation model for robot"], kind: "tech" },
  { canonical: "디지털 트윈", aliases: ["digital twin", "디지털 트윈", "디지털트윈"], kind: "tech" },
  { canonical: "WMS/WES", aliases: ["wms", "wes", "warehouse management system", "warehouse execution"], kind: "tech" },
  { canonical: "마이크로풀필먼트", aliases: ["micro-fulfillment", "micro fulfillment", "mfc", "마이크로풀필먼트", "마이크로 풀필먼트", "도심형 물류"], kind: "tech" },
  { canonical: "Goods-to-Person", aliases: ["goods-to-person", "goods to person", "g2p", "gtp"], kind: "tech" },
  { canonical: "자율주행 지게차", aliases: ["autonomous forklift", "자율주행 지게차", "무인 지게차", "무인지게차"], kind: "tech" },
  { canonical: "라스트마일", aliases: ["last mile", "last-mile", "라스트마일", "라스트 마일"], kind: "tech" },
  { canonical: "드론 배송", aliases: ["drone delivery", "드론 배송", "드론배송"], kind: "tech" },
  { canonical: "콜드체인", aliases: ["cold chain", "콜드체인"], kind: "tech" },
  { canonical: "RaaS", aliases: ["raas", "robots-as-a-service", "robot as a service", "로봇 구독"], kind: "tech" },
  { canonical: "LogiMAT", aliases: ["logimat"], kind: "tech" },
  { canonical: "CeMAT", aliases: ["cemat"], kind: "tech" },
  { canonical: "ProMat", aliases: ["promat", "modex"], kind: "tech" },
];
