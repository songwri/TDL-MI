import { CHARACTER, COLORS as C, PERSONA, SECTIONS, type Pose } from "@/config/brand";
import type { NewsletterContent } from "@/lib/types";
import { FONT, css, link, row, spacer, t, table, td, tr } from "./inline";

export interface RenderMeta {
  issueNo: number;
  publishDate: string; // YYYY-MM-DD
  newsletterName: string;
  tagline: string;
  feedbackContact: string;
  /** 답장·설문을 받을 메일 주소 */
  feedbackEmail?: string;
  /** 설문 폼 URL (있으면 mailto 대신 사용, ?answer=good|bad 추가) */
  surveyUrl?: string;
  /** 지난 레터 보기 링크 */
  archiveUrl?: string;
  /** 캐릭터 이미지 기준 URL (예: https://mi.example.com). 비우면 상대경로 */
  assetBaseUrl?: string;
  thumbnails?: Record<string, string | undefined>;
  dates?: Record<string, string | undefined>;
}

/** 슬림한 레터: 600px 프레임, 본문 520px */
const WIDTH = 600;
/** 영문 워드마크: 윈도우 기본 Arial Black → 굵은 대체 서체 */
const WORDMARK = "'Arial Black','Segoe UI Black','Helvetica Neue',Arial,sans-serif";
const PAD = 40;
const INNER = WIDTH - PAD * 2;

const txt = (size: number, color: string = C.ink, extra: Record<string, string | number> = {}) => ({
  fontSize: size,
  lineHeight: `${Math.round(size * 1.75)}px`,
  color,
  ...extra,
});

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
function letterDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(day).padStart(2, "0")}. ${wd}요일`;
}

function assetUrl(m: RenderMeta, path: string) {
  return `${(m.assetBaseUrl ?? "").replace(/\/$/, "")}/${path}`;
}

function character(m: RenderMeta, pose: Pose, height: number, alt: string) {
  const c = CHARACTER[pose];
  const w = Math.round((c.w * height) / c.h);
  return `<img src="${t(assetUrl(m, c.src))}" width="${w}" height="${height}" alt="${t(alt)}" style="${css({
    display: "block",
    width: w,
    height,
    border: 0,
    margin: "0 auto",
  })}">`;
}

function mailto(m: RenderMeta, subject: string) {
  return m.feedbackEmail ? `mailto:${m.feedbackEmail}?subject=${encodeURIComponent(subject)}` : "";
}

/** 짧은 진한 선 + 옅은 긴 선 (레터의 시그니처 구분선) */
function progressRule(): string {
  return table(
    tr(
      td("&nbsp;", { width: 48, bgcolor: C.brand, style: { height: 3, fontSize: 1, lineHeight: "3px" } }) +
        td("&nbsp;", { bgcolor: C.brandLine, style: { height: 3, fontSize: 1, lineHeight: "3px" } }),
    ),
  );
}

function lineCell(color: string) {
  return td(table(row("&nbsp;", { bgcolor: color, style: { height: 2, fontSize: 1, lineHeight: "2px" } })), { valign: "middle" });
}

/** 섹션 머리: (캐릭터) + 양쪽 선 사이 알약 라벨 + 보조 문구 */
function sectionHead(m: RenderMeta, label: string, pose?: Pose, sub?: string): string {
  return table(
    (pose ? row(character(m, pose, 96, `${PERSONA.name}`), { align: "center" }) : "") +
      row(
        table(
          tr(
            lineCell(C.brand) +
              td(
                table(
                  row(t(label), {
                    bgcolor: C.brand,
                    align: "center",
                    style: { ...txt(15, "#FFFFFF", { fontWeight: "bold", lineHeight: "20px" }), padding: "7px 20px", borderRadius: 18, whiteSpace: "nowrap" },
                  }),
                  { width: "auto", style: { borderCollapse: "separate" } },
                ),
                { width: 1, valign: "middle", align: "center" },
              ) +
              lineCell(C.brandLine),
          ),
        ),
      ) +
      (sub ? row(t(sub), { align: "center", style: { ...txt(12, C.mute), paddingTop: 8 } }) : ""),
  );
}

function bullets(items: string[], mark: string, color: string = C.ink): string {
  return table(
    items
      .map((it) =>
        tr(
          td(`<span style="${css(txt(14, C.brand, { fontWeight: "bold" }))}">${mark}</span>`, { width: 18, style: { paddingTop: 6 } }) +
            td(t(it), { style: { ...txt(14, color), paddingTop: 6 } }),
        ),
      )
      .join(""),
  );
}

