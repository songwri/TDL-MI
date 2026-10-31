import { SOURCES } from "@/config/sources";
import { fail, ok } from "@/lib/api";
import { summarizeChannels } from "@/lib/collector/channels";
import { getAllArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

/** GET /api/sources — 수집 채널 목록과 시트에 쌓인 기사 집계 */
export async function GET() {
  try {
    return ok(summarizeChannels(SOURCES, await getAllArticles()));
  } catch (e) {
    return fail(e);
  }
}
