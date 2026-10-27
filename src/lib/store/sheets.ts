import fs from "node:fs";
import { auth as gauth, sheets as gsheets, type sheets_v4 } from "@googleapis/sheets";
import { config, sheetsEnabled } from "@/lib/config";
import { CATEGORIES, type Article, type Category, type NewsletterIssue } from "@/lib/types";

/** ── 시트 스키마 ─────────────────────────────────────────── */
export const ARTICLE_SHEET = "Raw_Articles";
export const ISSUE_SHEET = "Newsletter_Issues";
export const BODY_SHEET = "Article_Bodies"; // 기사 본문 (작성 의뢰서용, 목록 조회와 분리)
export const HANDOFF_SHEET = "Handoffs"; // 작성 의뢰서·작성본 (웹 서버에는 저장하지 않기 위함)

export const ARTICLE_HEADERS = [
  "ID", "수집일", "발행일", "언론사", "제목", "링크", "요약", "카테고리", "선정여부", "지역", "썸네일", "키워드",
] as const;
export const ISSUE_HEADERS = [
  "호수", "발행일", "메인 콘셉트", "선정 기사 ID 목록", "완성된 HTML", "핵심 키워드", "헤드라인", "생성일시",
  "HTML(이어짐1)", "HTML(이어짐2)", "HTML(이어짐3)",
] as const;

/** 구글 시트 셀 최대 50,000자 제한 → 완성된 HTML은 여러 셀로 분할 저장 */
const CELL_LIMIT = 49_000;
const HTML_CELLS = 4;
const SELECTION_COL = "I"; // 선정여부

let client: sheets_v4.Sheets | null = null;

/** 테스트용: 가짜 시트 클라이언트 주입 */
export function __setClient(c: sheets_v4.Sheets | null) {
  client = c;
  schemaReady = false;
}

function loadCredentials() {
  if (config.serviceAccountKeyJson) return JSON.parse(config.serviceAccountKeyJson);
  if (config.serviceAccountKeyBase64) return JSON.parse(Buffer.from(config.serviceAccountKeyBase64, "base64").toString("utf8"));
  return JSON.parse(fs.readFileSync(config.serviceAccountKeyPath, "utf8"));
}

function getClient(): sheets_v4.Sheets {
  if (client) return client;
  if (!sheetsEnabled()) throw new Error("Google Sheets 환경변수가 설정되지 않았습니다.");
  const credentials = loadCredentials();
  const auth = new gauth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = gsheets({ version: "v4", auth });
  return client;
}

const sid = () => config.spreadsheetId;

export const BODY_HEADERS = ["ID", "본문"] as const;
export const HANDOFF_HEADERS = ["호수", "작성 의뢰(JSON)", "작성본(JSON)", "작성본(이어짐)", "의뢰 저장일시", "작성본 저장일시"] as const;

let schemaReady = false;

/** 프로세스당 한 번만 시트/헤더 확인 */
export async function ensureSchemaOnce() {
  if (schemaReady) return;
  await ensureSchema();
  schemaReady = true;
}

/** 시트/헤더가 없으면 생성 */
export async function ensureSchema(): Promise<{ created: string[] }> {
  const api = getClient();
  const meta = await api.spreadsheets.get({ spreadsheetId: sid(), fields: "sheets.properties.title" });
  const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);
  const created: string[] = [];
  const requests = [ARTICLE_SHEET, ISSUE_SHEET, BODY_SHEET, HANDOFF_SHEET]
    .filter((t) => !existing.has(t))
    .map((title) => {
      created.push(title);
      return { addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } };
    });
  if (requests.length) {
    await api.spreadsheets.batchUpdate({ spreadsheetId: sid(), requestBody: { requests } });
  }
  await api.spreadsheets.values.batchUpdate({
    spreadsheetId: sid(),
    requestBody: {
      valueInputOption: "RAW",
      data: [
        { range: `${ARTICLE_SHEET}!A1`, values: [[...ARTICLE_HEADERS]] },
        { range: `${ISSUE_SHEET}!A1`, values: [[...ISSUE_HEADERS]] },
        { range: `${BODY_SHEET}!A1`, values: [[...BODY_HEADERS]] },
        { range: `${HANDOFF_SHEET}!A1`, values: [[...HANDOFF_HEADERS]] },
      ],
    },
  });
  return { created };
}

