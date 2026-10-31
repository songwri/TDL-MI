/**
 * 아웃룩 호환 인포그래픽: 이미지·SVG·자바스크립트 없이 <table> 셀의 폭과 배경색으로 그린다.
 * 메일 본문에 그대로 붙여 넣어도 깨지지 않고, 받는 사람 쪽에서 이미지 차단에 걸리지 않는다.
 * 색과 형식은 데이터 시각화 스킬의 규칙을 따른다: 얇은 막대, 조각 사이 2px 간격, 막대 안 숫자는 들어갈 때만, 항상 범례.
 */
import { CATEGORY_COLORS, COLORS as C, RAMP } from "@/config/brand";
import { FONT, css, t, table, td, tr } from "./inline";

const text = (size: number, color: string = C.ink, extra: Record<string, string | number> = {}) => ({
  fontSize: size,
  lineHeight: `${Math.round(size * 1.5)}px`,
  color,
  ...extra,
});

const w = (n: number) => Math.max(0, Math.round(n));
const SURFACE = "#FFFFFF";
const GAP = `2px solid ${SURFACE}`; // 조각 사이 간격은 테두리가 아니라 바탕색 선

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/**
 * 채운 색 위에 쓸 글자색: 흰색이 기본이고, 흰색 대비가 2.3:1 아래인 밝은 색(노랑 등)에서만 검정 (스킬 규칙)
 */
export function inkFor(bg: string): string {
  const whiteContrast = 1.05 / (lum(bg) + 0.05);
  return whiteContrast >= 2.3 ? "#FFFFFF" : "#0B0B0B";
}

const cell = (width: number, color: string, height: number, label = "", first = false) =>
  width > 0
    ? td(label || "&nbsp;", {
        width,
        bgcolor: color,
        align: "center",
        valign: "middle",
        style: { width, height, fontSize: label ? 11 : 1, lineHeight: `${height}px`, fontWeight: "bold", color: inkFor(color), borderLeft: first ? "0" : GAP },
      })
    : "";

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

/** 가로 막대: 라벨 | 막대 | 값. 항목마다 색을 줄 수 있다(강조형) */
export function hbarChart(data: Datum[], opts: { width: number; color?: string; unit?: string; labelWidth?: number } = { width: 576 }): string {
  if (!data.length) return "";
  const labelW = opts.labelWidth ?? 150;
  const valueW = 44;
  const area = opts.width - labelW - valueW - 12;
  const max = Math.max(...data.map((d) => d.value), 1);
  const rows = data.map((d) => {
    const filled = w((d.value / max) * area);
    const barCell = table(tr(cell(filled, d.color ?? opts.color ?? C.brand, 12, "", true) + td("", { style: { width: Math.max(0, area - filled), height: 12, fontSize: 1 } })), { width: area });
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

/** 범례: 색 사각형 + 이름 (+ 건수·비율) */
export function legend(items: { label: string; color: string; value?: number; total?: number }[]): string {
  return items
    .map(
      (s) =>
        `<span style="${css({ color: s.color, fontSize: 12 })}">■</span>&nbsp;<span style="${css(text(12, C.sub))}">${t(s.label)}${
          s.value !== undefined ? ` ${s.value}${s.total ? ` (${Math.round((s.value / s.total) * 100)}%)` : ""}` : ""
        }</span>`,
    )
    .join("&nbsp;&nbsp;&nbsp; ");
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
    return cell(px, s.color, h, px >= 30 ? String(s.value) : "", i === 0);
  });
  return table(
    tr(td(table(tr(cells.join("")), { width: opts.width }), { style: { paddingBottom: 6 } })) +
      tr(td(legend(segs.map((s) => ({ label: s.label, color: s.color, value: opts.showCounts === false ? undefined : s.value, total })), ), { style: { ...text(12, C.sub), lineHeight: "20px" } })),
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
      const color = CATEGORY_COLORS[s.label] ?? CATEGORY_COLORS["기타"];
      legendItems.set(s.label, color);
      return cell(px, color, 16, px >= 18 ? String(s.value) : "", i === 0);
    });
    const bars = total ? table(tr(cells.join("") + td("", { style: { width: Math.max(0, area - full), fontSize: 1 } })), { width: area }) : "";
    return tr(
      td(t(r.label), { width: labelW, valign: "middle", style: { ...text(12, r.current ? C.brand : C.ink, { fontWeight: r.current ? "bold" : "normal" }), padding: "4px 8px 4px 0" } }) +
        td(bars, { width: area, valign: "middle", style: { padding: "3px 0" } }) +
        td(`${total}건`, { width: totalW, valign: "middle", style: { ...text(12, C.sub), padding: "4px 0 4px 8px" } }),
    );
  });
  const lg = legend([...legendItems].map(([label, color]) => ({ label, color })));
  return table(body.join("") + tr(td(lg, { colspan: 3, style: { ...text(12, C.sub), lineHeight: "20px", paddingTop: 6 } })), { width: opts.width });
}

/** "#RRGGBB" 두 색을 t(0~1) 비율로 섞는다 */
export function mix(from: string, to: string, tt: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(from), p(to)];
  return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * tt).toString(16).padStart(2, "0")).join("");
}

