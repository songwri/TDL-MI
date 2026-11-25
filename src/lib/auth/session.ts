/**
 * 웹 접속 로그인 (APP_PASSWORD). 브라우저 기본 인증 창 대신 로그인 화면 + 쿠키를 쓴다.
 * 쿠키 값 = HMAC-SHA256(비밀번호, 고정 문구). 비밀번호를 바꾸면 기존 로그인은 모두 풀린다.
 * 미들웨어(Edge)와 서버 양쪽에서 쓰므로 Web Crypto 만 사용한다.
 */
export const SESSION_COOKIE = "tdl_session";
export const SESSION_DAYS = 30;

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function sessionToken(password: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("tdl-trend-session-v1")));
}

/** 길이와 무관하게 끝까지 비교 (시간 차로 값을 추측하지 못하게) */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** 로그인 뒤 돌아갈 주소: 같은 사이트의 경로만 허용 */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
