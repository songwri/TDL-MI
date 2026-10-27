import fs from "node:fs/promises";
import path from "node:path";
import { config, storeMode } from "@/lib/config";
import { getAllArticles, getArticlesWithBodies, listIssues } from "@/lib/store";
import { ensureSchemaOnce, listHandoffRows, upsertHandoffRow } from "@/lib/store/sheets";
import type { NewsletterContent } from "@/lib/types";
import { issueLabel } from "@/config/brand";
import { renderAll } from "./render";
import { NewsletterSchema } from "./schema";
import { OUTPUT_SCHEMA, anchorToSources, buildContext } from "./synthesizer";

/**
 * Claude Code 작성 의뢰서 (API 토큰 없이 레터를 쓰는 흐름)
 *
 *   웹: 기사·역할·콘셉트 선정 → createHandoff() → 저장(파일 또는 구글 시트 'Handoffs') + prompt.md
 *   Claude Code: /write-letter → prompt.md 를 읽고 content.json 작성 → `npm run letter -- save N`
 *   웹: 작성본 불러오기 → 미리보기 → 발행 확정
 */

export interface HandoffRequest {
  issueNo: number;
  publishDate: string;
  concept: string;
  articleIds: string[];
  mainArticleId?: string;
  churuArticleId?: string;
  createdAt: string;
}

export interface HandoffSummary extends HandoffRequest {
  hasContent: boolean;
  contentSavedAt?: string;
}

const root = () => path.join(config.dataDir, "handoff");
const dirOf = (n: number) => path.join(root(), String(n));
export const handoffPaths = (n: number) => ({
  dir: dirOf(n),
  request: path.join(dirOf(n), "request.json"),
  prompt: path.join(dirOf(n), "prompt.md"),
  content: path.join(dirOf(n), "content.json"),
  preview: path.join(dirOf(n), "letter.html"),
});

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

/**
 * 저장 위치
 *  - local 모드: data/handoff/<N>/ 파일 (Claude Code 가 같은 PC 에서 직접 읽음)
 *  - sheets 모드: 구글 시트 'Handoffs' (웹 서버에는 파일을 남기지 않음, 어디서든 같은 데이터)
 */
const inSheetsMode = () => storeMode() === "sheets";

interface Stored {
  request: HandoffRequest | null;
  content: NewsletterContent | null;
  contentAt?: string;
}

async function loadStored(n: number): Promise<Stored> {
  if (inSheetsMode()) {
    await ensureSchemaOnce();
    const row = (await listHandoffRows()).find((r) => r.issueNo === n);
    return {
      request: row?.request ? (JSON.parse(row.request) as HandoffRequest) : null,
      content: row?.content ? (JSON.parse(row.content) as NewsletterContent) : null,
      contentAt: row?.contentAt || undefined,
    };
  }
  const p = handoffPaths(n);
  const stat = await fs.stat(p.content).catch(() => null);
  return { request: await readJson<HandoffRequest>(p.request), content: await readJson<NewsletterContent>(p.content), contentAt: stat?.mtime.toISOString() };
}

async function storeRequest(req: HandoffRequest) {
  if (inSheetsMode()) {
    await ensureSchemaOnce();
    // 선정이 바뀌면 이전 작성본은 맞지 않으므로 비운다
    await upsertHandoffRow({ issueNo: req.issueNo, request: JSON.stringify(req), content: "", requestAt: req.createdAt, contentAt: "" });
    return;
  }
  const p = handoffPaths(req.issueNo);
  await fs.mkdir(p.dir, { recursive: true });
  await fs.writeFile(p.request, JSON.stringify(req, null, 2));
  await fs.rename(p.content, `${p.content}.${Date.now()}.bak`).catch(() => undefined);
}

async function storeContent(req: HandoffRequest, content: NewsletterContent, html: string) {
  if (inSheetsMode()) {
    await upsertHandoffRow({
      issueNo: req.issueNo,
      request: JSON.stringify(req),
      content: JSON.stringify(content),
      requestAt: req.createdAt,
      contentAt: new Date().toISOString(),
    });
    return;
  }
  const p = handoffPaths(req.issueNo);
  await fs.mkdir(p.dir, { recursive: true });
  await fs.writeFile(p.content, JSON.stringify(content, null, 2));
  await fs.writeFile(p.preview, html);
}

async function context(req: HandoffRequest) {
  const [articles, issues, all] = await Promise.all([getArticlesWithBodies(req.articleIds), listIssues(), getAllArticles()]);
  if (articles.length !== req.articleIds.length) throw new Error("의뢰서의 기사 중 저장소에 없는 기사가 있습니다.");
  return { articles, ...buildContext({ ...req, articles, issues, allArticles: all }) };
}

