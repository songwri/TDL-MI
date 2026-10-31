import { BRAND, COLORS as C, issueLabel } from "@/config/brand";
import { MARK, MARK_ALT, MARK_DISPLAY } from "@/lib/brand/mark";
import type { Article, ReportContent } from "@/lib/types";
import type { ChartId } from "@/lib/charts/svg";
import { parseRich, plainRich, stripRich } from "@/lib/report/rich";
import { heatmap, themeMatrix, trendStack } from "./charts";
import { FONT, css, link, row, spacer, t, table, td, tr } from "./inline";

export interface RenderMeta {
  issueNo: number;
  publishDate: string; // YYYY-MM-DD
  /** 리포트 이름 (예: TDL Trend) */
  newsletterName: string;
  tagline: string;
  /** 발행 조직 (예: 테크이노베이션팀) */
  feedbackContact: string;
  feedbackEmail?: string;
  /** 배포 대상 (예: CL사업부) */
  audience?: string;
  /** 선정 기사 (참고 기사 목록과 [번호] 링크의 원본). 선택 순서 = 번호 */
  articles: Pick<Article, "id" | "title" | "source" | "link" | "publishedAt" | "region">[];
  /** 있으면 인포그래픽을 이미지로 넣는다 (없으면 표로 그린 차트). src 는 PNG 주소, height 는 표시 높이 */
  charts?: Partial<Record<ChartId, { src: string; height: number; alt: string }>>;
  /** TDL TREND REPORT 마크 이미지 주소. 없으면 같은 모양을 글자로 그린다 */
  markSrc?: string;
}

/** 메일 본문 폭: 640px 프레임, 본문 576px */
const WIDTH = 640;
const PAD = 32;
const INNER = WIDTH - PAD * 2;

const txt = (size: number, color: string = C.ink, extra: Record<string, string | number> = {}) => ({
  fontSize: size,
  lineHeight: `${Math.round(size * 1.7)}px`,
  color,
  ...extra,
});

const dotDate = (d: string) => d.slice(0, 10).replaceAll("-", ".");

/** 섹션 제목: 번호 + 제목 + 아래 실선 */
function heading(no: string, title: string): string {
  return table(
    row(`<span style="${css({ color: C.brand })}">${t(no)}</span>&nbsp;&nbsp;${t(title)}`, {
      style: { ...txt(16, C.ink, { fontWeight: "bold" }), paddingBottom: 8, borderBottom: `1px solid ${C.ink}` },
    }),
  );
}

function sub(title: string): string {
  return `<span style="${css(txt(13, C.ink, { fontWeight: "bold" }))}">${t(title)}</span>`;
}

/** 핵심 구절 하이라이트: **구절** → 형광펜 표시 (굵게 + 연노랑 바탕). 바탕을 못 그리는 메일 앱에서도 굵게는 남는다 */
const HL_BG = "#FFEDA8";
function rich(s: string): string {
  return parseRich(s)
    .map((p) => (p.hl ? `<span style="${css({ backgroundColor: HL_BG, fontWeight: "bold", color: C.ink, padding: "0 2px" })}">${t(p.text)}</span>` : t(p.text)))
    .join("");
}

function bullets(items: string[], mark = "·", color: string = C.ink): string {
  return table(
    items
      .map((it) =>
        tr(
          td(mark, { width: 16, style: { ...txt(14, C.sub), paddingTop: 5 } }) + td(rich(it), { style: { ...txt(14, color), paddingTop: 5 } }),
        ),
      )
      .join(""),
  );
}

/** 인포그래픽: 이미지 모드면 PNG, 아니면 표로 그린 차트 */
function figure(m: RenderMeta, id: ChartId, fallback: () => string): string {
  const ch = m.charts?.[id];
  if (!ch) return fallback();
  return `<img src="${t(ch.src)}" width="${INNER}" height="${ch.height}" alt="${t(ch.alt)}" style="${css({ display: "block", width: INNER, maxWidth: "100%", height: "auto", border: 0, outline: "none" })}">`;
}