function button(label: string, href: string, bg: string, width?: number): string {
  if (!href) return "";
  return table(
    row(link(label, href, { color: "#FFFFFF", fontWeight: "bold", fontSize: 14, fontFamily: FONT, display: "block" }), {
      bgcolor: bg,
      align: "center",
      style: { padding: "12px 22px", borderRadius: 4, ...(width ? { width } : {}) },
    }),
    { width: width ?? "auto", align: "center", style: { borderCollapse: "separate" } },
  );
}

/* ── 섹션 ─────────────────────────────────────────────── */

function header(c: NewsletterContent, m: RenderMeta): string {
  const archive = m.archiveUrl ? ` &nbsp;|&nbsp; ${link("지난 레터 보기", m.archiveUrl, { color: C.inkSoft, textDecoration: "underline" })}` : "";
  return table(
    row(character(m, "wave", 112, `${PERSONA.name} 인사`), { align: "center" }) +
      spacer(10) +
      row(t(m.newsletterName), {
        align: "center",
        style: { fontFamily: WORDMARK, fontSize: 36, lineHeight: "42px", fontWeight: 900, letterSpacing: "-1px", color: C.brand },
      }) +
      row(t(m.tagline), { align: "center", style: { ...txt(12, C.mute), paddingTop: 6 } }) +
      spacer(18) +
      row(`${t(PERSONA.name)} 레터 제${m.issueNo}호`, { align: "center", style: txt(13, C.ink, { fontWeight: "bold" }) }) +
      row(`${letterDate(m.publishDate)}${archive}`, { align: "center", style: txt(13, C.inkSoft) }) +
      spacer(26) +
      row(t(c.intro), { style: txt(15, C.ink) }) +
      spacer(30) +
      row(progressRule()),
  );
}

function quickNews(c: NewsletterContent, m: RenderMeta): string {
  if (!c.quickNews.length) return "";
  const items = c.quickNews.map(
    (q) =>
      spacer(26) +
      row(`${t(q.tag)} | ${t(q.title)} ${t(q.emoji)}`, { style: txt(16, C.ink, { fontWeight: "bold", lineHeight: "26px" }) }) +
      row(
        `${t(q.body)} ${link("자세히 보기", q.url, { color: C.brand, fontWeight: "bold", textDecoration: "underline" })}`,
        { style: { ...txt(14, C.inkSoft), paddingTop: 8 } },
      ),
  );
  return table(row(sectionHead(m, SECTIONS.quickNews.label, undefined, SECTIONS.quickNews.sub)) + items.join(""));
}

function mainReport(c: NewsletterContent, m: RenderMeta): string {
  const r = c.mainReport;
  const thumb = m.thumbnails?.[r.articleId];
  const date = m.dates?.[r.articleId];
  return table(
    row(sectionHead(m, SECTIONS.mainReport.label, "stand")) +
      spacer(22) +
      (thumb
        ? row(
            link(
              `<img src="${t(thumb)}" width="${INNER}" alt="${t(r.title)}" style="${css({ display: "block", width: INNER, maxWidth: "100%", height: "auto", border: 0 })}">`,
              r.url,
            ),
          ) + spacer(18)
        : "") +
      row(t(r.kicker), { style: txt(12, C.mute, { fontWeight: "bold" }) }) +
      row(t(r.title), { style: { ...txt(19, C.ink, { fontWeight: "bold", lineHeight: "30px" }), paddingTop: 2 } }) +
      row(`${t(r.source)}${date ? ` · ${date.replaceAll("-", ".")}` : ""}`, { style: { ...txt(12, C.mute), paddingTop: 2 } }) +
      r.paragraphs.map((p) => row(t(p), { style: { ...txt(15, C.ink), paddingTop: 14 } })).join("") +
      spacer(22) +
      row(
        `<span style="${css(txt(14, C.brand, { fontWeight: "bold" }))}">📌 핵심만 쏙</span>` + bullets(r.keyPoints, "•"),
        { bgcolor: C.brandTint, style: { padding: "16px 18px" } },
      ) +
      spacer(12) +
      row(
        `<span style="${css(txt(14, C.ink, { fontWeight: "bold" }))}">🏭 우리 회사엔?</span>` + bullets(r.forUs, "→", C.inkSoft),
        { style: { padding: "16px 18px", border: `1px solid ${C.brandLine}` } },
      ) +
      spacer(22) +
      row(button("원문 읽어 보기 →", r.url, C.brand), { align: "center" }),
  );
}

