/**
 * 아웃룩 호환 인포그래픽: 이미지·SVG·자바스크립트 없이 <table> 셀의 폭과 배경색으로 그린다.
 * 메일 본문에 그대로 붙여 넣어도 깨지지 않고, 받는 사람 쪽에서 이미지 차단에 걸리지 않는다.
 */
import { COLORS as C, CATEGORY_COLORS } from "@/config/brand";
import { FONT, css, t, table, td, tr } from "./inline";

const text = (size: number, color: string = C.ink, extra: Record<string, string | number> = {}) => ({
  fontSize: size,
  lineHeight: `${Math.round(size * 1.5)}px`,
  color,
  ...extra,
});

/** 막대 한 칸 (높이는 font-size 1px 로 고정해 아웃룩이 줄 높이를 늘리지 못하게 함) */
const bar = (width: number, color: string, height: number) =>
  width > 0
    ? td("&nbsp;", { width, bgcolor: color, style: { width, height, fontSize: 1, lineHeight: `${height}px` } })
    : "";

const w = (n: number) => Math.max(0, Math.round(n));

export interface Datum {
  label: string;
  value: number;
}

/** 가로 막대: 라벨 | 막대 | 값 */
export function hbarChart(data: Datum[], opts: { width: number; color?: string; unit?: string; labelWidth?: number } = { width: 576 }): string {
  if (!data.length) return "";
  const labelW = opts.labelWidth ?? 150;
  const valueW = 44;
  const area = opts.width - labelW - valueW - 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const rows = data.map((d) => {
    const filled = w((d.value / max) * area);
    const barCell = table(tr(bar(filled, opts.color ?? C.brand, 14) + td("", { style: { width: Math.max(0, area - filled), height: 14, fontSize: 1 } })), { width: area });
    return tr(
      td(t(d.label), { width: labelW, valign: "middle", style: { ...text(12, C.ink), padding: "4px 8px 4px 0" } }) +
        td(barCell, { width: area, valign: "middle", style: { padding: "4px 0" } }) +
        td(`${d.value}${opts.unit ?? ""}`, { width: valueW, valign: "middle", style: { ...text(12, C.sub, { fontWeight: "bold" }), padding: "4px 0 4px 8px" } }),
    );
  });
  return table(rows.join(""), { width: opts.width });
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** 누적 막대 한 줄 + 범례 (비율 구성) */
export function stackedBar(segments: Segment[], opts: { width: number; height?: number; showCounts?: boolean }): string {
  const segs = segments.filter((s) => s.value > 0);
  const total = segs.reduce((n, s) => n + s.value, 0);
  if (!total) return "";
  const h = opts.height ?? 22;
  let used = 0;
  const cells = segs.map((s, i) => {
    const px = i === segs.length - 1 ? opts.width - used : w((s.value / total) * opts.width);
    used += px;
    const label = px >= 28 ? `<span style="${css(text(11, "#FFFFFF", { fontWeight: "bold", lineHeight: `${h}px` }))}">${s.value}</span>` : "&nbsp;";
    return td(label, { width: px, bgcolor: s.color, align: "center", valign: "middle", style: { width: px, height: h, fontSize: 11, lineHeight: `${h}px` } });
  });
  const legend = segs
    .map(
      (s) =>
        `<span style="${css({ color: s.color, fontSize: 12 })}">■</span>&nbsp;<span style="${css(text(12, C.sub))}">${t(s.label)}${opts.showCounts === false ? "" : ` ${s.value} (${Math.round((s.value / total) * 100)}%)`}</span>`,
    )
    .join("&nbsp;&nbsp;&nbsp; ");
  return table(
    tr(td(table(tr(cells.join("")), { width: opts.width }), { style: { paddingBottom: 6 } })) +
      tr(td(legend, { style: { ...text(12, C.sub), lineHeight: "20px" } })),
    { width: opts.width },
  );
}

/** 호별 누적 막대: 행 = 호, 구간 = 카테고리 (추세) */
export function trendStack(
  rows: { label: string; current?: boolean; segments: { label: string; value: number }[] }[],
  opts: { width: number },
): string {
  if (!rows.length) return "";
  const labelW = 64;
  const totalW = 40;
  const area = opts.width - labelW - totalW - 12;
  const max = Math.max(...rows.map((r) => r.segments.reduce((n, s) => n + s.value, 0)), 1);
  const legendItems = new Map<string, string>();
  const body = rows.map((r) => {
    const total = r.segments.reduce((n, s) => n + s.value, 0);
    const segs = r.segments.filter((s) => s.value > 0);
    let used = 0;
    const full = w((total / max) * area);
    const cells = segs.map((s, i) => {
      const px = i === segs.length - 1 ? full - used : w((s.value / total) * full);
      used += px;
      const color = CATEGORY_COLORS[s.label] ?? "#999999";
      legendItems.set(s.label, color);
      return td(px >= 18 ? `<span style="${css(text(10, "#FFFFFF", { fontWeight: "bold", lineHeight: "16px" }))}">${s.value}</span>` : "&nbsp;", {
        width: px, bgcolor: color, align: "center", valign: "middle", style: { width: px, height: 16, fontSize: 10, lineHeight: "16px" },
      });
    });
    const bars = total ? table(tr(cells.join("") + td("", { style: { width: Math.max(0, area - full), fontSize: 1 } })), { width: area }) : "";
    return tr(
      td(t(r.label), { width: labelW, valign: "middle", style: { ...text(12, r.current ? C.brand : C.ink, { fontWeight: r.current ? "bold" : "normal" }), padding: "4px 8px 4px 0" } }) +
        td(bars, { width: area, valign: "middle", style: { padding: "4px 0" } }) +
        td(`${total}건`, { width: totalW, valign: "middle", style: { ...text(12, C.sub), padding: "4px 0 4px 8px" } }),
    );
  });
  const legend = [...legendItems]
    .map(([label, color]) => `<span style="${css({ color, fontSize: 12 })}">■</span>&nbsp;<span style="${css(text(12, C.sub))}">${t(label)}</span>`)
    .join("&nbsp;&nbsp;&nbsp; ");
  return table(body.join("") + tr(td(legend, { colspan: 3, style: { ...text(12, C.sub), lineHeight: "20px", paddingTop: 6 } })), { width: opts.width });
}

/** "#RRGGBB" 두 색을 t(0~1) 비율로 섞는다 */
export function mix(from: string, to: string, tt: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(from), p(to)];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * tt).toString(16).padStart(2, "0")).join("");
}

