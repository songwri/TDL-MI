/**
 * Claude Code 용 레터 작성 CLI (API 토큰 사용 없음)
 *   npm run letter -- list              작성 의뢰서 목록
 *   npm run letter -- show <N>          N차 의뢰서 경로와 상태
 *   npm run letter -- save <N> [file]   작성본 검증·저장 (file 생략 시 data/handoff/N/content.json)
 *   npm run letter -- candidates [일수]  최근 기사 후보 + 지난 입고 연관 태그 (Claude Code에서 선정할 때)
 *   npm run letter -- request <N> --date YYYY-MM-DD --concept "..." --main ID [--quick ID,ID] [--churu ID]
 *                                        Claude Code에서 직접 의뢰서 만들기 (웹 '작성 의뢰 저장'과 동일)
 *   npm run letter -- publish <N>        작성본을 발행 이력에 저장 (웹 '발행 확정'과 동일)
 */
import fs from "node:fs/promises";
import path from "node:path";
import { issueLabel } from "@/config/brand";
import { analyzeArticles } from "@/lib/mi";
import { createHandoff, getHandoff, handoffPaths, listHandoffs, saveHandoffContent } from "@/lib/newsletter/handoff";
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
  if (!n) throw new Error("차수를 숫자로 지정하세요. 예: npm run letter -- show 4");
  const p = handoffPaths(n);
  if (cmd === "show") {
    const h = await getHandoff(n);
    if (!h) throw new Error(`${issueLabel(n)} 작성 의뢰서가 없습니다.`);
    console.log(`의뢰서: ${rel(p.prompt)}\n작성본: ${rel(p.content)} (${h.content ? "있음" : "없음"})`);
    return;
  }
  if (cmd === "save") {
    const raw = await fs.readFile(file ?? p.content, "utf8");
    const r = await saveHandoffContent(n, raw);
    console.log(`${issueLabel(n)} 작성본 저장 완료\n- 콘텐츠: ${rel(p.content)}\n- 미리보기: ${rel(p.preview)}\n- 헤드라인: ${r.content.headline}`);
    return;
  }
  if (cmd === "request") {
    const f = flags(process.argv.slice(4));
    if (!f.main || !f.concept || !f.date) throw new Error("--date, --concept, --main 은 필수입니다.");
    const quick = (f.quick ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const articleIds = [f.main, ...quick, ...(f.churu ? [f.churu] : [])];
    const { promptPath } = await createHandoff({
      issueNo: n,
      publishDate: f.date,
      concept: f.concept,
      articleIds,
      mainArticleId: f.main,
      churuArticleId: f.churu || undefined,
    });
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
