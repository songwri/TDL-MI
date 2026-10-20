/**
 * 데모용 샘플 데이터 적재:  npm run seed:demo
 * - 과거 발행 3개 호 + 최근 2주 샘플 기사를 로컬 캐시(data/db.json)에 넣는다.
 * - 모든 샘플은 isSample=true, 링크는 example.com 으로 표시되어 실제 기사와 구분된다.
 * - 실제 운영 전에는 data/db.json 을 삭제하면 된다.
 */
import { config } from "@/lib/config";
import { extractKeywords, classify } from "@/lib/mi/matcher";
import { buildFallbackDraft } from "@/lib/newsletter/fallback";
import { renderAll } from "@/lib/newsletter/render";
import { addArticles, saveIssue } from "@/lib/store";
import type { Article, Region } from "@/lib/types";
import { articleIdFromUrl } from "@/lib/utils/text";

config.anthropicApiKey = ""; // 시드는 LLM 을 호출하지 않음

const day = 86_400_000;
const at = (daysAgo: number) => new Date(Date.now() - daysAgo * day).toISOString();

function sample(slug: string, title: string, summary: string, source: string, region: Region, ago: number): Article {
  const link = `https://example.com/sample/${slug}`;
  const text = `${title} ${summary}`;
  return {
    id: articleIdFromUrl(link),
    collectedAt: at(Math.max(0, ago - 1)),
    publishedAt: at(ago),
    source,
    region,
    title,
    link,
    summary,
    content: summary,
    category: classify(`${title} ${title} ${summary}`, region),
    keywords: extractKeywords(text),
    selected: false,
    publishedInIssue: null,
    isSample: true,
  };
}

const past = [
  sample("p1", "AutoStore 큐브형 자동창고, 국내 패션 풀필먼트센터 첫 도입", "AutoStore 시스템이 국내 패션 이커머스 풀필먼트센터에 도입돼 보관 밀도를 3배 높였다.", "물류신문(샘플)", "KR", 160),
  sample("p2", "Locus Robotics surpasses 5 billion picks with AMR fleet", "Locus Robotics says its AMR fleet has completed over 5 billion picks across 300+ sites.", "Robotics 24/7(샘플)", "GLOBAL", 158),
  sample("p3", "Agility Robotics Digit humanoid begins tote handling at GXO", "GXO expands its humanoid pilot with Agility Robotics Digit moving totes in a live warehouse.", "Supply Chain Dive(샘플)", "GLOBAL", 105),
  sample("p4", "쿠팡, 대구 FC에 무인 지게차·AMR 연동 운영", "쿠팡이 대구 풀필먼트센터에서 자율주행 지게차와 AMR을 WMS와 연동해 운영 중이다.", "로봇신문(샘플)", "KR", 104),
  sample("p5", "Symbotic to automate 12 more Walmart regional DCs", "Symbotic will deploy its AI-powered storage and retrieval system at additional Walmart DCs.", "Modern Materials Handling(샘플)", "GLOBAL", 48),
  sample("p6", "LogiMAT 2026 recap: piece-picking robots go mainstream", "Robotic piece picking and physical AI demos dominated the LogiMAT show floor.", "LogiMAT / CeMAT(샘플)", "GLOBAL", 46),
];

const current = [
  sample("c1", "AutoStore unveils next-gen picking port with integrated robotic arm", "AutoStore introduced a new port combining cube storage with an integrated piece-picking robot arm.", "Robotics 24/7(샘플)", "GLOBAL", 3),
  sample("c2", "CJ대한통운, 곤지암 메가허브에 AMR 200대 추가 투입", "CJ대한통운이 풀필먼트센터에 자율주행 로봇(AMR) 200대를 추가 투입해 출고 생산성을 높인다.", "물류신문(샘플)", "KR", 2),
  sample("c3", "Agility Robotics raises new round to scale Digit humanoid production", "Agility Robotics will use fresh funding to scale humanoid robot production for logistics customers.", "Supply Chain Dive(샘플)", "GLOBAL", 5),
  sample("c4", "현대글로비스, 디지털 트윈 기반 물류센터 시뮬레이션 플랫폼 구축", "현대글로비스가 디지털 트윈으로 물류센터 레이아웃과 설비 투자를 사전 검증한다.", "카고뉴스(샘플)", "KR", 6),
  sample("c5", "Dematic launches high-speed sorter for parcel hubs", "Dematic's new sortation system targets parcel hubs handling peak-season volumes.", "Modern Materials Handling(샘플)", "GLOBAL", 8),
  sample("c6", "레인보우로보틱스, 물류용 양팔 모바일 매니퓰레이터 공개", "레인보우로보틱스가 피킹과 디팔레타이징이 가능한 양팔 모바일 로봇을 공개했다.", "로봇신문(샘플)", "KR", 9),
  sample("c7", "Tariff uncertainty pushes shippers toward warehouse automation", "A new survey finds tariff volatility is accelerating warehouse automation investment plans.", "Supply Chain Dive(샘플)", "GLOBAL", 11),
  sample("c8", "Exotec Skypod 차세대 모델 국내 첫 공급 계약", "Exotec이 차세대 Skypod 시스템을 국내 유통사에 공급한다.", "물류신문(샘플)", "KR", 12),
];

async function main() {
  const r = await addArticles([...past, ...current]);
  console.log(`샘플 기사 ${r.added.length}건 적재 (중복 ${r.duplicates})`);
  const issues = [
    { issueNo: 1, publishDate: at(150).slice(0, 10), concept: "큐브형 AS/RS와 AMR, 국내 풀필먼트 자동화의 두 축", ids: [past[0], past[1]] },
    { issueNo: 2, publishDate: at(100).slice(0, 10), concept: "휴머노이드는 물류센터에 언제 들어오나", ids: [past[2], past[3]] },
    { issueNo: 3, publishDate: at(42).slice(0, 10), concept: "LogiMAT로 본 피스피킹 상용화와 대형 AS/RS 투자", ids: [past[4], past[5]] },
  ];
  for (const i of issues) {
    const [main, ...quick] = i.ids;
    const content = buildFallbackDraft({ issueNo: i.issueNo, concept: i.concept, main, quick, intel: [] });
    const { html } = renderAll(content, i.issueNo, i.publishDate, i.ids);
    await saveIssue({
      issueNo: i.issueNo,
      publishDate: i.publishDate,
      concept: i.concept,
      articleIds: i.ids.map((a) => a.id),
      html,
      keywords: content.keywords,
      headline: content.headline,
      content,
      createdAt: new Date().toISOString(),
    });
  }
  console.log(`샘플 발행 이력 ${issues.length}개 호 저장 → ${config.dataDir}/db.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
