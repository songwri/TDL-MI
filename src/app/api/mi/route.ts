import { fail, ok } from "@/lib/api";
import { analyzeArticles, keywordTimeline } from "@/lib/mi";
import { getAllArticles, getArticles, listIssues } from "@/lib/store";

/** POST /api/mi — { ids } 선택 기사에 대한 과거 이력 매칭 상세 + 키워드 타임라인 */
export async function POST(req: Request) {
  try {
    const { ids } = (await req.json()) as { ids: string[] };
    const [targets, issues, all] = await Promise.all([getArticles(ids ?? []), listIssues(), getAllArticles()]);
    const intel = analyzeArticles(targets, issues, all);
    const keywords = [...new Set(targets.flatMap((a) => a.keywords))];
    return ok({ intel, timeline: keywordTimeline(keywords, issues, all) });
  } catch (e) {
    return fail(e);
  }
}
