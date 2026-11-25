import { describe, expect, it } from "vitest";
import { isPersonalNews } from "@/lib/mi/matcher";

describe("개인 경조사·부고 제외", () => {
  it("부고·경조사는 제외", () => {
    for (const t of ["[부고] 홍길동 ○○물류 대표 빙모상", "○○기업 임원 부친상", "○○ 회장 장남 결혼", "○○ 前 회장 별세", "○○ 회장 별세했다"]) expect(isPersonalNews(t)).toBe(true);
  });
  it("인사발령·사업 기사는 유지", () => {
    for (const t of ["[인사] CJ대한통운 임원 승진", "LX판토스 신임 대표 선임", "쿠팡, 물류센터 증설", "물류 로봇 시장 별세계"]) expect(isPersonalNews(t)).toBe(false);
  });
});
