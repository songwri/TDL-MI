import { fail, ok } from "@/lib/api";
import { getHandoff } from "@/lib/newsletter/handoff";

export const dynamic = "force-dynamic";

/** GET /api/handoff/:n — 의뢰서 + (있으면) 작성본과 렌더링 결과 */
export async function GET(_req: Request, { params }: { params: Promise<{ issueNo: string }> }) {
  try {
    const h = await getHandoff(Number((await params).issueNo));
    if (!h) return fail(new Error("작성 의뢰서를 찾을 수 없습니다."), 404);
    return ok(h);
  } catch (e) {
    return fail(e);
  }
}
