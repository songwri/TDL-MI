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

/**
 * 비즈니스와 무관한 개인 경조사·부고 기사 (예: "○○○ 빙모상", "장남 결혼"). 수집에서 제외한다.
 * 인사발령·선임 같은 조직 소식은 제외 대상이 아니다.
 */
const PERSONAL_NEWS = /빙모상|빙부상|장인상|장모상|부친상|모친상|부모상|조부상|조모상|시부상|시모상|본인상|배우자상|별세(?!계)|부고|부음|타계|영결식|발인|결혼식|장남\s*결혼|차남\s*결혼|장녀\s*결혼|차녀\s*결혼|자녀\s*결혼|혼사|\[\s*(?:부고|부음|결혼|경조)\s*\]|\[\s*인사\s*\].*(?:상|혼)\b/;
export function isPersonalNews(title: string): boolean {
  return PERSONAL_NEWS.test(title);
}
