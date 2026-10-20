import { COLORS as C, ICONS, PERSONA } from "@/config/brand";
import type { NewsletterContent } from "@/lib/types";
import { FONT, css, link, row, spacer, t, table, td, tr } from "./inline";

export interface RenderMeta {
  issueNo: number;
  publishDate: string; // YYYY-MM-DD
  newsletterName: string;
  feedbackContact: string;
  /** articleId -> 썸네일 URL */
  thumbnails?: Record<string, string | undefined>;
  /** articleId -> 발행일 YYYY-MM-DD */
  dates?: Record<string, string | undefined>;
}

const WIDTH = 640;
const INNER = WIDTH - 48;

const text = (size: number, color: string = C.text, extra: Record<string, string | number> = {}) => ({
  fontSize: size,
  lineHeight: `${Math.round(size * 1.65)}px`,
  color,
  ...extra,
});

const dotDate = (d: string) => d.replaceAll("-", ".");

function sectionTitle(icon: string, title: string, sub?: string): string {
  return table(
    row(
      `<span style="${css({ fontSize: 18 })}">${icon}</span>&nbsp;<span style="${css(text(17, C.primaryDark, { fontWeight: "bold" }))}">${t(title)}</span>` +
        (sub ? `&nbsp;&nbsp;<span style="${css(text(12, C.subtext))}">${t(sub)}</span>` : ""),
      { style: { paddingBottom: 8, borderBottom: `2px solid ${C.primary}` } },
    ),
  );
}

function bulletList(items: string[], bullet: string, color: string = C.text): string {
  return table(
    items
      .map((it) =>
        tr(
          td(`<span style="${css(text(14, C.accent, { fontWeight: "bold" }))}">${bullet}</span>`, { width: 22, style: { paddingTop: 4 } }) +
            td(t(it), { style: { ...text(14, color), paddingTop: 4 } }),
        ),
      )
      .join(""),
  );
}

function button(label: string, href: string): string {
  return table(
    tr(
      td(link(t(label), href, { color: "#FFFFFF", fontWeight: "bold", fontSize: 13, display: "inline-block", fontFamily: FONT }), {
        bgcolor: C.primary,
        align: "center",
        style: { padding: "9px 18px", borderRadius: 4, border: `1px solid ${C.primary}` },
      }),
    ),
    { width: "auto", style: { borderCollapse: "separate" } },
  );
}

function header(c: NewsletterContent, m: RenderMeta): string {
  return table(
    row(
      table(
        row(`${ICONS.robot}&nbsp; ${t(m.newsletterName)} &nbsp;|&nbsp; Bi-weekly Logistics &amp; Robotics`, {
          style: text(12, "#BFD3F2", { letterSpacing: "0.5px" }),
        }) +
          row(`No.${m.issueNo} &nbsp;·&nbsp; ${ICONS.calendar} ${dotDate(m.publishDate)}`, {
            style: { ...text(13, "#FFFFFF"), paddingTop: 6 },
          }) +
          row(t(c.headline), { style: { ...text(24, "#FFFFFF", { fontWeight: "bold", lineHeight: "34px" }), paddingTop: 10 } }) +
          spacer(14) +
          row(
            table(
              row(
                `<span style="${css(text(12, C.highlight, { fontWeight: "bold" }))}">${ICONS.tip} 이번 호 기획 콘셉트</span><br>` +
                  `<span style="${css(text(14, "#FFFFFF"))}">${t(c.conceptBriefing)}</span>`,
                { bgcolor: C.primaryDark, style: { padding: "12px 14px", borderLeft: `4px solid ${C.highlight}` } },
              ),
            ),
          ),
        { width: INNER },
      ),
      { bgcolor: C.primary, style: { padding: "28px 24px 24px" } },
    ),
  );
}

function editorNote(c: NewsletterContent): string {
  return table(
    tr(
      td(`<span style="${css({ fontSize: 30, lineHeight: "36px" })}">${PERSONA.emoji}</span>`, { width: 46, align: "center" }) +
        td(
          `<span style="${css(text(12, C.accent, { fontWeight: "bold" }))}">${t(PERSONA.name)}의 인사</span><br>` +
            `<span style="${css(text(14, C.text))}">${t(c.editorNote)}</span>`,
          { style: { paddingLeft: 8 } },
        ),
    ),
  );
}

