/**
 * 예시 리포트 HTML 렌더링 (서버 없이 템플릿 확인용)
 *   npm run render:sample -- out.html [--fragment]
 * --fragment: 문서 틀 없이 메일 본문에 붙여 넣는 부분만
 */
import fs from "node:fs";
import { config } from "@/lib/config";
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
const html = process.argv.includes("--fragment") ? renderFragment(SAMPLE_REPORT, meta) : renderEmailHtml(SAMPLE_REPORT, meta);
fs.writeFileSync(out, html);
if (process.argv.includes("--text")) fs.writeFileSync(out.replace(/\.html$/, ".txt"), renderPlainText(SAMPLE_REPORT, meta));
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
