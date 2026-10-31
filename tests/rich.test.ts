import { describe, expect, it } from "vitest";
import { parseRich, plainRich, stripRich } from "@/lib/report/rich";

describe("하이라이트 표기 **구절**", () => {
  it("구절을 나누고, 짝이 안 맞는 별표는 글자로 둔다", () => {
    expect(parseRich("A **핵심** B **둘째**")).toEqual([
      { text: "A ", hl: false },
      { text: "핵심", hl: true },
      { text: " B ", hl: false },
      { text: "둘째", hl: true },
    ]);
    expect(parseRich("별표 ** 하나")).toEqual([{ text: "별표 ** 하나", hl: false }]);
    expect(stripRich("**AMR** 증설")).toBe("AMR 증설");
    expect(plainRich("**AMR** 증설")).toBe("「AMR」 증설");
  });
});
