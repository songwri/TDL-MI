import { fail, ok } from "@/lib/api";
import { saveHandoffContent } from "@/lib/newsletter/handoff";

/** POST /api/handoff/:n/content — 대화창에서 받은 작성본(JSON 텍스트) 붙여넣기 저장 { json: string } */
export async function POST(req: Request, { params }: { params: Promise<{ issueNo: string }> }) {
  try {
    const { json } = (await req.json()) as { json: string };
    return ok(await saveHandoffContent(Number((await params).issueNo), json));
  } catch (e) {
    return fail(e, 400);
  }
}