function deepDive(c: NewsletterContent, m: RenderMeta): string {
  const d = c.deepDive;
  const thumb = m.thumbnails?.[d.articleId];
  const date = m.dates?.[d.articleId];
  const rows = [
    row(sectionTitle(ICONS.deepDive, "메인 딥다이브", "Deep Dive")),
    spacer(16),
    thumb
      ? row(
          link(
            `<img src="${t(thumb)}" width="${INNER}" alt="${t(d.title)}" style="${css({ display: "block", width: INNER, maxWidth: "100%", height: "auto", border: 0 })}">`,
            d.url,
          ),
        ) + spacer(14)
      : "",
    row(link(t(d.title), d.url, { ...text(19, C.text, { fontWeight: "bold", lineHeight: "28px" }) })),
    row(`${t(d.source)}${date ? ` · ${dotDate(date)}` : ""}`, { style: { ...text(12, C.subtext), paddingTop: 4 } }),
    spacer(12),
    row(t(d.summary), { bgcolor: C.bg, style: { ...text(14, C.text), padding: "12px 14px", borderLeft: `4px solid ${C.accent}` } }),
    spacer(6),
    ...d.analysis.map((p) => row(t(p), { style: { ...text(14), paddingTop: 10 } })),
    spacer(14),
    row(`<span style="${css(text(14, C.primaryDark, { fontWeight: "bold" }))}">${ICONS.data} 핵심 포인트</span>`),
    row(bulletList(d.keyPoints, "▪"), { style: { paddingTop: 4 } }),
    spacer(14),
    row(
      `<span style="${css(text(14, "#8A5A00", { fontWeight: "bold" }))}">${ICONS.implication} 사내 도입 시사점</span>` +
        bulletList(d.implications, "→"),
      { bgcolor: C.highlightSoft, style: { padding: "14px 16px", border: `1px solid #F5DFA6` } },
    ),
    spacer(16),
    row(button(`${ICONS.link} 원문 보기`, d.url)),
  ];
  return table(rows.join(""));
}

function briefs(c: NewsletterContent, m: RenderMeta): string {
  if (!c.briefs.length) return "";
  const items = c.briefs.map((b, i) => {
    const date = m.dates?.[b.articleId];
    return (
      spacer(14) +
      row(
        table(
          tr(
            td(`<span style="${css(text(15, "#FFFFFF", { fontWeight: "bold" }))}">${i + 1}</span>`, {
              width: 30,
              bgcolor: C.accent,
              align: "center",
              valign: "middle",
              style: { height: 30 },
            }) +
              td(
                link(t(b.title), b.url, text(15, C.text, { fontWeight: "bold", lineHeight: "23px" })) +
                  `<br><span style="${css(text(12, C.subtext))}">${t(b.source)}${date ? ` · ${dotDate(date)}` : ""}</span>`,
                { style: { paddingLeft: 12 } },
              ),
          ) +
            tr(td("", { width: 30 }) + td(t(b.summary), { style: { ...text(14), paddingLeft: 12, paddingTop: 8 } })) +
            tr(
              td("", { width: 30 }) +
                td(`${ICONS.insight} <b>핵심:</b> ${t(b.keyPoint)}`, {
                  style: { ...text(13, C.primaryDark), paddingLeft: 12, paddingTop: 6 },
                }),
            ),
        ),
        { style: { paddingBottom: 14, borderBottom: `1px solid ${C.border}` } },
      )
    );
  });
  return table(row(sectionTitle(ICONS.brief, "테크 & 인더스트리 브리프", "Tech & Industry Brief")) + items.join(""));
}

function marketIntel(c: NewsletterContent): string {
  const mi = c.marketIntelligence;
  const conn = mi.connections.map((x) =>
    tr(
      td(
        table(
          row(t(x.pastIssueLabel), {
            bgcolor: C.primary,
            align: "center",
            style: { ...text(12, "#FFFFFF", { fontWeight: "bold" }), padding: "3px 6px" },
          }),
        ),
        { width: 96, style: { paddingTop: 10 } },
      ) +
        td(`<b style="${css({ color: C.primaryDark })}">${t(x.topic)}</b><br>${t(x.insight)}`, {
          style: { ...text(13), paddingTop: 10, paddingLeft: 12 },
        }),
    ),
  );
  return table(
    row(
      table(
        row(sectionTitle(ICONS.mi, "Market Intelligence 코너", "기술 흐름 점검")) +
          row(t(mi.overview), { style: { ...text(14), paddingTop: 12 } }) +
          row(table(conn.join("")), { style: { paddingTop: 4 } }) +
          (mi.watchList.length
            ? spacer(12) +
              row(`<span style="${css(text(14, C.primaryDark, { fontWeight: "bold" }))}">${ICONS.watch} 다음 호까지의 관전 포인트</span>`) +
              row(bulletList(mi.watchList, "◦"))
            : ""),
      ),
      { bgcolor: C.accentSoft, style: { padding: "20px 20px 22px", border: `1px solid #BFE6E5` } },
    ),
  );
}