/** 크기 → 파랑 한 가지 색의 단계 (0건은 바탕과 같은 연회색) */
export function rampColor(n: number, max: number): string {
  if (n <= 0) return C.soft;
  return RAMP[Math.min(RAMP.length - 1, Math.round(((n - 1) / Math.max(max - 1, 1)) * (RAMP.length - 1)))];
}

/** 히트맵: 행 = 키워드, 열 = 호. 칸 색의 진하기 = 건수 */
export function heatmap(
  rows: { label: string; counts: number[] }[],
  columns: { label: string; current?: boolean }[],
  opts: { width: number },
): string {
  if (!rows.length || !columns.length) return "";
  const labelW = 130;
  const cellW = Math.min(64, Math.floor((opts.width - labelW) / columns.length));
  const max = Math.max(...rows.flatMap((r) => r.counts), 1);
  const head = tr(
    td("", { width: labelW }) +
      columns.map((c) => td(t(c.label), { width: cellW, align: "center", style: { ...text(11, c.current ? C.brand : C.sub, { fontWeight: c.current ? "bold" : "normal" }), padding: "0 0 4px" } })).join(""),
  );
  const body = rows.map((r) =>
    tr(
      td(t(r.label), { width: labelW, valign: "middle", style: { ...text(12), padding: "2px 8px 2px 0" } }) +
        r.counts
          .map((n) => {
            const bg = rampColor(n, max);
            return td(n ? `<b>${n}</b>` : "&nbsp;", {
              width: cellW, bgcolor: bg, align: "center", valign: "middle",
              style: { ...text(12, n ? (RAMP.indexOf(bg as (typeof RAMP)[number]) >= 3 ? "#FFFFFF" : "#0B0B0B") : C.ink), height: 24, border: GAP },
            });
          })
          .join(""),
    ),
  );
  const scale = `<span style="${css(text(11, C.mute))}">적음</span> ${RAMP.map((c) => `<span style="${css({ color: c, fontSize: 13 })}">■</span>`).join("")} <span style="${css(text(11, C.mute))}">많음</span>`;
  return table(head + body.join("") + tr(td(scale, { colspan: columns.length + 1, style: { paddingTop: 6 } })), { width: labelW + cellW * columns.length, style: { fontFamily: FONT } });
}

/** 핵심 수치 타일 (KPI 줄) */
export function statTiles(tiles: { value: string; label: string; sub?: string }[], opts: { width: number }): string {
  const n = tiles.length;
  const tileW = Math.floor(opts.width / n);
  return table(
    tr(
      tiles
        .map((x, i) =>
          td(
            `<span style="${css({ fontSize: 28, lineHeight: "32px", fontWeight: "bold", color: C.ink })}">${t(x.value)}</span><br>` +
              `<span style="${css(text(12, C.sub, { fontWeight: "bold" }))}">${t(x.label)}</span>` +
              (x.sub ? `<br><span style="${css(text(11, C.mute))}">${t(x.sub)}</span>` : ""),
            { width: tileW, valign: "top", style: { padding: "12px 14px 12px", borderTop: `2px solid ${C.ink}`, borderLeft: i ? `1px solid ${C.line}` : "0", backgroundColor: C.paper } },
          ),
        )
        .join(""),
    ),
    { width: opts.width },
  );
}

/** 기사 × 주제 연결표: 어느 기사가 어느 주제의 근거인지 ● 로 표시 (웹 화면 '인사이트 맵'의 메일용 버전) */
export function themeMatrix(
  articles: { id: string; no: number; title: string; href: string }[],
  themes: { title: string; sourceArticleIds: string[] }[],
  opts: { width: number; anchor: (text: string, href: string) => string },
): string {
  if (!articles.length || !themes.length) return "";
  const colW = 52;
  const firstW = opts.width - colW * themes.length;
  const head = tr(
    td("근거 기사", { width: firstW, valign: "bottom", style: { ...text(12, C.sub, { fontWeight: "bold" }), padding: "0 8px 6px 0" } }) +
      themes
        .map((_, i) => td(`주제 ${i + 1}`, { width: colW, align: "center", valign: "bottom", style: { ...text(12, C.sub, { fontWeight: "bold" }), padding: "0 0 6px" } }))
        .join(""),
  );
  const short = (x: string) => (x.length > 46 ? x.slice(0, 45) + "…" : x);
  const rows = articles.map((a) =>
    tr(
      td(`<span style="${css(text(12, C.mute))}">[${a.no}]</span> ${opts.anchor(t(short(a.title)), a.href)}`, {
        width: firstW, valign: "middle", style: { ...text(12), padding: "5px 8px 5px 0", borderTop: `1px solid ${C.line}` },
      }) +
        themes
          .map((th) =>
            td(th.sourceArticleIds.includes(a.id) ? `<span style="${css({ color: RAMP[5], fontSize: 14 })}">●</span>` : "&nbsp;", {
              width: colW, align: "center", valign: "middle", style: { ...text(12), borderTop: `1px solid ${C.line}` },
            }),
          )
          .join(""),
    ),
  );
  const names = themes.map((th, i) => `<b>주제 ${i + 1}</b> ${t(th.title)}`).join("<br>");
  return table(head + rows.join("") + tr(td(names, { colspan: themes.length + 1, style: { ...text(12, C.sub), paddingTop: 8, borderTop: `1px solid ${C.line}` } })), { width: opts.width });
}
