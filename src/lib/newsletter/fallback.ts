import { PERSONA } from "@/config/brand";
import type { Article, ArticleIntel, NewsletterContent } from "@/lib/types";
import { truncate } from "@/lib/utils/text";

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n)).slice(0, 3);

/** LLM 미설정 시 사용하는 규칙 기반 초안 (편집 출발점 용도) */
export function buildFallbackDraft(input: {
  issueNo: number;
  concept: string;
  main: Article;
  briefs: Article[];
  intel: ArticleIntel[];
}): NewsletterContent {
  const { main, briefs, intel } = input;
  const sentences = (s: string) => s.split(/(?<=[.!?다])\s+/).filter((x) => x.length > 15);
  const body = sentences(main.content || main.summary);
  const relations = intel.flatMap((i) => i.relations);
  const keywords = [...new Set([main, ...briefs].flatMap((a) => a.keywords))].slice(0, 7);
  const conceptLine = input.concept.split("\n")[0].trim();

  return {
    headline: truncate(`[${input.issueNo}호] ${conceptLine || main.title}`, 60),
    conceptBriefing: conceptLine || "이번 호 주요 물류·로봇 자동화 동향",
    editorNote: `안녕하세요, ${PERSONA.name}입니다. 이번 ${input.issueNo}호에서는 ${main.source}의 "${truncate(main.title, 40)}" 기사를 중심으로 최근 2주간의 물류·로봇 자동화 동향을 정리했습니다.`,
    deepDive: {
      articleId: main.id,
      title: main.title,
      source: main.source,
      url: main.link,
      summary: truncate(main.summary, 300),
      analysis: body.length > 1 ? chunk(body.slice(1), 3).map((g) => truncate(g.join(" "), 500)) : ["[작성 필요] 기사 내용에 대한 심층 분석"],
      keyPoints: body.length > 1 ? body.slice(0, 3).map((s) => truncate(s, 140)) : ["[작성 필요] 핵심 수치·사실"],
      implications: ["[작성 필요] 당사 센터 운영 관점의 적용 가능성", "[작성 필요] 투자 대비 효과 및 검토 우선순위"],
    },
    briefs: briefs.map((a) => ({
      articleId: a.id,
      title: a.title,
      source: a.source,
      url: a.link,
      summary: truncate(a.summary, 240),
      keyPoint: a.keywords.length ? `관련 키워드: ${a.keywords.slice(0, 3).join(", ")}` : a.category,
    })),
    marketIntelligence: {
      overview: relations.length
        ? "이번 호 기사 중 일부는 과거 발행 주제와 연결됩니다. 기술 흐름의 연속성을 점검해 보세요."
        : "이번 호 기사는 최근 발행 이력과 겹치지 않는 신규 관측 주제입니다.",
      connections: relations.length
        ? relations.slice(0, 4).map((r) => ({
            pastIssueLabel: r.label.split("에서")[0],
            topic: r.sharedKeywords.join(", ") || "유사 주제",
            insight: r.label,
          }))
        : [{ pastIssueLabel: "신규 관측", topic: keywords.slice(0, 3).join(", ") || main.category, insight: "향후 호에서 후속 동향을 추적합니다." }],
      watchList: keywords.slice(0, 3).map((k) => `${k} 관련 후속 발표`),
    },
    closingTip: "의견이나 다뤄 주었으면 하는 주제가 있다면 언제든 회신 주세요.",
    keywords,
  };
}
