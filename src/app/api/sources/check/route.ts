import { SOURCES } from "@/config/sources";
import { fail, ok } from "@/lib/api";
import { checkSource } from "@/lib/collector";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/sources/check { id } — 채널 한 곳에 지금 접속해 보기 (저장하지 않음) */
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id: string };
    const src = SOURCES.find((s) => s.id === id);
    if (!src) return fail(new Error("없는 채널입니다."), 404);
    try {
      return ok({ ok: true, ...(await checkSource(src)) });
    } catch (e) {
      return ok({ ok: false, error: (e as Error).message });
    }
  } catch (e) {
    return fail(e);
  }
}
