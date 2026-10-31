import { describe, expect, it } from "vitest";
import { extractArticlePage } from "@/lib/collector/parse";
import { buildFallbackDraft } from "@/lib/newsletter/fallback";
import type { Article } from "@/lib/types";
import { stripBoilerplate } from "@/lib/utils/text";

const TAIL = "박경일 기자 robot@irobotnews.com 다른기사 보기 저작권자 © 로봇신문 무단전재 및 재배포 금지 더보기 내 댓글 모음 닫기";

describe("기사 본문의 기자 서명·저작권 고지·사이트 문구 제거", () => {
  it("보일러플레이트만 있는 본문은 빈 문자열", () => {
    expect(stripBoilerplate(`${TAIL}\n${TAIL} ${TAIL} ${TAIL}`)).toBe("");
  });

  it("본문 문장은 남기고 끝에 붙은 서명·고지만 지움", () => {
    const out = stripBoilerplate(`현대글로비스가 AMR 200대를 추가 도입한다고 밝혔다. 회사는 내년까지 전 센터로 확대할 계획이다. ${TAIL}`);
    expect(out).toBe("현대글로비스가 AMR 200대를 추가 도입한다고 밝혔다. 회사는 내년까지 전 센터로 확대할 계획이다.");
  });

  it("본문 속 '○○ 기자는' 인용은 보호, 영문 저작권 고지 제거", () => {
    const quote = "김철수 기자는 현장을 찾아 로봇 피킹 시스템이 시간당 600건을 처리하는 모습을 확인했다고 전했다. 이 수치는 기존 대비 두 배 수준이며 앞으로도 늘어날 전망이다.";
    expect(stripBoilerplate(quote)).toBe(quote);
    expect(stripBoilerplate("Copyright © 2026 Supply Chain Dive. All rights reserved.\nAmazon said it will deploy more robots across its network this year.")).toBe(
      "Amazon said it will deploy more robots across its network this year.",
    );
  });

  it("수집 단계: 기사 페이지에서 서명·고지를 본문에 담지 않음", () => {
    const html = `<html><body><div id="article-view-content-div">
      <p>물류 로봇 기업 A사가 신형 AMR을 공개했다. 적재 중량은 1톤이며 기존 대비 30% 늘었다.</p>
      <p>회사는 국내 3PL 센터 두 곳에서 실증을 마쳤다고 밝혔다. 상용 출시는 내년 상반기다.</p>
      <p>${TAIL}</p></div><div class="view-copyright">${TAIL}</div></body></html>`;
    const page = extractArticlePage(html, "https://www.irobotnews.com/news/articleView.html?idxno=1");
    expect(page.content).toContain("신형 AMR");
    for (const w of ["기자", "@", "저작권", "무단전재", "댓글", "닫기"]) expect(page.content).not.toContain(w);
  });

  it("규칙 기반 초안: 예전에 저장된 본문이 보일러플레이트뿐이어도 그 문구를 쓰지 않음", () => {
    const a: Article = {
      id: "R1", collectedAt: "", publishedAt: "2026-10-20T00:00:00Z", source: "로봇신문", region: "KR", title: "협동로봇 신제품",
      link: "https://x/R1", summary: TAIL, content: `${TAIL}\n${TAIL}`, category: "기타", keywords: [], selected: true,
    };
    const d = buildFallbackDraft({ issueNo: 1, concept: "", articles: [a], stats: { total: 1, byCategory: [], byRegion: [], topKeywords: [], repeat: { fresh: 1, followUp: 0, duplicate: 0 }, trend: { issues: [], category: [], keywords: [] } } });
    const all = JSON.stringify(d);
    for (const w of ["robot@", "저작권자", "무단전재", "내 댓글 모음"]) expect(all).not.toContain(w);
  });
});
