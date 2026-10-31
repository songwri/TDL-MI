/**
 * 예시 리포트 HTML 렌더링 (서버 없이 템플릿 확인용)
 *   npm run render:sample -- out.html [--fragment]
 * --fragment: 문서 틀 없이 메일 본문에 붙여 넣는 부분만
 * --images:   인포그래픽을 PNG 로 만들어 파일 안에 넣는다 (서버 없이 열어 보기용)
 */
import fs from "node:fs";
import { config } from "@/lib/config";
import { svgToPng } from "@/lib/charts/png";
import { chartSvg, svgHeight, type ChartId } from "@/lib/charts/svg";
import { renderEmailHtml, renderFragment, renderPlainText } from "@/lib/email/template";
import { SAMPLE_ARTICLES, SAMPLE_REPORT } from "./sample-content";

const out = process.argv[2] ?? "sample-report.html";
const meta = {
  issueNo: 4,
  publishDate: "2026-10-27",
  newsletterName: config.newsletterName,
  tagline: config.tagline,
  feedbackContact: config.feedbackContact,
  feedbackEmail: config.feedbackEmail || "tdl-trend@example.com",
  audience: config.audience,
  articles: SAMPLE_ARTICLES,
};
const CATS = ["소팅/보관설비", "AMR/AGV", "로봇 피킹/매니퓰레이션", "풀필먼트 자동화", "글로벌 트렌드", "로봇 피킹/매니퓰레이션"] as const;
if (process.argv.includes("--images")) {
  const arts = SAMPLE_ARTICLES.map((a, i) => ({ ...a, category: CATS[i] }));
  const charts: NonNullable<Parameters<typeof renderFragment>[1]["charts"]> = {};
  for (const id of ["category", "keywords", "map", "trend", "heatmap"] as ChartId[]) {
    const svg = chartSvg(id, SAMPLE_REPORT, arts);
    if (svg) charts[id] = { src: `data:image/png;base64,${svgToPng(svg).toString("base64")}`, height: svgHeight(svg), alt: id };
  }
  Object.assign(meta, { charts });
}
const html = process.argv.includes("--fragment") ? renderFragment(SAMPLE_REPORT, meta) : renderEmailHtml(SAMPLE_REPORT, meta);
fs.writeFileSync(out, html);
if (process.argv.includes("--text")) fs.writeFileSync(out.replace(/\.html$/, ".txt"), renderPlainText(SAMPLE_REPORT, meta));
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
