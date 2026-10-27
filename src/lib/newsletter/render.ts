import { config } from "@/lib/config";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import type { Article, ReportContent } from "@/lib/types";

/** articles: 선정 기사 (선택 순서 = 참고 기사 번호) */
export function renderAll(content: ReportContent, issueNo: number, publishDate: string, articles: Article[]) {
  const meta = {
    issueNo,
    publishDate,
    newsletterName: config.newsletterName,
    tagline: config.tagline,
    feedbackContact: config.feedbackContact,
    feedbackEmail: config.feedbackEmail || undefined,
    audience: config.audience,
    articles: articles.map(({ id, title, source, link, publishedAt }) => ({ id, title, source, link, publishedAt })),
  };
  return {
    html: renderEmailHtml(content, meta),
    fragment: renderFragment(content, meta),
    text: renderPlainText(content, meta),
  };
}
