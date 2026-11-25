import { describe, expect, it } from "vitest";
import { safeEqual, safeNext, sessionToken } from "@/lib/auth/session";

describe("로그인 (브라우저 인증 창 대신 로그인 화면 + 쿠키)", () => {
  it("같은 비밀번호는 같은 쿠키 값, 바꾸면 기존 로그인 무효", async () => {
    const a = await sessionToken("pw-1");
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await sessionToken("pw-1")).toBe(a);
    expect(await sessionToken("pw-2")).not.toBe(a);
    expect(a).not.toContain("pw-1");
  });

  it("비교는 길이가 달라도 안전하게", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("로그인 뒤 이동은 같은 사이트 경로만", () => {
    expect(safeNext("/insights#world")).toBe("/insights#world");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("/\\evil")).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });
});
