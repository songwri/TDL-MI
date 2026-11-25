import { describe, expect, it } from "vitest";
import { COUNTRIES, VENDORS, VENDOR_HEADERS } from "@/config/vendors";
import { mergeVendors, rowToVendor } from "@/lib/vendors";

const row = (o: Partial<Record<(typeof VENDOR_HEADERS)[number], string>>) => VENDOR_HEADERS.map((h) => o[h] ?? "");

describe("공급사 목록 (기본값 + 시트 Vendors 탭)", () => {
  it("기본 목록: 모든 본사 국가가 지도에 있고, 출처 없는 회사는 '입력 필요', 순위에는 근거가 있음", () => {
    for (const v of VENDORS) {
      expect(COUNTRIES[v.country], v.name).toBeDefined();
      for (const m of v.markets ?? []) expect(COUNTRIES[m], `${v.name} ${m}`).toBeDefined();
      if (!v.sources.length) expect(v.confidence, v.name).toBe("입력 필요");
      if (v.rank) expect(v.rank.basis.length, v.name).toBeGreaterThan(3);
    }
    expect(new Set(VENDORS.map((v) => v.name)).size).toBe(VENDORS.length);
  });

  it("시트 줄 읽기: 분야는 키·한글 이름 모두, 국가는 대문자, ; 로 여러 값", () => {
    const v = rowToVendor(row({ 회사명: "Libiao", "본사국가(ISO2)": "cn", "분야(;로 구분)": "sorter; AMR·AGV", "공급국가(ISO2;)": "us;kr", "출처 URL(;)": "https://www.libiao.com/a", "확인 상태": "일부 확인" }));
    expect(v).toMatchObject({ name: "Libiao", country: "CN", segments: ["sorter", "amr"], markets: ["US", "KR"], confidence: "일부 확인", sources: [{ label: "libiao.com", url: "https://www.libiao.com/a" }] });
    expect(v.korea).toBeUndefined(); // 빈 칸은 넣지 않음
  });

  it("같은 회사명은 채운 칸만 덮어쓰고 출처는 합침, 새 회사는 추가 (국가 없는 새 줄은 무시)", () => {
    const merged = mergeVendors(VENDORS, [
      row({ 회사명: "hai robotics", "한국 사업": "국내 3PL 도입 (팀 확인)", "출처 URL(;)": "https://example.com/hai" }),
      row({ 회사명: "Libiao", "본사국가(ISO2)": "CN", "분야(;로 구분)": "sorter" }),
      row({ 회사명: "국가 없음" }),
    ]);
    const hai = merged.find((v) => v.name === "Hai Robotics")!;
    expect(hai.korea).toBe("국내 3PL 도입 (팀 확인)");
    expect(hai.segments).toEqual(["acr"]); // 기본값 유지
    expect(hai.sources.map((s) => s.url)).toContain("https://example.com/hai");
    expect(hai.fromSheet).toBe(true);
    expect(merged.find((v) => v.name === "Libiao")).toMatchObject({ country: "CN", segments: ["sorter"], confidence: "입력 필요" });
    expect(merged.find((v) => v.name === "국가 없음")).toBeUndefined();
    expect(merged.length).toBe(VENDORS.length + 1);
  });
});

describe("매출·적용 사례 칸", () => {
  it("시트의 매출과 레퍼런스(고객|국가|내용|연도|URL ;)를 읽고, 기본 사례 뒤에 붙임", () => {
    const merged = mergeVendors(VENDORS, [
      row({ 회사명: "Geek+", 매출: "RMB 3.2B", "매출 연도": "2025", "매출 근거": "연차보고서", "레퍼런스(고객|국가|내용|연도|URL ;)": "쿠팡|kr|AMR 도입|2025|https://x.test/a; 고객B||설명" }),
    ]);
    const g = merged.find((v) => v.name === "Geek+")!;
    expect(g.revenue).toEqual({ value: "RMB 3.2B", year: "2025", basis: "연차보고서" });
    expect(g.references!.slice(-2)).toEqual([
      { customer: "쿠팡", country: "KR", detail: "AMR 도입", year: "2025", url: "https://x.test/a" },
      { customer: "고객B", country: undefined, detail: "설명", year: undefined, url: undefined },
    ]);
    expect(g.references!.length).toBeGreaterThan(2); // 기본 사례(CJ대한통운 등) 유지
  });

  it("기본 매출·사례에는 모두 근거 표시", () => {
    for (const v of VENDORS) {
      if (v.revenue) expect(v.revenue.basis, v.name).toBeTruthy();
      for (const r of v.references ?? []) expect(r.url, `${v.name} ${r.customer}`).toMatch(/^https:\/\//);
    }
  });
});
