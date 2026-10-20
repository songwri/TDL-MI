/**
 * 아웃룩(Word 렌더링 엔진) 호환 HTML 생성 유틸리티.
 * - 클래스/외부 CSS 대신 모든 스타일을 인라인 style 로 출력
 * - 레이아웃은 <table> 로만 구성, 폭·배경은 HTML 속성(width/bgcolor)도 함께 지정
 */
import { escapeHtml } from "@/lib/utils/text";

export type Style = Record<string, string | number | undefined>;

export const FONT = "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo',Arial,Helvetica,sans-serif";

export function css(style: Style): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${typeof v === "number" ? `${v}px` : v}`)
    .join(";");
}

type Attrs = Record<string, string | number | undefined>;

function attrs(a: Attrs = {}): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${escapeHtml(String(v))}"`)
    .join("");
}

export function table(rows: string, opts: { width?: string | number; bgcolor?: string; style?: Style; align?: string } = {}): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${attrs({
    width: opts.width ?? "100%",
    bgcolor: opts.bgcolor,
    align: opts.align,
  })} style="${css({ borderCollapse: "collapse", msoTableLspace: "0pt", msoTableRspace: "0pt", ...opts.style })}">${rows}</table>`;
}

export function tr(cells: string): string {
  return `<tr>${cells}</tr>`;
}

export function td(content: string, opts: { style?: Style; bgcolor?: string; width?: string | number; align?: string; valign?: string; colspan?: number } = {}): string {
  return `<td${attrs({
    bgcolor: opts.bgcolor,
    width: opts.width,
    align: opts.align,
    valign: opts.valign ?? "top",
    colspan: opts.colspan,
  })} style="${css({ fontFamily: FONT, msoLineHeightRule: "exactly", ...opts.style })}">${content}</td>`;
}

/** 한 줄짜리 행: <tr><td>...</td></tr> */
export function row(content: string, opts: Parameters<typeof td>[1] = {}): string {
  return tr(td(content, opts));
}

export function link(text: string, href: string, style: Style = {}): string {
  return `<a href="${escapeHtml(href)}" target="_blank" style="${css({ textDecoration: "none", ...style })}">${text}</a>`;
}

export function spacer(h: number): string {
  return row("&nbsp;", { style: { height: h, fontSize: 1, lineHeight: `${h}px` } });
}

export const t = escapeHtml;
