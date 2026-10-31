import { SOURCES, type SourceDef } from "@/config/sources";
import { config } from "@/lib/config";
import { classify, extractKeywords, isRelevant } from "@/lib/mi/matcher";
import { addArticles, getAllArticles, setTitlesKo } from "@/lib/store";
import { needsKoTitle, withKoTitles } from "@/lib/translate";
import type { Article, RefreshResult } from "@/lib/types";
import { mapLimit } from "@/lib/utils/async";
import { articleIdFromUrl, cleanText, normalizeUrl, stripBoilerplate, truncate } from "@/lib/utils/text";
import { extractArticleLinks, resolveSource, type Resolved } from "./discover";
import { fetchText } from "./http";
import { extractArticlePage, extractListLinks, parseFeed, type RawItem } from "./parse";

const MAX_CONTENT = 12_000;

/** auto 채널의 탐지 결과 (서버 프로세스 동안 재사용) */
const resolvedCache = new Map<string, Resolved>();

export async function fetchSourceItems(src: SourceDef): Promise<RawItem[]> {
  let type = src.type ?? "auto";
  let url = src.url;
  if (type === "auto") {
    let r = resolvedCache.get(src.url);
    if (!r) resolvedCache.set(src.url, (r = await resolveSource(src.url)));
    type = r.type;
    url = r.url;
  }
  const body = await fetchText(url);
  const items =
    type === "rss"
      ? await parseFeed(body, { googleNews: url.includes("news.google.com") })
      : src.linkPattern
        ? extractListLinks(body, url, src.linkPattern)
        : extractArticleLinks(body, url);
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

export function toArticle(item: RawItem, src: { id?: string; name: string; region: SourceDef["region"] }, now = new Date()): Article {
  // 기자 서명·저작권 고지·사이트 문구는 저장하지 않는다
  const body = stripBoilerplate(item.content);
  const content = body ? truncate(body, MAX_CONTENT) : undefined;
  const summary = truncate(stripBoilerplate(cleanText(item.summary || "")) || content || "", 400);
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
    channel: src.id,
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

  // 해외 기사 제목은 한국어 번역을 함께 저장 (Apps Script 구글 번역, 무료)
  const tr = await withKoTitles(candidates);
  const { added, duplicates, warning } = await addArticles(tr.articles);
  // 예전에 번역 없이 수집된 최근 해외 기사도 채운다 (한 번에 최대 100건)
  let backfillWarning: string | undefined;
  if (!tr.warning) {
    const old = (await getAllArticles()).filter((a) => needsKoTitle(a) && new Date(a.publishedAt).getTime() >= since).slice(0, 100);
    const done = await withKoTitles(old);
    const map = new Map(done.articles.filter((a) => a.titleKo).map((a) => [a.id, a.titleKo!]));
    backfillWarning = done.warning ?? (await setTitlesKo(map)).warning;
  }
  for (const a of added) {
    const stat = statOf.get(a.id);
    if (stat) stat.added++;
  }
  return { added: added.length, duplicates, filtered, perSource, warning: [warning, tr.warning, backfillWarning].filter(Boolean).join(" / ") || undefined };
}

/** 채널 점검: 지금 접속되는지, 어떤 방식으로 수집하는지, 최근 기사 몇 건이 보이는지 */
export async function checkSource(src: SourceDef) {
  const started = Date.now();
  let method: { type: "rss" | "html"; url: string; via?: string } = { type: src.type === "rss" ? "rss" : "html", url: src.url };
  if ((src.type ?? "auto") === "auto") {
    let r = resolvedCache.get(src.url);
    if (!r) resolvedCache.set(src.url, (r = await resolveSource(src.url)));
    method = { type: r.type, url: r.url, via: r.via };
  }
  const items = await fetchSourceItems(src);
  return {
    method,
    count: items.length,
    ms: Date.now() - started,
    samples: items.slice(0, 5).map((i) => ({ title: i.title, link: i.link, publishedAt: i.publishedAt })),
  };
}
