import type { NewsletterContent } from "@/lib/types";

/** 톤·레이아웃 확인용 예시 레터 (기사 내용은 샘플 데이터 기준의 가상 예시) */
export const SAMPLE_LETTER: NewsletterContent = {
  headline: "로봇 팔, 드디어 피킹 현장에 출근하나요?",
  intro:
    "안녕하세요, 레포냥이에요! 요즘 전시회마다 '로봇이 낱개 피킹까지 한다'는 얘기가 빠지지 않죠. 이번 호에서는 그 말이 얼마나 현실에 가까워졌는지 물어 왔어요. 큐브 창고에 로봇 팔이 붙은 신형 포트부터, 국내 센터의 AMR 증설 소식까지 2주치를 꾹꾹 담았어요.",
  quickNews: [
    {
      articleId: "s1",
      tag: "AMR",
      title: "CJ대한통운, AMR 200대 더 들인다",
      emoji: "🤖",
      body: "곤지암 메가허브에 자율주행 로봇(AMR) 200대가 추가로 들어가요. 사람이 걷는 동선을 줄여 출고 생산성을 끌어올리는 게 목표래요. 국내 대형 센터의 AMR 도입이 '시범'에서 '증설' 단계로 넘어갔다는 신호로 볼 수 있어요.",
      source: "물류신문(샘플)",
      url: "https://example.com/sample/c2",
    },
    {
      articleId: "s2",
      tag: "휴머노이드",
      title: "Agility Robotics, 투자 받고 Digit 양산 속도 낸다",
      emoji: "🦿",
      body: "물류 현장에서 토트(상자)를 옮기던 휴머노이드 Digit이 생산 확대에 들어가요. 몇 대를 시험하는 단계에서 몇백 대를 만드는 단계로 가는 중이에요. 단가가 얼마나 내려올지가 다음 관전 포인트예요.",
      source: "Supply Chain Dive(샘플)",
      url: "https://example.com/sample/c3",
    },
    {
      articleId: "s3",
      tag: "디지털 트윈",
      title: "센터 짓기 전에 가상으로 먼저 돌려 본다고?",
      emoji: "🧪",
      body: "현대글로비스가 디지털 트윈(현실을 그대로 옮긴 가상 모델)으로 물류센터 레이아웃과 설비 투자를 미리 검증해요. 설비를 다 깔고 나서 병목을 발견하는 일을 줄이려는 거예요.",
      source: "카고뉴스(샘플)",
      url: "https://example.com/sample/c4",
    },
  ],
  mainReport: {
    articleId: "s4",
    kicker: "큐브 창고에 로봇 팔이 붙었다",
    title: "AutoStore 신형 포트, 피킹 자동화의 마지막 1m를 줄일까?",
    source: "Robotics 24/7(샘플)",
    url: "https://example.com/sample/c1",
    paragraphs: [
      "AutoStore는 상자를 격자 모양으로 쌓아 두고, 위를 달리는 로봇이 필요한 상자를 꺼내 작업자 앞(포트)까지 가져다주는 창고 시스템이에요. 지금까지는 상자가 도착하면 사람이 손으로 물건을 집어야 했죠.",
      "이번에 공개된 신형 포트에는 로봇 팔이 붙어 있어요. 상자가 도착하면 로봇 팔이 낱개 상품을 집어 주문 박스로 옮겨요. 상자를 가져오는 일과 물건을 집는 일이 한 자리에서 끝나는 셈이에요.",
      "다만 모든 상품을 로봇이 집을 수 있는 건 아니에요. 비닐 포장처럼 미끄럽거나 모양이 제각각인 상품은 여전히 사람 손이 필요할 가능성이 높아요. 그래서 처음에는 사람 포트와 로봇 포트를 섞어 쓰는 방식이 현실적으로 보여요.",
    ],
    keyPoints: [
      "상자 운반(G2P)과 낱개 피킹을 한 포트에서 처리",
      "기존 AutoStore 그리드에 포트만 추가하는 구조",
      "취급 가능한 상품 범위가 도입 효과를 좌우",
    ],
    forUs: [
      "우리 센터 SKU 중 로봇이 집기 쉬운 상품 비중부터 따져 볼 만해요",
      "사람 포트와 로봇 포트를 섞는 단계적 도입 시나리오가 현실적이에요",
    ],
  },
  churuStation: {
    articleId: "s5",
    title: "띵동! 관세가 오르면 창고는 더 똑똑해진다?",
    body: "관세 변동이 커지면서 화주들이 재고를 더 오래, 더 많이 쌓아 두는 경향이 생겼대요. 그러다 보니 보관 효율을 높이는 창고 자동화 투자 계획을 앞당기는 곳이 늘고 있다는 설문 결과가 나왔어요.",
    question: "여러분 센터는 요즘 '보관'과 '출고' 중 어느 쪽이 더 빠듯한가요?",
    source: "Supply Chain Dive(샘플)",
    url: "https://example.com/sample/c7",
  },
  tailNews: {
    intro: "이번 호 소식 중 두 개는 지난 레터에서 다룬 이야기의 다음 편이에요.",
    items: [
      { pastIssueLabel: "1호 · 05/23", topic: "AutoStore", story: "그때는 국내 첫 도입 소식이었는데, 이번엔 로봇 팔까지 붙은 신형이 나왔어요." },
      { pastIssueLabel: "2호 · 07/12", topic: "Agility Robotics", story: "현장 시범 운영 단계에서 양산 확대 단계로 넘어갔어요." },
    ],
    watchList: ["로봇 피킹 포트의 실제 처리량(시간당 피킹 수) 공개 여부", "휴머노이드 단가가 AMR과 비교할 만한 수준으로 내려오는지"],
  },
  closing: "다음 호에도 따끈한 소식 물어 올게요. 2주 뒤에 만나요!",
  keywords: ["AutoStore", "피스피킹", "AMR", "휴머노이드", "디지털 트윈"],
};
