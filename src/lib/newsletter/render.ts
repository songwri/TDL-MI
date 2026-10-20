import { config } from "@/lib/config";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import type { Article, NewsletterContent } from "@/lib/types";

export function renderAll(content: NewsletterContent, issueNo: number, publishDate: string, articles: Article[]) {
  const meta = {
    issueNo,
    publishDate,
    newsletterName: config.newsletterName,
    tagline: config.tagline,
    feedbackContact: config.feedbackContact,
    audience: config.audience,
    feedbackEmail: config.feedbackEmail || undefined,
    surveyUrl: config.surveyUrl || undefined,
    archiveUrl: config.archiveUrl || undefined,
    assetBaseUrl: config.assetBaseUrl || undefined,
    thumbnails: Object.fromEntries(articles.map((a) => [a.id, a.thumbnail])),
    dates: Object.fromEntries(articles.map((a) => [a.id, a.publishedAt.slice(0, 10)])),
  };
  return {
    html: renderEmailHtml(content, meta),
    fragment: renderFragment(content, meta),
    text: renderPlainText(content, meta),
  };
}
