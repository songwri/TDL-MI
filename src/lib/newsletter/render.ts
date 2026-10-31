import { chartSig, contentVersion } from "@/lib/charts/sign";
import { chartSvg, svgHeight, type ChartId } from "@/lib/charts/svg";
import { config } from "@/lib/config";
import { renderEmailHtml, renderFragment, renderPlainText, type RenderMeta } from "@/lib/email/template";
import type { Article, ReportContent, ViewerData } from "@/lib/types";

export function buildViewer(issueNo: number, publishDate: string, articles: Article[]): ViewerData {
  return {
    issueNo,
    publishDate,
    brand: { product: config.newsletterName, publisher: config.feedbackContact, audience: config.audience },
    articles: articles.map((a) => ({ id: a.id, title: a.title, source: a.source, link: a.link, publishedAt: a.publishedAt, category: a.category, region: a.region })),
  };
}

const CHARTS: ChartId[] = ["category", "keywords", "map", "trend", "heatmap"];
const unescape = (x: string) => x.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** 인포그래픽 이미지 주소와 크기. 주소는 서명이 붙어 비밀번호 없이 열린다(PUBLIC_BASE_URL 이 없으면 상대 주소 → 복사할 때 채움) */
function chartImages(content: ReportContent, issueNo: number, viewer: ViewerData): RenderMeta["charts"] {
  const v = contentVersion({ content, ids: viewer.articles.map((a) => a.id) });
  const out: NonNullable<RenderMeta["charts"]> = {};
  for (const id of CHARTS) {
    const svg = chartSvg(id, content, viewer.articles);
    if (!svg) continue;
    out[id] = {
      src: `${config.publicBaseUrl}/api/charts/${issueNo}/${id}.png?v=${v}&s=${chartSig(issueNo, id)}`,
      height: svgHeight(svg),
      alt: unescape(/aria-label="([^"]*)"/.exec(svg)?.[1] ?? ""),
    };
  }
  return out;
}

/** articles: 선정 기사 (선택 순서 = 참고 기사 번호) *//** articles: 선정 기사 (선택 순서 = 참고 기사 번호) */
export function renderAll(content: ReportContent, issueNo: number, publishDate: string, articles: Article[]) {
  const meta = {
    issueNo,
    publishDate,
    newsletterName: config.newsletterName,
    tagline: config.tagline,
    feedbackContact: config.feedbackContact,
    feedbackEmail: config.feedbackEmail || undefined,
    audience: config.audience,
    articles: articles.map(({ id, title, source, link, publishedAt, region }) => ({ id, title, source, link, publishedAt, region })),
  };
  const viewer = buildViewer(issueNo, publishDate, articles);
  const withImages = { ...meta, charts: chartImages(content, issueNo, viewer) };
  return {
    /** 웹 인터랙티브 화면용 (메일 HTML 과 같은 데이터) */
    viewer,
    /** 기본: 인포그래픽이 이미지 */
    html: renderEmailHtml(content, withImages),
    fragment: renderFragment(content, withImages),
    text: renderPlainText(content, meta),
    /** 예비: 인포그래픽을 표로 그린 버전 (이미지가 막히는 메일 환경용) */
    tables: { html: renderEmailHtml(content, meta), fragment: renderFragment(content, meta) },
  };
}
