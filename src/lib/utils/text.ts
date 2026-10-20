import { createHash } from "node:crypto";

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref$|refsrc$|sc_|cmpid)/i;

/** 중복 판정용 URL 정규화: 프로토콜/www/트래킹 파라미터/해시/끝 슬래시 제거 */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const pathname = u.pathname.replace(/\/+$/, "");
    const qs = u.searchParams.toString();
    return `${host}${pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function articleIdFromUrl(url: string): string {
  return "A" + createHash("sha1").update(normalizeUrl(url)).digest("hex").slice(0, 10);
}

export function normalizeTitle(t: string): string {
  return t.toLowerCase().replace(/[\s"'“”‘’\[\]()<>.,:;!?·…\-–—|]/g, "");
}

export function cleanText(s: string | undefined | null): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** "2026-05-10" -> "05/10" */
export function shortDate(iso: string): string {
  const d = toDateOnly(iso);
  return `${d.slice(5, 7)}/${d.slice(8, 10)}`;
}

export function daysAgo(n: number, from = new Date()): Date {
  return new Date(from.getTime() - n * 86_400_000);
}
