import { fail, ok } from "@/lib/api";
import { createHandoff, listHandoffs } from "@/lib/newsletter/handoff";

export const dynamic = "force-dynamic";

/** GET /api/handoff — 작성 의뢰서 목록 (작성본 유무 포함) */
export async function GET() {
  try {
    return ok({ handoffs: await listHandoffs() });
  } catch (e) {
    return fail(e);
  }
}

/** POST /api/handoff — 작성 의뢰서 저장 { issueNo, publishDate, concept, articleIds, mainArticleId?, churuArticleId? } */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.articleIds?.length) return fail(new Error("기사를 1개 이상 선택하세요."), 400);
    if (body.articleIds.length > 6) return fail(new Error("기사는 최대 6개까지 선택할 수 있습니다."), 400);
    if (!body.concept?.trim()) return fail(new Error("이번 입고 기획 콘셉트를 입력하세요."), 400);
    if (!Number.isInteger(body.issueNo) || body.issueNo < 1) return fail(new Error("입고 차수가 올바르지 않습니다."), 400);
    const { request, prompt } = await createHandoff(body);
    return ok({ request, prompt });
  } catch (e) {
    return fail(e);
  }
}
