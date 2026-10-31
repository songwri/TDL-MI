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

/* ── 기사 본문 정리: 기자 서명·저작권 고지·사이트 UI 문구 제거 ───────────── */

const EMAIL = String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`;
/** 기자 서명: "박경일 기자 robot@irobotnews.com", "(서울=연합뉴스) 홍길동 기자 =", "홍길동 기자" + 이메일 */
const BYLINE = new RegExp(String.raw`(?:\([^)]{0,20}=[^)]{0,20}\)\s*)?[가-힣]{2,4}\s*(?:선임|수석|객원|인턴)?\s*(?:기자|특파원|에디터|리포터)(?![가-힣])(?:\s*=)?(?:\s*\(?${EMAIL}\)?)?`, "g");
/** 저작권 고지: "저작권자 © 로봇신문 무단전재 및 재배포 금지", "Copyright © X. All rights reserved." */
const COPYRIGHT = [
  /(?:<\s*)?저작권자\s*(?:[©ⓒ]|\(c\))?[^\n]{0,80}?금지(?:\s*>)?/gi,
  /copyrights?\s*(?:[©ⓒ]|\(c\))?[^\n]{0,80}?all\s*rights?\s*reserved\.?/gi,
  /[©ⓒ]\s*[^\n]{0,60}?(?:무단\s*전재[^.\n]{0,30}?금지|all\s*rights?\s*reserved\.?)/gi,
  /무단\s*전재\s*(?:[및·,&]|및\s*)?\s*재배포\s*(?:및\s*AI\s*학습\s*이용\s*)?금지/g,
];
/** 기사 페이지 UI 문구 */
const UI = /(?:다른\s*기사\s*보기|기사\s*더\s*보기|내\s*댓글\s*모음|댓글\s*(?:보기|쓰기|작성)|이\s*기사를\s*공유합니다|기사\s*스크랩|SNS\s*기사\s*보내기|기사\s*공유하기|구독\s*신청|바로가기|닫기|더보기|로그인|회원가입|프린트|글씨\s*(?:키우기|줄이기)|좋아요\s*\d*|싫어요\s*\d*)/g;

/** 보일러플레이트 부분만 지운다. 본문 문장은 그대로 둔다. 같은 줄이 반복되면 하나만 남긴다 */
export function stripBoilerplate(s: string | undefined | null): string {
  if (!s) return "";
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(/\n+/)) {
    let line = raw;
    for (const re of COPYRIGHT) line = line.replace(re, " ");
    // 기자 서명은 이메일이 붙어 있거나 저작권 근처(줄이 짧을 때)만 지운다: "○○ 기자는 …" 같은 본문 인용 보호
    line = line.replace(new RegExp(BYLINE.source, "g"), (m) => (new RegExp(EMAIL).test(m) || raw.length < 120 ? " " : m));
    line = line.replace(new RegExp(EMAIL, "g"), " ");
    const hadUi = UI.test(line);
    UI.lastIndex = 0;
    if (hadUi) line = line.replace(UI, " ");
    line = line.replace(/\s+/g, " ").replace(/^[\s|·,:=-]+|[\s|·,:=-]+$/g, "").trim();
    // 지우고 남은 짧은 조각(메뉴 잔여물)은 버린다
    if (line.length < 12) continue;
    const key = line.replace(/\s/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  // 한 줄 안에서 같은 문장이 반복된 경우(본문을 통째로 읽었을 때) 정리
  return out.map((l) => dedupeSentences(l)).join("\n");
}

function dedupeSentences(line: string): string {
  const parts = line.split(/(?<=[.!?다])\s+/);
  const seen = new Set<string>();
  return parts.filter((p) => {
    const k = p.replace(/\s/g, "");
    if (k.length >= 12 && seen.has(k)) return false;
    seen.add(k);
    return true;
  }).join(" ");
}
