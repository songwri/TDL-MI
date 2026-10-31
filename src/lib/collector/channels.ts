import type { SourceDef } from "@/config/sources";
import type { Article } from "@/lib/types";

export interface ChannelSummary {
  id: string;
  name: string;
  region: SourceDef["region"];
  /** 설정된 방식. auto 는 접속할 때 RSS/HTML 을 자동으로 고른다 */
  type: "auto" | "rss" | "html";
  url: string;
  enabled: boolean;
  /** 물류·로봇 키워드가 있는 기사만 적재하는 채널 */
  filtered: boolean;
  articles: number;
  recent: number;
  lastPublishedAt?: string;
  lastCollectedAt?: string;
}

const iso = (a?: string, b?: string) => (!a || (b && b > a) ? b : a);

/** 시트에 쌓인 기사를 채널별로 집계. 채널 ID 가 없는 예전 기사는 언론사 이름이 채널 이름과 같을 때만 연결한다 */
export function summarizeChannels(sources: SourceDef[], articles: Article[], opts: { recentDays?: number; now?: Date } = {}) {
  const since = (opts.now ?? new Date()).getTime() - (opts.recentDays ?? 14) * 86_400_000;
  const byId = new Map(sources.map((s) => [s.id, s]));
  const byName = new Map(sources.map((s) => [s.name, s]));
  const rows = new Map<string, ChannelSummary>(
    sources.map((s) => [
      s.id,
      { id: s.id, name: s.name, region: s.region, type: s.type ?? "auto", url: s.url, enabled: s.enabled, filtered: !!s.requireRelevance, articles: 0, recent: 0 },
    ]),
  );
  let unattributed = 0;
  for (const a of articles) {
    const src = (a.channel && byId.get(a.channel)) || byName.get(a.source);
    const row = src && rows.get(src.id);
    if (!row) {
      unattributed++;
      continue;
    }
    row.articles++;
    if (new Date(a.publishedAt).getTime() >= since) row.recent++;
    row.lastPublishedAt = iso(row.lastPublishedAt, a.publishedAt) === a.publishedAt ? a.publishedAt : row.lastPublishedAt;
    row.lastCollectedAt = iso(row.lastCollectedAt, a.collectedAt) === a.collectedAt ? a.collectedAt : row.lastCollectedAt;
  }
  return { channels: [...rows.values()], unattributed, total: articles.length };
}
