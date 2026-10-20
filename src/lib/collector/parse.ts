import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { cleanText } from "@/lib/utils/text";

export interface RawItem {
  title: string;
  link: string;
  publishedAt?: string;
  summary?: string;
  content?: string;
  thumbnail?: string;
  publisher?: string;
}

type FeedItem = Parser.Item & {
  "media:content"?: { $?: { url?: string } };
  "media:thumbnail"?: { $?: { url?: string } };
  "content:encoded"?: string;
  source?: string | { _?: string };
  author?: string;
};

const parser: Parser<object, FeedItem> = new Parser({
  customFields: { item: ["media:content", "media:thumbnail", "content:encoded", "source", "author"] },
});

function toIso(d?: string): string | undefined {
  if (!d) return undefined;
  const t = new Date(d);
  return isNaN(t.getTime()) ? undefined : t.toISOString();
}

export async function parseFeed(xml: string, opts: { googleNews?: boolean } = {}): Promise<RawItem[]> {
  const feed = await parser.parseString(xml);
  return feed.items.map((it) => {
    const html = it["content:encoded"] || it.content || "";
    const firstImg = html ? cheerio.load(html)("img").first().attr("src") : undefined;
    let title = cleanText(it.title);
    let publisher: string | undefined;
    if (opts.googleNews) {
      publisher = typeof it.source === "string" ? it.source : it.source?._;
      // Google News 제목 형식: "헤드라인 - 매체명"
      const m = title.match(/^(.*) - ([^-]+)$/);
      if (m) {
        title = m[1].trim();
        publisher = publisher || m[2].trim();
      }
    }
    return {
      title,
      link: (it.link ?? "").trim(),
      publishedAt: toIso(it.isoDate || it.pubDate),
      summary: opts.googleNews ? undefined : cleanText(it.contentSnippet || it.summary || html).slice(0, 600),
      content: html ? cleanText(html) : undefined,
      thumbnail:
        it.enclosure?.url || it["media:content"]?.$?.url || it["media:thumbnail"]?.$?.url || firstImg || undefined,
      publisher,
    };
  });
}

/** 목록 페이지에서 기사 링크 추출 */
export function extractListLinks(html: string, baseUrl: string, linkPattern: string): RawItem[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: RawItem[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")!;
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString().split("#")[0];
    } catch {
      return;
    }
    if (!abs.includes(linkPattern) || seen.has(abs)) return;
    const title = cleanText($(el).text()) || cleanText($(el).attr("title"));
    if (title.length < 15) return; // 썸네일/더보기 링크 제외
    seen.add(abs);
    out.push({ title, link: abs });
  });
  return out;
}

const BODY_SELECTORS = [
  "#article-view-content-div", // ndsoft CMS (물류신문, 로봇신문, 카고뉴스 등)
  "[itemprop=articleBody]",
  ".article-body",
  ".article__body",
  ".articleBody",
  ".entry-content",
  ".story-body",
  ".body-content",
  "article",
];

export interface PageMeta {
  title?: string;
  publishedAt?: string;
  description?: string;
  image?: string;
  content?: string;
  siteName?: string;
}

/** 기사 원문 페이지에서 메타데이터와 본문 텍스트 추출 */
export function extractArticlePage(html: string, url: string): PageMeta {
  const $ = cheerio.load(html);
  const meta = (sel: string) => $(sel).attr("content")?.trim() || undefined;

  let ldDate: string | undefined;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (ldDate) return;
    try {
      const data = JSON.parse($(el).text());
      const nodes = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const n of nodes) if (n?.datePublished) ldDate = n.datePublished;
    } catch {
      /* ignore malformed JSON-LD */
    }
  });

  const published =
    meta('meta[property="article:published_time"]') ||
    meta('meta[name="article:published_time"]') ||
    meta('meta[name="pubdate"]') ||
    meta('meta[name="date"]') ||
    meta('meta[itemprop="datePublished"]') ||
    ldDate ||
    $("time[datetime]").first().attr("datetime");

  $("script, style, noscript, figure, aside, iframe, form, nav, header, footer, .ad, .ads, .related").remove();
  let content = "";
  for (const sel of BODY_SELECTORS) {
    const node = $(sel).first();
    if (!node.length) continue;
    const paras = node
      .find("p")
      .map((_, p) => cleanText($(p).text()))
      .get()
      .filter((t) => t.length > 30);
    content = paras.length >= 2 ? paras.join("\n") : cleanText(node.text());
    if (content.length > 200) break;
  }

  let image = meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]');
  if (image) {
    try {
      image = new URL(image, url).toString();
    } catch {
      image = undefined;
    }
  }
  const t = published ? new Date(published) : null;
  return {
    title: meta('meta[property="og:title"]') || cleanText($("title").text()) || undefined,
    publishedAt: t && !isNaN(t.getTime()) ? t.toISOString() : undefined,
    description: meta('meta[property="og:description"]') || meta('meta[name="description"]'),
    image,
    content: content || undefined,
    siteName: meta('meta[property="og:site_name"]'),
  };
}
