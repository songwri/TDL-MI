import { config } from "@/lib/config";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import type { Article, ReportContent, ViewerData } from "@/lib/types";

export function buildViewer(issueNo: number, publishDate: string, articles: Article[]): ViewerData {
  return {
    issueNo,
    publishDate,
    brand: { product: config.newsletterName, publisher: config.feedbackContact, audience: config.audience },
    articles: articles.map((a) => ({ id: a.id, title: a.title, source: a.source, link: a.link, publishedAt: a.publishedAt, category: a.category, region: a.region })),
  };
}

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
    articles: articles.map(({ id, title, source, link, publishedAt, region }) => ({ id, title, source, link, publishedAt, region })),
  };
  return {
    /** 웹 인터랙티브 화면용 (메일 HTML 과 같은 데이터) */
    viewer: buildViewer(issueNo, publishDate, articles),
    html: renderEmailHtml(content, meta),
    fragment: renderFragment(content, meta),
    text: renderPlainText(content, meta),
  };
}