function churuStation(c: NewsletterContent, m: RenderMeta): string {
  const s = c.churuStation;
  const reply = mailto(m, `[${PERSONA.name} 레터 ${m.issueNo}호] 츄르 스테이션 답장`);
  return table(
    row(sectionHead(m, SECTIONS.churuStation.label, "letter", SECTIONS.churuStation.sub)) +
      spacer(18) +
      row(t(s.title), { align: "center", style: txt(17, C.ink, { fontWeight: "bold", lineHeight: "27px" }) }) +
      row(
        t(s.body) + (s.url ? ` ${link("원문 보기", s.url, { color: C.brand, fontWeight: "bold", textDecoration: "underline" })}` : ""),
        { style: { ...txt(15, C.ink), paddingTop: 12 } },
      ) +
      spacer(16) +
      row(
        `<span style="${css(txt(13, C.brand, { fontWeight: "bold" }))}">💬 ${t(PERSONA.name)}의 질문</span><br>` +
          `<span style="${css(txt(15, C.ink, { fontWeight: "bold" }))}">${t(s.question)}</span>`,
        { bgcolor: C.brandTint, align: "center", style: { padding: "18px 20px" } },
      ) +
      (reply ? spacer(18) + row(button("답장으로 생각 보내기", reply, C.button), { align: "center" }) : ""),
  );
}

function tailNews(c: NewsletterContent, m: RenderMeta): string {
  const tn = c.tailNews;
  const items = tn.items.map((x) =>
    tr(
      td(
        table(
          row(t(x.pastIssueLabel), {
            align: "center",
            bgcolor: C.paper,
            style: { ...txt(12, C.brand, { fontWeight: "bold", lineHeight: "18px" }), padding: "3px 6px", border: `1px solid ${C.brand}`, whiteSpace: "nowrap" },
          }),
        ),
        { width: 92, style: { paddingTop: 14 } },
      ) +
        td(`<b style="${css({ color: C.ink })}">${t(x.topic)}</b><br>${t(x.story)}`, {
          style: { ...txt(14, C.inkSoft), paddingTop: 12, paddingLeft: 12 },
        }),
    ),
  );
  return table(
    row(sectionHead(m, SECTIONS.tailNews.label, "peek", SECTIONS.tailNews.sub)) +
      spacer(18) +
      row(
        table(
          row(t(tn.intro), { style: txt(14, C.ink) }) +
            row(table(items.join("")), { style: { paddingTop: 2 } }) +
            (tn.watchList.length
              ? spacer(16) +
                row(`<span style="${css(txt(13, C.ink, { fontWeight: "bold" }))}">👀 다음 호까지 지켜볼 것</span>`) +
                row(bullets(tn.watchList, "◦", C.inkSoft))
              : ""),
        ),
        { bgcolor: C.sand, style: { padding: "20px 22px", border: `1px dashed #DDD3D1` } },
      ),
  );
}

function survey(m: RenderMeta): string {
  const href = (answer: "good" | "bad", label: string) =>
    m.surveyUrl
      ? `${m.surveyUrl}${m.surveyUrl.includes("?") ? "&" : "?"}issue=${m.issueNo}&answer=${answer}`
      : mailto(m, `[${PERSONA.name} 레터 ${m.issueNo}호] ${label}`);
  const good = href("good", "좋았다냥");
  const bad = href("bad", "아쉬웠다냥");
  return table(
    row(character(m, "sit", 104, `${PERSONA.name}`), { align: "center" }) +
      spacer(14) +
      row(t(SECTIONS.survey.label), { align: "center", style: txt(17, C.ink, { fontWeight: "bold" }) }) +
      row("버튼을 눌러 이번 호 의견을 남겨 주세요.<br>피드백 하나하나가 다음 레터의 재료가 돼요.", {
        align: "center",
        style: { ...txt(13, C.inkSoft), paddingTop: 4 },
      }) +
      (good
        ? spacer(18) +
          row(
            table(
              tr(
                td(button("좋았다냥 😺", good, C.button, 170), { align: "center", width: "50%" }) +
                  td(button("아쉬웠다냥 😿", bad, C.button, 170), { align: "center", width: "50%" }),
              ),
            ),
          )
        : row(`의견은 <b>${t(m.feedbackContact)}</b>(으)로 보내 주세요.`, { align: "center", style: { ...txt(13, C.inkSoft), paddingTop: 10 } })),
  );
}

