/**
 * TDL TREND REPORT 마크 PNG 만들기 (public/brand/). 마크 디자인을 바꾼 뒤 한 번 실행해 커밋한다.
 *   npm run make:mark
 */
import fs from "node:fs";
import path from "node:path";
import { MARK_PATH, markSvg } from "@/lib/brand/mark";
import { svgToPng } from "@/lib/charts/png";

const out = path.join(process.cwd(), "public", MARK_PATH);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svgToPng(markSvg(), 3));
console.log(path.relative(process.cwd(), out));
