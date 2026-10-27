import { sheetsEnabled, storeMode } from "@/lib/config";
import type { Article, NewsletterIssue } from "@/lib/types";
import { normalizeTitle, normalizeUrl } from "@/lib/utils/text";
import { mutate, read } from "./local";
import * as sheets from "./sheets";

/**
 * 저장소 파사드.
 *
 * local 모드(내 PC): data/db.json 이 원본, 시트가 있으면 write-through
 * sheets 모드(웹 호스팅): 구글 시트가 유일한 원본. 서버의 db.json 은 임시 캐시이며
 *   - 읽기: 캐시가 TTL(기본 20초)보다 오래됐으면 시트에서 다시 불러옴
 *   - 쓰기: 항상 시트에서 최신본을 불러온 뒤 처리하고, 시트 쓰기가 실패하면 오류로 처리
 */

export interface WriteResult {
  warning?: string;
}

const TTL_MS = Number(process.env.SHEETS_CACHE_SECONDS || 20) * 1000;
let lastPull = 0;
let pulling: Promise<void> | null = null;

const inSheetsMode = () => storeMode() === "sheets";

async function pullFromSheets() {
  await sheets.ensureSchemaOnce();
  const remote = await sheets.fetchAll();
  await mutate((db) => {
    db.articles = remote.articles;
    db.issues = remote.issues;
    db.meta.lastSheetsSyncAt = new Date().toISOString();
  });
  lastPull = Date.now();
}

/** sheets 모드에서 캐시를 최신으로 맞춘다 (local 모드에서는 아무 일도 하지 않음) */
export async function refresh(force = false) {
  if (!inSheetsMode()) return;
  if (!sheetsEnabled()) throw new Error("웹 모드에는 구글 시트 설정(GOOGLE_SHEETS_SPREADSHEET_ID, 서비스 계정 키)이 필요합니다.");
  if (!force && Date.now() - lastPull < TTL_MS) return;
  pulling ??= pullFromSheets().finally(() => {
    pulling = null;
  });
  await pulling;
}

/** 시트 쓰기: local 모드에서는 실패해도 경고만, sheets 모드에서는 오류 */
async function toSheets(fn: () => Promise<unknown>): Promise<WriteResult> {
  if (!sheetsEnabled()) return {};
  try {
    if (inSheetsMode()) await sheets.ensureSchemaOnce();
    await fn();
    return {};
  } catch (e) {
    console.error("[sheets]", e);
    if (inSheetsMode()) throw new Error(`구글 시트에 저장하지 못했습니다: ${(e as Error).message}`);
    return { warning: `구글 시트 반영 실패: ${(e as Error).message}` };
  }
}

export async function listArticles(opts: { sinceDays?: number; withContent?: boolean } = {}) {
  await refresh();
  return read((db) => {
    const since = opts.sinceDays ? Date.now() - opts.sinceDays * 86_400_000 : 0;
    return db.articles
      .filter((a) => !since || new Date(a.publishedAt).getTime() >= since)
      .map((a) => (opts.withContent ? a : { ...a, content: undefined }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  });
}

export async function getArticles(ids: string[]): Promise<Article[]> {
  await refresh();
  return read((db) => ids.map((id) => db.articles.find((a) => a.id === id)).filter((a): a is Article => !!a));
}

/** 본문까지 포함 (작성 의뢰서용). sheets 모드에서는 Article_Bodies 시트에서 가져온다 */
export async function getArticlesWithBodies(ids: string[]): Promise<Article[]> {
  const articles = await getArticles(ids);
  if (!inSheetsMode()) return articles;
  const bodies = await sheets.fetchBodies(ids);
  return articles.map((a) => ({ ...a, content: bodies.get(a.id) ?? a.content }));
}

export async function getAllArticles(): Promise<Article[]> {
  await refresh();
  return read((db) => db.articles);
}

/** 기존 URL/제목과 중복되지 않는 기사만 적재 */
export async function addArticles(candidates: Article[]): Promise<{ added: Article[]; duplicates: number } & WriteResult> {
  await refresh(true);
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
  await refresh(true);
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
  await refresh();
  return read((db) => [...db.issues].sort((a, b) => b.issueNo - a.issueNo));
}

export async function getIssue(issueNo: number): Promise<NewsletterIssue | undefined> {
  await refresh();
  return read((db) => db.issues.find((i) => i.issueNo === issueNo));
}

export async function nextIssueNo(): Promise<number> {
  await refresh();
  return read((db) => db.issues.reduce((m, i) => Math.max(m, i.issueNo), 0) + 1);
}

/** 발행 확정: 이력 저장 + 선정 기사에 호수 기록 */
export async function saveIssue(issue: NewsletterIssue): Promise<WriteResult> {
  await refresh(true);
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

/** 시트 → 로컬 캐시 병합 (local 모드). 시트 값을 우선하되 로컬 전용 필드(본문, 구조화 콘텐츠)는 보존 */
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
  await refresh();
  return read((db) => ({
    ...db.meta,
    // 웹 서버는 재시작되므로 수집 시각은 기사 자체의 수집일에서 계산
    lastRefreshAt: db.articles.reduce<string | undefined>((m, a) => (!m || a.collectedAt > m ? a.collectedAt : m), db.meta.lastRefreshAt),
    articleCount: db.articles.length,
    issueCount: db.issues.length,
  }));
}

/** 로컬 캐시 전체를 시트로 밀어넣기 (최초 연동 시, 본문 포함) */
export async function pushAllToSheets() {
  await sheets.ensureSchema();
  const remote = await sheets.fetchAll();
  const remoteIds = new Set(remote.articles.map((a) => a.id));
  const { articles, issues } = await read((db) => db);
  await sheets.appendArticles(articles.filter((a) => !remoteIds.has(a.id)));
  for (const i of issues) await sheets.upsertIssue(i);
  return { articles: articles.length, issues: issues.length };
}
