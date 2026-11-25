import { SEGMENTS, VENDORS, VENDOR_HEADERS, type Confidence, type Segment, type Vendor } from "@/config/vendors";
import { cached } from "@/lib/cache";
import { sheetsEnabled, storeMode } from "@/lib/config";
import * as sheets from "@/lib/store/sheets";

/**
 * 공급사 목록 = 저장소 기본 목록(src/config/vendors.ts) + 구글 시트 Vendors 탭.
 * 시트에 같은 회사명이 있으면 시트에 채운 칸이 기본값을 덮어쓰고(빈 칸은 기본값 유지), 새 회사명은 추가된다.
 */

const list = (s?: string) => (s ?? "").split(/[;,\n]/).map((x) => x.trim()).filter(Boolean);
const SEG_BY_LABEL = new Map<string, Segment>(
  (Object.entries(SEGMENTS) as [Segment, string][]).flatMap(([k, v]) => [[k.toLowerCase(), k], [v.toLowerCase(), k], [v.split(" ")[0].toLowerCase(), k]]),
);
const CONF: Confidence[] = ["확인", "일부 확인", "입력 필요"];

/** 시트 한 줄 → 공급사 (채운 칸만) */
export function rowToVendor(r: string[]): Partial<Vendor> & { name: string } {
  const at = (h: (typeof VENDOR_HEADERS)[number]) => (r[VENDOR_HEADERS.indexOf(h)] ?? "").trim();
  const out: Partial<Vendor> & { name: string } = { name: at("회사명") };
  const set = <K extends keyof Vendor>(k: K, v: Vendor[K] | undefined) => {
    if (v !== undefined && v !== "" && !(Array.isArray(v) && !v.length)) out[k] = v;
  };
  set("nameLocal", at("현지명"));
  set("country", at("본사국가(ISO2)").toUpperCase());
  set("city", at("도시"));
  set("parent", at("모회사"));
  set("segments", list(at("분야(;로 구분)")).map((s) => SEG_BY_LABEL.get(s.toLowerCase())).filter((s): s is Segment => !!s));
  set("solutions", list(at("대표 솔루션(;)")));
  set("markets", list(at("공급국가(ISO2;)")).map((c) => c.toUpperCase()));
  set("reach", at("공급 범위"));
  set("korea", at("한국 사업"));
  if (at("순위")) out.rank = { value: at("순위"), basis: at("순위 근거") };
  set("sources", list(at("출처 URL(;)")).map((url) => ({ label: url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0], url })));
  const c = at("확인 상태") as Confidence;
  if (CONF.includes(c)) out.confidence = c;
  set("checkedAt", at("확인일"));
  if (at("매출")) out.revenue = { value: at("매출"), year: at("매출 연도"), basis: at("매출 근거") };
  const refs = at("레퍼런스(고객|국가|내용|연도|URL ;)")
    .split(";")
    .map((x) => x.split("|").map((f) => f.trim()))
    .filter((f) => f[0])
    .map(([customer, country, detail, year, url]) => ({ customer, country: country ? country.toUpperCase() : undefined, detail: detail ?? "", year: year || undefined, url: url || undefined }));
  if (refs.length) out.references = refs;
  return out;
}

export function mergeVendors(base: Vendor[], rows: string[][]): (Vendor & { fromSheet?: boolean })[] {
  const byName = new Map(base.map((v) => [v.name.toLowerCase(), { ...v } as Vendor & { fromSheet?: boolean }]));
  for (const r of rows) {
    const p = rowToVendor(r);
    if (!p.name) continue;
    const key = p.name.toLowerCase();
    const prev = byName.get(key);
    // 대소문자만 다른 회사명은 같은 회사로 보고 기본 표기를 유지
    if (prev) byName.set(key, { ...prev, ...p, name: prev.name, sources: [...(prev.sources ?? []), ...(p.sources ?? [])], references: [...(prev.references ?? []), ...(p.references ?? [])], fromSheet: true });
    else if (p.country) byName.set(key, { segments: [], solutions: [], sources: [], confidence: "입력 필요", checkedAt: "", ...p, country: p.country, fromSheet: true });
  }
  return [...byName.values()];
}

export async function listVendors(opts: { fresh?: boolean } = {}) {
  if (!sheetsEnabled()) return { vendors: mergeVendors(VENDORS, []), sheetRows: 0 as number, warning: undefined as string | undefined };
  try {
    // 시트 Vendors 탭은 팀이 가끔 고친다: 2분 안이면 그대로, 그 뒤는 일단 보여 주고 뒤에서 새로 읽음
    const rows = await cached("vendors", { soft: 2 * 60_000, hard: 6 * 3_600_000, fresh: opts.fresh }, async () => {
      if (storeMode() === "sheets") await sheets.ensureSchemaOnce();
      return sheets.listVendorRows();
    });
    return { vendors: mergeVendors(VENDORS, rows), sheetRows: rows.length, warning: undefined as string | undefined };
  } catch (e) {
    // 실패한 결과는 저장하지 않는다 (다음 방문 때 다시 시도)
    return { vendors: mergeVendors(VENDORS, []), sheetRows: 0, warning: `시트 Vendors 탭을 읽지 못해 기본 목록만 표시합니다: ${(e as Error).message}` };
  }
}
