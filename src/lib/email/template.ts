import { BRAND, CATEGORY_COLORS, COLORS as C, NEUTRALS, issueLabel } from "@/config/brand";
import type { Article, ReportContent } from "@/lib/types";
import { heatmap, hbarChart, legend, stackedBar, statTiles, themeMatrix, trendStack } from "./charts";
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

function bullets(items: string[], mark = "·", color: string = C.ink): string {
  return table(
    items
      .map((it) =>
        tr(
          td(mark, { width: 16, style: { ...txt(14, C.sub), paddingTop: 5 } }) + td(t(it), { style: { ...txt(14, color), paddingTop: 5 } }),
        ),
      )
      .join(""),
  );
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

function header(c: ReportContent, m: RenderMeta): string {
  return (
    row("&nbsp;", { bgcolor: C.brand, style: { height: 4, fontSize: 1, lineHeight: "4px" } }) +
    row(
      table(
        tr(
          td(
            `<span style="${css(txt(12, C.sub, { fontWeight: "bold", letterSpacing: "0.5px" }))}">${t(m.feedbackContact)} &nbsp;|&nbsp; ${t(BRAND.kind)}</span><br>` +
              `<span style="${css({ fontSize: 30, lineHeight: "40px", fontWeight: "bold", color: C.ink, letterSpacing: "-0.5px" })}">${t(m.newsletterName)}</span>`,
            { valign: "bottom", style: { paddingBottom: 16 } },
          ) +
            td(
              `<span style="${css({ fontSize: 30, lineHeight: "40px", fontWeight: "bold", color: C.brand })}">${issueLabel(m.issueNo)}</span><br>` +
                `<span style="${css(txt(12, C.sub))}">${dotDate(m.publishDate)} 발행${m.audience ? `<br>배포 대상 ${t(m.audience)}` : ""}</span>`,
              { align: "right", valign: "bottom", width: 170, style: { paddingBottom: 16 } },
            ),
        ) +
          row(t(c.headline), { colspan: 2, style: { ...txt(19, C.ink, { fontWeight: "bold", lineHeight: "30px" }), paddingTop: 14, borderTop: `1px solid ${C.line}` } }),
      ),
      { style: { padding: `22px ${PAD}px 20px`, borderBottom: `1px solid ${C.line}` } },
    )
  );
}

/** 핵심 수치 줄: 한눈에 보는 규모 */
function kpis(c: ReportContent, m: RenderMeta): string {
  const s = c.stats;
  if (!s) return "";
  const kr = s.byRegion.find((x) => x.label === "국내")?.count ?? 0;
  const gl = s.byRegion.find((x) => x.label === "해외")?.count ?? 0;
  const sources = new Set(m.articles.map((a) => a.source)).size;
  return statTiles(
    [
      { value: `${s.total}건`, label: "선정 기사", sub: `${sources}개 매체` },
      { value: `${c.themes.length}개`, label: "핵심 주제", sub: "기사를 묶어 분석" },
      { value: `${kr} : ${gl}`, label: "국내 : 해외", sub: "기사 수 비율" },
      { value: `${s.repeat.followUp}건`, label: "지난 호 연관", sub: `신규 ${s.repeat.fresh}건` },
    ],
    { width: INNER },
  );
}

function summary(c: ReportContent): string {
  return table(
    row(heading("■", "핵심 요약")) +
      row(bullets(c.executiveSummary, "▪"), {
        bgcolor: C.soft,
        style: { padding: "12px 16px 14px", borderLeft: `3px solid ${C.brand}` },
      }),
  );
}

/** 이번 호 한눈에: 구성 인포그래픽 */
function overview(c: ReportContent): string {
  const s = c.stats;
  if (!s || !s.total) return "";
  const cat = s.byCategory.map((x) => ({ label: x.label, value: x.count, color: CATEGORY_COLORS[x.label] ?? CATEGORY_COLORS["기타"] }));
  // 국내·해외, 지난 호와의 관계는 카테고리 색과 섞이지 않게 회색과 강조색만 사용 (강조 = 지난 호에서 이어지는 이야기)
  const region = s.byRegion.map((x, i) => ({ label: x.label, value: x.count, color: i === 0 ? NEUTRALS.strong : NEUTRALS.mid }));
  const rep = [
    { label: "지난 호와 연관·후속", value: s.repeat.followUp, color: C.brand },
    { label: "신규 주제", value: s.repeat.fresh, color: NEUTRALS.mid },
    { label: "중복 가능", value: s.repeat.duplicate, color: NEUTRALS.light },
  ];
  const kw = s.topKeywords.map((k) => ({ label: k.label, value: k.count, color: k.seenBefore ? C.brand : NEUTRALS.mid }));
  const kwLegend = s.trend.issues.length > 1 ? legend([{ label: "지난 호에서도 등장", color: C.brand }, { label: "이번 호 처음", color: NEUTRALS.mid }]) : "";
  return table(
    row(heading("■", "이번 호 한눈에")) +
      spacer(14) +
      row(sub("카테고리 구성"), { style: { paddingBottom: 6 } }) +
      row(stackedBar(cat, { width: INNER })) +
      spacer(16) +
      row(
        table(
          tr(
            td(sub("국내·해외") + "<br>" + stackedBar(region, { width: 270 }), { width: 288, valign: "top" }) +
              td(sub("지난 호와의 관계") + "<br>" + stackedBar(rep, { width: 270 }), { width: 288, valign: "top" }),
          ),
        ),
      ) +
      (kw.length
        ? spacer(18) +
          row(sub("많이 언급된 기업·기술"), { style: { paddingBottom: 6 } }) +
          row(hbarChart(kw, { width: INNER, unit: "건" })) +
          (kwLegend ? row(kwLegend, { style: { paddingTop: 6 } }) : "")
        : ""),
  );
}

function themes(c: ReportContent, m: RenderMeta, refNo: Map<string, number>, byId: Map<string, RenderMeta["articles"][number]>): string {
  const blocks = c.themes.map((th, i) => {
    const refs = refLinks(th.sourceArticleIds, refNo, byId);
    return (
      spacer(i === 0 ? 14 : 26) +
      row(`<span style="${css({ color: C.brand })}">${i + 1}.</span> ${t(th.title)}`, { style: txt(17, C.ink, { fontWeight: "bold", lineHeight: "27px" }) }) +
      row(t(th.lead), { style: { ...txt(14, C.sub), paddingTop: 6 } }) +
      th.body.map((p) => row(t(p), { style: { ...txt(14), paddingTop: 10 } })).join("") +
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
  const matrix =
    c.themes.length > 1 && m.articles.length > 1
      ? spacer(14) +
        row(sub("주제와 근거 기사의 연결"), { style: { paddingBottom: 6 } }) +
        row(
          themeMatrix(
            m.articles.map((a, i) => ({ id: a.id, no: i + 1, title: a.title, href: a.link })),
            c.themes,
            { width: INNER, anchor: (txt_, href) => link(txt_, href, { color: C.ink, textDecoration: "underline" }) },
          ),
        )
      : "";
  return table(row(heading("■", "핵심 인사이트")) + matrix + blocks.join(""));
}

function trend(c: ReportContent): string {
  const s = c.stats;
  const hasHistory = !!s && s.trend.issues.length > 1;
  const charts = hasHistory
    ? spacer(14) +
      row(sub("호별 카테고리 추이"), { style: { paddingBottom: 6 } }) +
      row(
        trendStack(
          s.trend.issues.map((iss, idx) => ({
            label: issueLabel(iss.no),
            current: iss.current,
            segments: s.trend.category.map((cat) => ({ label: cat.label, value: cat.counts[idx] ?? 0 })),
          })),
          { width: INNER },
        ),
      ) +
      (s.trend.keywords.length
        ? spacer(20) +
          row(sub("키워드 호별 등장 (건수)"), { style: { paddingBottom: 6 } }) +
          row(heatmap(s.trend.keywords, s.trend.issues.map((i) => ({ label: issueLabel(i.no), current: i.current })), { width: INNER }))
        : "")
    : "";
  return table(
    row(heading("■", "추세 분석")) +
      row(t(c.trend.overview), { style: { ...txt(14), paddingTop: 12 } }) +
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

/** 메일 본문에 붙여 넣을 리포트 (단일 테이블, 이미지 없음) */
export function renderFragment(c: ReportContent, m: RenderMeta): string {
  const refNo = new Map(m.articles.map((a, i) => [a.id, i + 1]));
  const byId = new Map(m.articles.map((a) => [a.id, a]));
  const block = (content: string, top: number) => (content ? spacer(top) + row(content) : "");
  const frame = table(
    header(c, m) +
      row(
        table(
          block(kpis(c, m), 0) +
            block(summary(c), 28) +
            block(overview(c), 32) +
            block(themes(c, m, refNo, byId), 32) +
            block(trend(c), 32) +
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
  L.push(`${m.feedbackContact} ${m.newsletterName} ${issueLabel(m.issueNo)} (${dotDate(m.publishDate)})`, c.headline, "");
  L.push("[핵심 요약]", ...c.executiveSummary.map((x) => `- ${x}`), "");
  c.themes.forEach((th, i) => {
    const refs = th.sourceArticleIds.map((id) => refNo.get(id)).filter(Boolean).map((n) => `[${n}]`).join(" ");
    L.push(`[핵심 인사이트 ${i + 1}] ${th.title}`, th.lead, ...th.body, ...th.insights.map((x) => `- ${x}`));
    if (th.implications.length) L.push(`${m.audience ?? ""} 시사점`.trim(), ...th.implications.map((x) => `  → ${x}`));
    if (refs) L.push(`근거 기사: ${refs}`);
    L.push("");
  });
  L.push("[추세 분석]", c.trend.overview, ...c.trend.notes.map((x) => `- ${x}`), "");
  L.push("[제언 및 향후 과제]", ...c.recommendations.map((x) => `- ${x}`), ...c.watchList.map((x) => `  ◦ ${x}`), "");
  L.push("[참고 기사]", ...m.articles.map((a, i) => `[${i + 1}] ${a.title} (${a.source}, ${dotDate(a.publishedAt)})\n    ${a.link}`));
  return L.join("\n");
}
