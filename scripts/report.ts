/**
 * Claude Code 용 리포트 작성 CLI (API 토큰 사용 없음)
 *   npm run report -- list              작성 의뢰서 목록
 *   npm run report -- prompt <N>        의뢰서를 data/handoff/N/prompt.md 로 내려받기 (구글 시트 모드에서 필수)
 *   npm run report -- show <N>          제N호 의뢰서 경로와 상태
 *   npm run report -- save <N> [file]   작성본 검증·저장 (file 생략 시 data/handoff/N/content.json)
 *   npm run report -- candidates [일수]  최근 기사 후보 + 지난 호 연관 태그 (Claude Code에서 선정할 때)
 *   npm run report -- request <N> --date YYYY-MM-DD --concept "..." --articles ID,ID,...
 *                                        Claude Code에서 직접 의뢰서 만들기 (웹 '작성 의뢰 저장'과 동일)
 *   npm run report -- publish <N>        작성본을 발행 이력에 저장 (웹 '발행 확정'과 동일)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { issueLabel } from "@/config/brand";
import { storeMode } from "@/lib/config";
import { analyzeArticles } from "@/lib/mi";
import { createHandoff, getHandoff, handoffPaths, listHandoffs, saveHandoffContent, writePrompt } from "@/lib/newsletter/handoff";
import { getAllArticles, listArticles, listIssues, saveIssue, setSelection } from "@/lib/store";

function flags(args: string[]) {
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) if (args[i].startsWith("--")) out[args[i].slice(2)] = args[++i] ?? "";
  return out;
}

const rel = (f: string) => path.relative(process.cwd(), f);

async function main() {
  const [cmd = "list", arg, file] = process.argv.slice(2);
  if (cmd === "list") {
    const list = await listHandoffs();
    if (!list.length) return console.log("작성 의뢰서가 없습니다. 웹 대시보드에서 '작성 의뢰 저장'을 먼저 하세요.");
    for (const h of list) {
      console.log(`${issueLabel(h.issueNo)}  ${h.publishDate}  ${h.hasContent ? "작성 완료" : "작성 대기"}  기사 ${h.articleIds.length}건  ${h.concept.split("\n")[0]}`);
    }
    return;
  }
  if (cmd === "candidates") {
    const days = Number(arg) || 14;
    const [articles, issues, all] = await Promise.all([listArticles({ sinceDays: days }), listIssues(), getAllArticles()]);
    const intel = new Map(analyzeArticles(articles, issues, all).map((i) => [i.articleId, i.relations]));
    console.log(`최근 ${days}일 기사 ${articles.length}건 (★ = 웹에서 체크한 후보)`);
    for (const a of articles) {
      const tags = (intel.get(a.id) ?? []).map((r) => `[${r.label}]`).join(" ");
      const mark = a.publishedInIssue ? `(${a.publishedInIssue}차 입고됨)` : a.selected ? "★" : " ";
      console.log(`${mark} ${a.id} | ${a.publishedAt.slice(0, 10)} | ${a.source} | ${a.category} | ${a.title}${tags ? `\n    ${tags}` : ""}`);
    }
    return;
  }
  const n = Number(arg);
  if (!n) throw new Error("차수를 숫자로 지정하세요. 예: npm run report -- show 4");
  const p = handoffPaths(n);
  if (cmd === "prompt") {
    console.log(`의뢰서: ${rel(await writePrompt(n))}\n작성본은 ${rel(p.content)} 에 JSON 만 저장한 뒤 'npm run report -- save ${n}' 을 실행하세요.`);
    return;
  }
  if (cmd === "show") {
    const h = await getHandoff(n);
    if (!h) throw new Error(`${issueLabel(n)} 작성 의뢰서가 없습니다.`);
    console.log(`의뢰서: ${rel(p.prompt)}\n작성본: ${rel(p.content)} (${h.content ? "있음" : "없음"})`);
    return;
  }
  if (cmd === "save") {
    const raw = await fs.readFile(file ?? p.content, "utf8");
    const r = await saveHandoffContent(n, raw);
    console.log(`${issueLabel(n)} 작성본 저장 완료 (${storeMode() === "sheets" ? "구글 시트 Handoffs" : rel(p.content)})\n- 헤드라인: ${r.content.headline}`);
    if (r.missing.length) {
      console.warn(`\n⚠ 어느 테마에도 인용되지 않은 선정 기사 ${r.missing.length}건 (themes[].sourceArticleIds 에 추가하세요):`);
      for (const a of r.missing) console.warn(`  - ${a.id} ${a.title}`);
    }
    return;
  }
  if (cmd === "request") {
    const f = flags(process.argv.slice(4));
    if (!f.articles || !f.concept || !f.date) throw new Error("--date, --concept, --articles 는 필수입니다. (--articles ID,ID,...)");
    const articleIds = f.articles.split(",").map((x) => x.trim()).filter(Boolean);
    const { promptPath } = await createHandoff({ issueNo: n, publishDate: f.date, concept: f.concept, articleIds });
    await setSelection(articleIds, true);
    console.log(`${issueLabel(n)} 작성 의뢰서 저장: ${rel(promptPath)}`);
    return;
  }
  if (cmd === "publish") {
    const h = await getHandoff(n);
    if (!h?.content) throw new Error(`${issueLabel(n)} 작성본이 없습니다. 먼저 save 하세요.`);
    const { warning } = await saveIssue({
      issueNo: n,
      publishDate: h.request.publishDate,
      concept: h.request.concept,
      articleIds: h.request.articleIds,
      html: h.html,
      keywords: h.content.keywords,
      headline: h.content.headline,
      content: h.content,
      createdAt: new Date().toISOString(),
    });
    console.log(`${issueLabel(n)} 발행 이력 저장 완료${warning ? ` (${warning})` : ""}`);
    return;
  }
  throw new Error(`알 수 없는 명령: ${cmd}`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
