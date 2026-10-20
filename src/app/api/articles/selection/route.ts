import { fail, ok } from "@/lib/api";
import { setSelection } from "@/lib/store";

/** POST /api/articles/selection — { ids: string[], selected: boolean } */
export async function POST(req: Request) {
  try {
    const { ids, selected } = (await req.json()) as { ids: string[]; selected: boolean };
    if (!Array.isArray(ids)) return fail(new Error("ids 가 필요합니다."), 400);
    const { updated, warning } = await setSelection(ids, Boolean(selected));
    return ok({ updated: updated.map((a) => a.id), warning });
  } catch (e) {
    return fail(e);
  }
}
