import { PERSONA, issueLabel, issueShort } from "@/config/brand";
import type { Article, ArticleIntel, NewsletterContent } from "@/lib/types";
import { shortDate, truncate } from "@/lib/utils/text";
import { nextIssueDate } from "./prompt";

const TAG: Record<string, string> = {
  "AMR/AGV": "AMR",
  "풀필먼트 자동화": "풀필먼트",
  "소팅/보관설비": "설비",
  "로봇 피킹/매니퓰레이션": "로봇",
  "글로벌 트렌드": "글로벌",
  기타: "물류",
};

const chunk = <T,>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n)).slice(0, 4);

/** LLM 미설정 시 사용하는 규칙 기반 초안 (편집 출발점 용도) */
export function buildFallbackDraft(input: {
  issueNo: number;
  publishDate?: string;
  concept: string;
  main: Article;
  quick: Article[];
  churu?: Article;
  intel: ArticleIntel[];
}): NewsletterContent {
  const { main, quick, churu, intel } = input;
  const sentences = (s: string) => s.split(/(?<=[.!?다요])\s+/).filter((x) => x.length > 15);
  const body = sentences(main.content || main.summary);
  const relations = intel.flatMap((i) => i.relations);
  const keywords = [...new Set([main, ...quick, ...(churu ? [churu] : [])].flatMap((a) => a.keywords))].slice(0, 6);
  const conceptLine = input.concept.split("\n")[0].trim();

  return {
    headline: truncate(conceptLine || main.title, 40),
    intro: `안녕하세요, ${PERSONA.name}이에요! ${issueLabel(input.issueNo)} 주제는 "${truncate(conceptLine || "최근 2주간의 물류·로봇 소식", 50)}"예요. 메인 리포트에서는 ${main.source}의 "${truncate(main.title, 36)}" 이야기를 깊게 들여다봐요.`,
    quickNews: quick.map((a) => ({
      articleId: a.id,
      tag: TAG[a.category] ?? "물류",
      title: a.title,
      emoji: "📦",
      body: truncate(a.summary, 220),
      source: a.source,
      url: a.link,
    })),
    mainReport: {
      articleId: main.id,
      kicker: `${main.source} · ${main.category}`,
      title: main.title,
      source: main.source,
      url: main.link,
      paragraphs: body.length > 1 ? chunk(body, 3).map((g) => truncate(g.join(" "), 500)) : [main.summary || "[작성 필요] 본문"],
      keyPoints: body.length > 1 ? body.slice(0, 3).map((s) => truncate(s, 140)) : ["[작성 필요] 핵심 수치·사실"],
      forUs: ["[작성 필요] 우리 센터에 적용해 볼 만한 부분", "[작성 필요] 검토할 때 따져 볼 비용·효과"],
    },
    churuStation: churu
      ? {
          articleId: churu.id,
          title: `띵동! ${truncate(churu.title, 40)}`,
          body: truncate(churu.summary, 220),
          question: "여러분 센터라면 이 소식, 어떻게 보세요? 답장으로 알려 주세요.",
          source: churu.source,
          url: churu.link,
        }
      : {
          articleId: "",
          title: "띵동! 이번 호 주제, 여러분 생각이 궁금해요",
          body: `${conceptLine || "이번 호 주제"}에 대해 현장에서 느끼는 점이 있다면 들려주세요.`,
          question: "지금 우리 센터에서 가장 먼저 자동화하고 싶은 공정은 어디인가요?",
          source: "",
          url: "",
        },
    tailNews: {
      intro: relations.length
        ? "이번 입고 소식 중 일부는 지난 입고에서 다룬 이야기와 이어져요."
        : "이번 입고 소식은 처음 들어온 주제예요.",
      items: relations.length
        ? relations.slice(0, 3).map((r) => ({
            pastIssueLabel: `${issueShort(r.issueNo)} · ${shortDate(r.publishDate)}`,
            topic: r.sharedKeywords.join(", ") || "유사 주제",
            story: r.label,
          }))
        : [{ pastIssueLabel: "첫 입고", topic: keywords.slice(0, 3).join(", ") || main.category, story: "다음 입고부터 이어지는 소식을 추적해 볼게요." }],
      watchList: keywords.slice(0, 2).map((k) => `${k}의 다음 행보`),
    },
    closing: input.publishDate
      ? `다음 입고는 ${nextIssueDate(input.publishDate)} 예정이에요. 따끈한 소식 물어 올게요!`
      : "2주 뒤에 따끈한 소식 물어 올게요!",
    keywords,
  };
}
