import * as cheerio from "cheerio";
import { cleanText } from "@/lib/utils/text";
import { fetchText } from "./http";
import type { RawItem } from "./parse";

/**
 * 사이트 주소만으로 수집 방법 찾기
 *  1) 홈페이지의 <link rel="alternate" type="application/rss+xml"> 로 피드 탐지
 *  2) 없으면 흔한 피드 경로 시도 (국내 언론 CMS 공통 /rss/allArticle.xml, WordPress /feed 등)
 *  3) 그래도 없으면 홈페이지 링크 중 기사처럼 생긴 주소를 골라 HTML 수집
 */

export type Fetcher = (url: string) => Promise<string>;

export type Resolved =
  | { type: "rss"; url: string; via: "link-tag" | "common-path" }
  | { type: "html"; url: string; via: "heuristic"; sampleLinks: number };

const COMMON_FEED_PATHS = [
  "/rss/allArticle.xml", // 국내 언론 CMS (ndsoft 계열: 물류신문, 로봇신문, 카고뉴스 등)
  "/feed",
  "/rss",
  "/rss.xml",
  "/feed.xml",
  "/feeds/news/",
  "/atom.xml",
];

/** 기사 상세 주소에서 흔히 보이는 모양 */
const ARTICLE_URL = [
  /articleView\.html\?idxno=\d+/i,
  /[?&](idxno|no|news_id|article_id|aid)=\d{3,}/i,
  /\/(article|articles|news|story|stories|view)\/[^/?#]{6,}/i,
  /\/20\d{2}\/\d{1,2}\/(\d{1,2}\/)?[^/?#]{6,}/,
  /\/\d{5,}(?:[/?#.-]|$)/,
  /[a-z0-9]-[a-z0-9-]{20,}\/?$/i,
];

const NOT_ARTICLE = /\/(tag|tags|category|categories|topic|author|authors|search|login|subscribe|about|contact|page|section)\b|articleList|\/list(\.\w+)?$|\.(jpg|png|gif|pdf)$/i;

export const looksLikeFeed = (body: string) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<(rss|feed|rdf:RDF)[\s>]/i.test(body);

export function findFeedLinks(html: string, base: string): string[] {
  const $ = cheerio.load(html);
  const out: string[] = [];
  $('link[rel="alternate"]').each((_, el) => {
    const type = ($(el).attr("type") ?? "").toLowerCase();
    const href = $(el).attr("href");
    if (!href || !/(rss|atom)\+xml/.test(type)) return;
    try {
      out.push(new URL(href, base).toString());
    } catch {
      /* 잘못된 주소 무시 */
    }
  });
  return [...new Set(out)];
}

export function isArticleUrl(url: string, siteHost: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.hostname.replace(/^www\./, "") !== siteHost.replace(/^www\./, "")) return false;
  const pathAndQuery = u.pathname + u.search;
  if (NOT_ARTICLE.test(u.pathname)) return false;
  return ARTICLE_URL.some((re) => re.test(pathAndQuery));
}

/** 홈/목록 페이지에서 기사처럼 생긴 링크 추출 (제목 길이 15자 이상) */
export function extractArticleLinks(html: string, base: string): RawItem[] {
  const $ = cheerio.load(html);
  const host = new URL(base).hostname;
  const seen = new Map<string, RawItem>();
  $("a[href]").each((_, el) => {
    let abs: string;
    try {
      abs = new URL($(el).attr("href")!, base).toString().split("#")[0];
    } catch {
      return;
    }
    if (!isArticleUrl(abs, host)) return;
    const title = cleanText($(el).text()) || cleanText($(el).attr("title"));
    if (title.length < 15) return;
    const prev = seen.get(abs);
    if (!prev || title.length > prev.title.length) seen.set(abs, { title, link: abs });
  });
  return [...seen.values()];
}

export async function resolveSource(siteUrl: string, fetch: Fetcher = fetchText): Promise<Resolved> {
  const home = await fetch(siteUrl);
  if (looksLikeFeed(home)) return { type: "rss", url: siteUrl, via: "link-tag" };

  for (const feed of findFeedLinks(home, siteUrl)) {
    try {
      if (looksLikeFeed(await fetch(feed))) return { type: "rss", url: feed, via: "link-tag" };
    } catch {
      /* 다음 후보 */
    }
  }
  const origin = new URL(siteUrl).origin;
  for (const p of COMMON_FEED_PATHS) {
    const url = origin + p;
    try {
      if (looksLikeFeed(await fetch(url))) return { type: "rss", url, via: "common-path" };
    } catch {
      /* 다음 후보 */
    }
  }
  const links = extractArticleLinks(home, siteUrl);
  if (!links.length) throw new Error("피드도, 기사처럼 보이는 링크도 찾지 못했습니다. 자바스크립트로 그려지는 사이트일 수 있습니다.");
  return { type: "html", url: siteUrl, via: "heuristic", sampleLinks: links.length };
}
