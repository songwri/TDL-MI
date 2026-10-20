import { fail, ok } from "@/lib/api";
import { config } from "@/lib/config";
import { analyzeArticles } from "@/lib/mi";
import { getAllArticles, listArticles, listIssues, nextIssueNo } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/articles?days=14 — 기사 목록 + 과거 발행 이력 태그 */
export async function GET(req: Request) {
  try {
    const days = Number(new URL(req.url).searchParams.get("days") ?? config.lookbackDays);
    const [articles, issues, all, upcoming] = await Promise.all([
      listArticles({ sinceDays: days > 0 ? days : undefined }),
      listIssues(),
      getAllArticles(),
      nextIssueNo(),
    ]);
    const intel = analyzeArticles(articles, issues, all);
    const byId = Object.fromEntries(intel.map((i) => [i.articleId, i.relations]));
    return ok({
      articles: articles.map((a) => ({ ...a, relations: byId[a.id] ?? [] })),
      nextIssueNo: upcoming,
    });
  } catch (e) {
    return fail(e);
  }
}