/** 근거 기사 번호: [1] [3] 각각 원문으로 연결 */
function refLinks(ids: string[], refNo: Map<string, number>, byId: Map<string, RenderMeta["articles"][number]>): string {
  const parts = ids
    .map((id) => ({ n: refNo.get(id), a: byId.get(id) }))
    .filter((x): x is { n: number; a: RenderMeta["articles"][number] } => !!x.n && !!x.a)
    .sort((a, b) => a.n - b.n)
    .map((x) => link(`[${x.n}]`, x.a.link, { color: C.brand, fontWeight: "bold" }));
  return parts.join("&nbsp; ");
}

/* ── 섹션 ───────────────────────────────────────────── */

/** TDL TREND REPORT 마크: 이미지(기본) 또는 이미지를 못 쓰는 환경용 글자 버전 */
function mark(m: RenderMeta): string {
  const { width, height } = MARK_DISPLAY;
  if (m.markSrc)
    return `<img src="${t(m.markSrc)}" width="${width}" height="${height}" alt="${MARK_ALT}" style="${css({ display: "block", width, height, border: 0, outline: "none" })}">`;
  return table(
    row(
      `<span style="${css({ fontSize: 34, lineHeight: "36px", fontWeight: "bold", color: MARK.fg, letterSpacing: "1px" })}">TDL</span><br>` +
        `<span style="${css({ fontSize: 9, lineHeight: "14px", fontWeight: "bold", color: MARK.fg, letterSpacing: "1.6px" })}">TREND REPORT</span>`,
      { bgcolor: MARK.bg, align: "right", style: { padding: "0" } },
    ),
    { width: 96 }, // 글자 TDL 폭에 맞춰 TREND REPORT 를 오른쪽 끝에 붙임
  );
}

function header(c: ReportContent, m: RenderMeta): string {
  const theme = c.issueTheme?.trim();
  return row(
    table(
      tr(
        td(mark(m), { valign: "top", width: MARK_DISPLAY.width }) +
          td(
            `<span style="${css({ fontSize: 26, lineHeight: "32px", fontWeight: "bold", color: C.brand })}">${issueLabel(m.issueNo)}</span><br>` +
              `<span style="${css(txt(12, C.sub))}">${dotDate(m.publishDate)} 발행${m.audience ? ` · 배포 대상 ${t(m.audience)}` : ""}</span><br>` +
              `<span style="${css(txt(11, C.mute, { letterSpacing: "0.3px" }))}">${t(m.feedbackContact)} · ${t(BRAND.kind)}</span>`,
            { align: "right", valign: "bottom" },
          ),
      ) +
        (theme
          ? row(`<span style="${css(txt(12, C.brand, { fontWeight: "bold", letterSpacing: "1px" }))}">이번 호 주제</span>`, { colspan: 2, style: { paddingTop: 26 } }) +
            row(t(theme), { colspan: 2, style: { fontSize: 32, lineHeight: "42px", fontWeight: "bold", color: C.ink, letterSpacing: "-0.8px" } }) +
            row(t(c.headline), { colspan: 2, style: { ...txt(16, C.sub, { lineHeight: "26px" }), paddingTop: 6 } })
          : row(t(c.headline), { colspan: 2, style: { ...txt(24, C.ink, { fontWeight: "bold", lineHeight: "34px" }), paddingTop: 24 } })),
    ),
    { style: { padding: `28px ${PAD}px 24px`, borderTop: `4px solid ${C.brand}`, borderBottom: `1px solid ${C.line}` } },
  );
}

const NOTE_BG = "#161616";

