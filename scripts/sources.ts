/**
 * 수집 채널 점검 CLI
 *   npm run sources -- list            설정된 채널
 *   npm run sources -- probe <주소>    사이트 주소만으로 수집 가능한지 확인 (피드 탐지 → 기사 5건 미리보기)
 *   npm run sources -- check           활성 채널 전체를 한 번씩 점검
 */
import { SOURCES } from "@/config/sources";
import { fetchSourceItems } from "@/lib/collector";
import { resolveSource } from "@/lib/collector/discover";
import { fetchText } from "@/lib/collector/http";
import { extractArticlePage } from "@/lib/collector/parse";

async function probe(url: string) {
  const r = await resolveSource(url);
  console.log(`방식: ${r.type === "rss" ? `RSS (${r.via === "link-tag" ? "홈페이지에 표시된 피드" : "흔한 피드 경로"})` : `HTML 링크 추정 (기사 링크 ${r.sampleLinks}개)`}`);
  console.log(`주소: ${r.url}`);
  const items = await fetchSourceItems({ id: "probe", name: "probe", region: "KR", url, enabled: true, maxItems: 5 });
  for (const it of items) console.log(`- ${it.publishedAt?.slice(0, 10) ?? "날짜?"} ${it.title}\n  ${it.link}`);
  if (items[0]) {
    const page = extractArticlePage(await fetchText(items[0].link), items[0].link);
    console.log(`\n첫 기사 원문: 본문 ${page.content?.length ?? 0}자, 발행일 ${page.publishedAt ?? "없음"}, 썸네일 ${page.image ? "있음" : "없음"}`);
  }
}

async function main() {
  const [cmd = "list", arg] = process.argv.slice(2);
  if (cmd === "list") {
    for (const s of SOURCES) console.log(`${s.enabled ? "●" : "○"} ${s.id.padEnd(16)} ${s.region.padEnd(6)} ${(s.type ?? "auto").padEnd(5)} ${s.name}  ${s.url}`);
    return;
  }
  if (cmd === "probe") {
    if (!arg) throw new Error("사이트 주소를 넣어 주세요. 예: npm run sources -- probe https://www.klnews.co.kr");
    return probe(arg);
  }
  if (cmd === "check") {
    for (const s of SOURCES.filter((x) => x.enabled)) {
      try {
        const items = await fetchSourceItems(s);
        console.log(`✔ ${s.name}: ${items.length}건 (최신: ${items[0]?.title ?? "-"})`);
      } catch (e) {
        console.log(`✘ ${s.name}: ${(e as Error).message}`);
      }
    }
    return;
  }
  throw new Error(`알 수 없는 명령: ${cmd}`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
