import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config, llmEnabled } from "@/lib/config";
import { analyzeArticles } from "@/lib/mi";
import { computeStats } from "@/lib/report/stats";
import type { Article, NewsletterIssue, ReportContent, ReportStats } from "@/lib/types";
import { buildFallbackDraft } from "./fallback";
import { buildUserPrompt, systemPrompt } from "./prompt";
import { ReportSchema } from "./schema";

export interface SynthesizeInput {
  issueNo: number;
  publishDate: string;
  concept: string;
  articles: Article[]; // 선택 순서 유지
  issues: NewsletterIssue[];
  allArticles: Article[];
}

export interface SynthesizeOutput {
  content: ReportContent;
  mode: "llm" | "draft";
  model?: string;
  notice?: string;
}

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: config.anthropicApiKey }));

export const OUTPUT_SCHEMA = z.toJSONSchema(ReportSchema) as Record<string, unknown>;
delete OUTPUT_SCHEMA.$schema;

/** 통계 계산 + 프롬프트. API 호출과 Claude Code 작성 의뢰서가 같은 맥락을 쓴다 */
export function buildContext(input: SynthesizeInput) {
  if (!input.articles.length) throw new Error("선택된 기사가 없습니다.");
  const pastIssues = input.issues.filter((i) => i.issueNo !== input.issueNo);
  const intel = analyzeArticles(input.articles, input.issues, input.allArticles, { excludeIssueNo: input.issueNo });
  const stats = computeStats(input.articles, input.issues, input.allArticles, { issueNo: input.issueNo, publishDate: input.publishDate });
  return {
    intel,
    stats,
    system: systemPrompt(config.newsletterName, config.audience, config.feedbackContact),
    user: buildUserPrompt({
      issueNo: input.issueNo,
      publishDate: input.publishDate,
      concept: input.concept,
      articles: input.articles,
      intel,
      issues: pastIssues,
      stats,
    }),
  };
}

export async function synthesizeNewsletter(input: SynthesizeInput): Promise<SynthesizeOutput> {
  const ctx = buildContext(input);

  if (!llmEnabled()) {
    return {
      content: { ...buildFallbackDraft({ ...input, stats: ctx.stats }), stats: ctx.stats },
      mode: "draft",
      notice: "규칙 기반 초안입니다. 레이아웃 확인용으로 쓰고, 본문은 Claude Code 작성본으로 바꿔 주세요.",
    };
  }

  const stream = getClient().beta.messages.stream({
    model: config.anthropicModel,
    max_tokens: 32000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: ctx.system,
    messages: [{ role: "user", content: ctx.user }],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(`모델이 요청을 거절했습니다${message.stop_details?.explanation ? `: ${message.stop_details.explanation}` : "."}`);
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("응답이 최대 토큰 한도에서 잘렸습니다. 기사 수를 줄여 다시 시도하세요.");
  }
  const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed = ReportSchema.safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`생성 결과 형식 오류: ${parsed.error.message}`);

  return { content: anchorToSources(parsed.data, input.articles, ctx.stats).content, mode: "llm", model: message.model };
}

/**
 * 작성 결과를 선정 기사와 맞춘다: 존재하지 않는 근거 기사 ID 는 버리고, 통계는 서버 계산값으로 고정한다.
 * 선정 기사 중 어느 테마에도 인용되지 않은 기사는 missing 으로 알려 준다.
 */
export function anchorToSources(draft: z.infer<typeof ReportSchema>, articles: Article[], stats: ReportStats): { content: ReportContent; missing: Article[] } {
  const valid = new Set(articles.map((a) => a.id));
  const themes = draft.themes.map((t) => ({ ...t, sourceArticleIds: [...new Set(t.sourceArticleIds.filter((id) => valid.has(id)))] }));
  const cited = new Set(themes.flatMap((t) => t.sourceArticleIds));
  const content: ReportContent = { ...draft, themes, stats };
  return { content, missing: articles.filter((a) => !cited.has(a.id)) };
}
