import { createHash } from "node:crypto";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

/** 한글 폰트 (Pretendard, OFL). 서버 폰트에 의존하지 않도록 패키지의 파일을 직접 읽는다 */
const FONT_DIR = path.join(process.cwd(), "node_modules", "pretendard", "dist", "public", "static");
const FONTS = ["Pretendard-Regular.otf", "Pretendard-SemiBold.otf", "Pretendard-Bold.otf"].map((f) => path.join(FONT_DIR, f));

const cache = new Map<string, Buffer>();

/** SVG → 2배 해상도 PNG (메일에서는 절반 크기로 표시해 선명하게) */
export function svgToPng(svg: string, scale = 2): Buffer {
  const key = createHash("sha1").update(svg).digest("hex");
  const hit = cache.get(key);
  if (hit) return hit;
  const width = Number(/width="(\d+)"/.exec(svg)?.[1] ?? 576);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width * scale },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: "Pretendard" },
  })
    .render()
    .asPng();
  if (cache.size > 200) cache.delete(cache.keys().next().value!);
  cache.set(key, png);
  return png;
}