/** ── 직렬화 ─────────────────────────────────────────────── */
export function selectionLabel(a: Pick<Article, "selected" | "publishedInIssue">): string {
  if (a.publishedInIssue) return `발행(제${a.publishedInIssue}호)`;
  return a.selected ? "후보" : "";
}

export function articleToRow(a: Article): string[] {
  return [
    a.id, a.collectedAt, a.publishedAt, a.source, a.title, a.link, a.summary, a.category,
    selectionLabel(a), a.region, a.thumbnail ?? "", a.keywords.join(", "),
  ];
}

export function rowToArticle(r: string[]): Article | null {
  if (!r[0]) return null;
  const sel = r[8] ?? "";
  const issueMatch = sel.match(/(\d+)\s*[호차]/);
  const category = (CATEGORIES as readonly string[]).includes(r[7]) ? (r[7] as Category) : "기타";
  return {
    id: r[0],
    collectedAt: r[1] ?? "",
    publishedAt: r[2] ?? "",
    source: r[3] ?? "",
    title: r[4] ?? "",
    link: r[5] ?? "",
    summary: r[6] ?? "",
    category,
    selected: sel === "후보",
    publishedInIssue: issueMatch ? Number(issueMatch[1]) : null,
    region: r[9] === "KR" ? "KR" : "GLOBAL",
    thumbnail: r[10] || undefined,
    keywords: (r[11] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export function issueToRow(i: NewsletterIssue): string[] {
  const chunks: string[] = [];
  for (let k = 0; k < HTML_CELLS; k++) chunks.push(i.html.slice(k * CELL_LIMIT, (k + 1) * CELL_LIMIT));
  return [
    String(i.issueNo), i.publishDate, i.concept, i.articleIds.join(", "), chunks[0], i.keywords.join(", "),
    i.headline ?? "", i.createdAt, ...chunks.slice(1),
  ];
}

export function rowToIssue(r: string[]): NewsletterIssue | null {
  const issueNo = Number(r[0]);
  if (!issueNo) return null;
  return {
    issueNo,
    publishDate: r[1] ?? "",
    concept: r[2] ?? "",
    articleIds: (r[3] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    html: [r[4], r[8], r[9], r[10]].filter(Boolean).join(""),
    keywords: (r[5] ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    headline: r[6] || undefined,
    createdAt: r[7] ?? "",
  };
}

/** ── 읽기/쓰기 ──────────────────────────────────────────── */
async function readRows(sheet: string): Promise<string[][]> {
  const res = await getClient().spreadsheets.values.get({
    spreadsheetId: sid(),
    range: `${sheet}!A2:Z`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values ?? []).map((row) => row.map((c) => (c == null ? "" : String(c))));
}

export async function fetchAll(): Promise<{ articles: Article[]; issues: NewsletterIssue[] }> {
  const [ar, ir] = await Promise.all([readRows(ARTICLE_SHEET), readRows(ISSUE_SHEET)]);
  return {
    articles: ar.map(rowToArticle).filter((a): a is Article => a !== null),
    issues: ir.map(rowToIssue).filter((i): i is NewsletterIssue => i !== null),
  };
}

async function appendRows(sheet: string, values: string[][]) {
  for (let i = 0; i < values.length; i += 50) {
    await getClient().spreadsheets.values.append({
      spreadsheetId: sid(),
      range: `${sheet}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: values.slice(i, i + 50) },
    });
  }
}

export async function appendArticles(articles: Article[]) {
  if (!articles.length) return;
  await appendRows(ARTICLE_SHEET, articles.map(articleToRow));
  const withBody = articles.filter((a) => a.content);
  await appendRows(BODY_SHEET, withBody.map((a) => [a.id, (a.content ?? "").slice(0, CELL_LIMIT)]));
}

/** 기사 본문 조회 (id → 본문) */
export async function fetchBodies(ids: string[]): Promise<Map<string, string>> {
  const want = new Set(ids);
  const out = new Map<string, string>();
  for (const [id, body] of await readRows(BODY_SHEET)) if (want.has(id)) out.set(id, body ?? "");
  return out;
}

/** ── 작성 의뢰서 ─────────────────────────────────────── */
export interface HandoffRow {
  issueNo: number;
  request: string; // JSON
  content: string; // JSON ('' = 미작성)
  requestAt: string;
  contentAt: string;
}

const rowToHandoff = (r: string[]): HandoffRow | null =>
  Number(r[0]) ? { issueNo: Number(r[0]), request: r[1] ?? "", content: [r[2], r[3]].filter(Boolean).join(""), requestAt: r[4] ?? "", contentAt: r[5] ?? "" } : null;

const handoffToRow = (h: HandoffRow): string[] => [
  String(h.issueNo), h.request, h.content.slice(0, CELL_LIMIT), h.content.slice(CELL_LIMIT, CELL_LIMIT * 2), h.requestAt, h.contentAt,
];

export async function listHandoffRows(): Promise<HandoffRow[]> {
  return (await readRows(HANDOFF_SHEET)).map(rowToHandoff).filter((h): h is HandoffRow => h !== null);
}

export async function upsertHandoffRow(h: HandoffRow) {
  const rows = await idRowIndex(HANDOFF_SHEET);
  const row = rows.get(String(h.issueNo));
  if (row) {
    await getClient().spreadsheets.values.update({
      spreadsheetId: sid(),
      range: `${HANDOFF_SHEET}!A${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [handoffToRow(h)] },
    });
  } else await appendRows(HANDOFF_SHEET, [handoffToRow(h)]);
}

async function idRowIndex(sheet: string): Promise<Map<string, number>> {
  const res = await getClient().spreadsheets.values.get({ spreadsheetId: sid(), range: `${sheet}!A:A` });
  const map = new Map<string, number>();
  (res.data.values ?? []).forEach((row, i) => {
    if (i > 0 && row[0] != null) map.set(String(row[0]), i + 1);
  });
  return map;
}

export async function updateArticleSelections(articles: Article[]) {
  if (!articles.length) return;
  const rows = await idRowIndex(ARTICLE_SHEET);
  const data = articles
    .filter((a) => rows.has(a.id))
    .map((a) => ({ range: `${ARTICLE_SHEET}!${SELECTION_COL}${rows.get(a.id)}`, values: [[selectionLabel(a)]] }));
  const missing = articles.filter((a) => !rows.has(a.id));
  if (data.length) {
    await getClient().spreadsheets.values.batchUpdate({
      spreadsheetId: sid(),
      requestBody: { valueInputOption: "RAW", data },
    });
  }
  if (missing.length) await appendArticles(missing);
}

export async function upsertIssue(issue: NewsletterIssue) {
  const rows = await idRowIndex(ISSUE_SHEET);
  const row = rows.get(String(issue.issueNo));
  if (row) {
    await getClient().spreadsheets.values.update({
      spreadsheetId: sid(),
      range: `${ISSUE_SHEET}!A${row}`,
      valueInputOption: "RAW",
      requestBody: { values: [issueToRow(issue)] },
    });
  } else {
    await getClient().spreadsheets.values.append({
      spreadsheetId: sid(),
      range: `${ISSUE_SHEET}!A1`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [issueToRow(issue)] },
    });
  }
}