function footer(c: NewsletterContent, m: RenderMeta): string {
  return table(
    row(`${t(PERSONA.name)}의 한마디 &nbsp;<span style="${css({ color: C.inkSoft, fontWeight: "normal" })}">${t(c.closing)}</span>`, {
      align: "center",
      style: txt(14, C.ink, { fontWeight: "bold" }),
    }) +
      spacer(26) +
      row("&nbsp;", { style: { borderTop: `1px solid ${C.brandLine}`, fontSize: 1, lineHeight: "1px", height: 1 } }) +
      spacer(18) +
      row(t(m.newsletterName), { align: "center", style: { fontFamily: WORDMARK, fontSize: 22, lineHeight: "28px", fontWeight: 900, color: "#B9AEAF", letterSpacing: "-0.5px" } }) +
      row(`${t(m.tagline)}<br>문의·제보 ${t(m.feedbackContact)}${m.feedbackEmail ? ` · ${t(m.feedbackEmail)}` : ""}`, {
        align: "center",
        style: { ...txt(12, C.mute), paddingTop: 6 },
      }) +
      (c.keywords.length ? row(`#${c.keywords.map(t).join("&nbsp; #")}`, { align: "center", style: { ...txt(12, C.brand), paddingTop: 8 } }) : "") +
      row("사내 공유용 레터입니다. 기사 저작권은 각 언론사에 있어요.", { align: "center", style: { ...txt(11, "#B9AEAF"), paddingTop: 8 } }),
  );
}

/** 아웃룩 붙여넣기용 본문 (단일 테이블) */
export function renderFragment(c: NewsletterContent, m: RenderMeta): string {
  const block = (content: string, top: number) => (content ? spacer(top) + row(content) : "");
  return table(
    row(
      table(
        row(
          table(
            row(header(c, m)) +
              block(quickNews(c, m), 34) +
              block(mainReport(c, m), 52) +
              block(churuStation(c, m), 56) +
              block(tailNews(c, m), 56) +
              block(survey(m), 56) +
              block(footer(c, m), 44),
          ),
          { style: { padding: `36px ${PAD}px 40px` } },
        ),
        { width: WIDTH, bgcolor: C.paper, align: "center", style: { width: WIDTH, maxWidth: "100%" } },
      ),
      { align: "center", bgcolor: C.paper },
    ),
    { bgcolor: C.paper },
  );
}

/** 완성된 HTML 문서 (미리보기, 시트 아카이브, HTML 코드 복사용) */
export function renderEmailHtml(c: NewsletterContent, m: RenderMeta): string {
  return `<!DOCTYPE html>
<html lang="ko" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${t(c.headline)}</title>
<style>
/* 모바일 메일 앱 전용. 아웃룩 데스크톱은 무시하고 인라인 스타일(600px)로 렌더링 */
@media screen and (max-width: 620px) {
  table[width="${WIDTH}"] { width: 100% !important; }
  table[width="${WIDTH}"] > tbody > tr > td { padding-left: 20px !important; padding-right: 20px !important; }
  img[width="${INNER}"] { width: 100% !important; height: auto !important; }
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
export function renderPlainText(c: NewsletterContent, m: RenderMeta): string {
  const L: string[] = [];
  L.push(m.newsletterName, `${PERSONA.name} 레터 제${m.issueNo}호 · ${letterDate(m.publishDate)}`, "", c.intro, "");
  if (c.quickNews.length) {
    L.push(`[${SECTIONS.quickNews.label}]`);
    for (const q of c.quickNews) L.push(`${q.tag} | ${q.title} ${q.emoji}`, q.body, q.url, "");
  }
  const r = c.mainReport;
  L.push(`[${SECTIONS.mainReport.label}]`, r.kicker, r.title, `${r.source} | ${r.url}`, ...r.paragraphs, "");
  L.push("📌 핵심만 쏙", ...r.keyPoints.map((x) => ` • ${x}`), "🏭 우리 회사엔?", ...r.forUs.map((x) => ` → ${x}`), "");
  const s = c.churuStation;
  L.push(`[${SECTIONS.churuStation.label}]`, s.title, s.body, ...(s.url ? [s.url] : []), `💬 ${s.question}`, "");
  L.push(`[${SECTIONS.tailNews.label}]`, c.tailNews.intro, ...c.tailNews.items.map((x) => ` [${x.pastIssueLabel}] ${x.topic}: ${x.story}`));
  if (c.tailNews.watchList.length) L.push("👀 다음 호까지 지켜볼 것", ...c.tailNews.watchList.map((x) => ` ◦ ${x}`));
  L.push("", `[${SECTIONS.survey.label}] 의견: ${m.feedbackEmail ?? m.feedbackContact}`, "", `${PERSONA.name}의 한마디: ${c.closing}`);
  return L.join("\n");
}
