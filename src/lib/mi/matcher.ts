import { CATEGORY_RULES, ENTITIES, RELEVANCE_KEYWORDS, type EntityDef } from "@/config/taxonomy";
import type { Category, Region } from "@/lib/types";

const LATIN_ONLY = /^[a-z0-9+/&.\- ']+$/;
const cache = new Map<string, RegExp | null>();

/** 영문 단어는 단어 경계로, 한글 포함 표현은 부분일치로 매칭 */
export function containsTerm(haystackLower: string, term: string): boolean {
  let re = cache.get(term);
  if (re === undefined) {
    const t = term.trim();
    re = LATIN_ONLY.test(t)
      ? new RegExp(`(?<![a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i")
      : null;
    cache.set(term, re);
  }
  return re ? re.test(haystackLower) : haystackLower.includes(term.trim());
}

export function extractEntities(text: string): EntityDef[] {
  const lower = ` ${text.toLowerCase()} `;
  return ENTITIES.filter((e) => e.aliases.some((a) => containsTerm(lower, a)));
}

export function extractKeywords(text: string): string[] {
  const names = extractEntities(text).map((e) => e.canonical);
  // "Amazon Robotics"가 잡히면 상위 "Amazon"은 중복이므로 제거
  return names.filter((n) => !names.some((m) => m !== n && m.startsWith(n + " ")));
}

export function classify(text: string, region: Region): Category {
  const lower = ` ${text.toLowerCase()} `;
  let best: Category | null = null;
  let bestScore = 0;
  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.reduce((s, [kw, w]) => (containsTerm(lower, kw) ? s + w : s), 0);
    if (score > bestScore) {
      best = rule.category;
      bestScore = score;
    }
  }
  if (best && bestScore >= 2) return best;
  return region === "GLOBAL" ? "글로벌 트렌드" : "기타";
}

export function isRelevant(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return RELEVANCE_KEYWORDS.some((k) => containsTerm(lower, k));
}
