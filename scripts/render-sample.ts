/**
 * 예시 레터 HTML 렌더링 (서버 없이 템플릿 확인용)
 *   npm run render:sample -- out.html [--inline-assets]
 * --inline-assets: 캐릭터 이미지를 data URI 로 넣어 단독 파일로 열 수 있게 한다
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "@/lib/config";
import { renderEmailHtml, renderFragment } from "@/lib/email/template";
import { SAMPLE_LETTER } from "./sample-content";

const out = process.argv[2] ?? "sample-letter.html";
const inline = process.argv.includes("--inline-assets");
const fragmentOnly = process.argv.includes("--fragment");

const meta = {
  issueNo: 4,
  publishDate: "2026-10-20",
  newsletterName: config.newsletterName,
  tagline: config.tagline,
  feedbackContact: config.feedbackContact,
  audience: config.audience,
  feedbackEmail: config.feedbackEmail || "mi-letter@example.com",
  assetBaseUrl: config.assetBaseUrl || undefined,
};
let html = fragmentOnly ? renderFragment(SAMPLE_LETTER, meta) : renderEmailHtml(SAMPLE_LETTER, meta);
if (inline) {
  html = html.replace(/src="[^"]*?(character\/[a-z]+\.png)"/g, (_, rel: string) => {
    const b64 = fs.readFileSync(path.join(process.cwd(), "public", rel)).toString("base64");
    return `src="data:image/png;base64,${b64}"`;
  });
}
fs.writeFileSync(out, html);
console.log(`${out} (${Math.round(html.length / 1024)} KB)`);
