import { config } from "@/lib/config";
import { appsScriptCaller } from "@/lib/store/appsScript";
import type { Article } from "@/lib/types";

/** 한글이 없는 제목 = 번역 대상 (해외 기사) */
export const needsKoTitle = (a: Pick<Article, "title" | "titleKo">) => !a.titleKo && !!a.title.trim() && !/[가-힣]/.test(a.title);

/** 연결 정보 (기본: 환경변수). 테스트에서는 가짜 Apps Script 를 넘긴다 */
export interface TranslateOpts {
  url?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}
const conn = (o: TranslateOpts = {}) => ({ url: o.url ?? config.sheetsWebAppUrl, token: o.token ?? config.sheetsWebAppToken, fetchImpl: o.fetchImpl ?? fetch });
export const translationEnabled = (o?: TranslateOpts) => {
  const c = conn(o);
  return !!(c.url && c.token);
};

/**
 * 영어 제목 → 한국어. 시트에 붙인 Apps Script 의 구글 번역(LanguageApp)을 쓴다: 무료, API 키 불필요.
 * 실패한 항목은 null. 시트 스크립트가 옛 버전이면 안내 오류를 던진다.
 */
export async function translateTitles(texts: string[], opts?: TranslateOpts): Promise<(string | null)[]> {
  if (!texts.length || !translationEnabled(opts)) return texts.map(() => null);
  const c = conn(opts);
  const call = appsScriptCaller(c.url, c.token, c.fetchImpl);
  const out: (string | null)[] = [];
  for (let i = 0; i < texts.length; i += 50) {
    let res: string[];
    try {
      res = await call<string[]>("translate", { texts: texts.slice(i, i + 50), from: "en", to: "ko" });
    } catch (e) {
      if (/알 수 없는 요청/.test((e as Error).message)) {
        throw new Error("영어 제목 번역: 시트의 Apps Script 를 최신 apps-script/Code.gs 로 바꾸고 '새 버전'으로 다시 배포해 주세요.");
      }
      throw e;
    }
    out.push(...texts.slice(i, i + 50).map((_, j) => (res[j] ? String(res[j]).trim() : null)));
  }
  return out;
}

/** 번역 제목을 붙여 돌려준다 (실패해도 수집은 계속) */
export async function withKoTitles<T extends Pick<Article, "title" | "titleKo">>(articles: T[], opts?: TranslateOpts): Promise<{ articles: T[]; translated: number; warning?: string }> {
  const targets = articles.filter(needsKoTitle);
  if (!targets.length || !translationEnabled(opts)) return { articles, translated: 0 };
  try {
    const ko = await translateTitles(targets.map((a) => a.title), opts);
    const map = new Map(targets.map((a, i) => [a, ko[i]]));
    let translated = 0;
    const out = articles.map((a) => {
      const k = map.get(a);
      if (!k) return a;
      translated++;
      return { ...a, titleKo: k };
    });
    return { articles: out, translated };
  } catch (e) {
    return { articles, translated: 0, warning: (e as Error).message };
  }
}