/** 테크이노베이션팀의 한마디: 맨 위에서 가장 눈에 띄는 발행팀 메시지 (어두운 바탕) */
function teamNote(c: ReportContent, m: RenderMeta): string {
  if (!c.teamNote?.trim()) return "";
  return table(
    row(
      table(
        tr(
          td(`<span style="${css({ fontSize: 44, lineHeight: "40px", fontWeight: "bold", color: "#E0675B", fontFamily: "Georgia, serif" })}">&ldquo;</span>`, { width: 40, valign: "top" }) +
            td(
              `<span style="${css(txt(12, "#E0675B", { fontWeight: "bold", letterSpacing: "1px" }))}">${t(m.feedbackContact)}의 한마디</span><br>` +
                `<span style="${css(txt(16, "#FFFFFF", { lineHeight: "28px" }))}">${t(stripRich(c.teamNote))}</span>`,
              { valign: "top" },
            ),
        ) + row(`<span style="${css(txt(12, "#B5B5B5"))}">&mdash; ${t(m.feedbackContact)} 드림</span>`, { colspan: 2, align: "right", style: { paddingTop: 8 } }),
      ),
      { bgcolor: NOTE_BG, style: { padding: "20px 24px 18px" } },
    ),
  );
}

function summary(c: ReportContent): string {
  const conclusion = c.keyTakeaway?.trim()
    ? row(
        `<span style="${css(txt(11, C.brand, { fontWeight: "bold", letterSpacing: "0.5px" }))}">한 줄 결론</span><br>` +
          `<span style="${css(txt(17, C.ink, { fontWeight: "bold", lineHeight: "27px" }))}">${t(stripRich(c.keyTakeaway))}</span>`,
        { style: { padding: "14px 0 4px" } },
      )
    : "";
  return table(
    row(heading("■", "핵심 요약")) +
      conclusion +
      spacer(10) +
      row(bullets(c.executiveSummary, "▪"), {
        bgcolor: C.soft,
        style: { padding: "12px 16px 14px", borderLeft: `3px solid ${C.brand}` },
      }),
  );
}

function themes(c: ReportContent, m: RenderMeta, refNo: Map<string, number>, byId: Map<string, RenderMeta["articles"][number]>): string {
  const blocks = c.themes.map((th, i) => {
    const refs = refLinks(th.sourceArticleIds, refNo, byId);
    return (
      spacer(i === 0 ? 14 : 30) +
      row(`<span style="${css({ color: C.brand })}">${i + 1}.</span> ${t(th.title)}`, { style: txt(17, C.ink, { fontWeight: "bold", lineHeight: "27px" }) }) +
      (th.takeaway
        ? spacer(8) +
          row(
            table(
              tr(
                td(`<span style="${css(txt(11, "#7A5B00", { fontWeight: "bold" }))}">핵심</span>`, { width: 40, valign: "top", style: { paddingTop: 3 } }) +
                  td(t(stripRich(th.takeaway)), { style: txt(14, C.ink, { fontWeight: "bold" }) }),
              ),
            ),
            { bgcolor: HL_BG, style: { padding: "8px 12px" } },
          )
        : "") +
      row(t(th.lead), { style: { ...txt(14, C.sub), paddingTop: 10 } }) +
      th.body.map((p) => row(rich(p), { style: { ...txt(14), paddingTop: 10 } })).join("") +
      spacer(10) +
      row(sub("핵심 인사이트") + bullets(th.insights, "▪"), { style: { paddingTop: 2 } }) +
      (th.implications.length
        ? spacer(10) +
          row(`<b style="${css({ color: C.brand })}">${m.audience ? `${t(m.audience)} ` : ""}시사점</b>` + bullets(th.implications, "→", C.ink), {
            bgcolor: C.soft,
            style: { padding: "12px 16px 14px", borderLeft: `3px solid ${C.brand}` },
          })
        : "") +
      (refs ? row(`<span style="${css(txt(12, C.mute))}">근거 기사 (원문 링크)</span>&nbsp; ${refs}`, { style: { ...txt(13), paddingTop: 10 } }) : "")
    );
  });
  const map =
    c.themes.length > 1 && m.articles.length > 1
      ? spacer(14) +
        row(sub("주제와 근거 기사의 연결"), { style: { paddingBottom: 8 } }) +
        row(
          figure(m, "map", () =>
            themeMatrix(
              m.articles.map((a, i) => ({ id: a.id, no: i + 1, title: a.title, href: a.link })),
              c.themes,
              { width: INNER, anchor: (txt_, href) => link(txt_, href, { color: C.ink, textDecoration: "underline" }) },
            ),
          ),
        )
      : "";
  return table(row(heading("■", "핵심 인사이트")) + map + blocks.join(""));
}

