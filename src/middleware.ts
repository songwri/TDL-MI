import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth/session";

/**
 * 웹 접속 비밀번호 (APP_PASSWORD 가 설정된 경우에만 동작).
 * 로그인 화면에서 비밀번호를 넣으면 30일간 기억한다. 브라우저 기본 인증 창은 쓰지 않는다
 * (페이지가 다시 요청될 때 창이 닫혔다 다시 뜨는 문제가 있었음).
 * 스크립트·curl 용으로 Authorization: Basic 헤더도 받는다 (창은 띄우지 않음).
 */
export async function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && safeEqual(cookie, await sessionToken(password))) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      if (safeEqual(decoded.slice(decoded.indexOf(":") + 1), password)) return NextResponse.next();
    } catch {
      /* 형식이 잘못된 헤더는 거절 */
    }
  }

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // 인포그래픽 이미지와 TDL TREND REPORT 마크는 메일에서 비밀번호 없이 열려야 하므로 제외 (주소 서명으로 보호)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/charts/|brand/|fonts/).*)"],
};
