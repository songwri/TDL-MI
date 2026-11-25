import { describe, expect, it } from "vitest";
import { subjectScore } from "@/lib/mi/subject";

const is = (t: string, s: string, c: string) => subjectScore(t, s, c).isSubject;

describe("기사 주체 회사 판정", () => {
  it("제목이 회사명으로 시작하거나 제목에 회사명이 있으면 그 회사 기사", () => {
    expect(is("CJ대한통운, 새 풀필먼트센터 가동", "", "CJ대한통운")).toBe(true);
    expect(is("대한통운 노조 반발", "", "CJ대한통운")).toBe(true);
    expect(is("LX판토스 AMR 도입", "", "LX판토스")).toBe(true);
  });
  it("종합·전망 기사 요약에 이름이 스치듯 나열되면 제외", () => {
    const t = "Logistics Tech Map 2027: 2027년을 관통할 새로운 물류 기술";
    const s = "로봇, AI, 디지털 트윈 등 물류 기술을 짚었다. 쿠팡, CJ대한통운, LX판토스 등이 도입을 늘리고 있다.";
    for (const c of ["LX판토스", "쿠팡", "CJ대한통운"]) expect(is(t, s, c)).toBe(false);
  });
  it("제목엔 없어도 요약에서 주어로 여러 번 나오면 그 회사 기사", () => {
    expect(is("물류센터 자동화 가속", "LX판토스는 평택 센터에 AMR을 도입했다. LX판토스 측은 효과를 밝혔다.", "LX판토스")).toBe(true);
  });
  it("요약에 한 번 지나가듯 나오면 제외", () => {
    expect(is("물류센터 자동화 가속", "업계에서는 로봇 도입이 늘고 있다. 판토스 등이 거론된다.", "LX판토스")).toBe(false);
  });
  it("근거를 돌려준다", () => {
    expect(subjectScore("쿠팡, 증설", "", "쿠팡").reasons).toContain("제목이 회사명으로 시작");
  });
});