function trend(c: ReportContent, m: RenderMeta): string {
  const s = c.stats;
  const hasHistory = !!s && s.trend.issues.length > 1;
  const charts = hasHistory
    ? spacer(16) +
      row(sub("호별 카테고리 추이"), { style: { paddingBottom: 8 } }) +
      row(
        figure(m, "trend", () =>
          trendStack(
            s.trend.issues.map((iss, idx) => ({
              label: issueLabel(iss.no),
              current: iss.current,
              segments: s.trend.category.map((cat) => ({ label: cat.label, value: cat.counts[idx] ?? 0 })),
            })),
            { width: INNER },
          ),
        ),
      ) +
      (s.trend.keywords.length
        ? spacer(20) +
          row(sub("키워드 호별 등장 (건수)"), { style: { paddingBottom: 8 } }) +
          row(figure(m, "heatmap", () => heatmap(s.trend.keywords, s.trend.issues.map((i) => ({ label: issueLabel(i.no), current: i.current })), { width: INNER })))
        : "")
    : "";
  return table(
    row(heading("■", "추세 분석")) +
      row(rich(c.trend.overview), { style: { ...txt(14), paddingTop: 12 } }) +
      (c.trend.notes.length ? row(bullets(c.trend.notes, "▪"), { style: { paddingTop: 4 } }) : "") +
      charts,
  );
}

function recommendations(c: ReportContent): string {
  return table(
    row(heading("■", "제언 및 향후 과제")) +
      row(sub("제언"), { style: { paddingTop: 12 } }) +
      row(bullets(c.recommendations, "▪")) +
      (c.watchList.length ? row(sub("다음 호까지 확인할 사항"), { style: { paddingTop: 14 } }) + row(bullets(c.watchList, "◦", C.sub)) : ""),
  );
}

function references(m: RenderMeta): string {
  const head = tr(
    ["No.", "기사 제목 (원문 링크)", "출처", "일자"]
      .map((h, i) => td(h, { width: [36, INNER - 36 - 120 - 76, 120, 76][i], bgcolor: C.head, style: { ...txt(12, C.sub, { fontWeight: "bold" }), padding: "7px 8px", border: `1px solid ${C.line}` } }))
      .join(""),
  );
  const rows = m.articles.map((a, i) =>
    tr(
      [String(i + 1), link(t(a.title), a.link, { color: C.ink, textDecoration: "underline" }), t(a.source), dotDate(a.publishedAt)]
        .map((cell, j) =>
          td(cell, { width: [36, INNER - 36 - 120 - 76, 120, 76][j], style: { ...txt(12, j === 1 ? C.ink : C.sub), padding: "7px 8px", border: `1px solid ${C.line}`, wordBreak: "keep-all" } }),
        )
        .join(""),
    ),
  );
  return table(
    row(heading("■", "참고 기사")) +
      row("본 리포트의 근거 기사입니다. 제목을 누르면 원문으로 이동합니다.", { style: { ...txt(12, C.mute), paddingTop: 8 } }) +
      spacer(8) +
      row(table(head + rows.join(""), { style: { borderCollapse: "collapse" } })),
  );
}

function footer(m: RenderMeta): string {
  return table(
    row(`${t(m.feedbackContact)} · ${t(BRAND.kind)} ${t(m.newsletterName)} ${issueLabel(m.issueNo)}`, { style: { ...txt(12, C.sub, { fontWeight: "bold" }), paddingTop: 14, borderTop: `1px solid ${C.line}` } }) +
      row(
        `${m.audience ? `${t(m.audience)} 내부 공유용 자료입니다. ` : "내부 공유용 자료입니다. "}기사의 저작권은 각 언론사에 있으며, 본 자료의 무단 외부 배포를 금합니다.${m.feedbackEmail ? `<br>문의 및 의견: ${t(m.feedbackEmail)}` : ""}`,
        { style: { ...txt(11, C.mute), paddingTop: 4 } },
      ),
  );
}

