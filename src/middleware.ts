import { NextResponse, type NextRequest } from "next/server";

/**
 * 웹 접속 비밀번호 (APP_PASSWORD 가 설정된 경우에만 동작, HTTP Basic 인증).
 * 사용자 이름은 아무거나, 비밀번호만 맞으면 됩니다.
 */
export function middleware(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given === password) return NextResponse.next();
    } catch {
      /* 형식이 잘못된 헤더는 거절 */
    }
  }
  return new NextResponse("비밀번호가 필요합니다.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="NEWS/INBOUND", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
