import { fail, ok } from "@/lib/api";
import { sheetsEnabled } from "@/lib/config";
import { pushAllToSheets, syncFromSheets } from "@/lib/store";
import { ensureSchema } from "@/lib/store/sheets";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST /api/sheets — { action: "init" | "pull" | "push" } */
export async function POST(req: Request) {
  try {
    if (!sheetsEnabled()) return fail(new Error("GOOGLE_SHEETS_SPREADSHEET_ID / 서비스 계정 키가 설정되지 않았습니다."), 400);
    const { action } = (await req.json()) as { action: "init" | "pull" | "push" };
    if (action === "init") return ok(await ensureSchema());
    if (action === "pull") return ok(await syncFromSheets());
    if (action === "push") return ok(await pushAllToSheets());
    return fail(new Error("알 수 없는 action"), 400);
  } catch (e) {
    return fail(e);
  }
}
