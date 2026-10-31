import { fail, ok } from "@/lib/api";
import { sheetsEnabled, sheetsVia } from "@/lib/config";
import { pushAllToSheets, syncFromSheets } from "@/lib/store";
import { ensureSchema } from "@/lib/store/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/sheets — { action: "init" | "pull" | "push" } */
export async function POST(req: Request) {
  try {
    if (!sheetsEnabled()) return fail(new Error("구글 시트 연결 설정(SHEETS_WEBAPP_URL, SHEETS_WEBAPP_TOKEN)이 없습니다. docs/DEPLOY.md 를 확인해 주세요."), 400);
    const { action } = (await req.json()) as { action: "init" | "pull" | "push" };
    if (action === "init") return ok({ ...(await ensureSchema()), via: sheetsVia() });
    if (action === "pull") return ok(await syncFromSheets());
    if (action === "push") return ok(await pushAllToSheets());
    return fail(new Error("알 수 없는 action"), 400);
  } catch (e) {
    return fail(e);
  }
}
