import { ICONS, PERSONA } from "@/config/brand";
import type { Article, ArticleIntel, NewsletterIssue } from "@/lib/types";
import { shortDate, truncate } from "@/lib/utils/text";
import type { keywordTimeline } from "@/lib/mi";

export const systemPrompt = (newsletterName: string) => `당신은 사내 바이위클리 뉴스레터 "${newsletterName}"의 편집자이자 캐릭터 "${PERSONA.name}"(${PERSONA.emoji})입니다.
${PERSONA.intro}로서, 물류센터 자동화·로봇 도입을 검토하는 사내 실무자와 의사결정자를 위해 글을 씁니다.

[톤앤매너]
- ${PERSONA.voice}
- 기사 내용을 단순 번역·요약하지 말고 "그래서 우리에게 무슨 의미인가"를 분석합니다.
- 기사에 없는 수치나 사실을 만들어내지 않습니다. 추정이나 의견은 "~로 보입니다", "~가능성이 있습니다"처럼 구분합니다.
- 해외 기사는 한국어로 작성하되 고유명사(기업·제품명)는 원문 표기를 유지합니다.

[아이콘 규칙] 템플릿이 섹션 아이콘(${Object.values(ICONS).join(" ")})을 자동 배치하므로, 본문 문자열에는 이모지를 문장당 최대 1개, 꼭 필요한 곳(예: ${ICONS.insight} 인사이트 강조, ${ICONS.tip} 팁)에만 씁니다. 마크다운·HTML 태그는 쓰지 않습니다.

[섹션 구성]
1. 헤더: headline(메일 제목), conceptBriefing(작업자가 입력한 기획 콘셉트를 한 줄로 정제)
2. 메인 딥다이브: 지정된 핵심 기사 1건 심층 분석 + 사내 도입 시사점
3. 테크 & 인더스트리 브리프: 나머지 선택 기사 각각 요약 + 핵심 포인트
4. Market Intelligence 코너: 제공된 과거 발행 이력과 연결해 기술 흐름을 점검. 과거 이력에 없는 연결은 만들지 말고 "신규 관측"으로 표기
5. 마무리: closingTip

articleId, source, url 필드는 제공된 값을 그대로 복사합니다.`;

export function buildUserPrompt(input: {
  issueNo: number;
  publishDate: string;
  concept: string;
  mainArticle: Article;
  briefArticles: Article[];
  intel: ArticleIntel[];
  issues: NewsletterIssue[];
  timeline: ReturnType<typeof keywordTimeline>;
}): string {
  const fmtArticle = (a: Article, role: string) => {
    const rel = input.intel.find((i) => i.articleId === a.id)?.relations ?? [];
    return `<article role="${role}">
articleId: ${a.id}
source: ${a.source}
url: ${a.link}
publishedAt: ${a.publishedAt.slice(0, 10)}
category: ${a.category}
keywords: ${a.keywords.join(", ") || "-"}
title: ${a.title}
summary: ${a.summary}
body:
${truncate(a.content || a.summary, 8000)}
pastIssueLinks: ${rel.length ? rel.map((r) => r.label).join(" | ") : "없음"}
</article>`;
  };

  const recent = input.issues
    .slice()
    .sort((a, b) => b.issueNo - a.issueNo)
    .slice(0, 12)
    .map((i) => `- ${i.issueNo}호(${shortDate(i.publishDate)}): ${i.concept} / 키워드: ${i.keywords.join(", ")}`)
    .join("\n");

  const timeline = input.timeline
    .map((t) => `- ${t.keyword}: ${t.appearances.map((a) => `${a.issueNo}호(${shortDate(a.publishDate)})`).join(", ")}`)
    .join("\n");

  return `이번 호 정보
- 호수: ${input.issueNo}호
- 발행일: ${input.publishDate}
- 작업자 기획 콘셉트 및 메시지:
"""
${input.concept}
"""

[메인 딥다이브 기사]
${fmtArticle(input.mainArticle, "deepDive")}

[브리프 기사]
${input.briefArticles.map((a) => fmtArticle(a, "brief")).join("\n\n") || "없음"}

[과거 발행 이력 (최근 12개 호)]
${recent || "아직 발행 이력이 없습니다 (창간호)."}

[핵심 키워드의 과거 등장 이력]
${timeline || "없음"}

위 자료로 이번 호 뉴스레터 콘텐츠를 JSON 스키마에 맞춰 작성하세요. briefs 에는 브리프 기사 ${input.briefArticles.length}건을 모두 순서대로 포함합니다.`;
}
