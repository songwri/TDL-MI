import { fail, ok } from "@/lib/api";
import { listIndicators } from "@/lib/indicators";
import { computeInsights } from "@/lib/insights/compute";
import { getAllArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/insights?days=180 — 수집 기사로 계산한 트렌드 인사이트 + 저장된 공개 지표 */
export async function GET(req: Request) {
  try {
    const days = Math.min(730, Math.max(30, Number(new URL(req.url).searchParams.get("days")) || 180));
    const [articles, indicators] = await Promise.all([getAllArticles(), listIndicators()]);
    return ok({ insights: computeInsights(articles, { days }), indicators });
  } catch (e) {
    return fail(e);
  }
}