/** 메일 본문에 붙여 넣을 리포트 (뼈대는 단일 테이블, 인포그래픽은 이미지 또는 표) */
export function renderFragment(c: ReportContent, m: RenderMeta): string {
  const refNo = new Map(m.articles.map((a, i) => [a.id, i + 1]));
  const byId = new Map(m.articles.map((a) => [a.id, a]));
  const block = (content: string, top: number) => (content ? spacer(top) + row(content) : "");
  const frame = table(
    header(c, m) +
      row(
        table(
          block(teamNote(c, m), 0) +
            block(summary(c), c.teamNote?.trim() ? 32 : 0) +
            block(themes(c, m, refNo, byId), 32) +
            block(trend(c, m), 32) +
            block(recommendations(c), 32) +
            block(references(m), 32) +
            block(footer(m), 28),
        ),
        { style: { padding: `26px ${PAD}px 30px` } },
      ),
    { width: WIDTH, bgcolor: C.paper, align: "center", style: { width: WIDTH, maxWidth: "100%" } },
  );
  return table(row(frame, { align: "center" }), { bgcolor: C.paper });
}

/** 완성된 HTML 문서 (미리보기, 시트 아카이브, HTML 코드 복사용) */
export function renderEmailHtml(c: ReportContent, m: RenderMeta): string {
  return `<!DOCTYPE html>
<html lang="ko" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${t(m.newsletterName)} ${issueLabel(m.issueNo)} - ${t(c.headline)}</title>
<style>
/* 모바일 메일 앱 전용. 아웃룩 데스크톱은 무시하고 인라인 스타일(640px)로 렌더링 */
@media screen and (max-width: 660px) {
  table[width="${WIDTH}"] { width: 100% !important; }
  table[width="${WIDTH}"] > tbody > tr > td { padding-left: 18px !important; padding-right: 18px !important; }
}
</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="${css({ margin: 0, padding: 0, backgroundColor: C.paper, fontFamily: FONT })}">
${renderFragment(c, m)}
</body>
</html>`;
}

/** text/plain 클립보드용 */
export function renderPlainText(c: ReportContent, m: RenderMeta): string {
  const refNo = new Map(m.articles.map((a, i) => [a.id, i + 1]));
  const L: string[] = [];
  L.push(`${m.feedbackContact} ${m.newsletterName} ${issueLabel(m.issueNo)} (${dotDate(m.publishDate)})`);
  if (c.issueTheme) L.push(`이번 호 주제: ${c.issueTheme}`);
  L.push(c.headline, "");
  if (c.teamNote) L.push(`[${m.feedbackContact}의 한마디]`, stripRich(c.teamNote), "");
  if (c.keyTakeaway) L.push(`▶ 한 줄 결론: ${stripRich(c.keyTakeaway)}`, "");
  L.push("[핵심 요약]", ...c.executiveSummary.map((x) => `- ${plainRich(x)}`), "");
  c.themes.forEach((th, i) => {
    const refs = th.sourceArticleIds.map((id) => refNo.get(id)).filter(Boolean).map((n) => `[${n}]`).join(" ");
    L.push(`[핵심 인사이트 ${i + 1}] ${th.title}`, ...(th.takeaway ? [`▶ 핵심: ${stripRich(th.takeaway)}`] : []), th.lead, ...th.body.map(plainRich), ...th.insights.map((x) => `- ${plainRich(x)}`));
    if (th.implications.length) L.push(`${m.audience ?? ""} 시사점`.trim(), ...th.implications.map((x) => `  → ${x}`));
    if (refs) L.push(`근거 기사: ${refs}`);
    L.push("");
  });
  L.push("[추세 분석]", plainRich(c.trend.overview), ...c.trend.notes.map((x) => `- ${plainRich(x)}`), "");
  L.push("[제언 및 향후 과제]", ...c.recommendations.map((x) => `- ${x}`), ...c.watchList.map((x) => `  ◦ ${x}`), "");
  L.push("[참고 기사]", ...m.articles.map((a, i) => `[${i + 1}] ${a.title} (${a.source}, ${dotDate(a.publishedAt)})\n    ${a.link}`));
  return L.join("\n");
}
