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

import { leadingSubject, mentionsEntity } from "@/lib/mi/matcher";
describe("제목 앞 회사명", () => {
  it('"회사명, …" 이면 그 회사 기사, 별칭(대한통운)도 같은 회사', () => {
    expect(leadingSubject("CJ대한통운, 새 풀필먼트센터 가동")).toBe("CJ대한통운");
    expect(leadingSubject("대한통운, 로봇 도입 확대")).toBe("CJ대한통운");
    expect(leadingSubject("[단독] 쿠팡, 물류 자회사 신설")).toBe("쿠팡");
    expect(leadingSubject("택배 속도 경쟁, 쿠팡 앞서")).toBeNull();
    expect(mentionsEntity("대한통운 노조 반발", "CJ대한통운")).toBe(true);
  });
});
