import { sheetsEnabled } from "@/lib/config";
import type { Article, NewsletterIssue } from "@/lib/types";
import { normalizeTitle, normalizeUrl } from "@/lib/utils/text";
import { mutate, read } from "./local";
import * as sheets from "./sheets";

/**
 * 저장소 파사드.
 * - 모든 읽기는 로컬 캐시(data/db.json)에서 수행
 * - 쓰기는 로컬 캐시에 반영 후 구글 시트에 write-through (시트 오류는 warning 으로 반환)
 * - syncFromSheets() 로 시트 → 캐시 동기화 (여러 작업자가 같은 시트를 공유할 때)
 */

export interface WriteResult {
  warning?: string;
}

async function toSheets(fn: () => Promise<unknown>): Promise<WriteResult> {
  if (!sheetsEnabled()) return {};
  try {
    await fn();
    return {};
  } catch (e) {
    console.error("[sheets]", e);
    return { warning: `구글 시트 반영 실패: ${(e as Error).message}` };
  }
}

export async function listArticles(opts: { sinceDays?: number; withContent?: boolean } = {}) {
  return read((db) => {
    const since = opts.sinceDays ? Date.now() - opts.sinceDays * 86_400_000 : 0;
    return db.articles
      .filter((a) => !since || new Date(a.publishedAt).getTime() >= since)
      .map((a) => (opts.withContent ? a : { ...a, content: undefined }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });
}

export async function getArticles(ids: string[]): Promise<Article[]> {
  return read((db) => ids.map((id) => db.articles.find((a) => a.id === id)).filter((a): a is Article => !!a));
}

export async function getAllArticles(): Promise<Article[]> {
  return read((db) => db.articles);
}

/** 기존 URL/제목과 중복되지 않는 기사만 적재 */
export async function addArticles(candidates: Article[]): Promise<{ added: Article[]; duplicates: number } & WriteResult> {
  const { added, duplicates } = await mutate((db) => {
    const urls = new Set(db.articles.map((a) => normalizeUrl(a.link)));
    const titles = new Set(db.articles.map((a) => normalizeTitle(a.title)));
    const added: Article[] = [];
    let duplicates = 0;
    for (const a of candidates) {
      const u = normalizeUrl(a.link);
      const t = normalizeTitle(a.title);
      if (urls.has(u) || titles.has(t)) {
        duplicates++;
        continue;
      }
      urls.add(u);
      titles.add(t);
      added.push(a);
    }
    db.articles.push(...added);
    db.meta.lastRefreshAt = new Date().toISOString();
    return { added, duplicates };
  });
  const w = await toSheets(() => sheets.appendArticles(added));
  return { added, duplicates, ...w };
}

export async function setSelection(ids: string[], selected: boolean): Promise<{ updated: Article[] } & WriteResult> {
  const updated = await mutate((db) => {
    const out: Article[] = [];
    for (const a of db.articles) {
      if (ids.includes(a.id)) {
        a.selected = selected;
        out.push(a);
      }
    }
    return out;
  });
  const w = await toSheets(() => sheets.updateArticleSelections(updated));
  return { updated, ...w };
}

export async function listIssues(): Promise<NewsletterIssue[]> {
  return read((db) => [...db.issues].sort((a, b) => b.issueNo - a.issueNo));
}

export async function getIssue(issueNo: number): Promise<NewsletterIssue | undefined> {
  return read((db) => db.issues.find((i) => i.issueNo === issueNo));
}

export async function nextIssueNo(): Promise<number> {
  return read((db) => db.issues.reduce((m, i) => Math.max(m, i.issueNo), 0) + 1);
}

/** 발행 확정: 이력 저장 + 선정 기사에 호수 기록 */
export async function saveIssue(issue: NewsletterIssue): Promise<WriteResult> {
  const touched = await mutate((db) => {
    db.issues = db.issues.filter((i) => i.issueNo !== issue.issueNo);
    db.issues.push(issue);
    const out: Article[] = [];
    for (const a of db.articles) {
      if (issue.articleIds.includes(a.id)) {
        a.publishedInIssue = issue.issueNo;
        a.selected = false;
        out.push(a);
      } else if (a.publishedInIssue === issue.issueNo) {
        a.publishedInIssue = null;
        out.push(a);
      }
    }
    return out;
  });
  const w1 = await toSheets(() => sheets.upsertIssue(issue));
  const w2 = await toSheets(() => sheets.updateArticleSelections(touched));
  return { warning: [w1.warning, w2.warning].filter(Boolean).join(" / ") || undefined };
}

/** 시트 → 로컬 캐시 병합. 시트 값을 우선하되 로컬 전용 필드(본문, 구조화 콘텐츠)는 보존 */
export async function syncFromSheets() {
  if (!sheetsEnabled()) throw new Error("Google Sheets 환경변수가 설정되지 않았습니다.");
  await sheets.ensureSchema();
  const remote = await sheets.fetchAll();
  return mutate((db) => {
    const local = new Map(db.articles.map((a) => [a.id, a]));
    for (const ra of remote.articles) {
      const la = local.get(ra.id);
      local.set(ra.id, la ? { ...la, ...ra, content: la.content, thumbnail: ra.thumbnail ?? la.thumbnail } : ra);
    }
    db.articles = [...local.values()];
    const localIssues = new Map(db.issues.map((i) => [i.issueNo, i]));
    for (const ri of remote.issues) {
      const li = localIssues.get(ri.issueNo);
      localIssues.set(ri.issueNo, li ? { ...li, ...ri, content: li.content } : ri);
    }
    db.issues = [...localIssues.values()];
    db.meta.lastSheetsSyncAt = new Date().toISOString();
    return { articles: remote.articles.length, issues: remote.issues.length };
  });
}

export async function getMeta() {
  return read((db) => ({ ...db.meta, articleCount: db.articles.length, issueCount: db.issues.length }));
}

/** 로컬 캐시 전체를 시트로 밀어넣기 (최초 연동 시) */
export async function pushAllToSheets() {
  await sheets.ensureSchema();
  const remote = await sheets.fetchAll();
  const remoteIds = new Set(remote.articles.map((a) => a.id));
  const { articles, issues } = await read((db) => db);
  await sheets.appendArticles(articles.filter((a) => !remoteIds.has(a.id)));
  for (const i of issues) await sheets.upsertIssue(i);
  return { articles: articles.length, issues: issues.length };
}