function promptDocument(req: HandoffRequest, system: string, user: string): string {
  const p = handoffPaths(req.issueNo);
  const rel = (f: string) => path.relative(process.cwd(), f) || f;
  return `# ${config.newsletterName} ${issueLabel(req.issueNo)} 작성 의뢰서

- 발행일: ${req.publishDate}
- 의뢰서 생성: ${req.createdAt}

## 작업 방법

**Claude Code에서** (\`/write-letter ${req.issueNo}\`)
1. 아래 [작성 지침]과 [자료]를 읽고, [출력 형식]에 맞는 JSON 하나를 작성합니다.
2. \`${rel(p.content)}\` 에 JSON만 저장합니다 (코드블록 표시 없이).
3. \`npm run letter -- save ${req.issueNo}\` 를 실행해 형식 검증·링크 고정·미리보기 생성을 합니다.
4. 오류가 나오면 메시지대로 고쳐 다시 저장합니다.

**Claude 대화창에서** 이 문서를 붙여넣은 경우: JSON만 답해 주세요. 작업자가 웹 화면의 '작성본 붙여넣기'에 넣습니다.

## 작성 지침

${system}

## 자료

${user}

## 출력 형식 (JSON Schema)

\`\`\`json
${JSON.stringify(OUTPUT_SCHEMA, null, 2)}
\`\`\`
`;
}

export async function createHandoff(input: Omit<HandoffRequest, "createdAt">) {
  const req: HandoffRequest = { ...input, createdAt: new Date().toISOString() };
  const { system, user } = await context(req); // 기사가 없으면 여기서 실패
  const prompt = promptDocument(req, system, user);
  await storeRequest(req);
  return { request: req, prompt, promptPath: await writePromptFile(req.issueNo, prompt) };
}

/** Claude Code 가 읽을 로컬 사본 (data/handoff/<N>/prompt.md). sheets 모드에서도 CLI 용으로 만든다 */
async function writePromptFile(n: number, prompt: string): Promise<string> {
  const p = handoffPaths(n);
  await fs.mkdir(p.dir, { recursive: true });
  await fs.writeFile(p.prompt, prompt);
  return p.prompt;
}

/** 저장된 의뢰서로 프롬프트 문서를 다시 만든다 (sheets 모드에서는 이것이 유일한 방법) */
export async function buildPrompt(n: number) {
  const { request } = await loadStored(n);
  if (!request) return null;
  const { system, user } = await context(request);
  return { request, prompt: promptDocument(request, system, user) };
}

export async function writePrompt(n: number): Promise<string> {
  const built = await buildPrompt(n);
  if (!built) throw new Error(`${issueLabel(n)} 작성 의뢰서가 없습니다.`);
  return writePromptFile(n, built.prompt);
}

export async function listHandoffs(): Promise<HandoffSummary[]> {
  if (inSheetsMode()) {
    await ensureSchemaOnce();
    return (await listHandoffRows())
      .filter((r) => r.request)
      .map((r) => ({ ...(JSON.parse(r.request) as HandoffRequest), hasContent: !!r.content, contentSavedAt: r.contentAt || undefined }))
      .sort((a, b) => b.issueNo - a.issueNo);
  }
  const dirs = await fs.readdir(root()).catch(() => [] as string[]);
  const out: HandoffSummary[] = [];
  for (const d of dirs) {
    const n = Number(d);
    if (!n) continue;
    const st = await loadStored(n);
    if (st.request) out.push({ ...st.request, hasContent: !!st.content, contentSavedAt: st.contentAt });
  }
  return out.sort((a, b) => b.issueNo - a.issueNo);
}

export async function getHandoff(n: number) {
  const built = await buildPrompt(n);
  if (!built) return null;
  const { request, prompt } = built;
  const { content } = await loadStored(n);
  if (!content) return { request, prompt, content: null };
  const articles = await getArticlesWithBodies(request.articleIds);
  return { request, prompt, content, ...renderAll(content, request.issueNo, request.publishDate, articles) };
}

/** 작성본 JSON 검증 → 링크·출처 고정 → 저장 + 미리보기 HTML */
export async function saveHandoffContent(n: number, raw: unknown) {
  const { request } = await loadStored(n);
  if (!request) throw new Error(`${issueLabel(n)} 작성 의뢰서가 없습니다. 웹에서 먼저 '작성 의뢰 저장'을 하세요.`);
  let data = raw;
  if (typeof raw === "string") {
    const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`JSON 을 읽을 수 없습니다: ${(e as Error).message}`);
    }
  }
  const parsed = NewsletterSchema.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`작성본이 출력 형식과 맞지 않습니다.\n${issues}`);
  }
  const ctx = await context(request);
  const content = anchorToSources(parsed.data, ctx.main, ctx.quick, ctx.churu);
  const rendered = renderAll(content, request.issueNo, request.publishDate, ctx.articles);
  await storeContent(request, content, rendered.html);
  return { request, content, ...rendered };
}
