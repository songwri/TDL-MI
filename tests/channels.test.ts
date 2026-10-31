import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { SourceDef } from "@/config/sources";
import { checkSource, toArticle } from "@/lib/collector";
import { summarizeChannels } from "@/lib/collector/channels";
import { articleToRow, rowToArticle } from "@/lib/store/sheets";
import type { Article } from "@/lib/types";

const SOURCES: SourceDef[] = [
  { id: "kl", name: "물류신문", region: "KR", url: "https://kl.example/rss.xml", type: "rss", enabled: true },
  { id: "scd", name: "Supply Chain Dive", region: "GLOBAL", url: "https://scd.example/", enabled: true, requireRelevance: true },
  { id: "gnews", name: "Google 뉴스", region: "GLOBAL", url: "https://news.google.com/rss/search?q=x", type: "rss", enabled: false },
];

const art = (id: string, over: Partial<Article>): Article => ({
  id, collectedAt: "2026-10-30T00:00:00Z", publishedAt: "2026-10-29T00:00:00Z", source: "x", region: "KR", title: id, link: `https://x/${id}`,
  summary: "", category: "기타", keywords: [], selected: false, ...over,
});

describe("수집 채널 현황 집계", () => {
  const now = new Date("2026-10-31T00:00:00Z");

  it("채널 ID 로 집계하고, 예전 기사는 언론사 이름으로 연결, 나머지는 채널 미상", () => {
    const { channels, unattributed, total } = summarizeChannels(
      SOURCES,
      [
        art("a1", { channel: "kl", source: "물류신문", publishedAt: "2026-10-29T00:00:00Z", collectedAt: "2026-10-30T08:00:00Z" }),
        art("a2", { channel: "kl", source: "물류신문", publishedAt: "2026-09-01T00:00:00Z", collectedAt: "2026-10-30T08:00:00Z" }),
        art("a3", { source: "물류신문", publishedAt: "2026-10-20T00:00:00Z" }), // 채널 기록 없는 예전 기사
        art("a4", { channel: "scd", source: "Supply Chain Dive", region: "GLOBAL" }),
        art("a5", { source: "Logistics Business", region: "GLOBAL" }), // Google 뉴스가 가져온 매체 기사
      ],
      { now },
    );
    const kl = channels.find((c) => c.id === "kl")!;
    expect(kl).toMatchObject({ articles: 3, recent: 2, lastPublishedAt: "2026-10-29T00:00:00Z", lastCollectedAt: "2026-10-30T08:00:00Z", type: "rss", enabled: true });
    expect(channels.find((c) => c.id === "scd")).toMatchObject({ articles: 1, type: "auto", filtered: true });
    expect(channels.find((c) => c.id === "gnews")).toMatchObject({ articles: 0, enabled: false });
    expect(unattributed).toBe(1);
    expect(total).toBe(5);
  });

  it("수집한 기사에 채널 ID 가 기록되고 시트 행으로 왕복", () => {
    const a = toArticle({ title: "제목 제목 제목", link: "https://kl.example/a", publishedAt: "2026-10-30T00:00:00Z" }, SOURCES[0]);
    expect(a.channel).toBe("kl");
    const back = rowToArticle(articleToRow(a))!;
    expect(back.channel).toBe("kl");
    expect(rowToArticle(articleToRow({ ...a, channel: undefined }))!.channel).toBeUndefined();
    expect(rowToArticle(articleToRow(a).slice(0, 12))!.channel).toBeUndefined(); // 13번째 칸이 없는 예전 시트 행
  });
});

describe("채널 점검", () => {
  const rss = fs.readFileSync(path.join(__dirname, "fixtures", "ndsoft-rss.xml"), "utf8");

  it("RSS 채널에 접속해 기사 수와 샘플을 돌려주고 저장은 하지 않음", async () => {
    vi.stubGlobal("fetch", async () => new Response(rss, { status: 200, headers: { "content-type": "application/rss+xml" } }));
    const r = await checkSource(SOURCES[0]);
    expect(r.method).toMatchObject({ type: "rss", url: "https://kl.example/rss.xml" });
    expect(r.count).toBe(2);
    expect(r.samples[0].title).toContain("CJ대한통운");
    vi.unstubAllGlobals();
  });

  it("자동 탐지 채널은 어떤 방식으로 찾았는지 알려 줌", async () => {
    const home = `<html><head><link rel="alternate" type="application/rss+xml" href="/feed.xml"></head></html>`;
    vi.stubGlobal("fetch", async (url: string) => new Response(String(url).endsWith("feed.xml") ? rss : home, { status: 200 }));
    const r = await checkSource({ id: "auto1", name: "자동", region: "KR", url: "https://auto.example/", enabled: true });
    expect(r.method).toEqual({ type: "rss", url: "https://auto.example/feed.xml", via: "link-tag" });
    expect(r.count).toBe(2);
    vi.unstubAllGlobals();
  });

  it("접속 실패는 이유가 있는 오류", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 403 }));
    await expect(checkSource(SOURCES[0])).rejects.toThrow(/HTTP 403/);
    vi.unstubAllGlobals();
  });
});
