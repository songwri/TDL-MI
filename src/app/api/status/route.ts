import { ok } from "@/lib/api";
import { SOURCES } from "@/config/sources";
import { config, llmEnabled, sheetsEnabled, storeMode, writerMode } from "@/lib/config";
import { getMeta } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return ok({
    llm: llmEnabled() ? config.anthropicModel : null,
    writer: writerMode(),
    store: storeMode(),
    sheets: sheetsEnabled(),
    lookbackDays: config.lookbackDays,
    sources: SOURCES.map(({ id, name, region, enabled }) => ({ id, name, region, enabled })),
    ...(await getMeta()),
  });
}
