import { issueLabel } from "@/config/brand";
import type { Article, ReportDraft, ReportStats } from "@/lib/types";
import { stripBoilerplate, truncate } from "@/lib/utils/text";

const sentences = (s: string) => s.split(/(?<=[.!?다요])\s+/).filter((x) => x.length > 15);

/** Claude 작성 없이 만드는 규칙 기반 초안. 레이아웃·통계 확인용이며 [작성 필요] 칸은 직접 채운다 */
export function buildFallbackDraft(input: {
  issueNo: number;
  concept: string;
  articles: Article[];
  stats: ReportStats;
}): ReportDraft {
  const { stats } = input;
  // 기자 서명·저작권 고지·사이트 문구는 초안에 담지 않는다 (예전에 수집된 본문 포함)
  const articles = input.articles.map((a) => ({ ...a, content: stripBoilerplate(a.content), summary: stripBoilerplate(a.summary) }));
  const concept = input.concept.split("\n")[0].trim();

  // 카테고리별로 묶어 테마 구성 (기사 수가 많은 순, 최대 3개)
  const byCat = new Map<string, Article[]>();
  for (const a of articles) byCat.set(a.category, [...(byCat.get(a.category) ?? []), a]);
  const groups = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 3);
  const grouped = new Set(groups.flatMap(([, as]) => as.map((a) => a.id)));
  const rest = articles.filter((a) => !grouped.has(a.id));
  if (rest.length) groups[groups.length - 1][1].push(...rest);

  const keywords = [...new Set(articles.flatMap((a) => a.keywords))].slice(0, 6);
  const hasHistory = stats.trend.issues.length > 1;

  return {
    issueTheme: "[작성 필요] 이번 호 핵심 주제 (예: 자율주행으로 바라보는 물류)",
    teamNote: "[작성 필요] 테크이노베이션팀의 한마디 (위트 있는 첫 문장 + 이번 호를 읽는 관점)",
    headline: truncate(concept || `${issueLabel(input.issueNo)} 물류·로봇 자동화 주요 동향`, 45),
    keyTakeaway: "[작성 필요] 이번 호 한 줄 결론",
    executiveSummary: articles.slice(0, 5).map((a) => truncate(`${a.title} (${a.source})`, 110)),
    themes: groups.map(([cat, as]) => {
      const body = sentences(as.map((a) => a.content || a.summary).join(" "));
      return {
        title: `${cat} 분야 동향`,
        takeaway: "[작성 필요] 이 주제의 핵심 한 줄",
        lead: truncate(as[0].summary || as[0].title, 200),
        body: body.length ? [truncate(body.slice(0, 3).join(" "), 500)] : [as[0].summary || "[작성 필요] 본문"],
        insights: as.slice(0, 3).map((a) => truncate(a.title, 120)),
        implications: ["[작성 필요] 운영 센터에 적용할 때의 시사점"],
        sourceArticleIds: as.map((a) => a.id),
      };
    }),
    trend: {
      overview: hasHistory
        ? `이번 호 ${stats.total}건 중 지난 호와 연관·후속인 기사는 ${stats.repeat.followUp}건, 신규 주제는 ${stats.repeat.fresh}건입니다. [작성 필요] 변화 해석`
        : "첫 호로 비교 대상 없음. 다음 호부터 호별 추세를 제공합니다.",
      notes: stats.topKeywords.slice(0, 2).map((k) => `${k.label} 관련 기사 ${k.count}건`),
    },
    recommendations: ["[작성 필요] 검토·확인할 대상이 분명한 제언"],
    watchList: stats.topKeywords.slice(0, 2).map((k) => `${k.label} 후속 동향`),
    keywords,
  };
}
