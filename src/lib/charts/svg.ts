/**
 * 메일용 인포그래픽 (SVG → PNG). 데이터 시각화 스킬 규칙:
 * 얇은 막대, 조각 사이 2px 간격, 양 끝 4px 라운드, 들어갈 때만 막대 안 숫자, 범례 항상 표시,
 * 카테고리 색은 항목에 고정, 크기는 파랑 한 가지 색, 강조(브랜드 레드)는 한 가지 의미에만.
 * 제목은 메일 본문의 글자로 두고(검색·이미지 차단 대비), 이미지는 그래픽과 라벨만 담는다.
 */
import { CATEGORY_COLORS, COLORS, NEUTRALS, RAMP } from "@/config/brand";
import { stripRich } from "@/lib/report/rich";
import type { ReportContent, ReportStats, ViewerData } from "@/lib/types";

export const CHART_W = 576;
const FONT = "Pretendard";
const INK = "#222222";
const SOFT = "#5F5F5F";
const MUTE = "#8A8A8A";
const LINE = "#E1E0D9";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cat = (c: string) => CATEGORY_COLORS[c] ?? CATEGORY_COLORS["기타"];
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const inkOn = (bg: string) => (1.05 / (lum(bg) + 0.05) >= 2.3 ? "#FFFFFF" : "#0B0B0B");

/** 글자 폭 근사치 (한글 1em, 영문·숫자 0.56em) */
export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += /[ㄱ-힝一-鿿]/.test(ch) ? size : /[A-Z]/.test(ch) ? size * 0.64 : size * 0.54;
  return w;
}
/** 최대 n 줄로 줄바꿈 (넘치면 마지막 줄 말줄임) */
export function lines(s: string, maxPx: number, size: number, n = 2): string[] {
  const words = s.split(/(\s+)/);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (textWidth(cur + w, size) <= maxPx || !cur.trim()) cur += w;
    else {
      out.push(cur.trim());
      cur = w.trimStart();
    }
  }
  if (cur.trim()) out.push(cur.trim());
  if (out.length <= n) return out;
  return [...out.slice(0, n - 1), fit(out.slice(n - 1).join(" "), maxPx, size)];
}

export function fit(s: string, maxPx: number, size: number): string {
  if (textWidth(s, size) <= maxPx) return s;
  let out = "";
  for (const ch of s) {
    if (textWidth(out + ch + "…", size) > maxPx) break;
    out += ch;
  }
  return out.trimEnd() + "…";
}