/** 히트맵: 행 = 키워드, 열 = 호. 칸 색의 진하기 = 건수 */
export function heatmap(
  rows: { label: string; counts: number[] }[],
  columns: { label: string; current?: boolean }[],
  opts: { width: number; color?: string },
): string {
  if (!rows.length || !columns.length) return "";
  const labelW = 130;
  const cellW = Math.min(64, Math.floor((opts.width - labelW) / columns.length));
  const max = Math.max(...rows.flatMap((r) => r.counts), 1);
  const base = opts.color ?? C.brand;
  const head = tr(
    td("", { width: labelW }) +
      columns.map((c) => td(t(c.label), { width: cellW, align: "center", style: { ...text(11, c.current ? C.brand : C.sub, { fontWeight: c.current ? "bold" : "normal" }), padding: "0 0 4px" } })).join(""),
  );
  const body = rows.map((r) =>
    tr(
      td(t(r.label), { width: labelW, valign: "middle", style: { ...text(12), padding: "2px 8px 2px 0" } }) +
        r.counts
          .map((n) => {
            const level = n === 0 ? 0 : 0.3 + 0.7 * (n / max);
            const bg = n === 0 ? C.soft : mix("#FFFFFF", base, level);
            return td(n ? `<b>${n}</b>` : "&nbsp;", {
              width: cellW, bgcolor: bg, align: "center", valign: "middle",
              style: { ...text(12, level > 0.55 ? "#FFFFFF" : C.ink), height: 24, border: "2px solid #FFFFFF" },
            });
          })
          .join(""),
    ),
  );
  return table(head + body.join(""), { width: labelW + cellW * columns.length, style: { fontFamily: FONT } });
}
