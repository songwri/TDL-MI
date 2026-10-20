import { fail, ok } from "@/lib/api";
import { refreshArticles } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** POST /api/articles/refresh — 기사 최신화 (body: { days?, sourceIds? }) */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { days?: number; sourceIds?: string[] };
    return ok(await refreshArticles(body));
  } catch (e) {
    return fail(e);
  }
}
