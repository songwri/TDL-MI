import { ENTITIES, type EntityDef } from "@/config/taxonomy";

/**
 * 기사가 어떤 회사의 기사인지 판정 (제목 구조 + 제목·요약 내용 분석).
 * 점수 합이 SUBJECT_THRESHOLD 이상이면 그 회사 기사로 본다. 점수 근거(reasons)는 그대로 돌려줘 설명할 수 있다.
 *
 *  + 제목 맨 앞 "회사명," 구조                      +5
 *  + 제목에 회사명 (앞쪽일수록 +1)                  +4
 *  + 요약에 언급: 횟수 최대 3회 × 1점, 첫 언급이 요약 앞 80자면 +1
 *  + 요약에서 주어 자리(회사명+은·는·이·가·측·,)       +1.5
 *  − 제목에 다른 추적 회사가 2곳 이상(종합 기사)       −1
 *  − 요약에 다른 추적 회사가 2곳 이상, 또는 나열 구조    −2
 *  − 제목이 전망·종합 성격(Tech Map·트렌드·TOP 등)이고 제목에 회사명이 없음  −1.5
 */
export const SUBJECT_THRESHOLD = 3;

export interface SubjectScore {
  score: number;
  isSubject: boolean;
  reasons: string[];
}

const LATIN = /^[a-z0-9+/&.\- ']+$/;
const ROUNDUP = /tech\s*map|trend|트렌드|전망|총정리|top\s*\d|순위|키워드|로드맵|outlook|\b20\d\d\b/i;

function positions(textLower: string, e: EntityDef): number[] {
  const out: number[] = [];
  for (const a of e.aliases) {
    const t = a.trim();
    if (!t) continue;
    let i = textLower.indexOf(t);
    while (i !== -1) {
      const before = textLower[i - 1] ?? " ", after = textLower[i + t.length] ?? " ";
      if (!LATIN.test(t) || (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after))) out.push(i);
      i = textLower.indexOf(t, i + t.length);
    }
  }
  return out.sort((x, y) => x - y);
}

const companies = ENTITIES.filter((e) => e.kind === "company");

export function subjectScore(title: string, summary: string, canonical: string): SubjectScore {
  const e = ENTITIES.find((x) => x.canonical === canonical);
  if (!e) return { score: 0, isSubject: false, reasons: [] };
  const tl = title.toLowerCase().trim(), sl = summary.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const inTitle = positions(tl, e);
  const lead = tl.replace(/^\[[^\]]*\]\s*/, "").match(/^(.{1,24}?)\s*[,，、·]\s*\S/);
  const leadHit = !!lead && positions(` ${lead[1]} `, e).length > 0;
  if (leadHit) { score += 5; reasons.push("제목이 회사명으로 시작"); }
  if (inTitle.length) {
    score += 4; reasons.push("제목에 회사명");
    if (inTitle[0] <= 12) score += 1;
  }

  const inSum = positions(sl, e);
  if (inSum.length) {
    score += Math.min(inSum.length, 3);
    reasons.push(`요약에 ${inSum.length}회 언급`);
    if (inSum[0] <= 80) score += 1;
    const names = e.aliases.map((a) => a.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    if (new RegExp(`(?:${names})\\s*(?:은|는|이|가|측|도|,)`, "i").test(sl)) { score += 1.5; reasons.push("요약에서 주어 자리"); }
  }

  const others = (text: string) => companies.filter((c) => c.canonical !== canonical && positions(text, c).length > 0);
  const otherInTitle = others(tl).length, otherInSum = others(sl).length;
  if (inTitle.length && otherInTitle >= 2) { score -= 1; reasons.push("제목에 다른 회사 여러 곳"); }
  if (otherInSum >= 2) { score -= 2; reasons.push("요약에 다른 회사 여러 곳(나열·종합 기사)"); }
  if (!inTitle.length && ROUNDUP.test(tl)) { score -= 1.5; reasons.push("제목이 전망·종합 성격"); }

  return { score, isSubject: score >= SUBJECT_THRESHOLD, reasons };
}
