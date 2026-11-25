import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_DAYS, safeEqual, sessionToken } from "@/lib/auth/session";

/** POST /api/login { password } → 맞으면 30일 로그인 쿠키 */
export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ ok: true });
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!body.password || !safeEqual(body.password, password)) {
    await new Promise((r) => setTimeout(r, 600)); // 연속 대입 늦추기
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return res;
}
