import { describe, expect, it } from "vitest";
import { needsKoTitle, translateTitles, withKoTitles } from "@/lib/translate";
import { rowToArticle, articleToRow } from "@/lib/store/sheets";
import type { Article } from "@/lib/types";
import { TEST_TOKEN, createAppsScriptServer } from "./appsScriptHarness";

const URL_ = "https://script.google.com/macros/s/TEST/exec";

describe("해외 기사 제목 한국어 번역 (Apps Script 구글 번역, 무료)", () => {
  it("한글이 없는 제목만 번역 대상", () => {
    expect(needsKoTitle({ title: "AutoStore unveils new port" })).toBe(true);
    expect(needsKoTitle({ title: "CJ대한통운, AMR 도입" })).toBe(false);
    expect(needsKoTitle({ title: "Amazon robots", titleKo: "아마존 로봇" })).toBe(false);
  });

  it("영어 제목만 번역해 붙이고, 실패한 항목은 비워 둠", async () => {
    const srv = createAppsScriptServer();
    const opts = { url: URL_, token: TEST_TOKEN, fetchImpl: srv.fetchImpl };
    const arts: { title: string; titleKo?: string }[] = [{ title: "AutoStore unveils new port" }, { title: "국내 기사" }, { title: "FAIL case" }];
    const r = await withKoTitles(arts, opts);
    expect(r.translated).toBe(1);
    expect(r.articles[0].titleKo).toBe("[en>ko] AutoStore unveils new port");
    expect(r.articles[1]).toBe(arts[1]);
    expect(r.articles[2]).toEqual({ title: "FAIL case" });
    expect(await translateTitles([], opts)).toEqual([]);
  });

  it("연결 정보가 없으면 아무것도 하지 않고, 옛 스크립트면 다시 배포 안내 (수집은 계속)", async () => {
    expect(await withKoTitles([{ title: "Hello" }], { url: "", token: "" })).toEqual({ articles: [{ title: "Hello" }], translated: 0 });
    const old = (async () => new Response(JSON.stringify({ ok: false, error: "알 수 없는 요청: translate" }))) as unknown as typeof fetch;
    const r = await withKoTitles([{ title: "Hello" }], { url: URL_, token: "t", fetchImpl: old });
    expect(r.translated).toBe(0);
    expect(r.warning).toMatch(/새 버전/);
  });

  it("시트 '제목(한글)' 열에 저장·복원", () => {
    const a: Article = {
      id: "G1", collectedAt: "c", publishedAt: "p", source: "s", region: "GLOBAL", title: "Robots", titleKo: "로봇", link: "l",
      summary: "", category: "기타", keywords: [], selected: false,
    };
    const row = articleToRow(a);
    expect(row[13]).toBe("로봇");
    expect(rowToArticle(row)?.titleKo).toBe("로봇");
    expect(rowToArticle(row.slice(0, 13))?.titleKo).toBeUndefined(); // 예전 시트(열 없음)
  });
});