function footer(c: NewsletterContent, m: RenderMeta): string {
  return table(
    row(`${PERSONA.emoji} <b>${t(PERSONA.name)}</b>: ${t(c.closingTip)}`, { style: { ...text(14), paddingBottom: 14 } }) +
      row(
        `${ICONS.feedback} <b>피드백 안내</b><br>이번 호에 대한 의견, 다뤄 주었으면 하는 기술·기업, 사내 적용 사례 제보는 이 메일에 회신하시거나 <b>${t(m.feedbackContact)}</b>(으)로 보내 주세요.`,
        { bgcolor: C.bg, style: { ...text(13, C.subtext), padding: "14px 16px" } },
      ) +
      (c.keywords.length
        ? row(`# ${c.keywords.map(t).join("&nbsp;&nbsp;# ")}`, { style: { ...text(12, C.accent), paddingTop: 12 } })
        : "") +
      row(`${t(m.newsletterName)} No.${m.issueNo} · 본 메일은 사내 공유용이며 기사 저작권은 각 언론사에 있습니다.`, {
        style: { ...text(11, "#98A2B3"), paddingTop: 10 },
      }),
  );
}

/** 아웃룩 붙여넣기용 본문 (단일 테이블) */
export function renderFragment(c: NewsletterContent, m: RenderMeta): string {
  const card = (content: string, pad = "24px") => row(content, { bgcolor: C.card, style: { padding: pad } });
  return table(
    row(
      table(
        row(header(c, m)) +
          card(editorNote(c), "22px 24px 6px") +
          card(deepDive(c, m)) +
          card(briefs(c, m), "8px 24px 24px") +
          card(marketIntel(c), "4px 24px 24px") +
          card(footer(c, m), "8px 24px 28px"),
        { width: WIDTH, bgcolor: C.card, align: "center", style: { width: WIDTH, maxWidth: "100%" } },
      ),
      { align: "center", bgcolor: C.bg, style: { padding: "20px 0" } },
    ),
    { bgcolor: C.bg },
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
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="${css({ margin: 0, padding: 0, backgroundColor: C.bg, fontFamily: FONT })}">
${renderFragment(c, m)}
</body>
</html>`;
}

/** text/plain 클립보드용 */
export function renderPlainText(c: NewsletterContent, m: RenderMeta): string {
  const L: string[] = [];
  L.push(`${m.newsletterName} No.${m.issueNo} (${dotDate(m.publishDate)})`, c.headline, "", `${ICONS.tip} 이번 호 기획 콘셉트: ${c.conceptBriefing}`, "", `${PERSONA.emoji} ${c.editorNote}`, "");
  L.push(`${ICONS.deepDive} 메인 딥다이브`, c.deepDive.title, `${c.deepDive.source} | ${c.deepDive.url}`, c.deepDive.summary, ...c.deepDive.analysis, "");
  L.push(`${ICONS.data} 핵심 포인트`, ...c.deepDive.keyPoints.map((x) => ` - ${x}`), `${ICONS.implication} 사내 도입 시사점`, ...c.deepDive.implications.map((x) => ` → ${x}`), "");
  if (c.briefs.length) {
    L.push(`${ICONS.brief} 테크 & 인더스트리 브리프`);
    c.briefs.forEach((b, i) => L.push(`${i + 1}. ${b.title} (${b.source})`, `   ${b.summary}`, `   ${ICONS.insight} ${b.keyPoint}`, `   ${b.url}`));
    L.push("");
  }
  L.push(`${ICONS.mi} Market Intelligence 코너`, c.marketIntelligence.overview, ...c.marketIntelligence.connections.map((x) => ` [${x.pastIssueLabel}] ${x.topic}: ${x.insight}`));
  if (c.marketIntelligence.watchList.length) L.push(`${ICONS.watch} 관전 포인트`, ...c.marketIntelligence.watchList.map((x) => ` - ${x}`));
  L.push("", `${PERSONA.emoji} ${c.closingTip}`, `${ICONS.feedback} 피드백: ${m.feedbackContact}`);
  return L.join("\n");
}
