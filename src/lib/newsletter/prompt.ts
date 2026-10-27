import { issueLabel } from "@/config/brand";
import { rulesMarkdown } from "@/config/report-rules";
import { statsToText } from "@/lib/report/stats";
import type { Article, ArticleIntel, NewsletterIssue, ReportStats } from "@/lib/types";
import { shortDate, truncate } from "@/lib/utils/text";

export const systemPrompt = (product: string, audience: string, publisher: string) => rulesMarkdown(audience, publisher, product);

export function buildUserPrompt(input: {
  issueNo: number;
  publishDate: string;
  concept: string;
  articles: Article[];
  intel: ArticleIntel[];
  issues: NewsletterIssue[];
  stats: ReportStats;
}): string {
  const fmtArticle = (a: Article, i: number) => {
    const rel = input.intel.find((x) => x.articleId === a.id)?.relations ?? [];
    return `<article no="${i + 1}">
articleId: ${a.id}
source: ${a.source}
url: ${a.link}
publishedAt: ${a.publishedAt.slice(0, 10)}
category: ${a.category}
keywords: ${a.keywords.join(", ") || "-"}
title: ${a.title}
summary: ${a.summary}
body:
${truncate(a.content || a.summary, 6000)}
pastIssueLinks: ${rel.length ? rel.map((r) => r.label).join(" | ") : "없음"}
</article>`;
  };

  const recent = input.issues
    .slice()
    .sort((a, b) => b.issueNo - a.issueNo)
    .slice(0, 12)
    .map((i) => `- ${issueLabel(i.issueNo)}(${shortDate(i.publishDate)}): ${i.concept} / 키워드: ${i.keywords.join(", ")}`)
    .join("\n");

  return `이번 호 정보
- 호수: ${issueLabel(input.issueNo)}
- 발행일: ${input.publishDate}
- 작업자 기획 의도 (이번 호가 다루려는 질문·관점):
"""
${input.concept}
"""

[선정 기사 ${input.articles.length}건]
${input.articles.map(fmtArticle).join("\n\n")}

[이번 호 통계 (서버 계산값, 이 숫자만 인용)]
${statsToText(input.stats)}

[지난 호 이력 (최근 12개 호)]
${recent || "아직 발행 이력이 없습니다 (창간호)."}

위 자료로 이번 호 리포트를 JSON 스키마에 맞춰 작성하세요.
- themes 는 기사를 주제별로 묶어 2~4개로 만들고, 각 테마의 sourceArticleIds 에는 위 articleId 만 사용합니다.
- 선정된 ${input.articles.length}건이 모두 어느 테마에든 인용되어야 합니다.
- 작업자 기획 의도를 리포트 전체의 관점으로 반영합니다.`;
}