const T = (x: number, y: number, s: string, o: { size?: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end" } = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size ?? 12}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? "start"}">${esc(s)}</text>`;

/** 한쪽 또는 양쪽 끝만 둥근 막대 */
function bar(x: number, y: number, w: number, h: number, fill: string, round: "left" | "right" | "both" | "none") {
  if (w <= 0) return "";
  const r = Math.min(4, h / 2, w / 2);
  const l = round === "left" || round === "both" ? r : 0;
  const rr = round === "right" || round === "both" ? r : 0;
  return `<path d="M${x + l} ${y} H${x + w - rr} ${rr ? `Q${x + w} ${y} ${x + w} ${y + rr}` : ""} V${y + h - rr} ${rr ? `Q${x + w} ${y + h} ${x + w - rr} ${y + h}` : ""} H${x + l} ${l ? `Q${x} ${y + h} ${x} ${y + h - l}` : ""} V${y + l} ${l ? `Q${x} ${y} ${x + l} ${y}` : ""} Z" fill="${fill}"/>`;
}

function legendRow(items: { label: string; color: string; note?: string }[], y: number, width = CHART_W) {
  let x = 0;
  let row = y;
  const parts: string[] = [];
  for (const it of items) {
    const label = it.note ? `${it.label} ${it.note}` : it.label;
    const w = 14 + textWidth(label, 12) + 18;
    if (x + w > width && x > 0) {
      x = 0;
      row += 20;
    }
    parts.push(`<rect x="${x}" y="${row - 9}" width="10" height="10" rx="2" fill="${it.color}"/>` + T(x + 14, row, label, { size: 12, fill: SOFT }));
    x += w;
  }
  return { svg: parts.join(""), bottom: row + 8 };
}

const wrap = (w: number, h: number, body: string, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.ceil(h)}" viewBox="0 0 ${w} ${Math.ceil(h)}" role="img" aria-label="${esc(label)}"><rect width="100%" height="100%" fill="#FFFFFF"/>${body}</svg>`;

/** 1) 카테고리 구성: 분할 막대 + 범례 */
export function categorySvg(s: ReportStats): string {
  const items = s.byCategory.filter((c) => c.count > 0);
  const total = items.reduce((n, c) => n + c.count, 0) || 1;
  const gap = 2;
  const avail = CHART_W - gap * (items.length - 1);
  let x = 0;
  const segs = items.map((c, i) => {
    const w = i === items.length - 1 ? CHART_W - x : Math.round((c.count / total) * avail);
    const color = cat(c.label);
    const out =
      bar(x, 0, w, 34, color, items.length === 1 ? "both" : i === 0 ? "left" : i === items.length - 1 ? "right" : "none") +
      (w >= 34 ? T(x + w / 2, 22, `${c.count}건`, { size: 13, weight: 700, fill: inkOn(color), anchor: "middle" }) : "");
    x += w + gap;
    return out;
  });
  const lg = legendRow(items.map((c) => ({ label: c.label, color: cat(c.label), note: `${c.count}건 · ${Math.round((c.count / total) * 100)}%` })), 58);
  return wrap(CHART_W, lg.bottom + 6, segs.join("") + lg.svg, `카테고리 구성: ${items.map((c) => `${c.label} ${c.count}건`).join(", ")}`);
}

/** 2) 많이 언급된 기업·기술: 순위 막대 (이어지는 주제 = 강조색) */
export function keywordSvg(s: ReportStats): string {
  const rows = s.topKeywords;
  const max = Math.max(...rows.map((r) => r.count), 1);
  const labelW = 150, valueW = 44, rowH = 26;
  const area = CHART_W - labelW - valueW;
  const body = rows
    .map((r, i) => {
      const y = i * rowH;
      const w = Math.max(4, (r.count / max) * area);
      return (
        T(0, y + 16, fit(r.label, labelW - 12, 13), { size: 13 }) +
        `<line x1="${labelW}" y1="${y + 3}" x2="${labelW}" y2="${y + 23}" stroke="${LINE}"/>` +
        bar(labelW, y + 7, w, 12, r.seenBefore ? COLORS.brand : NEUTRALS.mid, "right") +
        T(labelW + w + 8, y + 17, `${r.count}건`, { size: 12, weight: 700, fill: SOFT })
      );
    })
    .join("");
  const hasHistory = s.trend.issues.length > 1;
  const lg = hasHistory ? legendRow([{ label: "지난 호에서도 등장", color: COLORS.brand }, { label: "이번 호 처음", color: NEUTRALS.mid }], rows.length * rowH + 18) : { svg: "", bottom: rows.length * rowH };
  return wrap(CHART_W, lg.bottom + 6, body + lg.svg, `많이 다룬 기업·기술: ${rows.map((r) => `${r.label} ${r.count}건`).join(", ")}`);
}

/** 3) 인사이트 맵: 주제 ↔ 근거 기사 */
export function insightMapSvg(c: ReportContent, articles: ViewerData["articles"]): string {
  const themes = c.themes;
  const nodeW = 236;
  const rowH = 34;
  const first = (id: string) => {
    const i = themes.findIndex((t) => t.sourceArticleIds.includes(id));
    return i < 0 ? 99 : i;
  };
  const arts = articles.map((a, i) => ({ a, no: i + 1 })).sort((x, y) => first(x.a.id) - first(y.a.id) || x.no - y.no);
  const themeH = 66;
  const H = Math.max(arts.length * rowH, themes.length * (themeH + 12)) + 4;
  const ay = (i: number) => 2 + (i + 0.5) * ((H - 4) / arts.length);
  const ty = (i: number) => 2 + (i + 0.5) * ((H - 4) / themes.length);
  const x1 = nodeW, x2 = CHART_W - nodeW;
  const edges = themes
    .flatMap((t, ti) =>
      t.sourceArticleIds.flatMap((id) => {
        const ai = arts.findIndex((x) => x.a.id === id);
        return ai < 0 ? [] : [`<path d="M${x1} ${ty(ti)} C ${x1 + 40} ${ty(ti)}, ${x2 - 40} ${ay(ai)}, ${x2} ${ay(ai)}" fill="none" stroke="${cat(arts[ai].a.category)}" stroke-width="2" opacity="0.9"/>`];
      }),
    )
    .join("");
  const tnodes = themes
    .map((t, i) => {
      const y = ty(i) - themeH / 2;
      return (
        `<rect x="0" y="${y}" width="${nodeW}" height="${themeH}" rx="4" fill="${COLORS.brandTint}" stroke="${COLORS.brand}"/>` +
        `<rect x="0" y="${y}" width="4" height="${themeH}" rx="2" fill="${COLORS.brand}"/>` +
        T(14, y + 18, `주제 ${i + 1}`, { size: 11, weight: 700, fill: COLORS.brand }) +
        lines(stripRich(t.title), nodeW - 26, 12.5, 2)
          .map((ln, k) => T(14, y + 36 + k * 17, ln, { size: 12.5, weight: 700 }))
          .join("")
      );
    })
    .join("");
  const anodes = arts
    .map(({ a, no }, i) => {
      const y = ay(i) - 13;
      return (
        `<rect x="${x2}" y="${y}" width="${nodeW}" height="26" rx="4" fill="#FFFFFF" stroke="${LINE}"/>` +
        `<rect x="${x2}" y="${y}" width="4" height="26" rx="2" fill="${cat(a.category)}"/>` +
        T(x2 + 12, y + 17, `[${no}]`, { size: 11, weight: 700, fill: SOFT }) +
        T(x2 + 38, y + 17, fit(a.title, nodeW - 46, 12), { size: 12 })
      );
    })
    .join("");
  const cats = [...new Set(arts.map((x) => x.a.category))];
  const lg = legendRow(cats.map((k) => ({ label: k, color: cat(k) })), H + 22);
  return wrap(CHART_W, lg.bottom + 6, edges + tnodes + anodes + lg.svg, `인사이트 맵: 주제 ${themes.length}개와 근거 기사 ${articles.length}건의 연결`);
}

/** 4) 호별 카테고리 추이: 누적 막대 */
export function trendSvg(s: ReportStats): string {
  const { issues, category } = s.trend;
  const labelW = 58, totalW = 44, rowH = 30, gap = 2;
  const area = CHART_W - labelW - totalW;
  const totals = issues.map((_, i) => category.reduce((n, c) => n + (c.counts[i] ?? 0), 0));
  const max = Math.max(...totals, 1);
  const body = issues
    .map((iss, i) => {
      const y = i * rowH;
      const segs = category.map((c) => ({ label: c.label, v: c.counts[i] ?? 0 })).filter((x) => x.v > 0);
      const full = (totals[i] / max) * area;
      let x = labelW;
      const parts = segs.map((sg, k) => {
        const w = k === segs.length - 1 ? labelW + full - x : Math.round((sg.v / totals[i]) * (full - gap * (segs.length - 1)));
        const color = cat(sg.label);
        const out = bar(x, y + 6, Math.max(w, 2), 18, color, segs.length === 1 ? "right" : k === segs.length - 1 ? "right" : "none") + (w >= 20 ? T(x + w / 2, y + 19, String(sg.v), { size: 11, weight: 700, fill: inkOn(color), anchor: "middle" }) : "");
        x += w + gap;
        return out;
      });
      return (
        T(0, y + 20, `제${iss.no}호`, { size: 13, weight: iss.current ? 700 : 400, fill: iss.current ? COLORS.brand : INK }) +
        `<line x1="${labelW}" y1="${y + 2}" x2="${labelW}" y2="${y + 28}" stroke="${LINE}"/>` +
        parts.join("") +
        T(labelW + full + 8, y + 20, `${totals[i]}건`, { size: 12, fill: SOFT })
      );
    })
    .join("");
  const lg = legendRow(category.map((c) => ({ label: c.label, color: cat(c.label) })), issues.length * rowH + 16);
  return wrap(CHART_W, lg.bottom + 6, body + lg.svg, `호별 카테고리 추이 (제${issues[0]?.no}호~제${issues.at(-1)?.no}호)`);
}

/** 5) 키워드 × 호 히트맵 */
export function heatmapSvg(s: ReportStats): string {
  const { issues, keywords } = s.trend;
  const labelW = 150;
  const cellW = Math.min(76, Math.floor((CHART_W - labelW) / issues.length));
  const cellH = 26, head = 22, gap = 2;
  const max = Math.max(...keywords.flatMap((k) => k.counts), 1);
  const ramp = (n: number) => (n <= 0 ? "#F1F0EC" : RAMP[Math.min(RAMP.length - 1, Math.round(((n - 1) / Math.max(max - 1, 1)) * (RAMP.length - 1)))]);
  const header = issues.map((iss, i) => T(labelW + i * cellW + (cellW - gap) / 2, 14, `제${iss.no}호`, { size: 12, weight: iss.current ? 700 : 400, fill: iss.current ? COLORS.brand : SOFT, anchor: "middle" })).join("");
  const rows = keywords
    .map((k, r) => {
      const y = head + r * cellH;
      return (
        T(0, y + 17, fit(k.label, labelW - 10, 13), { size: 13 }) +
        k.counts
          .map((n, i) => {
            const bg = ramp(n);
            const dark = RAMP.indexOf(bg as (typeof RAMP)[number]) >= 3;
            return `<rect x="${labelW + i * cellW}" y="${y}" width="${cellW - gap}" height="${cellH - gap}" rx="3" fill="${bg}"/>` + (n ? T(labelW + i * cellW + (cellW - gap) / 2, y + 16, String(n), { size: 12, weight: 700, fill: dark ? "#FFFFFF" : "#0B0B0B", anchor: "middle" }) : "");
          })
          .join("")
      );
    })
    .join("");
  const y0 = head + keywords.length * cellH + 14;
  const scale = T(0, y0 + 9, "적음", { size: 11, fill: MUTE }) + RAMP.map((c, i) => `<rect x="${30 + i * 20}" y="${y0}" width="18" height="10" rx="2" fill="${c}"/>`).join("") + T(30 + RAMP.length * 20 + 6, y0 + 9, "많음", { size: 11, fill: MUTE });
  return wrap(CHART_W, y0 + 18, header + rows + scale, `키워드 호별 등장: ${keywords.map((k) => k.label).join(", ")}`);
}

export type ChartId = "category" | "keywords" | "map" | "trend" | "heatmap";

export function chartSvg(id: ChartId, c: ReportContent, articles: ViewerData["articles"]): string | null {
  const s = c.stats;
  if (id === "map") return c.themes.length && articles.length ? insightMapSvg(c, articles) : null;
  if (!s) return null;
  if (id === "category") return s.byCategory.length ? categorySvg(s) : null;
  if (id === "keywords") return s.topKeywords.length ? keywordSvg(s) : null;
  if (id === "trend") return s.trend.issues.length > 1 ? trendSvg(s) : null;
  if (id === "heatmap") return s.trend.issues.length > 1 && s.trend.keywords.length ? heatmapSvg(s) : null;
  return null;
}

/** 이미지 표시 높이 (메일 <img height> 용): SVG 의 높이를 그대로 사용 */
export const svgHeight = (svg: string) => Number(/height="(\d+)"/.exec(svg)?.[1] ?? 0);
