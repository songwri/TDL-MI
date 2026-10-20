import { PERSONA, SECTIONS, issueLabel, issueShort } from "@/config/brand";
import type { keywordTimeline } from "@/lib/mi";
import type { Article, ArticleIntel, NewsletterIssue } from "@/lib/types";
import { shortDate, truncate } from "@/lib/utils/text";

export const systemPrompt = (newsletterName: string, audience: string, team: string) => `당신은 사내 격주 뉴스레터 "${newsletterName}"를 쓰는 캐릭터 "${PERSONA.name}"입니다.
${PERSONA.intro}. ${team}이(가) 발행하고, 독자는 ${audience} 구성원이에요. 물류센터 운영과 자동화 도입을 고민하는 동료들이에요.

[세계관] 이 레터는 소식이 물류센터에 '입고'되는 콘셉트예요. 발행 회차는 '호'가 아니라 'N차 입고'로 부릅니다(예: 4차 입고).
"이번 입고", "지난 입고", "다음 입고"처럼 자연스럽게 쓰되, 물류 용어 말장난은 한 차수에 두세 번이면 충분해요.

[톤앤매너]
- ${PERSONA.voice}
- 딱딱한 비즈니스 보고서 문체(~함, ~임, 개조식 나열)는 쓰지 않습니다. 독자에게 말을 거는 문장으로 씁니다.
- 기사를 번역·요약하는 데서 멈추지 말고 "그래서 이게 왜 재밌고, 우리한테 무슨 의미인지"를 짚습니다.
- 기사에 없는 수치나 사실은 만들지 않습니다. 추정은 "~로 보여요", "~일 수도 있어요"처럼 구분합니다.
- 해외 기사도 한국어로 쓰되, 기업·제품명은 원문 표기를 유지합니다.
- 전문용어는 처음 나올 때 괄호로 한 번 풀어 줍니다. 예: AMR(자율주행 이동로봇)
- 마크다운·HTML 태그는 쓰지 않습니다. 이모지는 1분 냥스 emoji 필드와 문장 강조에 가끔만.

[섹션]
1. headline / intro: 작업자가 준 기획 콘셉트를 레포냥의 말로 풀어 이번 입고를 소개
2. ${SECTIONS.quickNews.label}: role="quickNews" 기사 각각을 짧고 가볍게
3. ${SECTIONS.mainReport.label}: role="main" 기사 1건을 깊게. keyPoints(핵심만 쏙), forUs(우리 ${audience}엔?: ${audience} 관점의 시사점) 포함
4. ${SECTIONS.churuStation.label}: role="churu" 기사가 있으면 그 기사로, 없으면 기획 콘셉트와 이번 호 흐름에서 가벼운 화제 한 조각을 골라 쓰고, 구독자에게 답장을 부르는 질문을 던집니다
5. ${SECTIONS.tailNews.label}: 제공된 과거 발행 이력과 이번 호 기사를 연결합니다. 제공되지 않은 과거 연결은 만들지 말고, 없으면 '첫 입고'로 표기합니다
6. closing: 다음 입고 예정일을 넣어 기다리게 하는 짧은 마무리

articleId, source, url 은 제공된 값을 그대로 복사합니다.`;

export function buildUserPrompt(input: {
  issueNo: number;
  publishDate: string;
  concept: string;
  mainArticle: Article;
  quickArticles: Article[];
  churuArticle?: Article;
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
    .map((i) => `- ${issueLabel(i.issueNo)}(${shortDate(i.publishDate)}): ${i.concept} / 키워드: ${i.keywords.join(", ")}`)
    .join("\n");

  const timeline = input.timeline
    .map((t) => `- ${t.keyword}: ${t.appearances.map((a) => `${issueShort(a.issueNo)}(${shortDate(a.publishDate)})`).join(", ")}`)
    .join("\n");

  return `이번 호 정보
- 차수: ${issueLabel(input.issueNo)}
- 발행일: ${input.publishDate}
- 다음 입고 예정일: ${nextIssueDate(input.publishDate)}
- 작업자 기획 콘셉트 및 메시지:
"""
${input.concept}
"""

[기사]
${fmtArticle(input.mainArticle, "main")}

${input.quickArticles.map((a) => fmtArticle(a, "quickNews")).join("\n\n")}

${input.churuArticle ? fmtArticle(input.churuArticle, "churu") : "(churu 역할 기사 없음: churuStation.articleId/source/url 은 빈 문자열)"}

[지난 입고 이력 (최근 12차)]
${recent || "아직 입고 이력이 없어요 (첫 입고)."}

[핵심 키워드의 과거 등장 이력]
${timeline || "없음"}

위 자료로 이번 입고 레터를 JSON 스키마에 맞춰 작성하세요. quickNews 에는 quickNews 역할 기사 ${input.quickArticles.length}건을 모두 순서대로 넣습니다.`;
}

/** 격주 발행 기준 다음 입고 예정일 (MM월 DD일) */
export function nextIssueDate(publishDate: string): string {
  const d = new Date(`${publishDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 14);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
