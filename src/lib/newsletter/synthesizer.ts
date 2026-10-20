import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config, llmEnabled } from "@/lib/config";
import { analyzeArticles, keywordTimeline } from "@/lib/mi";
import type { Article, NewsletterContent, NewsletterIssue } from "@/lib/types";
import { buildFallbackDraft } from "./fallback";
import { buildUserPrompt, systemPrompt } from "./prompt";
import { NewsletterSchema } from "./schema";

export interface SynthesizeInput {
  issueNo: number;
  publishDate: string;
  concept: string;
  articles: Article[]; // 선택 순서 유지
  mainArticleId?: string;
  churuArticleId?: string;
  issues: NewsletterIssue[];
  allArticles: Article[];
}

export interface SynthesizeOutput {
  content: NewsletterContent;
  mode: "llm" | "draft";
  model?: string;
  notice?: string;
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: config.anthropicApiKey }));

const OUTPUT_SCHEMA = z.toJSONSchema(NewsletterSchema) as Record<string, unknown>;
delete OUTPUT_SCHEMA.$schema;

export async function synthesizeNewsletter(input: SynthesizeInput): Promise<SynthesizeOutput> {
  const main = input.articles.find((a) => a.id === input.mainArticleId) ?? input.articles[0];
  if (!main) throw new Error("선택된 기사가 없습니다.");
  const churu = input.articles.find((a) => a.id === input.churuArticleId && a.id !== main.id);
  const quick = input.articles.filter((a) => a.id !== main.id && a.id !== churu?.id);
  const intel = analyzeArticles(input.articles, input.issues, input.allArticles, { excludeIssueNo: input.issueNo });
  const keywords = [...new Set(input.articles.flatMap((a) => a.keywords))];
  const timeline = keywordTimeline(keywords, input.issues.filter((i) => i.issueNo !== input.issueNo), input.allArticles);

  if (!llmEnabled()) {
    return {
      content: buildFallbackDraft({ ...input, main, quick, churu, intel }),
      mode: "draft",
      notice: "ANTHROPIC_API_KEY 가 없어 기사 원문 기반 기본 초안으로 생성했습니다.",
    };
  }

  const stream = getClient().beta.messages.stream({
    model: config.anthropicModel,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: systemPrompt(config.newsletterName),
    messages: [
      {
        role: "user",
        content: buildUserPrompt({
          issueNo: input.issueNo,
          publishDate: input.publishDate,
          concept: input.concept,
          mainArticle: main,
          quickArticles: quick,
          churuArticle: churu,
          intel,
          issues: input.issues.filter((i) => i.issueNo !== input.issueNo),
          timeline,
        }),
      },
    ],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(`모델이 요청을 거절했습니다${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("응답이 최대 토큰 한도에서 잘렸습니다. 기사 수를 줄여 다시 시도하세요.");
  }
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = NewsletterSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`생성 결과 형식 오류: ${parsed.error.message}`);

  return { content: anchorToSources(parsed.data, main, quick, churu), mode: "llm", model: message.model };
}

/** 링크/출처는 모델 출력 대신 원본 데이터로 고정 (환각 링크 방지) */
function anchorToSources(c: NewsletterContent, main: Article, quick: Article[], churu?: Article): NewsletterContent {
  const pick = (id: string, i: number) => quick.find((a) => a.id === id) ?? quick[i];
  return {
    ...c,
    mainReport: { ...c.mainReport, articleId: main.id, source: main.source, url: main.link },
    quickNews: c.quickNews
      .map((q, i) => {
        const a = pick(q.articleId, i);
        return a ? { ...q, articleId: a.id, source: a.source, url: a.link } : null;
      })
      .filter((q): q is NewsletterContent["quickNews"][number] => q !== null),
    churuStation: churu
      ? { ...c.churuStation, articleId: churu.id, source: churu.source, url: churu.link }
      : { ...c.churuStation, articleId: "", source: "", url: "" },
  };
}
