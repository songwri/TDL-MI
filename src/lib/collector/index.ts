import { SOURCES, type SourceDef } from "@/config/sources";
import { config } from "@/lib/config";
import { classify, extractKeywords, isRelevant } from "@/lib/mi/matcher";
import { addArticles, getAllArticles } from "@/lib/store";
import type { Article, RefreshResult } from "@/lib/types";
import { mapLimit } from "@/lib/utils/async";
import { articleIdFromUrl, cleanText, normalizeUrl, truncate } from "@/lib/utils/text";
import { fetchText } from "./http";
import { extractArticlePage, extractListLinks, parseFeed, type RawItem } from "./parse";

const MAX_CONTENT = 12_000;

async function fetchSourceItems(src: SourceDef): Promise<RawItem[]> {
  const body = await fetchText(src.url);
  const items =
    src.type === "rss"
      ? await parseFeed(body, { googleNews: src.url.includes("news.google.com") })
      : extractListLinks(body, src.url, src.linkPattern ?? "/");
  return items.filter((i) => i.title && i.link).slice(0, src.maxItems ?? 60);
}

async function enrich(item: RawItem): Promise<RawItem> {
  try {
    const page = extractArticlePage(await fetchText(item.link), item.link);
    return {
      ...item,
      title: item.title || page.title || "",
      publishedAt: item.publishedAt || page.publishedAt,
      summary: item.summary || page.description,
      content: page.content && page.content.length > (item.content?.length ?? 0) ? page.content : item.content,
      thumbnail: item.thumbnail || page.image,
    };
  } catch {
    return item; // 원문 접근 실패 시 피드 정보만 사용
  }
}

export function toArticle(item: RawItem, src: Pick<SourceDef, "name" | "region">, now = new Date()): Article {
  const content = item.content ? truncate(item.content, MAX_CONTENT) : undefined;
  const summary = truncate(cleanText(item.summary || content || ""), 400);
  const text = `${item.title}\n${summary}\n${content ?? ""}`;
  return {
    id: articleIdFromUrl(item.link),
    collectedAt: now.toISOString(),
    publishedAt: item.publishedAt ?? now.toISOString(),
    source: item.publisher ? `${item.publisher}` : src.name,
    region: src.region,
    title: item.title,
    link: item.link,
    summary,
    content,
    thumbnail: item.thumbnail,
    category: classify(`${item.title} ${item.title} ${summary}`, src.region),
    keywords: extractKeywords(text),
    selected: false,
    publishedInIssue: null,
  };
}

/** 기사 최신화: 활성 채널에서 최근 N일 기사를 수집하여 중복 제거 후 적재 */
export async function refreshArticles(opts: { days?: number; sourceIds?: string[] } = {}): Promise<RefreshResult & { warning?: string }> {
  const days = opts.days ?? config.lookbackDays;
  const since = Date.now() - days * 86_400_000;
  const known = new Set((await getAllArticles()).map((a) => normalizeUrl(a.link)));
  const sources = SOURCES.filter((s) => (opts.sourceIds ? opts.sourceIds.includes(s.id) : s.enabled));

  let filtered = 0;
  const perSource: RefreshResult["perSource"] = [];
  const candidates: Article[] = [];
  const statOf = new Map<string, RefreshResult["perSource"][number]>();

  await mapLimit(sources, 4, async (src) => {
    const stat: RefreshResult["perSource"][number] = { source: src.name, fetched: 0, added: 0 };
    perSource.push(stat);
    try {
      const items = await fetchSourceItems(src);
      stat.fetched = items.length;
      // 이미 적재된 URL과 기간 밖(발행일 확인 가능한 경우) 기사는 원문 요청 전에 제외
      const fresh = items.filter(
        (i) => !known.has(normalizeUrl(i.link)) && (!i.publishedAt || new Date(i.publishedAt).getTime() >= since),
      );
      const enriched = src.enrich ? await mapLimit(fresh, 4, enrich) : fresh;
      for (const item of enriched) {
        if (item.publishedAt && new Date(item.publishedAt).getTime() < since) {
          filtered++;
          continue;
        }
        if (src.requireRelevance && !isRelevant(`${item.title} ${item.summary ?? ""} ${item.content?.slice(0, 1500) ?? ""}`)) {
          filtered++;
          continue;
        }
        const article = toArticle(item, src);
        candidates.push(article);
        statOf.set(article.id, stat);
      }
    } catch (e) {
      stat.error = (e as Error).message;
    }
  });

  const { added, duplicates, warning } = await addArticles(candidates);
  for (const a of added) {
    const stat = statOf.get(a.id);
    if (stat) stat.added++;
  }
  return { added: added.length, duplicates, filtered, perSource, warning };
}
