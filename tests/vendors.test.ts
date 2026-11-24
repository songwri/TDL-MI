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
